import type { ScrapedOrder } from '../lib/types';
import { ensureTrackerScriptRegistered } from '../lib/tracker-script';

const ICON_PATHS_CHROME = { 16: 'icons/icon16.png', 32: 'icons/icon32.png', 48: 'icons/icon48.png', 128: 'icons/icon128.png' };
const ICON_PATH_FIREFOX = 'icons/icon.svg';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _browser = (globalThis as any).browser;
const extAction = (_browser ?? chrome).action as typeof chrome.action;
const isFirefox = typeof _browser !== 'undefined';
function setToolbarIcon() {
  if (isFirefox) {
    extAction?.setIcon({ path: ICON_PATH_FIREFOX } as Parameters<typeof chrome.action.setIcon>[0]);
  } else {
    extAction?.setIcon({ path: ICON_PATHS_CHROME });
  }
}

setToolbarIcon();
function reregisterTrackerScript() {
  // No-op if the user hasn't granted the optional host permission yet
  // (requesting it needs a user gesture, so that only happens from the
  // options page — see grantTrackerAccess in lib/tracker-script.ts).
  import('../lib/storage').then(m => m.getSettings()).then(({ trackerUrl }) => {
    if (trackerUrl) ensureTrackerScriptRegistered(trackerUrl).catch(() => {});
  }).catch(() => {});
}
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Reselling Tracker] Extension installed.');
  setToolbarIcon();
  chrome.alarms.create('pollCommands', { when: Date.now() + 2000, periodInMinutes: 1 });
  pollAndExecuteCommands().catch(console.error);
  reregisterTrackerScript();
});
chrome.runtime.onStartup.addListener(() => {
  setToolbarIcon();
  chrome.alarms.create('pollCommands', { when: Date.now() + 2000, periodInMinutes: 1 });
  pollAndExecuteCommands().catch(console.error);
  reregisterTrackerScript();
});
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'pollCommands') pollAndExecuteCommands().catch(console.error);
});

const PLATFORM_CONFIG: Record<string, { host: string; url: string; script: string }> = {
  Amazon: { host: 'www.amazon.com', url: 'https://www.amazon.com/your-orders/orders', script: 'content/amazon.js' },
  Walmart: { host: 'www.walmart.com', url: 'https://www.walmart.com/orders', script: 'content/walmart.js' },
  Costco: { host: 'www.costco.com', url: 'https://www.costco.com/myaccount/', script: 'content/costco.js' },
  BigSkyBuyers: { host: 'www.bigskybuyers.com', url: 'https://www.bigskybuyers.com/main', script: 'content/bigskybuyers.js' },
};

// Tabs we opened to do a scrape. We track them so we can:
//   1. Close them automatically when SYNC_DONE / SYNC_ERROR fires.
//   2. Broadcast a SYNC_CANCELLED status if the user closes the tab
//      mid-scrape so the tracker-status banner doesn't hang.
// We never reuse the user's existing retailer tabs for scraping anymore —
// they often have product tabs open in other windows that they're tracking
// and the old "reuse first matching tab in any window" behavior would
// hijack them.
type OpenedScrapeTab = { platform: string; openedAt: number };
const openedScrapeTabs = new Map<number, OpenedScrapeTab>();

async function triggerSyncInBackground(platform: string, activeTabId?: number, activeTabUrl?: string) {
  // Observability for the spurious "scrape didn't open a tab" issue. The
  // failure modes we've suspected — getCurrent() returning the popup window,
  // tabs.create silently failing, the 10s load wait racing the page — none
  // currently leave a trace in the service-worker console. Make every step
  // log so the next reproduction tells us where it died.
  console.log(`[BG] triggerSync ${platform} | activeTabId=${activeTabId} | activeTabUrl=${activeTabUrl ?? '(none)'}`);
  const config = PLATFORM_CONFIG[platform];
  if (!config) { console.warn(`[BG] triggerSync: no config for platform ${platform}`); return; }

  let targetTabId: number | undefined;
  let weOpenedIt = false;

  // If the user's active tab is already on the right host, scrape in place
  // (the user is intentionally there). Otherwise always open a new tab in
  // the current window — never reuse existing retailer tabs in other
  // windows, since those are typically product pages the user is tracking.
  if (activeTabId && activeTabUrl) {
    try {
      if (new URL(activeTabUrl).hostname === config.host) {
        targetTabId = activeTabId;
        console.log(`[BG] triggerSync: reusing active tab ${activeTabId} (host matches)`);
      }
    } catch { /* invalid url */ }
  }

  if (!targetTabId) {
    let currentWindowId: number | undefined;
    try { currentWindowId = (await chrome.windows.getCurrent()).id; } catch (e) { console.warn('[BG] windows.getCurrent failed:', e); }
    if (currentWindowId === undefined) {
      try { currentWindowId = (await chrome.windows.getLastFocused()).id; } catch (e) { console.warn('[BG] windows.getLastFocused failed:', e); }
    }
    console.log(`[BG] triggerSync: opening new tab in window ${currentWindowId ?? '(any)'}`);

    let newTab: chrome.tabs.Tab;
    try {
      newTab = await chrome.tabs.create({ url: config.url, active: true, windowId: currentWindowId });
    } catch (e) {
      console.error(`[BG] triggerSync: tabs.create FAILED for ${platform}`, e);
      return;
    }
    if (!newTab.id) { console.error(`[BG] triggerSync: tabs.create returned no id for ${platform}`); return; }
    targetTabId = newTab.id;
    weOpenedIt = true;
    openedScrapeTabs.set(newTab.id, { platform, openedAt: Date.now() });
    console.log(`[BG] triggerSync: created tab ${targetTabId}, waiting for load…`);

    const loadStart = Date.now();
    const loadResult = await new Promise<'complete' | 'timeout'>(resolve => {
      let tabListener: (tabId: number, info: { status?: string }) => void;
      const timeout = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(tabListener);
        resolve('timeout');
      }, 10000);
      tabListener = (tabId: number, info: { status?: string }) => {
        if (tabId === targetTabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(tabListener);
          clearTimeout(timeout);
          resolve('complete');
        }
      };
      chrome.tabs.onUpdated.addListener(tabListener);
    });
    console.log(`[BG] triggerSync: tab load ${loadResult} after ${Date.now() - loadStart}ms`);
  }

  // Ping to check if content script is already loaded
  const alive = await chrome.tabs.sendMessage(targetTabId, { type: 'PING' }).catch(() => null);
  if (!alive) {
    try {
      await chrome.scripting.executeScript({ target: { tabId: targetTabId }, files: [config.script] });
      console.log(`[BG] triggerSync: injected ${config.script} into tab ${targetTabId}`);
    } catch (e) {
      console.error('[BG] injection failed', e);
      if (weOpenedIt && targetTabId) {
        openedScrapeTabs.delete(targetTabId);
        chrome.tabs.remove(targetTabId).catch(() => {});
      }
      return;
    }
  } else {
    console.log(`[BG] triggerSync: content script already alive in tab ${targetTabId}`);
  }

  chrome.tabs.sendMessage(targetTabId, { type: 'START_SYNC', platform }).then(() => {
    console.log(`[BG] triggerSync: START_SYNC delivered to tab ${targetTabId}`);
  }).catch(e =>
    console.error('[BG] START_SYNC failed', e)
  );
}

// Storage-status keys per platform — used to broadcast SYNC_CANCELLED when
// the user closes a scrape tab mid-flight. Mirrors the lowercased prefix
// used by the content scripts when they write SYNC_STARTED / SYNC_PROGRESS.
const STATUS_KEY_BY_PLATFORM: Record<string, string> = {
  Amazon: 'amazonSyncStatus',
  Walmart: 'walmartSyncStatus',
  Costco: 'costcoSyncStatus',
  BigSkyBuyers: 'bigskySyncStatus',
};

chrome.tabs.onRemoved.addListener(tabId => {
  const opened = openedScrapeTabs.get(tabId);
  if (!opened) return;
  openedScrapeTabs.delete(tabId);
  const key = STATUS_KEY_BY_PLATFORM[opened.platform];
  if (!key) return;
  chrome.storage.local.get(key).then(stored => {
    const current = (stored[key] as { type?: string } | undefined);
    // Only flip to CANCELLED if the scrape was still active. If it already
    // ended (DONE / ERROR) the close was a normal cleanup.
    if (!current || current.type === 'SYNC_STARTED' || current.type === 'SYNC_PROGRESS') {
      chrome.storage.local.set({
        [key]: { type: 'SYNC_ERROR', error: 'tab closed before scan finished', ts: Date.now() },
      }).catch(() => {});
    }
  }).catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ ok: true });
    return;
  }

  // Content scripts forward their console.log/warn here so the scrape
  // transcript survives the tab close. Visible via about:debugging →
  // Inspect on the Reselling Tracker Sync extension's background page.
  if (message.type === 'SCRAPE_LOG') {
    const fn = message.level === 'warn' ? console.warn : console.log;
    fn(...(message.args ?? []));
    return;
  }

  // When a scrape tab we opened finishes, close it. Small delay so the
  // user can see the result toast in the tab before it disappears.
  if (message.type === 'SYNC_DONE' || message.type === 'SYNC_ERROR') {
    const tabId = sender.tab?.id;
    if (tabId != null && openedScrapeTabs.has(tabId)) {
      openedScrapeTabs.delete(tabId);
      setTimeout(() => { chrome.tabs.remove(tabId).catch(() => {}); }, 2000);
    }
    // fall through — no sendResponse expected; content scripts also write
    // status directly to chrome.storage.local for the tracker banner.
  }

  // Tracker-status content script pings this every ~15s while the user is on
  // the tracker UI so queued SYNC_* commands fire well before the next 60s
  // alarm tick. We rate-limit to one real poll per ~10s to avoid hammering.
  if (message.type === 'POLL_COMMANDS_NOW') {
    chrome.storage.local.get('lastForcedPoll').then(({ lastForcedPoll }) => {
      const now = Date.now();
      if (typeof lastForcedPoll === 'number' && now - lastForcedPoll < 10_000) {
        sendResponse({ ok: true, skipped: true });
        return;
      }
      chrome.storage.local.set({ lastForcedPoll: now });
      pollAndExecuteCommands().catch(e => console.error('[BG] forced poll error', e));
      sendResponse({ ok: true, skipped: false });
    });
    return true; // async response
  }

  if (message.type === 'TRIGGER_SYNC') {
    triggerSyncInBackground(message.platform as string, message.activeTabId as number | undefined, message.activeTabUrl as string | undefined).catch(e =>
      console.error('[BG] triggerSyncInBackground error', e)
    );
    sendResponse({ ok: true });
    return;
  }

  if (message.type === 'SET_BADGE') {
    const tabId = sender.tab?.id;
    if (tabId) {
      chrome.action.setBadgeText({ text: message.text, tabId });
      chrome.action.setBadgeBackgroundColor({ color: message.color ?? '#3b82f6', tabId });
    }
  }

  // Content scripts can't make cross-origin fetch without CORS issues since
  // they run with the page's origin. Route API calls through the background
  // service worker which has the chrome-extension:// origin instead.
  if (message.type === 'FETCH_USERS') {
    handleFetchUsers(message.trackerUrl).then(sendResponse).catch(e =>
      sendResponse({ error: String(e) })
    );
    return true; // keep channel open for async response
  }

  if (message.type === 'FETCH_HTML') {
    fetch(message.url, { credentials: 'include' })
      .then(r => r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(html => sendResponse({ html }))
      .catch(e => sendResponse({ error: String(e) }));
    return true;
  }

  if (message.type === 'FETCH_IMAGE_BYTES') {
    // Fetch a delivery photo URL with credentials so cookies for the user's
    // Walmart/Amazon session are included. Returns base64 + content-type so
    // the content script can attach to the order's import payload. Used for
    // Walmart's receipts-query.edge.walmart.com URLs which 401 when fetched
    // server-side (no session cookie). Amazon's S3 signed URLs would also
    // work via this path but we let the server fetch those directly since
    // they're self-contained.
    fetch(message.url as string, { credentials: 'include' })
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const buf = await r.arrayBuffer();
        // Cap at 5 MB — same as the server-side cap. Delivery photos are
        // ~50-200 KB, so this is generous; rejects anything unexpected.
        if (buf.byteLength > 5 * 1024 * 1024) throw new Error(`oversized: ${buf.byteLength} bytes`);
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const base64 = btoa(binary);
        sendResponse({ base64, mimeType: r.headers.get('content-type') || 'image/jpeg' });
      })
      .catch(e => sendResponse({ error: String(e) }));
    return true;
  }

  if (message.type === 'CYCLE_DATE_FILTER') {
    const tabId = sender.tab?.id;
    if (!tabId) { sendResponse(null); return; }
    chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: inPageCycleDateFilter,
      args: [message.sinceDate as string],
    }).then(results => sendResponse(results[0]?.result ?? null))
      .catch(e => { console.error('[BG] CYCLE_DATE_FILTER error', e); sendResponse(null); });
    return true;
  }

  if (message.type === 'GET_CAPTURED_ORDERS') {
    const tabId = sender.tab?.id;
    if (!tabId) { sendResponse(null); return; }
    chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => (window as unknown as Record<string, unknown>).__costcoAllOrders ?? null,
    }).then(results => sendResponse(results[0]?.result ?? null))
      .catch(() => sendResponse(null));
    return true;
  }

  if (message.type === 'GET_CAPTURED_RECEIPTS') {
    const tabId = sender.tab?.id;
    if (!tabId) { sendResponse(null); return; }
    chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => ({
        list: (window as unknown as Record<string, unknown>).__costcoReceiptList ?? [],
        details: (window as unknown as Record<string, unknown>).__costcoReceiptDetails ?? {},
      }),
    }).then(results => sendResponse(results[0]?.result ?? null))
      .catch(() => sendResponse(null));
    return true;
  }

  if (message.type === 'GET_MSAL_TOKEN') {
    const tabId = sender.tab?.id;
    if (!tabId) { sendResponse(null); return; }
    chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: inPageGetMsalToken,
    }).then(results => sendResponse(results[0]?.result ?? null))
      .catch(e => { console.error('[BG] GET_MSAL_TOKEN error', e); sendResponse(null); });
    return true;
  }

  if (message.type === 'GET_COSTCO_AUTH') {
    const tabId = sender.tab?.id;
    if (!tabId) { sendResponse(null); return; }
    chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => (window as unknown as Record<string, unknown>).__costcoAuth as { token: string; clientId: string } | undefined,
    }).then(results => sendResponse(results[0]?.result ?? null))
      .catch(() => sendResponse(null));
    return true;
  }

  if (message.type === 'COSTCO_GRAPHQL') {
    const tabId = sender.tab?.id;
    if (!tabId) { sendResponse({ error: 'no tab id' }); return; }
    chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: inPageCostcoGraphql,
      args: [message.token, message.clientId, message.body],
    }).then(results => sendResponse(results[0]?.result ?? { error: 'no result' }))
      .catch(e => sendResponse({ error: String(e) }));
    return true;
  }

  if (message.type === 'PUSH_ORDERS') {
    handlePushOrders(message.trackerUrl, message.apiKey, message.userId, message.orders)
      .then(sendResponse)
      .catch(e => sendResponse({ error: String(e) }));
    return true;
  }

  if (message.type === 'PUSH_COSTCO_RECEIPTS') {
    handlePushCostcoReceipts(message.trackerUrl, message.apiKey, message.userId, message.receipts as Record<string, unknown>[], message.receiptHtml as Record<string, string> | undefined)
      .then(sendResponse)
      .catch(e => sendResponse({ error: String(e) }));
    return true;
  }

  if (message.type === 'PUSH_BIGSKY_ORDERS') {
    handlePushBigskyOrders(message.trackerUrl, message.apiKey, message.userId, message.groups, message.notCheckedInTracking)
      .then(sendResponse)
      .catch(e => sendResponse({ error: String(e) }));
    return true;
  }

  if (message.type === 'CBM_SCRAPE_DONE') {
    const { merchant, rates, rateCount } = message as { merchant: string; rates?: { portal: string; rate: string; category: string | null }[]; rateCount: number; ok: boolean };
    const tabId = sender.tab?.id;

    (async () => {
      let ok = true;
      if (rates && rates.length > 0) {
        try {
          const { trackerUrl, apiKey, extensionSecret, userId } = await import('../lib/storage').then(m => m.getSettings());
          if (trackerUrl) {
            const base = trackerUrl.replace(/\/$/, '');
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (apiKey) headers['X-API-Key'] = apiKey;
            if (extensionSecret) headers['X-Extension-Secret'] = extensionSecret;
            if (userId) headers['X-Extension-User-Id'] = userId;
            const res = await fetch(`${base}/api/portal-rates/bulk`, {
              method: 'POST',
              headers,
              body: JSON.stringify([{ merchant, rates }]),
            });
            ok = res.ok;
          }
        } catch { ok = false; }
      }
      const resolve = pendingCbmScrapes.get(merchant);
      if (resolve) {
        pendingCbmScrapes.delete(merchant);
        resolve(ok, rateCount);
      }
      if (tabId) chrome.tabs.remove(tabId).catch(() => {});
    })();
    return;
  }

  if (message.type === 'API_LOG') {
    appendApiLog(message.entry as Record<string, unknown>).catch(() => {});
    return;
  }

  if (message.type === 'DEV_LOGS_CLEAR') {
    chrome.storage.local.set({ apiLogs: [], apiLogNextId: 0 }).then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === 'DEV_SPY_NOW') {
    injectSpy(message.tabId as number).then(() => sendResponse({ ok: true })).catch(e => sendResponse({ error: String(e) }));
    return true;
  }
});

let _apiLogQueue: Promise<void> = Promise.resolve();
function appendApiLog(entry: Record<string, unknown>): Promise<void> {
  _apiLogQueue = _apiLogQueue.then(async () => {
    const stored = await chrome.storage.local.get(['apiLogs', 'apiLogNextId']);
    const logs = (stored.apiLogs as Record<string, unknown>[] | undefined) ?? [];
    const nextId = (stored.apiLogNextId as number | undefined) ?? 0;
    logs.push({ ...entry, id: nextId });
    if (logs.length > 200) logs.splice(0, logs.length - 200);
    await chrome.storage.local.set({ apiLogs: logs, apiLogNextId: nextId + 1 });
  });
  // Fire-and-forget: forward CC API errors to the tracker so they land
  // in /api-errors alongside our server-side failures. Keeps debugging
  // unified — you don't have to remember to open the spy panel separately.
  void forwardErrorIfRelevant(entry);

  // When the spy sees a successful commitment edit on buyinggroup.com,
  // nudge the tracker to re-sync. Without this, raising a commitment from
  // 3 to 6 on bg.com doesn't show up locally until the user clicks "Sync
  // from BG" manually — which they keep forgetting.
  void triggerCommitmentSyncIfRelevant(entry);

  return _apiLogQueue;
}

// Debounce — bg.com fires edit_commitment per change, but the user may
// drag a number up/down a few times in quick succession. Wait 5s of quiet
// before kicking off the sync to avoid hammering the tracker.
let _commitmentSyncTimer: ReturnType<typeof setTimeout> | null = null;
async function triggerCommitmentSyncIfRelevant(entry: Record<string, unknown>) {
  try {
    const status = typeof entry.status === 'number' ? entry.status : 0;
    const url = typeof entry.url === 'string' ? entry.url : '';
    if (status < 200 || status >= 300) return;
    // BG's commitment endpoints all live under /v1/commitment/ — fire on
    // edits, creates, deletes. The fulfilled/count change is the whole
    // point of the sync.
    if (!/buyinggroup\.com.*\/v1\/commitment\/(edit|create|delete|update|cancel)/i.test(url)) return;

    if (_commitmentSyncTimer) clearTimeout(_commitmentSyncTimer);
    _commitmentSyncTimer = setTimeout(async () => {
      _commitmentSyncTimer = null;
      try {
        const { trackerUrl, apiKey, extensionSecret, userId } = await import('../lib/storage').then(m => m.getSettings());
        if (!trackerUrl || !userId) return;
        const headers: Record<string, string> = { 'X-Extension-User-Id': userId };
        if (apiKey) headers['X-API-Key'] = apiKey;
        if (extensionSecret) headers['X-Extension-Secret'] = extensionSecret;
        headers['X-Extension-Browser'] = isFirefox ? 'firefox' : 'chrome';
        console.log('[spy] auto-firing /api/buyinggroup/sync-commitments after edit_commitment');
        await fetch(`${trackerUrl.replace(/\/$/, '')}/api/buyinggroup/sync-commitments`, {
          method: 'POST', headers,
        }).catch(() => {});
      } catch { /* never throw */ }
    }, 5000);
  } catch { /* never throw */ }
}

// Per-session dedupe of recent forwards. The spy fires for every fetch
// the page makes, and CC pages tend to retry — we don't want N copies of
// the same error in the tracker.
const _recentForwards = new Map<string, number>();
async function forwardErrorIfRelevant(entry: Record<string, unknown>) {
  try {
    const status = typeof entry.status === 'number' ? entry.status : 0;
    const url = typeof entry.url === 'string' ? entry.url : '';
    const method = typeof entry.method === 'string' ? entry.method : '';
    if (!url || status >= 200 && status < 300) return;
    if (status === 0) return; // network/abort, not server error
    const group = classifyGroup(url);
    if (!group) return;
    const dedupeKey = `${group}:${method}:${url}:${status}`;
    const last = _recentForwards.get(dedupeKey) ?? 0;
    if (Date.now() - last < 60_000) return;
    _recentForwards.set(dedupeKey, Date.now());

    const { trackerUrl, apiKey, extensionSecret, userId } = await import('../lib/storage').then(m => m.getSettings());
    if (!trackerUrl || !userId) return;
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Extension-User-Id': userId };
    if (apiKey) headers['X-API-Key'] = apiKey;
    if (extensionSecret) headers['X-Extension-Secret'] = extensionSecret;
    headers['X-Extension-Browser'] = isFirefox ? 'firefox' : 'chrome';
    await fetch(`${trackerUrl.replace(/\/$/, '')}/api/api-errors`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        group,
        endpoint: url.replace(/^https?:\/\/[^/]+/, ''),
        method,
        status,
        body: typeof entry.resBody === 'string' ? entry.resBody.slice(0, 1500) : undefined,
        context: 'extension API spy',
      }),
    }).catch(() => {});
  } catch { /* never throw from a fire-and-forget logger */ }
}

function classifyGroup(url: string): string | null {
  if (/cardcenter\.cc/i.test(url)) return 'CC';
  if (/buyinggroup\.com|prod\.buyinggroup\.com/i.test(url)) return 'BG';
  if (/bfmr\.com/i.test(url)) return 'BFMR';
  if (/bigskybuyers\.com/i.test(url)) return 'BigSky';
  return null;
}

async function injectSpy(tabId: number) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ['content/api-spy-bridge.js'] });
  await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', files: ['content/api-spy-main.js'] });
}

function urlMatchesPattern(tabUrl: string, pattern: string): boolean {
  if (!pattern) return false;
  try {
    const tabHost = new URL(tabUrl).hostname;
    const pat = pattern.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    return tabHost === pat || tabHost.endsWith(`.${pat}`);
  } catch { return false; }
}

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (!tab.url) return;
  // Inject at 'loading' to wrap fetch/XHR before page scripts fire; retry at 'complete' as fallback
  if (info.status !== 'loading' && info.status !== 'complete') return;
  const stored = await chrome.storage.local.get(['devMode', 'devModeUrl']);
  if (!stored.devMode) return;
  const pattern = (stored.devModeUrl as string | undefined) ?? '';
  if (!urlMatchesPattern(tab.url, pattern)) return;
  injectSpy(tabId).catch(() => {});
});

// Runs in MAIN world — finds Costco's MSAL instance and calls acquireTokenSilent
async function inPageGetMsalToken(): Promise<string | null> {
  const w = window as unknown as Record<string, unknown>;

  // Log all window keys that look auth/token related so we can identify the instance
  const interesting: string[] = [];
  for (const key of Object.keys(w)) {
    if (/msal|azure|token|auth|costco.*auth|azuretoken/i.test(key)) interesting.push(key);
  }
  console.log('[CST-MAIN] interesting window keys:', interesting);

  // Scan ALL window properties for an MSAL-like instance (getAllAccounts + acquireTokenSilent)
  type MsalLike = { getAllAccounts(): unknown[]; acquireTokenSilent(r: unknown): Promise<{ idToken?: string; accessToken?: string }> };
  let msalInstance: MsalLike | null = null;

  function isMsal(v: unknown): v is MsalLike {
    return !!v && typeof v === 'object' &&
      typeof (v as Record<string, unknown>).getAllAccounts === 'function' &&
      typeof (v as Record<string, unknown>).acquireTokenSilent === 'function';
  }

  for (const key of Object.keys(w)) {
    const v = w[key];
    if (isMsal(v)) { msalInstance = v; console.log('[CST-MAIN] found MSAL at window.' + key); break; }
    // Check one level deep (e.g. window.AzureAuth.msalInstance)
    if (v && typeof v === 'object') {
      for (const k2 of Object.keys(v as object)) {
        const v2 = (v as Record<string, unknown>)[k2];
        if (isMsal(v2)) { msalInstance = v2; console.log('[CST-MAIN] found MSAL at window.' + key + '.' + k2); break; }
      }
      if (msalInstance) break;
    }
  }

  // Also try common explicit names
  if (!msalInstance) {
    for (const name of ['msalInstance', 'msal', '__msal', 'msalApp', 'azureMsal', 'authInstance', 'pca']) {
      if (isMsal(w[name])) { msalInstance = w[name] as MsalLike; console.log('[CST-MAIN] found MSAL at window.' + name); break; }
    }
  }

  if (!msalInstance) { console.log('[CST-MAIN] no MSAL instance found'); return null; }

  const accounts = msalInstance.getAllAccounts();
  if (!accounts.length) { console.log('[CST-MAIN] MSAL: no accounts'); return null; }
  const account = accounts[0] as Record<string, unknown>;
  console.log('[CST-MAIN] found account:', account.username ?? account.localAccountId);

  try {
    const result = await msalInstance.acquireTokenSilent({ account, scopes: ['openid', 'profile'] });
    console.log('[CST-MAIN] acquireTokenSilent ok, idToken:', !!result.idToken, 'accessToken:', !!result.accessToken);
    return result.idToken ?? result.accessToken ?? null;
  } catch (e) {
    console.error('[CST-MAIN] acquireTokenSilent failed', String(e));
    return null;
  }
}

// Runs in MAIN world — selects each date period in the dropdown back to sinceDate,
// waiting for each XHR to be captured by the interceptor before moving on.
async function inPageCycleDateFilter(sinceDate: string): Promise<number> {
  const MONTHS: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  };

  const since = new Date(sinceDate);

  const sel = document.getElementById('Showing') as HTMLSelectElement | null;
  if (!sel) { console.log('[CST-MAIN] date select not found'); return 0; }

  // "Last 3 Months" is already loaded on page load — start from index 1
  let clicked = 0;
  for (let i = 1; i < sel.options.length; i++) {
    const text = sel.options[i].text.trim(); // e.g. "2025 September - November"
    const m = text.match(/^(\d{4})\s+(\w+)\s*-\s*(\w+)$/);
    if (!m) continue;

    const year = parseInt(m[1]);
    const endMonthIdx = MONTHS[m[3].toLowerCase()];
    if (endMonthIdx === undefined) continue;

    // The period ends on the last day of endMonth in year
    const periodEnd = new Date(year, endMonthIdx + 1, 0); // last day of endMonth
    if (periodEnd < since) break; // periods are newest-first, stop when past sinceDate

    const before = (window as unknown as Record<string, unknown>).__costcoAllOrders as unknown[] | undefined;
    const beforeLen = before?.length ?? 0;

    sel.value = sel.options[i].value || text;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('[CST-MAIN] selected date period:', text);
    clicked++;

    // Wait up to 8s for the interceptor to capture a new page
    await new Promise<void>(resolve => {
      let waited = 0;
      const interval = setInterval(() => {
        waited += 200;
        const current = (window as unknown as Record<string, unknown>).__costcoAllOrders as unknown[] | undefined;
        if ((current?.length ?? 0) > beforeLen || waited >= 8000) {
          clearInterval(interval);
          resolve();
        }
      }, 200);
    });

    await new Promise(r => setTimeout(r, 400)); // brief pause between selections
  }

  console.log('[CST-MAIN] date cycling done, clicked', clicked, 'periods');
  return clicked;
}

// Runs in the page's MAIN world — uses XHR like Costco's own app (fetch gets 401, XHR gets 200)
function inPageCostcoGraphql(token: string, clientId: string, body: string): Promise<{ ok: boolean; status: number; text: string }> {
  return new Promise(resolve => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://ecom-api.costco.com/ebusiness/order/v1/orders/graphql');
    xhr.setRequestHeader('content-type', 'application/json-patch+json');
    xhr.setRequestHeader('costco-x-authorization', `Bearer ${token}`);
    xhr.setRequestHeader('costco-x-wcs-clientid', clientId);
    xhr.setRequestHeader('costco.env', 'ecom');
    xhr.setRequestHeader('costco.service', 'restOrders');
    xhr.setRequestHeader('client-identifier', crypto.randomUUID());
    xhr.onload = () => resolve({ ok: xhr.status < 400, status: xhr.status, text: xhr.responseText });
    xhr.onerror = () => resolve({ ok: false, status: 0, text: 'network error' });
    xhr.send(body);
  });
}

// ── Tracker-driven command polling ────────────────────────────────────────────

type TrackerCommand = { id: number; type: string; payload: string | null };

async function pollAndExecuteCommands() {
  await chrome.storage.local.set({ lastPoll: Date.now() });
  const { trackerUrl, apiKey, extensionSecret, userId } = await import('../lib/storage').then(m => m.getSettings());
  if (!trackerUrl) return;

  const base = upgradeUrl(trackerUrl);
  const headers: Record<string, string> = {};
  if (apiKey) headers['X-API-Key'] = apiKey;
  if (extensionSecret) headers['X-Extension-Secret'] = extensionSecret;
  if (userId) headers['X-Extension-User-Id'] = userId;
  // Tell the tracker which browser this extension instance is running in.
  // When both Firefox + Chrome are installed pointing at the same tracker,
  // whichever polls first claims the command — leading to "I triggered
  // sync in Firefox and Amazon opened in Chrome." The tracker can filter
  // out commands targeted at the *other* browser using this header.
  headers['X-Extension-Browser'] = isFirefox ? 'firefox' : 'chrome';

  let commands: TrackerCommand[] = [];
  try {
    const res = await fetch(`${base}/api/extension/commands`, { headers });
    if (!res.ok) return;
    commands = await res.json() as TrackerCommand[];
  } catch { return; }

  for (const cmd of commands) {
    await patchCommand(base, cmd.id, 'running', headers);
    try {
      let result: unknown;
      if (cmd.type === 'SYNC_AMAZON') result = await runSyncCommand('Amazon');
      else if (cmd.type === 'SYNC_WALMART') result = await runSyncCommand('Walmart');
      else if (cmd.type === 'SYNC_COSTCO') result = await runSyncCommand('Costco');
      else if (cmd.type === 'SYNC_BIGSKY') result = await runSyncCommand('BigSkyBuyers');
      else if (cmd.type === 'SCRAPE_CBM') result = await runScrapeCbm(base, headers, cmd.payload);
      else if (cmd.type === 'SYNC_AMAZON_ORDER') {
        let orderNumbers: string[] = [];
        if (cmd.payload) {
          try {
            const parsed = JSON.parse(cmd.payload) as { orderNumbers?: string[] };
            if (Array.isArray(parsed.orderNumbers)) orderNumbers = parsed.orderNumbers;
          } catch { /* ignore */ }
        }
        result = await runAmazonOrderSync(orderNumbers);
      }
      await patchCommand(base, cmd.id, 'done', headers, result);
    } catch (e) {
      await patchCommand(base, cmd.id, 'failed', headers, String(e));
    }
  }
}

async function patchCommand(base: string, id: number, status: string, headers: Record<string, string>, result?: unknown) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${base}/api/extension/commands/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ status, result }),
      });
      if (res.ok) return;
    } catch { /* retry */ }
    if (attempt < 2) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
  }
}

async function runSyncCommand(platform: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    triggerSyncInBackground(platform)
      .then(() => resolve({ ok: true }))
      .catch(reject);
  });
}

async function runAmazonOrderSync(orderNumbers: string[]): Promise<unknown> {
  if (!orderNumbers.length) return { skipped: true, reason: 'no order numbers' };

  const config = PLATFORM_CONFIG['Amazon'];

  // Find or open an Amazon tab
  let targetTabId: number | undefined;
  let existingTabs: chrome.tabs.Tab[] = [];
  try { existingTabs = await chrome.tabs.query({ url: `https://${config.host}/*` }); } catch { /* Firefox may not support url filter */ }

  if (existingTabs.length > 0 && existingTabs[0].id) {
    targetTabId = existingTabs[0].id;
  } else {
    // Open the orders page so content script is available
    const newTab = await chrome.tabs.create({ url: config.url, active: false });
    if (!newTab.id) throw new Error('failed to open Amazon tab');
    targetTabId = newTab.id;
    await new Promise<void>(resolve => {
      let tabListener: (tabId: number, info: { status?: string }) => void;
      const timeout = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(tabListener);
        resolve();
      }, 15000);
      tabListener = (tabId: number, info: { status?: string }) => {
        if (tabId === targetTabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(tabListener);
          clearTimeout(timeout);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(tabListener);
    });
  }

  // Ping to check if content script is already loaded; inject if not
  const alive = await chrome.tabs.sendMessage(targetTabId, { type: 'PING' }).catch(() => null);
  if (!alive) {
    try {
      await chrome.scripting.executeScript({ target: { tabId: targetTabId }, files: [config.script] });
    } catch (e) {
      console.error('[BG] injection failed for SYNC_AMAZON_ORDER', e);
      throw e;
    }
  }

  // Send SCRAPE_AMAZON_ORDER and wait for response
  return new Promise(resolve => {
    chrome.tabs.sendMessage(
      targetTabId!,
      { type: 'SCRAPE_AMAZON_ORDER', orderNumbers },
      (response: unknown) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response ?? { ok: false, error: 'no response' });
        }
      }
    );
  });
}

// Pending CBM scrapes: maps merchant → resolve function
const pendingCbmScrapes = new Map<string, (ok: boolean, count: number) => void>();

async function runScrapeCbm(trackerBase: string, headers: Record<string, string>, rawPayload: string | null): Promise<unknown> {
  // Get merchant list: prefer command payload, fall back to /api/bfmr/vendors
  let merchants: string[] = [];
  if (rawPayload) {
    try { merchants = JSON.parse(rawPayload) as string[]; } catch { /* ignore */ }
  }
  if (!merchants.length) {
    const res = await fetch(`${trackerBase}/api/bfmr/vendors`, { headers });
    if (res.ok) merchants = await res.json() as string[];
  }
  if (!merchants.length) return { skipped: true, reason: 'no merchants' };

  const results: { merchant: string; rateCount: number; ok: boolean }[] = [];

  // Open CBM page for each merchant sequentially, wait for content script to report back
  for (const merchant of merchants) {
    const slug = merchant.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const url = `https://www.cashbackmonitor.com/cashback-store/${slug}/?vendor=${encodeURIComponent(merchant)}`;

    const result = await new Promise<{ ok: boolean; rateCount: number }>(resolve => {
      let openedTabId: number | undefined;
      let settled = false;
      const settle = (val: { ok: boolean; rateCount: number }) => {
        if (settled) return;
        settled = true;
        resolve(val);
      };

      const timeoutId = setTimeout(() => {
        pendingCbmScrapes.delete(merchant);
        if (openedTabId) chrome.tabs.remove(openedTabId).catch(() => {});
        settle({ ok: false, rateCount: 0 });
      }, 15000);

      pendingCbmScrapes.set(merchant, (ok, rateCount) => {
        clearTimeout(timeoutId);
        settle({ ok, rateCount });
      });

      chrome.tabs.create({ url, active: false })
        .then(tab => { if (tab.id) openedTabId = tab.id; })
        .catch(() => {
          clearTimeout(timeoutId);
          pendingCbmScrapes.delete(merchant);
          settle({ ok: false, rateCount: 0 });
        });
    });

    results.push({ merchant, ...result });
  }

  return { merchants: results };
}

// ── CBM scrape result from content script ─────────────────────────────────────

// handled inline in the onMessage listener below

async function handlePushBigskyOrders(
  trackerUrl: string,
  apiKey: string,
  userId: string,
  groups: Array<{ trackingNumber: string; itemDescription: string; salePrice: number; scanDate: string; paymentDate: string | null }>,
  notCheckedInTracking?: string[],
) {
  const url = `${upgradeUrl(trackerUrl)}/api/bigsky/sync-orders`;
  const { extensionSecret } = await import('../lib/storage').then(m => m.getSettings());
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'X-Extension-User-Id': userId } : {}),
      ...(apiKey ? { 'X-API-Key': apiKey } : {}),
      ...(extensionSecret ? { 'X-Extension-Secret': extensionSecret } : {}),
    },
    body: JSON.stringify({ groups, notCheckedInTracking: notCheckedInTracking ?? [] }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Tracker API error ${res.status} (${url}): ${text}`);
  }
  return res.json();
}

function upgradeUrl(trackerUrl: string): string {
  const stripped = trackerUrl.replace(/\/$/, '');
  if (/^http:\/\/(localhost|\d)/i.test(stripped)) return stripped;
  return stripped.replace(/^http:\/\//i, 'https://');
}

async function handleFetchUsers(trackerUrl: string) {
  const url = `${upgradeUrl(trackerUrl)}/api/users`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
  return res.json();
}

async function handlePushCostcoReceipts(trackerUrl: string, apiKey: string, userId: string | number | undefined, receipts: Record<string, unknown>[], receiptHtml?: Record<string, string>) {
  const url = `${upgradeUrl(trackerUrl)}/api/costco/receipts`;
  console.log('[RECEIPTS] pushing', receipts.length, 'receipts, userId=', userId, 'url=', url);
  const { extensionSecret } = await import('../lib/storage').then(m => m.getSettings());
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'X-API-Key': apiKey } : {}),
      ...(userId != null ? { 'X-Extension-User-Id': String(userId) } : {}),
      ...(extensionSecret ? { 'X-Extension-Secret': extensionSecret } : {}),
    },
    body: JSON.stringify({ receipts, receiptHtml: receiptHtml ?? {} }),
  });
  const text = await res.text();
  console.log('[RECEIPTS] response', res.status, text.slice(0, 200));
  if (!res.ok) throw new Error(`Tracker API error ${res.status} (${url}): ${text}`);
  return JSON.parse(text);
}

async function handlePushOrders(
  trackerUrl: string,
  apiKey: string,
  userId: string,
  orders: ScrapedOrder[],
) {
  // Upgrade http:// to https:// for known domain URLs to avoid Cloudflare 301
  // redirects that convert POST → GET (fetch follows 301 but drops the body).
  const url = `${upgradeUrl(trackerUrl)}/api/import`;
  const { extensionSecret } = await import('../lib/storage').then(m => m.getSettings());
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'X-Extension-User-Id': userId } : {}),
      ...(apiKey ? { 'X-API-Key': apiKey } : {}),
      ...(extensionSecret ? { 'X-Extension-Secret': extensionSecret } : {}),
    },
    body: JSON.stringify(orders.map(o => ({
      platform: o.platform,
      orderNumber: o.orderNumber,
      orderDate: o.orderDate,
      itemDescription: o.itemDescription,
      cost: o.cost,
      shippingCost: o.shippingCost,
      shippingAddress: o.shippingAddress,
      trackingNumbers: o.trackingNumbers,
      sourceUrl: o.sourceUrl || null,
      // Forward paymentLast4 so the server can auto-assign a saved card
      // when exactly one card matches. The content scripts scrape this
      // from Amazon/Walmart payment-method markup; the previous projection
      // here silently dropped it, which is why card auto-assign never fired
      // even when last4 was visible in extension logs.
      ...(o.paymentLast4 ? { paymentLast4: o.paymentLast4 } : {}),
      // Scraped total "Earns X% back[, extra Y%]" rate — disambiguates
      // last4 matches against multiple saved cards sharing one physical
      // card at different bonus-rate tiers (e.g. Amazon Store Card).
      ...(o.paymentRatePercent != null ? { paymentRatePercent: o.paymentRatePercent } : {}),
      // Amazon No-Rush delivery bonus, when detected on detail page.
      ...(o.noRushBonusPercent != null ? { noRushBonusPercent: o.noRushBonusPercent } : {}),
      // Carrier proof-of-delivery photo URL. Server downloads + attaches.
      ...(o.deliveryPhotoUrl ? { deliveryPhotoUrl: o.deliveryPhotoUrl } : {}),
      // For Walmart (and any other host whose photo URL needs the user's
      // session cookies), we ship the bytes inline so the server doesn't
      // try to fetch and 401.
      ...(o.deliveryPhotoBase64 ? { deliveryPhotoBase64: o.deliveryPhotoBase64 } : {}),
      ...(o.deliveryPhotoMime ? { deliveryPhotoMime: o.deliveryPhotoMime } : {}),
    }))),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Tracker API error ${res.status} (${url}): ${text}`);
  }

  return res.json();
}
