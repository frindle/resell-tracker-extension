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

// Runs in the page's MAIN world — fetch has correct Origin/sec-fetch headers
async function inPageCostcoGraphql(token: string, clientId: string, body: string) {
  // Use the pristine fetch saved by costco-interceptor before queueconfigloader/airgap/LogRocket
  // wrapped it — those wrappers may replace or drop our auth header.
  const fetchFn = ((window as Record<string, unknown>).__origFetch as typeof fetch | undefined) ?? fetch;
  const res = await fetchFn('https://ecom-api.costco.com/ebusiness/order/v1/orders/graphql', {
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
