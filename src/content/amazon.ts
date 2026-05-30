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
// Fetch orders from Amazon's internal JSON API (same approach as the
// order-history-exporter-for-amazon extension by xenolphthalein).
// Order list includes tracking IDs in shipments[].trackingId.
// Shipping address requires fetching the individual order detail page.
// ---------------------------------------------------------------------------

type AmazonOrderJson = {
  orders?: {
    id?: string;
    orderId?: string;
    orderPlacedDate?: string;
    orderDate?: string;
    grandTotal?: { amount?: string; value?: number };
    orderTotal?: { amount?: string; value?: number };
    shipments?: Array<{
      trackingId?: string;
      packages?: Array<{ trackingId?: string }>;
    }>;
    items?: Array<{ title?: string; name?: string }>;
    [key: string]: unknown;
  }[];
  [key: string]: unknown;
};

async function fetchShippingAddress(orderId: string): Promise<string> {
  try {
    const url = `https://www.amazon.com/gp/your-account/order-details?orderID=${orderId}`;
    const res = await fetch(url, { credentials: 'include' });
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    // Amazon puts the ship-to address in a section labelled "Shipping address"
    const addrEls = doc.querySelectorAll('.displayAddressDiv, [class*="shipToData"], [class*="ship-to"]');
    for (const el of Array.from(addrEls)) {
      const text = el.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      if (text.length > 5) return text;
    }
    // Fallback: look for address near "Shipping address" label
    const labels = Array.from(doc.querySelectorAll('b, strong, h5, span'));
    for (const lbl of labels) {
      if (/shipping address/i.test(lbl.textContent ?? '')) {
        const sibling = lbl.closest('td, div')?.nextElementSibling ?? lbl.parentElement?.nextElementSibling;
        const text = sibling?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        if (text.length > 5) return text;
      }
    }
  } catch { /* ignore */ }
  return '';
}

async function fetchOrdersFromApi(year: number, startIndex: number): Promise<AmazonOrderJson> {
  const url = `https://www.amazon.com/gp/your-account/order-history?opt=ab&digitalOrders=1&unifiedOrders=1&returnTo=&orderFilter=year-${year}&startIndex=${startIndex}`;
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`Amazon API ${res.status}`);
  return res.json();
}

async function scrapeOrders(sinceDate: Date): Promise<ScrapedOrder[]> {
  const orders: ScrapedOrder[] = [];
  const seen = new Set<string>();
  const currentYear = new Date().getFullYear();
  const sinceYear = sinceDate.getFullYear();

  for (let year = currentYear; year >= sinceYear; year--) {
    let startIndex = 0;
    let hasMore = true;

    while (hasMore) {
      let data: AmazonOrderJson;
      try {
        data = await fetchOrdersFromApi(year, startIndex);
      } catch {
        break;
      }

      const items = data.orders ?? [];
      if (items.length === 0) { hasMore = false; break; }

      let foundOlder = false;
      for (const item of items) {
        const orderId = item.id ?? item.orderId ?? '';
        if (!orderId || seen.has(orderId)) continue;

        const rawDate = item.orderPlacedDate ?? item.orderDate ?? '';
        const orderDate = rawDate ? new Date(rawDate).toISOString().split('T')[0] : '';
        if (!orderDate) continue;

        const oDate = new Date(orderDate);
        if (oDate < sinceDate) { foundOlder = true; continue; }

        seen.add(orderId);

        const totalObj = item.grandTotal ?? item.orderTotal ?? {};
        const costStr = (totalObj as Record<string, unknown>).amount as string | undefined;
        const costNum = (totalObj as Record<string, unknown>).value as number | undefined;
        const cost = costNum ?? parseMoney(costStr ?? '0');

        const firstItem = (item.items ?? [])[0];
        const itemDescription = ((firstItem?.title ?? firstItem?.name ?? '') as string).slice(0, 120);

        const trackingNumbers: string[] = [];
        for (const shipment of (item.shipments ?? [])) {
          if (shipment.trackingId) trackingNumbers.push(shipment.trackingId);
          for (const pkg of (shipment.packages ?? [])) {
            if (pkg.trackingId) trackingNumbers.push(pkg.trackingId);
          }
        }

        orders.push({
          platform: 'Amazon',
          orderNumber: orderId,
          orderDate,
          itemDescription,
          cost,
          shippingCost: 0,
          shippingAddress: '',
          trackingNumbers: [...new Set(trackingNumbers)],
          sourceUrl: `https://www.amazon.com/gp/your-account/order-details?orderID=${orderId}`,
        });
      }

      // Amazon returns up to 10 per page typically; if all on this page are older, stop
      if (foundOlder && items.every(item => {
        const rawDate = item.orderPlacedDate ?? item.orderDate ?? '';
        return rawDate && new Date(rawDate) < sinceDate;
      })) {
        hasMore = false;
      } else {
        startIndex += items.length;
        if (items.length < 10) hasMore = false;
        await new Promise(r => setTimeout(r, 300));
      }
    }
  }

  return orders;
}

// ---------------------------------------------------------------------------
// Sync — triggered by popup message
// ---------------------------------------------------------------------------

let syncing = false;

async function sync() {
  if (syncing) return;
  syncing = true;

  const settings = await getSettings();
  if (!settings.trackerUrl || !settings.userId) {
    sendMessage({ type: 'SYNC_ERROR', platform: 'Amazon', error: 'Tracker URL or user not configured — open Settings.' });
    setBadge('!', '#ef4444');
    syncing = false;
    return;
  }

  const sinceDate = settings.amazonLastSync
    ? new Date(settings.amazonLastSync)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  setBadge('…');
  sendMessage({ type: 'SYNC_STARTED', platform: 'Amazon' });

  let orders: ScrapedOrder[];
  try {
    sendMessage({ type: 'SYNC_PROGRESS', platform: 'Amazon', scraped: 0, message: 'Fetching orders from Amazon…' });
    orders = await scrapeOrders(sinceDate);
  } catch (err) {
    setBadge('!', '#ef4444');
    sendMessage({ type: 'SYNC_ERROR', platform: 'Amazon', error: err instanceof Error ? err.message : String(err) });
    syncing = false;
    return;
  }

  sendMessage({ type: 'SYNC_PROGRESS', platform: 'Amazon', scraped: orders.length, message: `Found ${orders.length} orders, fetching addresses…` });

  // Fetch shipping address from each order detail page
  for (let i = 0; i < orders.length; i++) {
    orders[i].shippingAddress = await fetchShippingAddress(orders[i].orderNumber);
    await new Promise(r => setTimeout(r, 250));
    if ((i + 1) % 5 === 0) {
      sendMessage({ type: 'SYNC_PROGRESS', platform: 'Amazon', scraped: orders.length, message: `Fetching addresses… ${i + 1}/${orders.length}` });
    }
  }

  sendMessage({ type: 'SYNC_PROGRESS', platform: 'Amazon', scraped: orders.length, message: `Found ${orders.length} orders…` });

  if (orders.length === 0) {
    setBadge('—');
    sendMessage({ type: 'SYNC_DONE', result: { platform: 'Amazon', scraped: 0, imported: 0, updated: 0 } });
    syncing = false;
    return;
  }

  try {
    const result = await pushOrders(settings.trackerUrl, settings.apiKey, settings.userId, orders);
    await setLastSync('amazon', new Date().toISOString().split('T')[0]);
    setBadge(`+${result.imported}`, '#22c55e');
    sendMessage({ type: 'SYNC_DONE', result: { platform: 'Amazon', scraped: orders.length, ...result } });
  } catch (err) {
    setBadge('!', '#ef4444');
    sendMessage({ type: 'SYNC_ERROR', platform: 'Amazon', error: err instanceof Error ? err.message : String(err) });
  }

  syncing = false;
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'START_SYNC' && msg.platform === 'Amazon') sync();
});
