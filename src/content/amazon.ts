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
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchPage(url: string): Promise<{ doc: Document; html: string } | null> {
  try {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) return null;
    const html = await res.text();
    return { html, doc: new DOMParser().parseFromString(html, 'text/html') };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Parse orders out of a fetched Amazon orders page.
// Tries __NEXT_DATA__ JSON first, then falls back to HTML patterns.
// ---------------------------------------------------------------------------

function parseOrdersFromPage(
  doc: Document,
  html: string,
  sinceDate: Date,
): { orders: ScrapedOrder[]; hasOlder: boolean; nextUrl: string | null } {
  const orders: ScrapedOrder[] = [];
  let hasOlder = false;

  // Strategy 1: __NEXT_DATA__ (Amazon uses Next.js on newer order pages)
  const nextDataEl = doc.getElementById('__NEXT_DATA__');
  if (nextDataEl?.textContent) {
    try {
      const json = JSON.parse(nextDataEl.textContent);
      const orderList: unknown[] = findOrdersInObject(json);
      if (orderList.length > 0) {
        for (const raw of orderList) {
          const item = raw as Record<string, unknown>;
          const result = extractOrderFromJson(item, sinceDate);
          if (result === 'older') { hasOlder = true; continue; }
          if (result === 'skip') continue;
          orders.push(result);
        }
        const nextUrl = findNextPageUrl(doc, html);
        return { orders, hasOlder, nextUrl };
      }
    } catch { /* fall through */ }
  }

  // Strategy 2: Regex scan for order IDs and nearby dates in raw HTML
  // Amazon order IDs: 3-digit-7-digit-7-digit
  const orderIdPattern = /\b(\d{3}-\d{7}-\d{7})\b/g;
  const found = new Set<string>();
  let m: RegExpExecArray | null;

  while ((m = orderIdPattern.exec(html)) !== null) {
    const orderId = m[1];
    if (found.has(orderId)) continue;
    found.add(orderId);

    // Grab surrounding context (2000 chars) to find date and total
    const start = Math.max(0, m.index - 1000);
    const end = Math.min(html.length, m.index + 1000);
    const ctx = html.slice(start, end);

    // Find a date in context
    const dateMatch = ctx.match(
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i
    ) ?? ctx.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);

    let orderDate = '';
    if (dateMatch) {
      const d = new Date(dateMatch[0]);
      if (!isNaN(d.getTime())) {
        if (d < sinceDate) { hasOlder = true; continue; }
        orderDate = d.toISOString().split('T')[0];
      }
    }

    // Skip cancelled
    if (/\b(cancelled|canceled|refunded|returned)\b/i.test(ctx)) continue;

    // Find total
    const totalMatch = ctx.match(/(?:order total|grand total)[^$]*\$([\d,]+\.?\d*)/i)
      ?? ctx.match(/\$([\d,]+\.\d{2})/);
    const cost = totalMatch ? parseMoney(totalMatch[1]) : 0;

    // Item title — look for title-like text near the order ID
    const titleMatch = ctx.match(/"title":"([^"]{5,120})"/i)
      ?? ctx.match(/class="[^"]*product-title[^"]*"[^>]*>([^<]{5,120})</i);
    const itemDescription = titleMatch ? titleMatch[1].trim() : '';

    orders.push({
      platform: 'Amazon',
      orderNumber: orderId,
      orderDate,
      itemDescription,
      cost,
      shippingCost: 0,
      shippingAddress: '',
      trackingNumbers: [],
      sourceUrl: `https://www.amazon.com/gp/your-account/order-details?orderID=${orderId}`,
    });
  }

  const nextUrl = findNextPageUrl(doc, html);
  return { orders, hasOlder, nextUrl };
}

function findOrdersInObject(obj: unknown, depth = 0): unknown[] {
  if (depth > 8 || obj == null || typeof obj !== 'object') return [];
  if (Array.isArray(obj)) {
    // Check if this looks like an orders array
    if (obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null) {
      const first = obj[0] as Record<string, unknown>;
      if ('orderId' in first || 'orderNo' in first || 'id' in first) {
        return obj;
      }
    }
    for (const item of obj) {
      const result = findOrdersInObject(item, depth + 1);
      if (result.length > 0) return result;
    }
  } else {
    const rec = obj as Record<string, unknown>;
    for (const key of ['orders', 'orderHistory', 'orderList', 'orderItems']) {
      if (Array.isArray(rec[key]) && (rec[key] as unknown[]).length > 0) return rec[key] as unknown[];
    }
    for (const val of Object.values(rec)) {
      const result = findOrdersInObject(val, depth + 1);
      if (result.length > 0) return result;
    }
  }
  return [];
}

function extractOrderFromJson(
  item: Record<string, unknown>,
  sinceDate: Date,
): ScrapedOrder | 'skip' | 'older' {
  const orderId = String(item.orderId ?? item.orderNo ?? item.id ?? '');
  if (!orderId || !/\d{3}-\d{7}-\d{7}/.test(orderId)) return 'skip';

  const rawDate = String(item.orderPlacedDate ?? item.orderDate ?? item.placedDate ?? '');
  const d = rawDate ? new Date(rawDate) : null;
  if (!d || isNaN(d.getTime())) return 'skip';
  if (d < sinceDate) return 'older';

  const statusRaw = String(item.status ?? item.orderStatus ?? '').toLowerCase();
  if (/cancel|return|refund/.test(statusRaw)) return 'skip';

  const totalObj = (item.grandTotal ?? item.orderTotal ?? {}) as Record<string, unknown>;
  const cost = typeof totalObj === 'number'
    ? totalObj
    : parseMoney(String(totalObj.amount ?? totalObj.value ?? 0));

  const lineItems = ((item.items ?? item.lineItems ?? []) as Record<string, unknown>[]);
  const firstItem = lineItems[0] ?? {};
  const itemDescription = String(firstItem.title ?? firstItem.name ?? '').slice(0, 120);

  return {
    platform: 'Amazon',
    orderNumber: orderId,
    orderDate: d.toISOString().split('T')[0],
    itemDescription,
    cost,
    shippingCost: 0,
    shippingAddress: '',
    trackingNumbers: [],
    sourceUrl: `https://www.amazon.com/gp/your-account/order-details?orderID=${orderId}`,
  };
}

function findNextPageUrl(doc: Document, html: string): string | null {
  // Look for pagination next link
  const nextEl = doc.querySelector(
    '.a-pagination .a-last:not(.a-disabled) a, [aria-label="Go to next page"], a[href*="startIndex"]'
  ) as HTMLAnchorElement | null;
  if (nextEl?.href && nextEl.href.includes('startIndex')) return nextEl.href;

  // Scan HTML for next page startIndex
  const m = html.match(/startIndex=(\d+)[^"]*"[^>]*>(?:Next|›)/i);
  if (m) return `https://www.amazon.com/your-orders/orders?startIndex=${m[1]}`;

  return null;
}

// ---------------------------------------------------------------------------
// Enrich with order detail pages (tracking + shipping address)
// ---------------------------------------------------------------------------

async function enrichWithDetails(orders: ScrapedOrder[], onProgress: (msg: string) => void): Promise<void> {
  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];
    if (i % 3 === 0) onProgress(`Fetching details ${i + 1}/${orders.length}…`);

    const result = await fetchPage(o.sourceUrl);
    if (!result) continue;
    const { doc, html } = result;

    // Shipping address
    const addrEl = doc.querySelector('.displayAddressDiv, [class*="ship-to"], #shipToData');
    if (addrEl) o.shippingAddress = (addrEl.textContent ?? '').replace(/\s+/g, ' ').trim();

    // Tracking numbers
    const trackNums = new Set<string>();
    const patterns = [
      /trackingId[=\s"':]+([A-Z0-9]{10,30})/g,
      /\b(1Z[A-Z0-9]{16})\b/g,
      /\b([0-9]{20,22})\b/g,
    ];
    for (const pat of patterns) {
      let m: RegExpExecArray | null;
      while ((m = pat.exec(html)) !== null) trackNums.add(m[1]);
    }
    if (trackNums.size > 0) o.trackingNumbers = [...trackNums];

    await new Promise(r => setTimeout(r, 300));
  }
}

// ---------------------------------------------------------------------------
// Sync
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
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // default 90 days

  setBadge('…');
  sendMessage({ type: 'SYNC_STARTED', platform: 'Amazon' });

  const allOrders: ScrapedOrder[] = [];
  const seen = new Set<string>();
  let url: string | null = 'https://www.amazon.com/your-orders/orders';
  let page = 1;

  while (url) {
    sendMessage({ type: 'SYNC_PROGRESS', platform: 'Amazon', scraped: allOrders.length, message: `Fetching page ${page}…` });
    const result = await fetchPage(url);
    if (!result) break;

    // Debug: log page title and first order ID found so we can verify parsing
    const pageTitle = result.doc.title;
    const firstId = result.html.match(/\b(\d{3}-\d{7}-\d{7})\b/)?.[1] ?? 'none';
    console.log(`[Amazon sync] page ${page} title="${pageTitle}" firstOrderId=${firstId} htmlLen=${result.html.length}`);

    const { orders, hasOlder, nextUrl } = parseOrdersFromPage(result.doc, result.html, sinceDate);
    console.log(`[Amazon sync] page ${page}: found ${orders.length} orders, hasOlder=${hasOlder}, nextUrl=${nextUrl}`);
    for (const o of orders) {
      if (!seen.has(o.orderNumber)) { seen.add(o.orderNumber); allOrders.push(o); }
    }

    if (hasOlder) break;
    if (orders.length === 0) break; // empty page = end of results
    if (page >= 20) break; // safety limit
    url = nextUrl;
    page++;
    await new Promise(r => setTimeout(r, 500));
  }

  sendMessage({ type: 'SYNC_PROGRESS', platform: 'Amazon', scraped: allOrders.length, message: `Found ${allOrders.length} orders` });

  if (allOrders.length === 0) {
    setBadge('—');
    sendMessage({ type: 'SYNC_DONE', result: { platform: 'Amazon', scraped: 0, imported: 0, updated: 0 } });
    syncing = false;
    return;
  }

  sendMessage({ type: 'SYNC_PROGRESS', platform: 'Amazon', scraped: allOrders.length, message: `Fetching tracking & addresses for ${allOrders.length} orders…` });
  await enrichWithDetails(allOrders, msg =>
    sendMessage({ type: 'SYNC_PROGRESS', platform: 'Amazon', scraped: allOrders.length, message: msg })
  );

  try {
    const result = await pushOrders(settings.trackerUrl, settings.apiKey, settings.userId, allOrders);
    await setLastSync('amazon', new Date().toISOString().split('T')[0]);
    setBadge(`+${result.imported}`, '#22c55e');
    sendMessage({ type: 'SYNC_DONE', result: { platform: 'Amazon', scraped: allOrders.length, ...result } });
  } catch (err) {
    setBadge('!', '#ef4444');
    sendMessage({ type: 'SYNC_ERROR', platform: 'Amazon', error: err instanceof Error ? err.message : String(err) });
  }

  syncing = false;
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'START_SYNC' && msg.platform === 'Amazon') sync();
});
