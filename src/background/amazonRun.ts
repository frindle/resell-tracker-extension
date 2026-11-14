// Wires the Sync now controller to real Chrome tabs. Started only by a user
// click: the popup button, or the tracker's Sync Amazon button (a queued
// command). Uses one visible tab and real navigation; never fetch().
import { createSyncRunner, formatRunSummary, type PageOutcome, type RunDeps } from '../lib/syncRun';
import { saveRun, reportRun } from './amazonCapture';

const WAIT_MS = 30000;
const pending = new Map<number, (o: PageOutcome) => void>();
const early = new Map<number, PageOutcome>();
let runTabId: number | null = null;

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
    const tab = await chrome.tabs.create({ url, active: true });
    if (!tab.id) throw new Error('could not open a tab');
    runTabId = tab.id;
    early.delete(tab.id);
    waiter = expect(tab.id);
    return tab.id;
  },
  async navigate(tabId, url) {
    early.delete(tabId);
    waiter = expect(tabId);
    await chrome.tabs.update(tabId, { url, active: true });
  },
  async waitForOutcome() { return waiter ?? { kind: 'timeout' }; },
  async closeTab(tabId) { await chrome.tabs.remove(tabId); },
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
  const out = await runner.run();
  runTabId = null;
  if ('started' in out) return { started: false, reason: out.reason };
  const text = formatRunSummary(out);
  await saveRun(text, out.status);
  await reportRun({ ...out, text });
  return { ...out, text };
}

export function amazonRunActive(): boolean { return runner.isRunning(); }
