// Wires the Sync now controller to real Chrome tabs. Started by a user click
// (the popup button, or the tracker's Sync Amazon button), which uses one
// visible tab, or by the tracker's TRACK_AMAZON command, which uses one tab in
// a minimized window that closes when done (left open on a block page). Real
// navigation only; never fetch().
import { createSyncRunner, formatRunSummary, type PageOutcome, type RunDeps } from '../lib/syncRun';
import { saveRun, reportRun, fetchVisitPlan } from './amazonCapture';
import type { Visit } from '../lib/syncRun';
import { createPokeJudge, shouldForce, shouldForceAny, isStaleOutcome, POKE_FIRST_MS, POKE_EVERY_MS } from '../lib/capturePoke';

import { getScrape } from '../lib/scrapeConfig';

const waitMs = () => getScrape('amazon').timeoutsMs.runWaitMs;
const pending = new Map<number, (o: PageOutcome, pageId?: string) => void>();
const early = new Map<number, { outcome: PageOutcome; pageId?: string }>();
let runTabId: number | null = null;
// Tracking runs: the minimized window, and whether pages may fill tracking.
let background = false;
// Runs that follow Track package links: their pages may fill a blank tracking number.
let fillsTracking = false;
let runWindowId: number | null = null;
// The page the run's tab showed last, so its late answers are not taken for the next page's.
let lastPageId: string | null = null;
// The page that has sent something during the current wait (known before it answers an ask).
let seenPageId: string | null = null;

// The browser stops an idle background worker after 30 seconds, which used to
// end a run half way and leave its tab open. A run keeps the worker awake, and
// records its tab so a restarted worker can still close it.
const RUN_TAB_KEY = 'amazonRunTab';
const KEEPALIVE_MS = 20000;
const store = () => chrome.storage.session ?? chrome.storage.local;

async function rememberRunTab(tabId: number, windowId: number | null) {
  try { await store().set({ [RUN_TAB_KEY]: { tabId, windowId } }); } catch { /* best-effort */ }
}
async function forgetRunTab() {
  try { await store().remove(RUN_TAB_KEY); } catch { /* best-effort */ }
}
async function keepAwake<T>(work: () => Promise<T>): Promise<T> {
  const t = setInterval(() => { chrome.runtime.getPlatformInfo().catch(() => {}); }, KEEPALIVE_MS);
  try { return await work(); } finally { clearInterval(t); await forgetRunTab(); }
}

/** On worker start: closes the tab of a run the browser cut short. */
export async function closeOrphanRunTab() {
  if (runner.isRunning()) return;
  try {
    const got = await store().get(RUN_TAB_KEY);
    const rec = got[RUN_TAB_KEY] as { tabId?: number; windowId?: number | null } | undefined;
    if (!rec) return;
    await forgetRunTab();
    if (typeof rec.windowId === 'number') await chrome.windows.remove(rec.windowId).catch(() => {});
    else if (typeof rec.tabId === 'number') await chrome.tabs.remove(rec.tabId).catch(() => {});
    await saveRun('stopped early; tab closed', 'error');
  } catch { /* best-effort */ }
}

// Waits for the page in the run's tab to be read. The page's own "settled"
// timer is slowed by the browser while the tab is hidden, so the worker asks
// the page itself (lib/capturePoke.ts) until an outcome arrives or time is up.
function expect(tabId: number): Promise<PageOutcome> {
  return new Promise<PageOutcome>(resolve => {
    const started = Date.now();
    const judge = createPokeJudge(lastPageId);
    seenPageId = null;
    let settled = false;
    let poke: ReturnType<typeof setTimeout> | null = null;
    const done = (o: PageOutcome, pageId?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(t);
      if (poke) clearTimeout(poke);
      if (pending.get(tabId) === done) pending.delete(tabId);
      // Whatever this page still sends (its result can arrive after the wait ended) is not the next page's.
      lastPageId = pageId ?? judge.pageId() ?? seenPageId ?? lastPageId;
      resolve(o);
    };
    const t = setTimeout(() => {
      // Say why: still loading, never answered, or sent but not confirmed.
      chrome.tabs.get(tabId)
        .then(tab => done({ kind: 'timeout', note: tab.status === 'loading' ? 'the tab was still loading' : judge.note() }))
        .catch(() => done({ kind: 'timeout', note: judge.note() }));
    }, waitMs());
    const ask = async () => {
      poke = null;
      let answer: unknown = null;
      // Rejects while the page (or its content script) is not there yet: ask again.
      const elapsed = Date.now() - started;
      try { answer = await chrome.tabs.sendMessage(tabId, { type: 'AMAZON_CAPTURE_NOW', force: shouldForce(elapsed), forceAny: shouldForceAny(elapsed) }); } catch { /* not ready */ }
      if (settled) return;
      const outcome = judge.reply(answer);
      if (outcome) { done(outcome); return; }
      poke = setTimeout(ask, POKE_EVERY_MS);
    };
    poke = setTimeout(ask, POKE_FIRST_MS);
    pending.set(tabId, done);
    const e = early.get(tabId);
    if (e) { early.delete(tabId); done(e.outcome, e.pageId); }
  });
}

/** Called by the capture / blocked message handlers. Only the run's own tab counts. */
export function isRunTab(tabId: number | undefined): boolean {
  return tabId !== undefined && tabId === runTabId;
}

/** A run page started sending: remembers which page it is, in case its result comes after the wait. */
export function notePage(tabId: number | undefined, pageId: unknown) {
  if (isRunTab(tabId) && typeof pageId === 'string' && pageId && !isStaleOutcome(pageId, lastPageId)) seenPageId = pageId;
}

/**
 * pageId: the page the outcome is about, when known. An outcome from the page
 * the tab showed before the current one (its result arrived late) is dropped,
 * so it is never taken for the page now being waited on.
 */
export function notifyOutcome(tabId: number | undefined, outcome: PageOutcome, pageId?: unknown) {
  if (!isRunTab(tabId)) return;
  if (isStaleOutcome(pageId, lastPageId)) return;
  const id = typeof pageId === 'string' && pageId ? pageId : undefined;
  const p = pending.get(tabId!);
  if (p) p(outcome, id); else early.set(tabId!, { outcome, pageId: id });
}

let waiter: Promise<PageOutcome> | null = null;

const deps: RunDeps = {
  async openTab(url) {
    let tab: chrome.tabs.Tab | undefined;
    if (background) {
      try {
        const win = await chrome.windows.create({ url, state: 'minimized', focused: false });
        runWindowId = win?.id ?? null;
        tab = win?.tabs?.[0];
      } catch {
        // Some window managers refuse a minimized window: a background tab instead.
        tab = await chrome.tabs.create({ url, active: false });
      }
    } else {
      tab = await chrome.tabs.create({ url, active: true });
    }
    if (!tab?.id) throw new Error('could not open a tab');
    runTabId = tab.id;
    lastPageId = null;
    early.delete(tab.id);
    waiter = expect(tab.id);
    await rememberRunTab(tab.id, runWindowId);
    return tab.id;
  },
  async navigate(tabId, url) {
    early.delete(tabId);
    waiter = expect(tabId);
    await chrome.tabs.update(tabId, background ? { url } : { url, active: true });
  },
  async waitForOutcome() { return waiter ?? { kind: 'timeout' }; },
  async closeTab(tabId) {
    if (runWindowId !== null) await chrome.windows.remove(runWindowId);
    else await chrome.tabs.remove(tabId);
  },
  sleep: ms => new Promise(r => setTimeout(r, ms)),
  fetchVisits: fetchVisitPlan,
};

chrome.tabs.onRemoved.addListener(tabId => {
  if (tabId === runTabId) {
    notifyOutcome(tabId, { kind: 'error', message: 'tab closed' });
  }
});

const runner = createSyncRunner(deps);

/** Starts one run. Resolves with the summary, or {started:false} when one is already running. */
export async function startAmazonRun(): Promise<Record<string, unknown>> {
  await saveRun('running...', 'running');
  // A click also lets email-triggered visits run again after a block.
  fillsTracking = true;
  let out: Awaited<ReturnType<typeof runner.run>>;
  try { out = await keepAwake(() => runner.run()); } finally { fillsTracking = false; }
  runTabId = null;
  if ('started' in out) return { started: false, reason: out.reason };
  const text = formatRunSummary(out);
  await saveRun(text, out.status);
  await reportRun({ ...out, text });
  return { ...out, text };
}

/**
 * TRACK_AMAZON: tracking for these orders, in a minimized window. Resolves
 * with the summary, or {started:false} when a run is already going.
 */
export async function startTrackingRun(orders: string[]): Promise<Record<string, unknown>> {
  if (runner.isRunning()) return { started: false, reason: 'a sync is already running' };
  background = true;
  runWindowId = null;
  try {
    const out = await keepAwake(() => runner.run({ orders, maxPages: orders.length * 4 }));
    if ('started' in out) return { started: false, reason: out.reason };
    const text = `tracking: ${formatRunSummary(out)}`;
    await saveRun(text, out.status);
    return { ...out, text };
  } finally {
    background = false;
    runWindowId = null;
    runTabId = null;
  }
}

/**
 * VISIT_AMAZON: the orders an Amazon email said need a page, in a minimized
 * window that closes when done (left open on a block page). Resolves with the
 * summary, or {started:false} when another run is going.
 */
export async function startVisitRun(visits: Visit[]): Promise<Record<string, unknown>> {
  if (runner.isRunning()) return { started: false, reason: 'a sync is already running' };
  background = true;
  fillsTracking = true;
  runWindowId = null;
  try {
    const out = await keepAwake(() => runner.run({ visits, maxPages: visits.length * 4 }));
    if ('started' in out) return { started: false, reason: out.reason };
    const text = `email visits: ${formatRunSummary(out)}`;
    await saveRun(text, out.status);
    return { ...out, text };
  } finally {
    background = false;
    fillsTracking = false;
    runWindowId = null;
    runTabId = null;
  }
}

/** True while a tracking run owns this tab: its pages may fill a blank tracking number. */
export function isTrackRunTab(tabId: number | undefined): boolean {
  return (background || fillsTracking) && isRunTab(tabId);
}

export function amazonRunActive(): boolean { return runner.isRunning(); }
