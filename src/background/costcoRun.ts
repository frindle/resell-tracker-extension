import {
  COSTCO_APP_ID, COSTCO_SIGN_IN_MESSAGE, COSTCO_TIMEOUT_MESSAGE, isCostcoUrl, judgeDeadline, judgeTab, mapOrderDetails, noDetailsMessage,
  type CostcoOrderDetails, type CostcoOrderRow, type CostcoOutcome, type TabLook,
} from '../lib/costcoCommand';

// Costco commands that run with nobody at the browser. Each run opens its own
// background tab, always closes it, never waits without a limit, and says so
// plainly when Costco wants a sign-in (the person signs in to costco.com in
// this browser; the tracker backs its automatic sync off meanwhile).
//
// Costco's data is only readable from Costco's own in-page calls (a request we
// build ourselves is refused), so both commands let the page make its calls and
// read what the interceptor (content/costco-interceptor.ts) kept on `window`.

const ORDERS_URL = 'https://www.costco.com/myaccount/';
/** How long the page gets to show it is signed in before the run gives up. */
const READY_WAIT_MS = 45_000;
/** The whole list sync, from tab open to report. */
const SYNC_TIMEOUT_MS = 4 * 60_000;
/** One order's details page. */
const DETAIL_WAIT_MS = 20_000;
/** All order lookups in one command. */
const ORDERS_TIMEOUT_MS = 5 * 60_000;
const DETAIL_DELAY_MS = 500;
const POLL_MS = 500;

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const MAIN = 'MAIN' as const;

// One Costco run at a time. The flag is taken before the caller's first await,
// so two polls that fetched the same command cannot both start it. The caller
// releases it when the command is finished (all exit paths), not the run.
// Until the start-up sweep of a cut-short run is over, nothing may start: the
// sweep reads the same stored record a new run writes.
let active = false;
let sweeping = true;
let currentCommandId: number | null = null;

export function claimCostcoRun(commandId: number): boolean {
  if (active || sweeping) return false;
  active = true;
  currentCommandId = commandId;
  return true;
}
export function releaseCostcoRun(): void {
  active = false;
  currentCommandId = null;
}

// The browser stops an idle background worker after 30 seconds, which would
// strand the tab and leave the tracker's command "running". A run keeps the
// worker awake and records the run (command, tab, start time) so a restarted
// worker can close the tab and fail the command. Kept in local storage, not
// session storage, because session storage is wiped by a full browser restart.
const RUN_TAB_KEY = 'costcoRunTab';
const KEEPALIVE_MS = 20_000;
const store = () => chrome.storage.local;

type RunRecord = { commandId?: number | null; tabId?: number; startedAt?: number };

async function rememberRunTab(tabId: number) {
  const rec: RunRecord = { commandId: currentCommandId, tabId, startedAt: Date.now() };
  try { await store().set({ [RUN_TAB_KEY]: rec }); } catch { /* best-effort */ }
}
async function forgetRunTab() {
  try { await store().remove(RUN_TAB_KEY); } catch { /* best-effort */ }
}
async function keepAwake<T>(work: () => Promise<T>): Promise<T> {
  const t = setInterval(() => { chrome.runtime.getPlatformInfo().catch(() => {}); }, KEEPALIVE_MS);
  try { return await work(); } finally { clearInterval(t); await forgetRunTab(); }
}

/**
 * On worker start: closes the Costco tab of a run the browser cut short and
 * returns that run's command id (so the caller can mark it failed). Runs may
 * not start until this is done.
 */
export async function closeOrphanCostcoTab(): Promise<number | null> {
  try {
    const got = await store().get(RUN_TAB_KEY);
    const rec = got[RUN_TAB_KEY] as RunRecord | undefined;
    if (!rec) return null;
    await store().remove(RUN_TAB_KEY);
    if (typeof rec.tabId === 'number') {
      // Only a costco.com page: a stored id can name some other tab after a browser restart.
      const tab = await chrome.tabs.get(rec.tabId).catch(() => null);
      if (tab && isCostcoUrl(tab.url)) await chrome.tabs.remove(rec.tabId).catch(() => {});
    }
    return typeof rec.commandId === 'number' ? rec.commandId : null;
  } catch { return null; } finally { sweeping = false; }
}

async function openTab(): Promise<number> {
  // Not active and no window of its own: it should not pull focus from whatever is open.
  const tab = await chrome.tabs.create({ url: ORDERS_URL, active: false });
  if (tab.id == null) throw new Error('could not open a tab');
  await rememberRunTab(tab.id);
  return tab.id;
}

function closeTab(tabId: number | undefined) {
  if (tabId != null) chrome.tabs.remove(tabId).catch(() => {});
}

async function inPage<T>(tabId: number, func: (...a: never[]) => T, args: unknown[] = []): Promise<T | null> {
  try {
    const r = await chrome.scripting.executeScript({ target: { tabId }, world: MAIN, func: func as never, args: args as never });
    return (r[0]?.result as T) ?? null;
  } catch { return null; }
}

async function look(tabId: number): Promise<TabLook> {
  let url = '';
  try { url = (await chrome.tabs.get(tabId)).url ?? ''; } catch { /* tab gone */ }
  const state = await inPage(tabId, () => {
    const w = window as unknown as Record<string, unknown>;
    return {
      hasAuth: !!w.__costcoAuth,
      orderPages: ((w.__costcoAllOrders as unknown[]) ?? []).length,
      listSeen: !!w.__costcoListSeen,
    };
  });
  return { url, hasAuth: !!state?.hasAuth, orderPages: state?.orderPages ?? 0, listSeen: !!state?.listSeen };
}

/**
 * Waits for Costco's own app to show it is signed in (it loads the order list,
 * which may be empty). Past the deadline only a sign-in address means signed
 * out; any other page is just slow, which must not make the tracker back off.
 */
async function waitReady(tabId: number, timeoutMs = READY_WAIT_MS): Promise<'ready' | 'signed-out' | 'timeout'> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const verdict = judgeTab(await look(tabId));
    if (verdict !== 'wait') return verdict;
    await sleep(POLL_MS);
  }
  const last = await look(tabId);
  // The list may have arrived during that last look.
  return judgeTab(last) === 'ready' ? 'ready' : judgeDeadline(last);
}

// ── SYNC_COSTCO: the content script does the sync; this waits for its report ──

const waiting = new Map<number, (o: CostcoOutcome) => void>();

/** Called for every SYNC_DONE / SYNC_ERROR the background hears. Ignores tabs that are not ours. */
export function noteCostcoMessage(tabId: number | undefined, message: { type?: string; result?: unknown; error?: unknown }): void {
  if (tabId == null) return;
  const settle = waiting.get(tabId);
  if (!settle) return;
  if (message.type === 'SYNC_DONE') settle({ kind: 'done', result: (message.result ?? {}) as Record<string, unknown> });
  else if (message.type === 'SYNC_ERROR') settle({ kind: 'error', message: String(message.error ?? 'run failed') });
}

chrome.tabs.onRemoved.addListener(tabId => {
  waiting.get(tabId)?.({ kind: 'error', message: 'tab closed before scan finished' });
});

function expectReport(tabId: number, timeoutMs: number): Promise<CostcoOutcome> {
  return new Promise(resolve => {
    const timer = setTimeout(() => finish({ kind: 'error', message: 'Costco sync timed out' }), timeoutMs);
    function finish(o: CostcoOutcome) {
      clearTimeout(timer);
      waiting.delete(tabId);
      resolve(o);
    }
    waiting.set(tabId, finish);
  });
}

/** The list sync (SYNC_COSTCO). Resolves to an outcome; never throws, never hangs. */
export function runCostcoSync(): Promise<CostcoOutcome> {
  return keepAwake(syncOnce);
}

async function syncOnce(): Promise<CostcoOutcome> {
  let tabId: number | undefined;
  try {
    tabId = await openTab();
    const ready = await waitReady(tabId);
    if (ready === 'timeout') return { kind: 'timeout', message: COSTCO_TIMEOUT_MESSAGE };
    if (ready !== 'ready') return { kind: 'error', message: COSTCO_SIGN_IN_MESSAGE };
    const report = expectReport(tabId, SYNC_TIMEOUT_MS);
    const alive = await chrome.tabs.sendMessage(tabId, { type: 'PING' }).catch(() => null);
    if (!alive) await chrome.scripting.executeScript({ target: { tabId }, files: ['content/costco.js'] });
    await chrome.tabs.sendMessage(tabId, { type: 'START_SYNC', platform: 'Costco' });
    return await report;
  } catch (e) {
    return { kind: 'error', message: String(e).slice(0, 200) };
  } finally {
    if (tabId != null) waiting.delete(tabId);
    closeTab(tabId);
  }
}

// ── SYNC_COSTCO_ORDER: details for named orders, read off the page's own calls ──

export type OrdersRead =
  | { kind: 'rows'; rows: CostcoOrderRow[]; timedOut: number; skipped: number; deferred: number }
  | { kind: 'error'; message: string };

/**
 * Opens each order's details page (by changing the page's own route, so
 * Costco's app asks for it) and reads the getOrderDetails answer the
 * interceptor kept. Same job as the sidecar's syncCostcoOrders.
 */
export function readCostcoOrders(orderNumbers: readonly string[]): Promise<OrdersRead> {
  return keepAwake(() => readOnce(orderNumbers));
}

async function readOnce(orderNumbers: readonly string[]): Promise<OrdersRead> {
  let tabId: number | undefined;
  try {
    tabId = await openTab();
    const ready = await waitReady(tabId);
    if (ready === 'timeout') return { kind: 'error', message: COSTCO_TIMEOUT_MESSAGE };
    if (ready !== 'ready') return { kind: 'error', message: COSTCO_SIGN_IN_MESSAGE };
    const appId = (await inPage(tabId, () => {
      const m = /^#\/app\/([^/]+)\//.exec(location.hash || '');
      return m ? m[1] : null;
    })) || COSTCO_APP_ID;

    const deadline = Date.now() + ORDERS_TIMEOUT_MS;
    const rows: CostcoOrderRow[] = [];
    let timedOut = 0;
    let skipped = 0;
    // Orders never tried because the overall time ran out; the tracker re-queues missing details itself.
    let deferred = 0;
    for (let i = 0; i < orderNumbers.length; i++) {
      if (Date.now() >= deadline) { deferred = orderNumbers.length - i; break; }
      if (i > 0) await sleep(DETAIL_DELAY_MS);
      const n = orderNumbers[i];
      await inPage(tabId, ((h: string) => { location.hash = h; }) as never, [`#/app/${appId}/orderdetails/${n}`]);
      const found = await waitForDetails(tabId, n);
      if (found === 'signed-out') return { kind: 'error', message: COSTCO_SIGN_IN_MESSAGE };
      if (!found) { timedOut++; continue; }
      const row = mapOrderDetails(found);
      if (row) rows.push(row); else skipped++;
    }
    if (!rows.length && timedOut) return { kind: 'error', message: noDetailsMessage(timedOut, skipped, deferred) };
    return { kind: 'rows', rows, timedOut, skipped, deferred };
  } catch (e) {
    return { kind: 'error', message: String(e).slice(0, 200) };
  } finally {
    closeTab(tabId);
  }
}

async function waitForDetails(tabId: number, orderNumber: string): Promise<CostcoOrderDetails | 'signed-out' | null> {
  const end = Date.now() + DETAIL_WAIT_MS;
  while (Date.now() < end) {
    const o = await inPage(tabId, ((k: string) => ((window as unknown as Record<string, Record<string, unknown>>).__costcoOrderDetails ?? {})[k] ?? null) as never, [orderNumber]);
    if (o) return o as CostcoOrderDetails;
    if (judgeTab(await look(tabId)) === 'signed-out') return 'signed-out';
    await sleep(POLL_MS);
  }
  return null;
}
