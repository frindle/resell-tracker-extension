// The plan interpreter on a fake tab driver. Every value is made up.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUNDLED_PLANS } from '../src/lib/stepPlan.ts';
import type { ClickSpec, Cond, FillSpec, Plan, ProbeReq, ProbeRes, ReadRes, ReadSpec } from '../src/lib/stepPlan.ts';
import { runPlan, type TabDriver, type PlanReport, type Watcher } from '../src/lib/planRun.ts';
import { egiftPostBody, egiftReport } from '../src/lib/egiftCommand.ts';

const PLAN = BUNDLED_PLANS!.plans.costcoEgift as Plan;
const LINK = 'https://www.memberedelivery.com/redeem?login=fake-login-token';
const EMAIL = 'fake-buyer@example.com';
const inputs = { link: LINK, email: EMAIL, orderId: 7 };

type Page = { sel: string[]; clickables: string[]; labels: Record<string, string>; alert?: boolean; botCheck?: boolean; counter?: string; text?: string; titles?: string[] };

interface Scenario {
  start: 'email' | 'list' | 'cards' | 'blank' | 'bot';
  total: number;
  /** how Access eGift opens the cards */
  open?: 'new-tab' | 'same-tab' | 'blocked';
  rejectEmail?: boolean;
  skipTo?: { after: number; jump: number };
  noNextAfter?: number;
  failPostAt?: number;
  noShot?: boolean;
  denyAccess?: boolean;
  titles?: string[];
}

class Fake implements TabDriver {
  clock = 0;
  calls: string[] = [];
  posts: unknown[] = [];
  fills: string[] = [];
  closed = false;
  pages = new Map<number, Page>();
  idx = new Map<number, number>();
  created: number[] = [];
  nextId = 1;
  kept = false;
  sc: Scenario;
  constructor(sc: Scenario) { this.sc = sc; }

  cardPage(tab: number, n: number): Page {
    this.idx.set(tab, n);
    return {
      sel: ['#wdt-page-counter'], clickables: ['Next'],
      labels: { 'Code:': `FAKE-CODE-${n}`, 'PIN:': `FAKE${n}` }, counter: `${n} of ${this.sc.total}`,
      text: `Code: FAKE-CODE-${n} PIN: FAKE${n} Fake value $25.00 ${n} of ${this.sc.total}`,
    };
  }
  listPage(): Page {
    const t = this.sc.titles ?? Array.from({ length: this.sc.total }, () => 'Fakemart eGift $25.00');
    return { sel: [], clickables: ['Access eGift'], labels: {}, titles: t };
  }
  async open(url: string) {
    this.calls.push('open');
    const id = this.nextId++;
    const s = this.sc.start;
    this.pages.set(id, s === 'email' ? { sel: ['#p2'], clickables: ['View Digital Code'], labels: {} }
      : s === 'list' ? this.listPage() : s === 'cards' ? this.cardPage(id, 1)
      : s === 'bot' ? { sel: [], clickables: [], labels: {}, botCheck: true } : { sel: [], clickables: [], labels: {} });
    assert.ok(url.startsWith('https://www.memberedelivery.com/'));
    return id;
  }
  watch(): Watcher { return { portal: async () => [...this.created], stop: () => {} }; }
  adopt() { this.calls.push('adopt'); }
  async probe(tab: number, req: ProbeReq): Promise<ProbeRes | null> {
    const p = this.pages.get(tab);
    if (!p) return null;
    const hit = (c: Cond) =>
      c.exists !== undefined ? p.sel.some(s => c.exists!.includes(s))
      : c.clickable !== undefined ? p.clickables.some(x => x.toLowerCase().includes(c.clickable!.toLowerCase()))
      : c.label !== undefined ? c.label in p.labels : c.alert ? !!p.alert : false;
    return { hits: req.conds.map(hit), labels: req.conds.map(c => (c.label !== undefined ? p.labels[c.label] ?? null : null)), alert: !!p.alert, botCheck: !!p.botCheck };
  }
  async click(tab: number, spec: ClickSpec): Promise<'ok' | 'none' | 'denied'> {
    this.calls.push(`click:${spec.clickable ?? 'next'}`);
    const p = this.pages.get(tab);
    if (spec.clickable === 'Access eGift') {
      if (this.sc.denyAccess) return 'denied';
      const mode = this.sc.open ?? 'new-tab';
      if (mode === 'new-tab') { const id = this.nextId++; this.pages.set(id, this.cardPage(id, 1)); this.created.push(id); }
      else if (mode === 'same-tab' || this.kept) this.pages.set(tab, this.cardPage(tab, 1));
      return 'ok';
    }
    const n = this.idx.get(tab) ?? 0;
    if (this.sc.noNextAfter === n || !p) return 'none';
    const to = this.sc.skipTo && this.sc.skipTo.after === n ? this.sc.skipTo.jump : n + 1;
    this.pages.set(tab, this.cardPage(tab, to));
    return 'ok';
  }
  async fill(tab: number, _s: FillSpec, value: string) {
    this.calls.push('fill');
    this.fills.push(value);
    this.pages.set(tab, this.sc.rejectEmail ? { sel: ['#p2'], clickables: [], labels: {}, alert: true } : this.listPage());
    return true;
  }
  async read(tab: number, spec: ReadSpec): Promise<ReadRes | null> {
    this.calls.push('read');
    const p = this.pages.get(tab);
    if (!p) return null;
    const fields: Record<string, string | null> = {};
    for (const [k, f] of Object.entries(spec.fields ?? {})) {
      fields[k] = f.label ? p.labels[f.label] ?? null : f.selector === 'body' ? p.text ?? null : f.selector?.includes('counter') ? p.counter ?? null : null;
    }
    return { fields, all: spec.all ? p.titles ?? [] : [] };
  }
  async shoot() { this.calls.push('shoot'); return this.sc.noShot ? null : 'FAKE-IMAGE-DATA'; }
  async post(path: string, body: unknown) {
    this.calls.push('post');
    assert.equal(path, '/api/extension/egift');
    this.posts.push(body);
    return this.sc.failPostAt !== this.posts.length;
  }
  async keepInTab() { this.calls.push('keepInTab'); this.kept = true; }
  async closeAll() { this.closed = true; }
  async sleep(ms: number) { this.clock += ms; }
  now() { return this.clock; }
}

const run = async (sc: Scenario, opts: { dryRun?: boolean } = {}) => {
  const d = new Fake(sc);
  const r = await runPlan('costcoEgift', PLAN, 1, d, inputs, opts);
  return { d, r };
};
const strip = (r: PlanReport) => { const { runner, trace, step, dryRun, ...rest } = r.result; return { status: r.status, result: rest }; };
const noSecrets = (r: PlanReport) => {
  const s = JSON.stringify(r);
  for (const bad of ['FAKE-CODE', 'FAKE1', 'FAKE-IMAGE', 'fake-login', 'fake-buyer', 'memberedelivery']) assert.equal(s.includes(bad), false, bad);
};

test('happy path, new tab: three cards, same report as the built-in runner', async () => {
  const { d, r } = await run({ start: 'email', total: 3 });
  assert.deepEqual(strip(r), egiftReport(3, 3, null, 'new-tab', { images: 3, named: 3, mismatched: 0 }));
  assert.equal(r.result.runner, 'plan v1');
  assert.deepEqual(d.fills, [EMAIL]);
  assert.equal(d.posts.length, 3);
  assert.deepEqual(d.posts[0], egiftPostBody(7, { index: 1, total: 3, code: 'FAKE-CODE-1', pin: 'FAKE1', value: 25 }, { title: { merchant: 'Fakemart', value: 25 }, image: 'FAKE-IMAGE-DATA' }));
  assert.equal(d.closed, true);
  assert.deepEqual(r.result.trace.map(t => t.stepId).slice(0, 7), ['open', 'first', 'email', 'list', 'titles', 'access', 'cardWait']);
  assert.equal(r.result.trace.find(t => t.stepId === 'first')?.matched, 'any[2]:exists');
  noSecrets(r);
});

test('no email form: the list page first; cards already showing are read in the same tab', async () => {
  const a = await run({ start: 'list', total: 2 });
  assert.equal(a.r.status, 'done');
  assert.equal(a.d.fills.length, 0);
  const b = await run({ start: 'cards', total: 2 });
  assert.deepEqual(strip(b.r), egiftReport(2, 2, null, 'same-tab', { images: 2, named: 0, mismatched: 0 }));
  assert.ok(!b.d.calls.includes('click:Access eGift'));
});

test('a card page in the same tab, and a blocked new tab retried with keepInTab', async () => {
  const same = await run({ start: 'list', total: 1, open: 'same-tab' });
  assert.equal(same.r.result.opened, 'same-tab');
  const blocked = await run({ start: 'list', total: 2, open: 'blocked' });
  assert.deepEqual(strip(blocked.r), egiftReport(2, 2, null, 'kept-in-tab', { images: 2, named: 2, mismatched: 0 }));
  assert.deepEqual(blocked.d.calls.filter(c => c === 'keepInTab' || c === 'click:Access eGift'), ['click:Access eGift', 'keepInTab', 'click:Access eGift']);
});

test('email rejected', async () => {
  const { r, d } = await run({ start: 'email', total: 1, rejectEmail: true });
  assert.deepEqual(strip(r), egiftReport(0, 0, 'email-rejected', undefined, { images: 0, named: 0, mismatched: 0 }));
  assert.equal(r.result.step, 'list');
  assert.equal(d.closed, true);
});

test('page timeout, and the email form that never answers', async () => {
  const blank = await run({ start: 'blank', total: 1 });
  assert.equal(blank.r.result.error, 'page-timeout');
  assert.equal(blank.r.result.step, 'first');
  const never = new Fake({ start: 'email', total: 1 });
  never.fill = async tab => { never.calls.push('fill'); never.pages.set(tab, { sel: ['#p2'], clickables: [], labels: {} }); return true; };
  const r = await runPlan('costcoEgift', PLAN, 1, never, inputs);
  assert.equal(r.result.error, 'email-no-response');
});

test('bot check fails as bot-check', async () => {
  const { r } = await run({ start: 'bot', total: 1 });
  assert.equal(r.result.error, 'bot-check');
  assert.equal(r.result.trace.at(-1)?.matched, 'botCheck');
});

test('out of sequence and total mismatch', async () => {
  const seq = await run({ start: 'cards', total: 4, skipTo: { after: 1, jump: 3 } });
  assert.equal(seq.r.status, 'failed');
  assert.equal(seq.r.result.error, 'out-of-sequence');
  assert.equal(seq.r.result.cards, 1);
  assert.equal(seq.r.result.saved, 1);
  const tot = new Fake({ start: 'cards', total: 3 });
  const orig = tot.cardPage.bind(tot);
  tot.cardPage = (tab, n) => { const p = orig(tab, n); if (n === 2) p.counter = '2 of 5', p.text = p.text!.replace('2 of 3', '2 of 5'); return p; };
  const r = await runPlan('costcoEgift', PLAN, 1, tot, inputs);
  assert.equal(r.result.error, 'total-mismatch');
  assert.equal(r.result.saved, 1);
});

test('the pager ends early; the tab-less Next button', async () => {
  const { r } = await run({ start: 'cards', total: 3, noNextAfter: 2 });
  assert.equal(r.result.error, 'ended-early');
  assert.equal(r.result.cards, 2);
  assert.equal(r.result.saved, 2);
  const stuck = new Fake({ start: 'cards', total: 3 });
  stuck.click = async () => 'ok';  // Next does nothing: the page never shows a new code
  const s = await runPlan('costcoEgift', PLAN, 1, stuck, inputs);
  assert.equal(s.result.error, 'ended-early');
});

test('save failed stops the run with the earlier cards counted', async () => {
  const { r, d } = await run({ start: 'cards', total: 3, failPostAt: 2 });
  assert.equal(r.result.error, 'save-failed');
  assert.equal(r.result.cards, 2);
  assert.equal(r.result.saved, 1);
  assert.equal(d.posts.length, 2);
});

test('a card without a photo or a title still saves; a title/amount disagreement is counted', async () => {
  const a = await run({ start: 'cards', total: 2, noShot: true });
  assert.deepEqual(strip(a.r), egiftReport(2, 2, null, 'same-tab', { images: 0, named: 0, mismatched: 0 }));
  const b = await run({ start: 'list', total: 2, titles: ['Fakemart eGift $50.00', 'Fakemart eGift $25.00'] });
  assert.equal(b.r.result.mismatched, 1);
  assert.equal(b.r.result.named, 2);
});

test('MAX_CARDS: a pager that does not end fails as ended-early after 50 cards', async () => {
  const { r } = await run({ start: 'cards', total: 80 });
  assert.equal(r.result.cards, 50);
  assert.equal(r.result.error, 'ended-early');
});

test('dryRun skips fill, post and shoot and reports the trace', async () => {
  const email = await run({ start: 'email', total: 2 }, { dryRun: true });
  assert.equal(email.r.status, 'done');
  assert.equal(email.r.result.dryRun, true);
  assert.equal(email.d.calls.includes('fill'), false);
  assert.deepEqual(email.r.result.trace.map(t => t.stepId), ['open', 'first', 'email']);
  const cards = await run({ start: 'list', total: 2 }, { dryRun: true });
  assert.equal(cards.r.status, 'done');
  assert.equal(cards.r.result.cards, 2);
  assert.equal(cards.r.result.saved, 0);
  for (const c of ['fill', 'post', 'shoot']) assert.equal(cards.d.calls.includes(c), false, c);
  assert.equal(cards.r.result.trace.filter(t => t.matched === 'skipped').length, 4);
  noSecrets(cards.r);
});

test('a denylisted click is refused and reported', async () => {
  const { r, d } = await run({ start: 'list', total: 2, denyAccess: true });
  assert.equal(r.result.error, 'click-denied');
  assert.equal(r.result.step, 'access');
  assert.equal(d.posts.length, 0);
});

test('a link off the plan hosts is never opened', async () => {
  const d = new Fake({ start: 'email', total: 1 });
  const r = await runPlan('costcoEgift', PLAN, 1, d, { ...inputs, link: 'https://evil.example.com/?login=x' });
  assert.equal(r.result.error, 'link-rejected');
  assert.equal(d.calls.includes('open'), false);
});

test('budgets: a plan with a low step limit stops; a thrown error gets a coded failure, no text', async () => {
  const low: Plan = { ...PLAN, limits: { ...PLAN.limits, steps: 5 } };
  const a = await runPlan('costcoEgift', low, 1, new Fake({ start: 'cards', total: 3 }), inputs);
  assert.equal(a.result.error, 'plan-failed');
  const d = new Fake({ start: 'cards', total: 3 });
  d.shoot = async () => { throw new Error(`Cannot access contents of url ${LINK}`); };
  // shoot errors are swallowed (a missing photo never fails a card); a failing post throws through
  d.read = async () => { throw new Error(`Cannot access contents of url ${LINK}`); };
  const r = await runPlan('costcoEgift', PLAN, 1, d, inputs);
  assert.equal(r.result.error, 'plan-error-permission');
  assert.equal(JSON.stringify(r).includes('memberedelivery'), false);
});
