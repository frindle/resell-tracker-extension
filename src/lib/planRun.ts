// Step plans: the interpreter. It walks a validated plan over a TabDriver (the real one is
// src/background/planDriver.ts; tests use a fake) and reports the same shape as the built-in eGift
// runner (egiftReport) plus `runner: "plan vN"`, the failing step id and a trace of step ids, the
// condition that matched and timings. Card codes, PINs, the email, the link and image data live only
// in memory here: they are never put in the report, the trace or an error.
//
// eGift-specific parts (reading a card, the sequence checks, the post body, the end test) are a small
// hook table keyed by plan name (`planHooks`), not generic JSON.
import {
  CLICK_DENY_SOURCE, PLAN_ENDPOINTS, effectiveLimits, effectiveTiming,
  type ClickSpec, type Cond, type FillSpec, type Plan, type PlanPage, type ProbeReq, type ProbeRes, type ReadRes, type ReadSpec, type Step,
  type WaitStep,
} from './stepPlan.ts';
import {
  MAX_CARDS, egiftErrorCode, egiftPostBody, egiftReport, readCard, titleFor,
  type CardPatterns, type EgiftCard, type EgiftFailure, type EgiftOpened, type EgiftReport,
} from './egiftCommand.ts';

export interface Watcher { portal(): Promise<number[]>; stop(): void }

/** Everything the interpreter does to the outside world. Clock and sleep are injected for tests. */
export interface TabDriver {
  /** Opens a background tab on `url` and returns its id. */
  open(url: string): Promise<number>;
  /** Watches for tabs the portal opens from `opener` (the opener-or-host rule). */
  watch(opener: number): Watcher;
  /** Marks a tab the portal opened, so the run closes it. */
  adopt(tabId: number): void;
  probe(tab: number, req: ProbeReq): Promise<ProbeRes | null>;
  click(tab: number, spec: ClickSpec, deny: string): Promise<'ok' | 'none' | 'denied'>;
  fill(tab: number, spec: FillSpec, value: string, deny: string): Promise<boolean>;
  read(tab: number, spec: ReadSpec): Promise<ReadRes | null>;
  shoot(tab: number, selector: string): Promise<string | null>;
  /** POSTs JSON to a tracker path (already resolved from a bundled endpoint name); true when saved. */
  post(path: string, body: unknown): Promise<boolean>;
  keepInTab(tab: number): Promise<void>;
  /** Closes every tab the run opened or adopted, the camera and the keepalive. Never touches other tabs. */
  closeAll(): Promise<void>;
  sleep(ms: number): Promise<void>;
  now(): number;
}

export interface PlanInputs { link: string; email: string; orderId: number }
export interface TraceEntry { stepId: string; matched?: string; ms: number }
export type PlanReport = {
  status: EgiftReport['status'];
  result: EgiftReport['result'] & { runner: string; step?: string; trace: TraceEntry[]; dryRun?: true };
};

// ---- per-plan hooks ----

export interface RunState { cards: number; saved: number; images: number; named: number; mismatched: number; total: number; opened?: EgiftOpened }
type Vars = Record<string, unknown>;
interface Hook {
  /** Turns a read step's fields into vars.card (+ vars.title); returns a failure code, or null when fine. */
  parse(kind: string, fields: Record<string, string | null>, vars: Vars, st: RunState): string | null;
  /** The JSON body for a post to `to`, or undefined to build it from the step's $variables. */
  postBody(to: string, vars: Vars, inputs: PlanInputs): unknown;
  afterPost(vars: Vars, st: RunState): void;
  /** stopIf counterAtEnd: stop the loop, or fail it. */
  atEnd(vars: Vars, st: RunState): { stop: boolean; failure?: string };
}

const noHook: Hook = {
  parse: () => 'plan-failed',
  postBody: () => undefined,
  afterPost: () => {},
  atEnd: () => ({ stop: false }),
};

function egiftHook(plan: Plan): Hook {
  const re = (k: string, flags = ''): RegExp | undefined => {
    const src = plan.patterns?.[k];
    try { return src ? new RegExp(src, flags) : undefined; } catch { return undefined; }
  };
  const pats: CardPatterns = {};
  for (const [k, flags] of [['code', ''], ['pin', 'i'], ['sequence', 'i'], ['amount', ''], ['codeValue', ''], ['pinValue', '']] as const) {
    const r = re(k, flags);
    if (r) (pats as Record<string, RegExp>)[k] = r;
  }
  return {
    parse(kind, f, vars, st) {
      if (kind !== 'card') return 'plan-failed';
      const card = readCard({ text: f.text ?? '', code: f.code, pin: f.pin, counter: f.counter }, pats);
      if (!card) return st.cards ? 'ended-early' : 'page-timeout';
      if (st.cards === 0) st.total = card.total;
      if (card.index !== st.cards + 1) return 'out-of-sequence';
      if (card.total !== st.total) return 'total-mismatch';
      st.cards++;
      const title = titleFor(Array.isArray(vars.titles) ? vars.titles as string[] : [], card.index, st.total, pats.amount);
      if (title && card.value != null && card.value !== title.value) st.mismatched++;
      vars.card = card;
      vars.title = title;
      return null;
    },
    postBody(to, vars, inputs) {
      if (to !== 'egift') return undefined;
      return egiftPostBody(inputs.orderId, vars.card as EgiftCard, { title: vars.title as ReturnType<typeof titleFor>, image: (vars.image as string | null) ?? null });
    },
    afterPost(vars, st) {
      if (vars.image) st.images++;
      if (vars.title) st.named++;
    },
    atEnd(vars, st) {
      const c = vars.card as EgiftCard | undefined;
      if (!c || c.index < st.total) return { stop: false };
      return c.index !== st.total ? { stop: true, failure: 'ended-early' } : { stop: true };
    },
  };
}

/** Hook factories keyed by plan name. */
export const planHooks: Record<string, (plan: Plan) => Hook> = { costcoEgift: egiftHook };

// ---- interpreter ----

type Flow = 'next' | 'break' | 'halt' | { go: string } | { fail: string; step: string };
const MAX_TRACE = 800;

function hostOk(url: string, hosts: string[]): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && !u.username && !u.password && hosts.includes(u.hostname.toLowerCase());
  } catch { return false; }
}

function planErrorCode(e: unknown): string {
  return egiftErrorCode('page', e).replace(/^error-page/, 'plan-error');
}

const kindOf = (c: Cond): string => (['exists', 'clickable', 'label', 'text', 'alert', 'counterAtEnd'] as const).find(k => k in c) ?? 'cond';

export async function runPlan(
  name: string, plan: Plan, version: number, driver: TabDriver, inputs: PlanInputs, opts: { dryRun?: boolean } = {},
): Promise<PlanReport> {
  const lim = effectiveLimits(plan);
  const timing = effectiveTiming(plan);
  const hook = (planHooks[name] ?? (() => noHook))(plan);
  const st: RunState = { cards: 0, saved: 0, images: 0, named: 0, mismatched: 0, total: 0 };
  const vars: Vars = {};
  const lastSeen: Record<string, string> = {};
  const trace: TraceEntry[] = [];
  const dry = !!opts.dryRun;
  const start = driver.now();
  let tab: number | null = null;
  let executed = 0;
  let opens = 0;
  let cur = '';
  let failure: string | null = null;
  let failedStep: string | undefined;

  const failFlow = (code: string, step: string): Flow => ({ fail: code, step });
  const inputOf = (v: string): string => (v === '$link' ? inputs.link : v === '$email' ? inputs.email : v);
  const need = (): number => { if (tab == null) throw new Error('no tab'); return tab; };
  const conds = (c: Cond[]): ProbeReq => ({ page: plan.page as PlanPage, conds: c });

  /** Whether a cond holds in a probe result; `changed` compares the label value with the last read. */
  const holds = (c: Cond, i: number, r: ProbeRes): boolean => {
    if (!r.hits[i]) return false;
    if (c.changed && c.label) return r.labels[i] != null && r.labels[i] !== lastSeen[c.label];
    return true;
  };

  async function wait(step: WaitStep, iter: number): Promise<{ flow: Flow; matched?: string }> {
    const t = need();
    const list: Cond[] = [...(step.any?.map(a => a.when) ?? []), ...(step.until ? [step.until] : [])];
    const altAt = list.length;
    if (step.timeoutAlt) list.push(step.timeoutAlt.when);
    const req = conds(list);
    const deadline = driver.now() + (step.timeoutMs ?? timing.waitMs);
    let last: ProbeRes | null = null;
    while (driver.now() < deadline) {
      await driver.sleep(timing.pollMs);
      try {
        const r = await driver.probe(t, req);
        if (!r) continue;
        last = r;
        if (step.any) {
          for (const [i, a] of step.any.entries()) {
            if (!holds(a.when, i, r)) continue;
            if (a.opened) st.opened = a.opened;
            return { flow: { go: a.go }, matched: `any[${i}]:${kindOf(a.when)}` };
          }
        } else if (step.until && holds(step.until, 0, r)) return { flow: 'next', matched: `until:${kindOf(step.until)}` };
        if (r.alert && step.alert) return { flow: failFlow(step.alert, step.id), matched: 'alert' };
      } catch { /* still loading or navigating */ }
    }
    let code: string = iter === 0 && step.timeoutFirst ? step.timeoutFirst : step.timeout;
    if (step.timeoutAlt && last && last.hits[altAt]) code = step.timeoutAlt.code;
    if (last?.botCheck) code = 'bot-check';
    return { flow: failFlow(code, step.id), matched: last?.botCheck ? 'botCheck' : 'timeout' };
  }

  async function follow(step: Extract<Step, { do: 'click' }>, spec: ClickSpec): Promise<{ flow: Flow; matched?: string }> {
    let t = need();
    const watcher = driver.watch(t);
    const landed = conds([step.landed as Cond]);
    const attempts = step.retryKeepInTab ? (['new-tab', 'kept-in-tab'] as const) : (['new-tab'] as const);
    let opened: EgiftOpened | undefined;
    let child: number | undefined;
    const adoptChild = (id: number): boolean => {
      if (++opens > lim.tabs) return false;
      driver.adopt(id);
      return true;
    };
    for (const attempt of attempts) {
      await driver.sleep(step.delayMs ?? 0);
      if (attempt === 'kept-in-tab') await driver.keepInTab(t);
      const r = await driver.click(t, spec, CLICK_DENY_SOURCE);
      if (r === 'denied') return { flow: failFlow('click-denied', step.id) };
      if (r === 'none') return { flow: failFlow(step.else ?? 'no-open-button', step.id) };
      const deadline = driver.now() + timing.newTabWaitMs;
      while (driver.now() < deadline) {
        await driver.sleep(timing.pollMs);
        const c = (await watcher.portal())[0];
        if (c != null) { child = c; opened = 'new-tab'; break; }
        try {
          const p = await driver.probe(t, landed);
          if (p && p.hits[0]) { opened = attempt === 'new-tab' ? 'same-tab' : 'kept-in-tab'; break; }
        } catch { /* navigating */ }
      }
      if (opened) break;
    }
    // A slow new tab: still read it; otherwise the card loop waits on this tab.
    if (!opened) { const late = (await watcher.portal())[0]; if (late != null) { child = late; opened = 'new-tab'; } }
    if (child != null) {
      if (!adoptChild(child)) return { flow: failFlow('plan-failed', step.id) };
      t = child;
      tab = t;
    }
    if (opened) st.opened = opened;
    return { flow: 'next', matched: opened ?? 'none' };
  }

  async function exec(step: Step, iter: number): Promise<{ flow: Flow; matched?: string }> {
    switch (step.do) {
      case 'open': {
        const url = inputOf(step.url);
        if (!hostOk(url, plan.hosts)) return { flow: failFlow('link-rejected', step.id) };
        if (++opens > lim.tabs) return { flow: failFlow('plan-failed', step.id) };
        tab = await driver.open(url);
        return { flow: 'next' };
      }
      case 'wait':
        return wait(step, iter);
      case 'click': {
        const spec: ClickSpec = { page: plan.page, selector: step.selector, clickable: step.clickable, orText: step.orText };
        if (step.follow) return follow(step, spec);
        await driver.sleep(step.delayMs ?? 0);
        const r = await driver.click(need(), spec, CLICK_DENY_SOURCE);
        if (r === 'denied') return { flow: failFlow('click-denied', step.id) };
        if (r === 'none') return { flow: failFlow(step.else ?? 'ended-early', step.id) };
        return { flow: 'next' };
      }
      case 'fill': {
        // A dry run never types into the portal: it ends here with the trace so far.
        if (dry) return { flow: 'halt', matched: 'skipped' };
        const spec: FillSpec = {
          selector: step.selector, submit: step.submit,
          submitButton: step.submitButton ?? 'button[type="submit"], input[type="submit"]', buttons: step.buttons ?? 'button',
          submitText: step.submitText ?? 'submit|continue|next|view|access',
        };
        const ok = await driver.fill(need(), spec, inputOf(step.value), CLICK_DENY_SOURCE);
        if (!ok && step.else) return { flow: failFlow(step.else, step.id) };
        await driver.sleep(step.delayMs ?? 0);
        return { flow: 'next' };
      }
      case 'read': {
        const res = await driver.read(need(), { page: plan.page, fields: step.fields, all: step.all });
        if (!res) return { flow: failFlow(st.cards ? 'ended-early' : 'page-timeout', step.id) };
        if (step.all) { vars[step.into] = res.all; return { flow: 'next' }; }
        for (const [k, f] of Object.entries(step.fields ?? {})) {
          const v = res.fields[k];
          if (f.label && v) lastSeen[f.label] = v;
        }
        vars[step.into] = res.fields;
        if (step.parse) {
          const code = hook.parse(step.parse, res.fields, vars, st);
          if (code) return { flow: failFlow(code, step.id) };
        }
        return { flow: 'next' };
      }
      case 'shoot': {
        if (dry) { vars[step.into] = null; return { flow: 'next', matched: 'skipped' }; }
        vars[step.into] = await driver.shoot(need(), step.selector).catch(() => null);
        return { flow: 'next' };
      }
      case 'post': {
        if (dry) return { flow: 'next', matched: 'skipped' };
        let body = hook.postBody(step.to, vars, inputs);
        if (body === undefined) {
          const b: Record<string, unknown> = {};
          for (const [k, ref] of Object.entries(step.body)) {
            const [v, field] = ref.slice(1).split('.');
            const val = vars[v];
            b[k] = field && val && typeof val === 'object' ? (val as Record<string, unknown>)[field] : val;
          }
          body = b;
        }
        let ok = false;
        try { ok = await driver.post(PLAN_ENDPOINTS[step.to], body); } catch { ok = false; }
        if (!ok) return { flow: failFlow(step.else ?? 'save-failed', step.id) };
        st.saved++;
        hook.afterPost(vars, st);
        return { flow: 'next' };
      }
      case 'repeat': {
        const max = Math.min(step.max, lim.repeat);
        for (let i = 0; i < max; i++) {
          const f = await runList(step.steps, i, false);
          if (f === 'break') return { flow: 'next' };
          if (f !== 'next') return { flow: f };
        }
        return step.onMax ? { flow: failFlow(step.onMax, step.id), matched: 'max' } : { flow: 'next', matched: 'max' };
      }
      case 'stopIf': {
        if (step.when.counterAtEnd) {
          const e = hook.atEnd(vars, st);
          if (e.failure) return { flow: failFlow(e.failure, step.id), matched: 'counterAtEnd' };
          return e.stop ? { flow: 'break', matched: 'counterAtEnd' } : { flow: 'next' };
        }
        const r = await driver.probe(need(), conds([step.when]));
        return r && holds(step.when, 0, r) ? { flow: 'break', matched: kindOf(step.when) } : { flow: 'next' };
      }
      case 'go':
        return { flow: { go: step.to } };
      case 'fail':
        return { flow: failFlow(step.code, step.id) };
    }
  }

  async function runList(steps: Step[], iter: number, top: boolean): Promise<Flow> {
    let i = 0;
    while (i < steps.length) {
      const step = steps[i];
      cur = step.id;
      if (++executed > lim.steps) return failFlow('plan-failed', step.id);
      if (driver.now() - start > lim.runMs) return failFlow('plan-failed', step.id);
      const t0 = driver.now();
      const r = await exec(step, iter);
      if (trace.length < MAX_TRACE) trace.push({ stepId: step.id, ...(r.matched ? { matched: r.matched } : {}), ms: driver.now() - t0 });
      const f = r.flow;
      if (f === 'next') { i++; continue; }
      if (typeof f === 'object' && 'go' in f && top) {
        const at = steps.findIndex(s => s.id === f.go);
        if (at < 0) return failFlow('plan-failed', step.id);
        i = at;
        continue;
      }
      return f;
    }
    return 'next';
  }

  try {
    const f = await runList(plan.steps, 0, true);
    if (typeof f === 'object' && 'fail' in f) { failure = f.fail; failedStep = f.step; }
    if (!failure && !dry && st.cards >= MAX_CARDS && st.saved < st.total) failure = 'ended-early';
  } catch (e) {
    failure = planErrorCode(e);
    failedStep = cur;
  } finally {
    await driver.closeAll().catch(() => {});
  }
  const counts = { images: st.images, named: st.named, mismatched: st.mismatched };
  const extra = { runner: `plan v${version}`, ...(failedStep ? { step: failedStep } : {}), trace };
  // A dry run saves nothing, so "done" means it ran to the end (or its first skipped fill) without a failure.
  if (dry && !failure) return { status: 'done', result: { cards: st.cards, saved: 0, opened: st.opened, ...counts, ...extra, dryRun: true } };
  const base = egiftReport(st.cards, st.saved, failure as EgiftFailure | null, st.opened, counts);
  return { status: base.status, result: { ...base.result, ...extra, ...(dry ? { dryRun: true as const } : {}) } };
}
