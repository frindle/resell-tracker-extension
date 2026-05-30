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

function formatOrderNumber(raw: string): string {
  // Walmart URLs use the number with no hyphen; strip any that got in
  return raw.replace(/\D/g, '');
}

function sendMessage(msg: SyncMessage) {
  chrome.runtime.sendMessage(msg).catch(() => {/* popup may be closed */});
}

// ---------------------------------------------------------------------------
// Scrape tracking numbers from a Walmart order detail page
// ---------------------------------------------------------------------------

async function fetchTrackingNumbers(orderNumber: string): Promise<string[]> {
  try {
    const url = `https://www.walmart.com/orders/${orderNumber}`;
    const res = await fetch(url, { credentials: 'include' });
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const numbers: string[] = [];

    doc.querySelectorAll('[data-automation-id*="tracking"], .tracking-number, [class*="tracking"]').forEach(el => {
      const text = el.textContent ?? '';
      const matches = text.match(/\b(1Z[A-Z0-9]{16}|[0-9]{12,22}|[A-Z]{2}[0-9]{9}[A-Z]{2})\b/g);
      if (matches) numbers.push(...matches);
    });

    // Also scan raw HTML for tracking patterns
    const trackMatches = html.match(/trackingNumber["\s:]+["']?([A-Z0-9]{10,25})/g);
    if (trackMatches) {
      trackMatches.forEach(m => {
        const id = m.match(/([A-Z0-9]{10,25})$/)?.[1];
        if (id && !numbers.includes(id)) numbers.push(id);
      });
    }

    return [...new Set(numbers)];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Scrape order cards from the Walmart orders list page
// ---------------------------------------------------------------------------

function scrapeOrdersFromPage(sinceDate: Date): ScrapedOrder[] {
  const orders: ScrapedOrder[] = [];

  // Walmart renders orders in various containers depending on page version
  const orderBlocks = document.querySelectorAll(
    '[data-automation-id*="order-card"], [data-testid*="order"], .order-card, article[class*="order"]'
  );

  orderBlocks.forEach(block => {
    // Order number
    const orderNumEl = block.querySelector('[data-automation-id*="order-number"], [class*="order-number"], [class*="orderNumber"]');
    const rawOrderNum = orderNumEl?.textContent?.replace(/order\s*#?/i, '').trim() ?? '';
    const orderNumber = formatOrderNumber(rawOrderNum);
    if (!orderNumber) return;

    // Date
    const dateEl = block.querySelector('[data-automation-id*="order-date"], [class*="order-date"], time');
    const orderDate = parseDate(dateEl?.textContent ?? dateEl?.getAttribute('datetime') ?? '');
    if (!orderDate) return;

    if (new Date(orderDate) < sinceDate) return;

    // Skip cancelled or returned orders
    const statusEl = block.querySelector('[data-automation-id*="delivery-status"], [class*="delivery-status"], [class*="order-status"]');
    const statusText = (statusEl?.textContent ?? '').toLowerCase();
    if (/cancelled|canceled|returned|refunded/.test(statusText)) return;

    // Total
    const totalEl = block.querySelector('[data-automation-id*="order-total"], [class*="total"]');
    const cost = parseMoney(totalEl?.textContent ?? '0');

    // Item description — first item name
    const itemEl = block.querySelector('[data-automation-id*="product-name"], [class*="product-name"], [class*="item-name"]');
    const itemDescription = itemEl?.textContent?.trim() ?? '';

    // Shipping address
    const addrEl = block.querySelector('[data-automation-id*="shipping-address"], [class*="shipping-address"]');
    const shippingAddress = addrEl?.textContent?.trim().replace(/\s+/g, ' ') ?? '';

    const sourceUrl = `https://www.walmart.com/orders/${orderNumber}`;

    orders.push({
      platform: 'Walmart',
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

  const sinceDate = settings.walmartLastSync
    ? new Date(settings.walmartLastSync)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  sendMessage({ type: 'SYNC_STARTED', platform: 'Walmart' });

  const orders = scrapeOrdersFromPage(sinceDate);
  if (orders.length === 0) {
    sendMessage({ type: 'SYNC_DONE', result: { platform: 'Walmart', scraped: 0, imported: 0, updated: 0 } });
    return;
  }

  sendMessage({ type: 'SYNC_PROGRESS', platform: 'Walmart', scraped: orders.length, message: `Found ${orders.length} orders, fetching tracking…` });

  for (let i = 0; i < orders.length; i++) {
    orders[i].trackingNumbers = await fetchTrackingNumbers(orders[i].orderNumber);
    await new Promise(r => setTimeout(r, 400));
    if (i % 5 === 0) {
      sendMessage({ type: 'SYNC_PROGRESS', platform: 'Walmart', scraped: orders.length, message: `Fetching tracking… ${i + 1}/${orders.length}` });
    }
  }

  try {
    const result = await pushOrders(settings.trackerUrl, settings.apiKey, settings.userId, orders);
    await setLastSync('walmart', new Date().toISOString().split('T')[0]);
    sendMessage({ type: 'SYNC_DONE', result: { platform: 'Walmart', scraped: orders.length, ...result } });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    sendMessage({ type: 'SYNC_ERROR', platform: 'Walmart', error });
  }
}

// Only run on orders list page, not individual order detail pages
if (location.pathname === '/orders' || location.pathname.startsWith('/account/order-history')) {
  setTimeout(sync, 1500);
}
