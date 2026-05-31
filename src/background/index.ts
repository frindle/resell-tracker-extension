import type { ScrapedOrder } from '../lib/types';

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Reselling Tracker] Extension installed.');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
});

// Runs in MAIN world — finds Costco's MSAL instance and calls acquireTokenSilent
async function inPageGetMsalToken(): Promise<string | null> {
  const w = window as Record<string, unknown>;

  // Costco stores their MSAL instance under various names — find it by duck-typing
  let msalInstance: { getAllAccounts(): unknown[]; acquireTokenSilent(req: unknown): Promise<{ idToken?: string; accessToken?: string }> } | null = null;
  for (const key of Object.keys(w)) {
    const v = w[key] as Record<string, unknown> | null;
    if (v && typeof v === 'object' && typeof (v as Record<string, unknown>).getAllAccounts === 'function' && typeof (v as Record<string, unknown>).acquireTokenSilent === 'function') {
      msalInstance = v as typeof msalInstance;
      console.log('[CST-MAIN] found MSAL instance at window.' + key);
      break;
    }
  }
  if (!msalInstance) { console.log('[CST-MAIN] no MSAL instance found on window'); return null; }

  const accounts = msalInstance.getAllAccounts();
  if (!accounts.length) { console.log('[CST-MAIN] MSAL: no accounts'); return null; }
  const account = accounts[0] as Record<string, unknown>;
  console.log('[CST-MAIN] acquiring token silently for account', account.username ?? account.localAccountId);

  try {
    const result = await msalInstance.acquireTokenSilent({ account, scopes: ['openid', 'profile'] });
    const token = result.idToken ?? result.accessToken ?? null;
    console.log('[CST-MAIN] acquireTokenSilent ok, got idToken:', !!result.idToken, 'accessToken:', !!result.accessToken);
    return token ?? null;
  } catch (e) {
    console.error('[CST-MAIN] acquireTokenSilent failed', e);
    return null;
  }
}

// Runs in the page's MAIN world — fetch has correct Origin/sec-fetch headers
async function inPageCostcoGraphql(token: string, clientId: string, body: string) {
  const res = await fetch('https://ecom-api.costco.com/ebusiness/order/v1/orders/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json-patch+json',
      'costco-x-authorization': `Bearer ${token}`,
      'costco-x-wcs-clientid': clientId,
      'costco.env': 'ecom',
      'costco.service': 'restOrders',
      'client-identifier': crypto.randomUUID(),
    },
    body,
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

async function handleFetchUsers(trackerUrl: string) {
  const url = `${trackerUrl.replace(/\/$/, '')}/api/users`;
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text().catch(() => res.statusText)}`);
  return res.json();
}

async function handlePushOrders(
  trackerUrl: string,
  apiKey: string,
  userId: string,
  orders: ScrapedOrder[],
) {
  const url = `${trackerUrl.replace(/\/$/, '')}/api/import`;
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
    throw new Error(`Tracker API error ${res.status}: ${text}`);
  }

  return res.json();
}
