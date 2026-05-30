import { getSettings, setLastSync } from '../lib/storage';
import { pushOrders } from '../lib/api';
import type { ScrapedOrder, SyncMessage } from '../lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseMoney(text: string): number {
  return parseFloat(text.replace(/[^0-9.-]/g, '')) || 0;
}

function parseDate(text: string): string {
  const d = new Date(text.trim());
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return text.trim();
}

function sendMessage(msg: SyncMessage) {
  chrome.runtime.sendMessage(msg).catch(() => {/* popup may be closed */});
}

// ---------------------------------------------------------------------------
// Scrape a single order detail page for tracking numbers
// ---------------------------------------------------------------------------

async function fetchTrackingNumbers(orderUrl: string): Promise<string[]> {
  try {
    const res = await fetch(orderUrl, { credentials: 'include' });
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const numbers: string[] = [];

    // Tracking numbers appear in various places on Amazon order detail pages
    doc.querySelectorAll('[data-a-modal], .a-expander-content, .ship-track-info').forEach(el => {
      const text = el.textContent ?? '';
      // Match common carrier tracking number patterns
      const matches = text.match(/\b(1Z[A-Z0-9]{16}|[0-9]{12,22}|[A-Z]{2}[0-9]{9}[A-Z]{2})\b/g);
      if (matches) numbers.push(...matches);
    });

    // Also check the raw HTML for tracking links
    const trackMatches = html.match(/trackingId=([A-Z0-9]+)/g);
    if (trackMatches) {
      trackMatches.forEach(m => {
        const id = m.replace('trackingId=', '');
        if (!numbers.includes(id)) numbers.push(id);
      });
    }

    return [...new Set(numbers)];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Scrape order cards from the current orders list page
// ---------------------------------------------------------------------------

function scrapeOrdersFromPage(sinceDate: Date): ScrapedOrder[] {
  const orders: ScrapedOrder[] = [];

  // Amazon renders orders in .order blocks
  const orderBlocks = document.querySelectorAll('.order, [data-component="order"]');

  orderBlocks.forEach(block => {
    // Order ID
    const orderIdEl = block.querySelector('.yohtmlc-order-id span:last-child, [data-a-selector="order-id"] span');
    const orderNumber = orderIdEl?.textContent?.trim() ?? '';
    if (!orderNumber) return;

    // Date
    const dateEl = block.querySelector('.order-date-invoice-item, .a-color-secondary');
    const rawDate = dateEl?.textContent?.replace(/order placed/i, '').trim() ?? '';
    const orderDate = parseDate(rawDate);
    if (!orderDate) return;

    // Skip if before sinceDate
    if (new Date(orderDate) < sinceDate) return;

    // Skip cancelled or returned orders
    const statusEl = block.querySelector('.a-color-error, [class*="order-status"], .shipment-status');
    const statusText = (statusEl?.textContent ?? block.textContent ?? '').toLowerCase();
    if (/cancelled|canceled|returned|refunded/.test(statusText)) return;

    // Total
    const totalEl = block.querySelector('.a-color-price, .grand-total-price');
    const cost = parseMoney(totalEl?.textContent ?? '0');

    // Item description — first item title
    const itemEl = block.querySelector('.yohtmlc-product-title, .a-link-normal[href*="/dp/"]');
    const itemDescription = itemEl?.textContent?.trim() ?? '';

    // Order detail URL
    const detailLink = block.querySelector('a[href*="order-details"], a[href*="orderID"]') as HTMLAnchorElement | null;
    const sourceUrl = detailLink?.href ?? `https://www.amazon.com/gp/your-account/order-details?orderID=${orderNumber}`;

    // Shipping address (not always visible on list page)
    const addrEl = block.querySelector('.displayAddressDiv, .ship-to-address');
    const shippingAddress = addrEl?.textContent?.trim().replace(/\s+/g, ' ') ?? '';

    orders.push({
      platform: 'Amazon',
      orderNumber,
      orderDate,
      itemDescription,
      cost,
      shippingCost: 0,
      shippingAddress,
      trackingNumbers: [],
      sourceUrl,
    });
  });

  return orders;
}

// ---------------------------------------------------------------------------
// Main sync flow
// ---------------------------------------------------------------------------

async function sync() {
  const settings = await getSettings();
  if (!settings.trackerUrl) {
    console.log('[Resell Tracker] No tracker URL configured — open extension options to set it up.');
    return;
  }

  const sinceDate = settings.amazonLastSync
    ? new Date(settings.amazonLastSync)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // default: last 30 days

  sendMessage({ type: 'SYNC_STARTED', platform: 'Amazon' });

  const orders = scrapeOrdersFromPage(sinceDate);
  if (orders.length === 0) {
    sendMessage({ type: 'SYNC_DONE', result: { platform: 'Amazon', scraped: 0, imported: 0, updated: 0 } });
    return;
  }

  sendMessage({ type: 'SYNC_PROGRESS', platform: 'Amazon', scraped: orders.length, message: `Found ${orders.length} orders, fetching tracking…` });

  // Fetch tracking numbers for each order (rate-limit to avoid hammering Amazon)
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    order.trackingNumbers = await fetchTrackingNumbers(order.sourceUrl);
    await new Promise(r => setTimeout(r, 400));
    if (i % 5 === 0) {
      sendMessage({ type: 'SYNC_PROGRESS', platform: 'Amazon', scraped: orders.length, message: `Fetching tracking… ${i + 1}/${orders.length}` });
    }
  }

  try {
    const result = await pushOrders(settings.trackerUrl, settings.apiKey, settings.userId, orders);
    await setLastSync('amazon', new Date().toISOString().split('T')[0]);
    sendMessage({ type: 'SYNC_DONE', result: { platform: 'Amazon', scraped: orders.length, ...result } });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    sendMessage({ type: 'SYNC_ERROR', platform: 'Amazon', error });
  }
}

// Only run on order history pages, not individual order detail pages
if (
  location.pathname.includes('order-history') ||
  location.pathname.includes('your-orders') ||
  location.search.includes('startIndex')
) {
  // Wait for page to render
  setTimeout(sync, 1500);
}
