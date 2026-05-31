import { getSettings, setLastSync } from '../lib/storage';
import { pushOrders } from '../lib/api';
import type { ScrapedOrder, SyncMessage } from '../lib/types';

console.log('[AMZ] content script loaded', location.href);

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
// Scrape an order list page (live DOM or parsed HTML document)
// ---------------------------------------------------------------------------

function scrapeDoc(doc: Document, sinceDate: Date): { orders: ScrapedOrder[]; hasOlder: boolean } {
  const orders: ScrapedOrder[] = [];
  let hasOlder = false;
  const seen = new Set<string>();

  const orderLinks = Array.from(doc.querySelectorAll<HTMLAnchorElement>(
    'a[href*="orderID="], a[href*="orderId="], a[href*="order-details"]'
  ));

  for (const link of orderLinks) {
    const idMatch = link.href.match(/[oO]rder[Ii][Dd]=([0-9A-Z-]{10,})/);
    if (!idMatch) continue;
    const orderId = idMatch[1];
    if (seen.has(orderId)) continue;
    seen.add(orderId);

    let header: Element | null = link;
    for (let i = 0; i < 15; i++) {
      header = header?.parentElement ?? null;
      if (!header) break;
      if (header.className && /order-header/.test(header.className)) break;
    }
    const card: Element | null = header?.parentElement ?? null;
    if (!card) continue;
    const cardText = (card.textContent ?? '').replace(/\s+/g, ' ');

    const dateMatch = cardText.match(/Order placed\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})/i)
      ?? cardText.match(/((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/i)
      ?? cardText.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4})/i);

    if (!dateMatch) continue;

    const orderDate = new Date(dateMatch[1]);
    if (isNaN(orderDate.getTime())) continue;
    if (orderDate.toISOString().split('T')[0] < sinceDate.toISOString().split('T')[0]) { hasOlder = true; continue; }

    if (/\b(cancelled|canceled|refunded|returned)\b/i.test(cardText)) continue;

    const totalMatch = cardText.match(/Total\s+\$?([\d,]+\.?\d*)/i);
    const cost = totalMatch ? parseMoney(totalMatch[1]) : 0;

    let shippingAddress = '';
    const addrMatch = cardText.match(/Ship to\s+(.+?)\s+United States/is);
    if (addrMatch) {
      const full = addrMatch[1].replace(/\s+/g, ' ').trim();
      const digitIdx = full.search(/\d/);
      shippingAddress = digitIdx > 0 ? full.slice(digitIdx) : full;
    }

    const titleEl = card.querySelector(
      '[class*="product-title"],[class*="item-title"],[class*="yohtmlc-item"],[class*="a-link-normal"][href*="/dp/"],[data-component*="item"] a,a[href*="/dp/"]'
    );
    const itemDescription = (titleEl?.textContent ?? '').trim().slice(0, 120);

    orders.push({
      platform: 'Amazon',
      orderNumber: orderId,
      orderDate: orderDate.toISOString().split('T')[0],
      itemDescription,
      cost,
      shippingCost: 0,
      shippingAddress,
      trackingNumbers: [],
      sourceUrl: `https://www.amazon.com/gp/your-account/order-details?orderID=${orderId}`,
    });
  }

  return { orders, hasOlder };
}

function getNextStartIndex(doc: Document): number | null {
  const nextEl = doc.querySelector(
    '.a-pagination .a-last:not(.a-disabled) a, [aria-label="Next page"] a'
  ) as HTMLAnchorElement | null;
  if (!nextEl?.href) return null;
  const m = nextEl.href.match(/startIndex=(\d+)/);
  return m ? parseInt(m[1]) : null;
}

// ---------------------------------------------------------------------------
// Fetch an orders page as HTML without navigating (avoids trust token quota)
// ---------------------------------------------------------------------------

async function fetchOrdersPage(startIndex: number): Promise<Document | null> {
  const url = `https://www.amazon.com/your-orders/orders?startIndex=${startIndex}`;
  try {
    // Route through background service worker to avoid trust token quota errors
    const resp = await chrome.runtime.sendMessage({ type: 'FETCH_HTML', url });
    if (resp?.error) { console.warn('[AMZ] fetch page error', resp.error); return null; }
    return new DOMParser().parseFromString(resp.html, 'text/html');
  } catch (e) {
    console.warn('[AMZ] fetch page error', e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Wait for React to render order links on the current live page
// ---------------------------------------------------------------------------

function waitForOrders(timeoutMs = 15000): Promise<void> {
  return new Promise(resolve => {
    const start = Date.now();
    function check() {
      const links = document.querySelectorAll('a[href*="orderID="], a[href*="orderId="], a[href*="order-details"]');
      if (links.length > 0) { console.log('[AMZ] found', links.length, 'order links'); resolve(); return; }
      if (Date.now() - start > timeoutMs) {
        console.warn('[AMZ] waitForOrders timed out — url:', location.href, '— sample links:', Array.from(document.querySelectorAll('a[href]')).slice(0, 5).map((a: Element) => (a as HTMLAnchorElement).href));
        resolve();
        return;
      }
      setTimeout(check, 500);
    }
    check();
  });
}

// ---------------------------------------------------------------------------
// Sync state stored in sessionStorage so it survives page navigation
// ---------------------------------------------------------------------------

const STATE_KEY = '__resell_sync_state__';

interface SyncState {
  sinceDate: string;
  trackerUrl: string;
  apiKey: string;
  userId: string;
}

function saveState(state: SyncState) {
  sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function loadState(): SyncState | null {
  try {
    const raw = sessionStorage.getItem(STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearState() {
  sessionStorage.removeItem(STATE_KEY);
}

// ---------------------------------------------------------------------------
// Main sync — scrape page 1 from live DOM, fetch remaining pages via fetch()
// ---------------------------------------------------------------------------

let syncing = false;

async function runSync(state: SyncState) {
  const sinceDate = new Date(state.sinceDate);
  const allOrders: ScrapedOrder[] = [];
  const seen = new Set<string>();

  sendMessage({ type: 'SYNC_PROGRESS', platform: 'Amazon', scraped: 0, message: 'Scraping page 1…' });

  // Page 1: read live DOM (React-rendered)
  console.log('[AMZ] waiting for orders on', location.href);
  await waitForOrders();
  console.log('[AMZ] scraping page 1, sinceDate:', sinceDate.toISOString().split('T')[0]);
  const page1 = scrapeDoc(document, sinceDate);
  console.log('[AMZ] page 1 result:', page1.orders.length, 'orders, hasOlder:', page1.hasOlder);
  for (const o of page1.orders) {
    if (!seen.has(o.orderNumber)) { seen.add(o.orderNumber); allOrders.push(o); }
  }

  // Subsequent pages: fetch HTML directly — no navigation, no trust token burn
  if (!page1.hasOlder && allOrders.length < 200) {
    let nextIndex = getNextStartIndex(document);
    let pageNum = 2;

    while (nextIndex !== null && allOrders.length < 200) {
      sendMessage({ type: 'SYNC_PROGRESS', platform: 'Amazon', scraped: allOrders.length, message: `Scraping page ${pageNum}…` });

      // Small delay to be polite to Amazon's servers
      await new Promise(r => setTimeout(r, 1500));

      const doc = await fetchOrdersPage(nextIndex);
      if (!doc) break;

      const { orders, hasOlder } = scrapeDoc(doc, sinceDate);
      for (const o of orders) {
        if (!seen.has(o.orderNumber)) { seen.add(o.orderNumber); allOrders.push(o); }
      }

      if (hasOlder) break;
      nextIndex = getNextStartIndex(doc);
      pageNum++;
    }
  }

  clearState();

  if (allOrders.length === 0) {
    setBadge('—');
    sendMessage({ type: 'SYNC_DONE', result: { platform: 'Amazon', scraped: 0, imported: 0, updated: 0 } });
    syncing = false;
    return;
  }

  try {
    const result = await pushOrders(state.trackerUrl, state.apiKey, state.userId, allOrders);
    await setLastSync('amazon', new Date().toISOString().split('T')[0]);
    setBadge(`+${result.imported}`, '#22c55e');
    sendMessage({ type: 'SYNC_DONE', result: { platform: 'Amazon', scraped: allOrders.length, ...result } });
  } catch (err) {
    setBadge('!', '#ef4444');
    sendMessage({ type: 'SYNC_ERROR', platform: 'Amazon', error: err instanceof Error ? err.message : String(err) });
  }

  syncing = false;
}

async function startSync() {
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
    ? new Date(new Date(settings.amazonLastSync).getTime() - 24 * 60 * 60 * 1000)
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  setBadge('…');
  sendMessage({ type: 'SYNC_STARTED', platform: 'Amazon' });

  const onOrdersPage = location.pathname.includes('your-orders') || location.pathname.includes('order-history');
  const hasStartIndex = new URL(location.href).searchParams.has('startIndex');

  const state: SyncState = {
    sinceDate: sinceDate.toISOString(),
    trackerUrl: settings.trackerUrl,
    apiKey: settings.apiKey ?? '',
    userId: settings.userId,
  };

  if (!onOrdersPage || hasStartIndex) {
    // Navigate to page 1 — content script will auto-resume via sessionStorage
    saveState(state);
    window.location.href = 'https://www.amazon.com/your-orders/orders';
    return;
  }

  saveState(state);
  await runSync(state);
}

// On page load, check if there's a pending sync to resume
(async () => {
  const state = loadState();
  if (state) {
    syncing = true;
    sendMessage({ type: 'SYNC_STARTED', platform: 'Amazon' });
    await runSync(state);
  }
})();

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'PING') { sendResponse('ok'); return; }
  if (msg.type === 'START_SYNC' && msg.platform === 'Amazon') startSync();
});
