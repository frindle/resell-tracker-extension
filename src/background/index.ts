import type { ScrapedOrder } from '../lib/types';

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
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Reselling Tracker] Extension installed.');
  setToolbarIcon();
  chrome.alarms.create('pollCommands', { periodInMinutes: 1 });
});
chrome.runtime.onStartup.addListener(() => {
  setToolbarIcon();
  chrome.alarms.create('pollCommands', { periodInMinutes: 1 });
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

async function triggerSyncInBackground(platform: string, activeTabId?: number, activeTabUrl?: string) {
  const config = PLATFORM_CONFIG[platform];
  if (!config) return;

  let targetTabId: number | undefined;

  // If the active tab is already on the right host, use it directly
  if (activeTabId && activeTabUrl) {
    try {
      if (new URL(activeTabUrl).hostname === config.host) {
        targetTabId = activeTabId;
      }
    } catch { /* invalid url */ }
  }

  if (!targetTabId) {
    // Look for an existing tab on the right host
    let existingTabs: chrome.tabs.Tab[] = [];
    try { existingTabs = await chrome.tabs.query({ url: `https://${config.host}/*` }); } catch { /* Firefox may not support url filter */ }
    if (existingTabs.length > 0 && existingTabs[0].id) {
      targetTabId = existingTabs[0].id;
      await chrome.tabs.update(targetTabId, { active: true });
      try { if (existingTabs[0].windowId) await chrome.windows.update(existingTabs[0].windowId, { focused: true }); } catch { /* ignore */ }
    } else {
      // Open a new tab and wait for it to load
      const newTab = await chrome.tabs.create({ url: config.url, active: true });
      if (!newTab.id) return;
      targetTabId = newTab.id;
      try { if (newTab.windowId) await chrome.windows.update(newTab.windowId, { focused: true }); } catch { /* ignore */ }
      await new Promise<void>(resolve => {
        let tabListener: (tabId: number, info: chrome.tabs.TabChangeInfo) => void;
        const timeout = setTimeout(() => {
          chrome.tabs.onUpdated.removeListener(tabListener);
          resolve();
        }, 10000);
        tabListener = (tabId: number, info: chrome.tabs.TabChangeInfo) => {
          if (tabId === targetTabId && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(tabListener);
            clearTimeout(timeout);
            resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(tabListener);
      });
    }
  }

  // Ping to check if content script is already loaded
  const alive = await chrome.tabs.sendMessage(targetTabId, { type: 'PING' }).catch(() => null);
  if (!alive) {
    try {
      await chrome.scripting.executeScript({ target: { tabId: targetTabId }, files: [config.script] });
    } catch (e) {
      console.error('[BG] injection failed', e);
      return;
    }
  }

  chrome.tabs.sendMessage(targetTabId, { type: 'START_SYNC', platform }).catch(e =>
    console.error('[BG] START_SYNC failed', e)
  );
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ ok: true });
    return;
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
      func: () => (window as Record<string, unknown>).__costcoAllOrders ?? null,
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
        list: (window as Record<string, unknown>).__costcoReceiptList ?? [],
        details: (window as Record<string, unknown>).__costcoReceiptDetails ?? {},
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
      func: () => (window as Record<string, unknown>).__costcoAuth as { token: string; clientId: string } | undefined,
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
    handlePushBigskyOrders(message.trackerUrl, message.apiKey, message.userId, message.groups)
      .then(sendResponse)
      .catch(e => sendResponse({ error: String(e) }));
    return true;
  }

  if (message.type === 'CBM_SCRAPE_DONE') {
    const { merchant, rateCount, ok } = message as { merchant: string; rateCount: number; ok: boolean };
    const resolve = pendingCbmScrapes.get(merchant);
    if (resolve) {
      pendingCbmScrapes.delete(merchant);
      resolve(ok, rateCount);
    }
    // Close the tab that sent this
    const tabId = sender.tab?.id;
    if (tabId) chrome.tabs.remove(tabId).catch(() => {});
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
function appendApiLog(entry: Record<string, unknown>) {
  _apiLogQueue = _apiLogQueue.then(async () => {
    const stored = await chrome.storage.local.get(['apiLogs', 'apiLogNextId']);
    const logs = (stored.apiLogs as Record<string, unknown>[] | undefined) ?? [];
    const nextId = (stored.apiLogNextId as number | undefined) ?? 0;
    logs.push({ ...entry, id: nextId });
    if (logs.length > 200) logs.splice(0, logs.length - 200);
    await chrome.storage.local.set({ apiLogs: logs, apiLogNextId: nextId + 1 });
  });
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
  const w = window as Record<string, unknown>;

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

    const before = (window as Record<string, unknown>).__costcoAllOrders as unknown[] | undefined;
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
        const current = (window as Record<string, unknown>).__costcoAllOrders as unknown[] | undefined;
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
  const { trackerUrl, apiKey } = await import('../lib/storage').then(m => m.getSettings());
  if (!trackerUrl) return;

  const base = upgradeUrl(trackerUrl);
  const headers: Record<string, string> = {};
  if (apiKey) headers['X-API-Key'] = apiKey;

  let commands: TrackerCommand[] = [];
  try {
    const res = await fetch(`${base}/api/extension/commands`, { headers });
    if (!res.ok) return;
    commands = await res.json() as TrackerCommand[];
  } catch { return; }

  await chrome.storage.local.set({ lastPoll: Date.now() });

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
  await fetch(`${base}/api/extension/commands/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ status, result }),
  }).catch(() => {});
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
    if (!newTab.id) return { ok: false, error: 'failed to open Amazon tab' };
    targetTabId = newTab.id;
    await new Promise<void>(resolve => {
      let tabListener: (tabId: number, info: chrome.tabs.TabChangeInfo) => void;
      const timeout = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(tabListener);
        resolve();
      }, 15000);
      tabListener = (tabId: number, info: chrome.tabs.TabChangeInfo) => {
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
      return { ok: false, error: String(e) };
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
      pendingCbmScrapes.set(merchant, (ok, rateCount) => resolve({ ok, rateCount }));
      setTimeout(() => {
        pendingCbmScrapes.delete(merchant);
        resolve({ ok: false, rateCount: 0 });
      }, 15000);

      chrome.tabs.create({ url, active: false }).catch(() => resolve({ ok: false, rateCount: 0 }));
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
) {
  const url = `${upgradeUrl(trackerUrl)}/api/bigsky/sync-orders`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'X-Extension-User-Id': userId } : {}),
      ...(apiKey ? { 'X-API-Key': apiKey } : {}),
    },
    body: JSON.stringify({ groups }),
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
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'X-API-Key': apiKey } : {}),
      ...(userId != null ? { 'X-Extension-User-Id': String(userId) } : {}),
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
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'X-Extension-User-Id': userId } : {}),
      ...(apiKey ? { 'X-API-Key': apiKey } : {}),
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
    }))),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Tracker API error ${res.status} (${url}): ${text}`);
  }

  return res.json();
}
