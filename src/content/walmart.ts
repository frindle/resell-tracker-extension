import { getSettings, setLastSync } from '../lib/storage';
import { pushOrders } from '../lib/api';
import type { ScrapedOrder, SyncMessage } from '../lib/types';

function parseMoney(text: string): number {
  return parseFloat(text.replace(/[^0-9.-]/g, '')) || 0;
}

function sendMessage(msg: SyncMessage) {
  chrome.runtime.sendMessage(msg).catch(() => {});
}

function setBadge(text: string, color = '#3b82f6') {
  chrome.runtime.sendMessage({ type: 'SET_BADGE', text, color }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Fetch Walmart order history HTML pages with session cookies
// ---------------------------------------------------------------------------

async function fetchOrderPage(page = 1): Promise<Document | null> {
  try {
    const url = `https://www.walmart.com/orders?page=${page}`;
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) return null;
    const html = await res.text();
    return new DOMParser().parseFromString(html, 'text/html');
  } catch {
    return null;
  }
}

async function fetchOrderDetail(orderNumber: string): Promise<Document | null> {
  try {
    const url = `https://www.walmart.com/orders/${orderNumber}`;
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) return null;
    const html = await res.text();
    return new DOMParser().parseFromString(html, 'text/html');
  } catch {
    return null;
  }
}

function parseOrdersFromDoc(doc: Document, sinceDate: Date): { orders: ScrapedOrder[]; hasOlder: boolean } {
  const orders: ScrapedOrder[] = [];
  let hasOlder = false;

  // Walmart embeds order data as JSON in __NEXT_DATA__ or window.__WML_REDUX_INITIAL_STATE__
  const nextDataEl = doc.getElementById('__NEXT_DATA__');
  if (nextDataEl?.textContent) {
    try {
      const json = JSON.parse(nextDataEl.textContent);
      // Traverse to find orders array — path varies by page version
      const pageProps = json?.props?.pageProps ?? json?.props ?? {};
      const orderList: unknown[] =
        pageProps?.initialData?.data?.customer?.orderHistoryData?.orderHistory?.orders ??
        pageProps?.orders ??
        pageProps?.data?.orders ??
        [];

      for (const raw of orderList) {
        const item = raw as Record<string, unknown>;
        const orderNumber = String(item.orderNo ?? item.orderId ?? item.id ?? '').replace(/\D/g, '');
        if (!orderNumber) continue;

        const rawDate = String(item.orderDate ?? item.placedDate ?? item.createdDate ?? '');
        if (!rawDate) continue;
        const orderDate = new Date(rawDate);
        if (isNaN(orderDate.getTime())) continue;
        if (orderDate < sinceDate) { hasOlder = true; continue; }

        const statusRaw = String(item.status ?? item.orderStatus ?? '').toLowerCase();
        if (/cancel|return|refund/.test(statusRaw)) continue;

        const costRaw = item.orderTotal ?? item.total ?? item.grandTotal ?? 0;
        const cost = typeof costRaw === 'number' ? costRaw : parseMoney(String(costRaw));

        const lineItems = (item.lineItems ?? item.items ?? []) as Record<string, unknown>[];
        const firstItem = lineItems[0];
        const itemDescription = String(firstItem?.name ?? firstItem?.title ?? firstItem?.productName ?? '').slice(0, 120);

        orders.push({
          platform: 'Walmart',
          orderNumber,
          orderDate: orderDate.toISOString().split('T')[0],
          itemDescription,
          cost,
          shippingCost: 0,
          shippingAddress: '',
          trackingNumbers: [],
          sourceUrl: `https://www.walmart.com/orders/${orderNumber}`,
        });
      }

      return { orders, hasOlder };
    } catch { /* fall through to DOM parsing */ }
  }

  // DOM fallback
  const blocks = Array.from(doc.querySelectorAll(
    '[data-automation-id*="order-card"], [data-testid*="order"], .order-card, article[class*="order"]'
  ));

  for (const block of blocks) {
    const orderNumEl = block.querySelector('[data-automation-id*="order-number"], [class*="order-number"], [class*="orderNumber"]');
    const orderNumber = (orderNumEl?.textContent ?? '').replace(/\D/g, '');
    if (!orderNumber) continue;

    const dateEl = block.querySelector('[data-automation-id*="order-date"], [class*="order-date"], time');
    const rawDate = dateEl?.getAttribute('datetime') ?? dateEl?.textContent ?? '';
    const orderDate = new Date(rawDate);
    if (isNaN(orderDate.getTime())) continue;
    if (orderDate < sinceDate) { hasOlder = true; continue; }

    const statusEl = block.querySelector('[data-automation-id*="delivery-status"], [class*="status"]');
    const statusText = (statusEl?.textContent ?? '').toLowerCase();
    if (/cancel|return|refund/.test(statusText)) continue;

    const totalEl = block.querySelector('[data-automation-id*="order-total"], [class*="total"]');
    const cost = parseMoney(totalEl?.textContent ?? '0');

    const itemEl = block.querySelector('[data-automation-id*="product-name"], [class*="product-name"]');
    const itemDescription = (itemEl?.textContent ?? '').trim().slice(0, 120);

    orders.push({
      platform: 'Walmart',
      orderNumber,
      orderDate: orderDate.toISOString().split('T')[0],
      itemDescription,
      cost,
      shippingCost: 0,
      shippingAddress: '',
      trackingNumbers: [],
      sourceUrl: `https://www.walmart.com/orders/${orderNumber}`,
    });
  }

  return { orders, hasOlder };
}

async function enrichWithDetails(orders: ScrapedOrder[], onProgress: (msg: string) => void): Promise<void> {
  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];
    onProgress(`Fetching details ${i + 1}/${orders.length}…`);

    const doc = await fetchOrderDetail(o.orderNumber);
    if (!doc) continue;

    const html = doc.documentElement.innerHTML;

    // Shipping address
    const addrEl = doc.querySelector('[data-automation-id*="shipping-address"], [class*="shipping-address"]');
    if (addrEl) {
      o.shippingAddress = (addrEl.textContent ?? '').replace(/\s+/g, ' ').trim();
    }

    // Tracking numbers
    const numbers: string[] = [];
    const trackPatterns = [
      /trackingNumber["\s:]+["']?([A-Z0-9]{10,25})/g,
      /\b(1Z[A-Z0-9]{16})\b/g,
      /\b([0-9]{20,22})\b/g,
    ];
    for (const pat of trackPatterns) {
      let m: RegExpExecArray | null;
      while ((m = pat.exec(html)) !== null) {
        numbers.push(m[1]);
      }
    }
    o.trackingNumbers = [...new Set(numbers)];

    await new Promise(r => setTimeout(r, 400));
  }
}

// ---------------------------------------------------------------------------
// Main sync
// ---------------------------------------------------------------------------

let syncing = false;

async function sync() {
  if (syncing) return;
  syncing = true;

  const settings = await getSettings();
  if (!settings.trackerUrl || !settings.userId) {
    sendMessage({ type: 'SYNC_ERROR', platform: 'Walmart', error: 'Tracker URL or user not configured — open Settings.' });
    setBadge('!', '#ef4444');
    syncing = false;
    return;
  }

  const sinceDate = settings.walmartLastSync
    ? new Date(settings.walmartLastSync)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  setBadge('…');
  sendMessage({ type: 'SYNC_STARTED', platform: 'Walmart' });

  const allOrders: ScrapedOrder[] = [];
  const seen = new Set<string>();
  let page = 1;

  while (true) {
    sendMessage({ type: 'SYNC_PROGRESS', platform: 'Walmart', scraped: 0, message: `Fetching orders page ${page}…` });
    const doc = await fetchOrderPage(page);
    if (!doc) break;

    const { orders, hasOlder } = parseOrdersFromDoc(doc, sinceDate);
    for (const o of orders) {
      if (!seen.has(o.orderNumber)) { seen.add(o.orderNumber); allOrders.push(o); }
    }

    if (hasOlder) break;
    if (orders.length === 0) break; // empty page = end of results
    if (page >= 15) break; // safety limit

    const nextLink = doc.querySelector('[aria-label="Next page"], [data-automation-id*="next-page"]:not([disabled])');
    if (!nextLink) break;
    page++;
    await new Promise(r => setTimeout(r, 500));
  }

  if (allOrders.length === 0) {
    setBadge('—');
    sendMessage({ type: 'SYNC_DONE', result: { platform: 'Walmart', scraped: 0, imported: 0, updated: 0 } });
    syncing = false;
    return;
  }

  sendMessage({ type: 'SYNC_PROGRESS', platform: 'Walmart', scraped: allOrders.length, message: `Found ${allOrders.length} orders, fetching details…` });

  await enrichWithDetails(allOrders, msg =>
    sendMessage({ type: 'SYNC_PROGRESS', platform: 'Walmart', scraped: allOrders.length, message: msg })
  );

  try {
    const result = await pushOrders(settings.trackerUrl, settings.apiKey, settings.userId, allOrders);
    await setLastSync('walmart', new Date().toISOString().split('T')[0]);
    setBadge(`+${result.imported}`, '#22c55e');
    sendMessage({ type: 'SYNC_DONE', result: { platform: 'Walmart', scraped: allOrders.length, ...result } });
  } catch (err) {
    setBadge('!', '#ef4444');
    sendMessage({ type: 'SYNC_ERROR', platform: 'Walmart', error: err instanceof Error ? err.message : String(err) });
  }

  syncing = false;
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'START_SYNC' && msg.platform === 'Walmart') sync();
});
