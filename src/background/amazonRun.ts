// Wires the Sync now controller to real Chrome tabs. Started by a user click
// (the popup button, or the tracker's Sync Amazon button), which uses one
// visible tab, or by the tracker's TRACK_AMAZON command, which uses one tab in
// a minimized window that closes when done (left open on a block page). Real
// navigation only; never fetch().
import { createSyncRunner, formatRunSummary, type PageOutcome, type RunDeps } from '../lib/syncRun';
import { saveRun, reportRun } from './amazonCapture';

const WAIT_MS = 30000;
const pending = new Map<number, (o: PageOutcome) => void>();
const early = new Map<number, PageOutcome>();
let runTabId: number | null = null;
// Tracking runs: the minimized window, and whether pages may fill tracking.
let background = false;
let runWindowId: number | null = null;

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

function expect(tabId: number): Promise<PageOutcome> {
  return new Promise<PageOutcome>(resolve => {
    const done = (o: PageOutcome) => { clearTimeout(t); pending.delete(tabId); resolve(o); };
    const t = setTimeout(() => done({ kind: 'timeout' }), WAIT_MS);
    pending.set(tabId, done);
    const e = early.get(tabId);
    if (e) { early.delete(tabId); done(e); }
  });
}

/** Called by the capture / blocked message handlers. Only the run's own tab counts. */
export function isRunTab(tabId: number | undefined): boolean {
  return tabId !== undefined && tabId === runTabId;
}

export function notifyOutcome(tabId: number | undefined, outcome: PageOutcome) {
  if (!isRunTab(tabId)) return;
  const p = pending.get(tabId!);
  if (p) p(outcome); else early.set(tabId!, outcome);
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
  const out = await keepAwake(() => runner.run());
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

/** True while a tracking run owns this tab: its pages may fill a blank tracking number. */
export function isTrackRunTab(tabId: number | undefined): boolean {
  return background && isRunTab(tabId);
}

export function amazonRunActive(): boolean { return runner.isRunning(); }
