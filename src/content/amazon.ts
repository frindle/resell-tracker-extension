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
// Fetch the HTML order history page and parse it with DOMParser.
// Amazon renders orders in HTML; we fetch with credentials (session cookies)
// so it returns the authenticated page content.
// ---------------------------------------------------------------------------

const ORDER_HISTORY_URL = 'https://www.amazon.com/your-orders/orders';

async function fetchOrderPage(startIndex = 0): Promise<Document | null> {
  try {
    const url = `${ORDER_HISTORY_URL}?startIndex=${startIndex}`;
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) return null;
    const html = await res.text();
    return new DOMParser().parseFromString(html, 'text/html');
  } catch {
    return null;
  }
}

async function fetchOrderDetailPage(orderUrl: string): Promise<Document | null> {
  try {
    const res = await fetch(orderUrl, { credentials: 'include' });
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

  // Each order is in a .order or [class*="order-card"] block
  const blocks = Array.from(doc.querySelectorAll(
    '.order, [class*="order-card"], .a-box-group.order'
  ));

  // Fallback: find by order ID pattern in the page
  if (blocks.length === 0) {
    // Try to find order containers another way
    doc.querySelectorAll('a[href*="orderID="], a[href*="order-details"]').forEach(a => {
      const block = a.closest('.a-box-group, .a-section, [class*="order"]');
      if (block && !blocks.includes(block)) blocks.push(block);
    });
  }

  for (const block of blocks) {
    const blockText = block.textContent ?? '';

    // Extract order number
    const orderIdMatch = blockText.match(/\b(\d{3}-\d{7}-\d{7})\b/);
    if (!orderIdMatch) continue;
    const orderNumber = orderIdMatch[1];

    // Extract date
    const dateMatch = blockText.match(
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/i
    );
    if (!dateMatch) continue;
    const orderDate = new Date(dateMatch[0]);
    if (isNaN(orderDate.getTime())) continue;

    if (orderDate < sinceDate) { hasOlder = true; continue; }

    // Skip cancelled/returned
    if (/\b(cancelled|canceled|refunded|returned)\b/i.test(blockText)) continue;

    // Total — "Order Total: $XX.XX" or "Grand Total: $XX.XX"
    const totalMatch = blockText.match(/(?:order total|grand total)[:\s$]+([\d,]+\.?\d*)/i)
      ?? blockText.match(/\$([\d,]+\.\d{2})/);
    const cost = totalMatch ? parseMoney(totalMatch[1]) : 0;

    // Item title
    const titleEl = block.querySelector(
      '[class*="product-title"], [class*="item-title"], .yohtmlc-product-title, a[href*="/dp/"]'
    );
    const itemDescription = (titleEl?.textContent ?? '').trim().slice(0, 120);

    // Tracking numbers from embedded links/text
    const trackingNumbers: string[] = [];
    const trackMatches = blockText.match(/\b(1Z[A-Z0-9]{16}|[0-9]{20,22}|[A-Z]{2}[0-9]{9}[A-Z]{2})\b/g);
    if (trackMatches) trackingNumbers.push(...trackMatches);

    orders.push({
      platform: 'Amazon',
      orderNumber,
      orderDate: orderDate.toISOString().split('T')[0],
      itemDescription,
      cost,
      shippingCost: 0,
      shippingAddress: '',
      trackingNumbers: [...new Set(trackingNumbers)],
      sourceUrl: `https://www.amazon.com/gp/your-account/order-details?orderID=${orderNumber}`,
    });
  }

  return { orders, hasOlder };
}

function getNextPageStartIndex(doc: Document, currentStart: number, pageSize: number): number | null {
  // Look for pagination "Next" link
  const nextLink = doc.querySelector('a[href*="startIndex"]:last-of-type, .a-pagination .a-last a') as HTMLAnchorElement | null;
  if (nextLink?.href) {
    const m = nextLink.href.match(/startIndex=(\d+)/);
    if (m) return parseInt(m[1]);
  }
  // If we got a full page, assume there's more
  return null;
}

async function scrapeOrders(sinceDate: Date, onProgress: (msg: string) => void): Promise<ScrapedOrder[]> {
  const allOrders: ScrapedOrder[] = [];
  const seen = new Set<string>();
  let startIndex = 0;
  let page = 1;

  while (true) {
    onProgress(`Fetching orders page ${page}…`);
    const doc = await fetchOrderPage(startIndex);
    if (!doc) break;

    const { orders, hasOlder } = parseOrdersFromDoc(doc, sinceDate);

    for (const o of orders) {
      if (!seen.has(o.orderNumber)) {
        seen.add(o.orderNumber);
        allOrders.push(o);
      }
    }

    if (hasOlder) break;

    // Find next page link
    const nextLink = doc.querySelector('.a-pagination .a-last:not(.a-disabled) a') as HTMLAnchorElement | null;
    if (!nextLink) break;

    const m = nextLink.href.match(/startIndex=(\d+)/);
    if (!m) break;
    startIndex = parseInt(m[1]);
    page++;
    await new Promise(r => setTimeout(r, 500));
  }

  return allOrders;
}

async function enrichWithDetails(orders: ScrapedOrder[], onProgress: (msg: string) => void): Promise<void> {
  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];
    if ((i + 1) % 3 === 0 || i === 0) {
      onProgress(`Fetching details ${i + 1}/${orders.length}…`);
    }

    const doc = await fetchOrderDetailPage(o.sourceUrl);
    if (!doc) continue;

    // Shipping address
    const addrBlock = doc.querySelector('.displayAddressDiv, [class*="ship-to"], #shippingAddress');
    if (addrBlock) {
      o.shippingAddress = (addrBlock.textContent ?? '').replace(/\s+/g, ' ').trim();
    }

    // Tracking numbers from detail page (more reliable)
    const html = doc.documentElement.innerHTML;
    const trackMatches = html.match(/trackingId[="]([A-Z0-9]{10,30})/g) ?? [];
    const fromPage = trackMatches.map(m => m.replace(/trackingId[="]/g, '').trim());
    if (fromPage.length > 0) {
      o.trackingNumbers = [...new Set([...o.trackingNumbers, ...fromPage])];
    }

    await new Promise(r => setTimeout(r, 300));
  }
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

  const orders = await scrapeOrders(sinceDate, msg =>
    sendMessage({ type: 'SYNC_PROGRESS', platform: 'Amazon', scraped: 0, message: msg })
  );

  if (orders.length === 0) {
    setBadge('—');
    sendMessage({ type: 'SYNC_DONE', result: { platform: 'Amazon', scraped: 0, imported: 0, updated: 0 } });
    syncing = false;
    return;
  }

  sendMessage({ type: 'SYNC_PROGRESS', platform: 'Amazon', scraped: orders.length, message: `Found ${orders.length} orders, fetching details…` });

  await enrichWithDetails(orders, msg =>
    sendMessage({ type: 'SYNC_PROGRESS', platform: 'Amazon', scraped: orders.length, message: msg })
  );

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
