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

  if (message.type === 'PUSH_ORDERS') {
    handlePushOrders(message.trackerUrl, message.apiKey, message.userId, message.orders)
      .then(sendResponse)
      .catch(e => sendResponse({ error: String(e) }));
    return true;
  }
});

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
