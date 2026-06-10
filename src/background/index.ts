import type { ScrapedOrder } from '../lib/types';

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Reselling Tracker] Extension installed.');
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
        const timeout = setTimeout(resolve, 10000); // fallback: proceed after 10s regardless
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === targetTabId && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            clearTimeout(timeout);
            resolve();
          }
        });
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

  if (message.type === 'PUSH_BIGSKY_ORDERS') {
    handlePushBigskyOrders(message.trackerUrl, message.apiKey, message.userId, message.groups)
      .then(sendResponse)
      .catch(e => sendResponse({ error: String(e) }));
    return true;
  }
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
  return trackerUrl.replace(/\/$/, '').replace(/^http:\/\/([^0-9])/i, 'https://$1');
}

async function handleFetchUsers(trackerUrl: string) {
  const url = `${upgradeUrl(trackerUrl)}/api/users`;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); } catch { reject(new Error('Invalid JSON')); }
      } else {
        reject(new Error(`${xhr.status}: ${xhr.statusText}`));
      }
    };
    xhr.onerror = () => reject(new Error(`NetworkError: ${url}`));
    xhr.send();
  });
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
