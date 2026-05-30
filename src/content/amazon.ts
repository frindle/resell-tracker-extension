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
  chrome.runtime.sendMessage(msg).catch(() => {});
}

function setBadge(text: string, color = '#3b82f6') {
  chrome.runtime.sendMessage({ type: 'SET_BADGE', text, color }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Scrape tracking numbers from order detail page
// ---------------------------------------------------------------------------

async function fetchTrackingNumbers(orderUrl: string): Promise<string[]> {
  try {
    const res = await fetch(orderUrl, { credentials: 'include' });
    const html = await res.text();
    const numbers: string[] = [];
    const trackMatches = html.match(/trackingId=([A-Z0-9]+)/g);
    if (trackMatches) {
      trackMatches.forEach(m => {
        const id = m.replace('trackingId=', '');
        if (!numbers.includes(id)) numbers.push(id);
      });
    }
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('[data-a-modal], .a-expander-content').forEach(el => {
      const matches = (el.textContent ?? '').match(/\b(1Z[A-Z0-9]{16}|[0-9]{12,22})\b/g);
      if (matches) numbers.push(...matches);
    });
    return [...new Set(numbers)];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Scrape orders from page — tries multiple Amazon DOM layouts
// ---------------------------------------------------------------------------

function scrapeOrdersFromPage(sinceDate: Date): ScrapedOrder[] {
  const orders: ScrapedOrder[] = [];

  // Amazon uses several different containers across page versions
  const blocks = Array.from(document.querySelectorAll(
    '.order, [data-component="order"], .js-order-card, ' +
    'div[class*="order-card"], div[class*="OrderCard"], ' +
    '[data-testid*="order"]'
  ));

  // Fallback: look for order ID links directly if no blocks found
  if (blocks.length === 0) {
    const orderLinks = Array.from(document.querySelectorAll('a[href*="orderID="], a[href*="order-details"]')) as HTMLAnchorElement[];
    orderLinks.forEach(link => {
      const match = link.href.match(/orderID=([A-Z0-9-]+)/);
      if (!match) return;
      const orderNumber = match[1];
      const block = link.closest('div, section, article') ?? link.parentElement;
      if (!block) return;
      if (blocks.includes(block)) return;
      blocks.push(block);
    });
  }

  blocks.forEach(block => {
    // Order ID — try several selectors
    const orderIdEl = block.querySelector(
      '.yohtmlc-order-id span:last-child, ' +
      '[data-a-selector="order-id"] span, ' +
      'bdi, ' +
      '[class*="order-id"]'
    );
    let orderNumber = orderIdEl?.textContent?.trim() ?? '';

    // Try extracting from a link href
    if (!orderNumber) {
      const link = block.querySelector('a[href*="orderID="]') as HTMLAnchorElement | null;
      const match = link?.href?.match(/orderID=([A-Z0-9-]+)/);
      if (match) orderNumber = match[1];
    }
    if (!orderNumber) return;

    // Date
    const dateEl = block.querySelector(
      '.order-date-invoice-item, ' +
      '[class*="order-date"], ' +
      'span[class*="date"], ' +
      '.a-color-secondary'
    );
    const rawDate = (dateEl?.textContent ?? '').replace(/order\s+placed/i, '').trim();
    const orderDate = parseDate(rawDate);
    if (!orderDate || orderDate === rawDate) return; // couldn't parse

    if (new Date(orderDate) < sinceDate) return;

    // Skip cancelled / returned
    const blockText = (block.textContent ?? '').toLowerCase();
    if (/cancelled|canceled|returned|refunded/.test(blockText) &&
        !/items? returned|return window/.test(blockText)) return;

    // Total
    const totalEl = block.querySelector(
      '.a-color-price, .grand-total-price, ' +
      '[class*="order-total"], [class*="total-price"]'
    );
    const cost = parseMoney(totalEl?.textContent ?? '0');

    // Item description
    const itemEl = block.querySelector(
      '.yohtmlc-product-title, ' +
      '.a-link-normal[href*="/dp/"], ' +
      '[class*="product-title"], ' +
      '[class*="item-title"]'
    );
    const itemDescription = itemEl?.textContent?.trim() ?? '';

    // Detail URL
    const detailLink = block.querySelector('a[href*="order-details"], a[href*="orderID"]') as HTMLAnchorElement | null;
    const sourceUrl = detailLink?.href ?? `https://www.amazon.com/gp/your-account/order-details?orderID=${orderNumber}`;

    // Shipping address
    const addrEl = block.querySelector('.displayAddressDiv, .ship-to-address, [class*="ship-address"]');
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
// Main sync
// ---------------------------------------------------------------------------

let syncing = false;

async function sync() {
  if (syncing) return;
  syncing = true;

  const settings = await getSettings();
  if (!settings.trackerUrl || !settings.userId) {
    console.log('[Reselling Tracker] Configure tracker URL and user in extension settings.');
    setBadge('!', '#ef4444');
    syncing = false;
    return;
  }

  const sinceDate = settings.amazonLastSync
    ? new Date(settings.amazonLastSync)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  setBadge('…');
  sendMessage({ type: 'SYNC_STARTED', platform: 'Amazon' });

  const orders = scrapeOrdersFromPage(sinceDate);

  if (orders.length === 0) {
    setBadge('0');
    sendMessage({ type: 'SYNC_DONE', result: { platform: 'Amazon', scraped: 0, imported: 0, updated: 0 } });
    syncing = false;
    return;
  }

  sendMessage({ type: 'SYNC_PROGRESS', platform: 'Amazon', scraped: orders.length, message: `Found ${orders.length} orders, fetching tracking…` });

  for (let i = 0; i < orders.length; i++) {
    orders[i].trackingNumbers = await fetchTrackingNumbers(orders[i].sourceUrl);
    await new Promise(r => setTimeout(r, 300));
  }

  try {
    const result = await pushOrders(settings.trackerUrl, settings.apiKey, settings.userId, orders);
    await setLastSync('amazon', new Date().toISOString().split('T')[0]);
    setBadge(`+${result.imported}`, '#22c55e');
    sendMessage({ type: 'SYNC_DONE', result: { platform: 'Amazon', scraped: orders.length, ...result } });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    setBadge('!', '#ef4444');
    sendMessage({ type: 'SYNC_ERROR', platform: 'Amazon', error });
  }

  syncing = false;
}

// ---------------------------------------------------------------------------
// Run on page load + watch for SPA navigation
// ---------------------------------------------------------------------------

function isOrdersPage() {
  return (
    location.pathname.includes('order-history') ||
    location.pathname.includes('your-orders') ||
    location.pathname.includes('order-history') ||
    location.search.includes('startIndex') ||
    location.search.includes('orderID') === false && location.pathname.includes('orders')
  );
}

if (isOrdersPage()) {
  setTimeout(sync, 2000);
}

// Re-run if Amazon does a client-side navigation to an orders page
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    if (isOrdersPage()) setTimeout(sync, 2000);
  }
}).observe(document.body, { childList: true, subtree: true });
