import { getSettings, setLastSync } from '../lib/storage';
import { pushOrders } from '../lib/api';
import type { ScrapedOrder, SyncMessage } from '../lib/types';

console.log('[WM] content script loaded', location.href);

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
// Scrape the live DOM — Walmart is Next.js; fetch() only gets a shell.
// Read document directly from the content script.
// ---------------------------------------------------------------------------

function scrapeCurrentPage(sinceDate: Date): { orders: ScrapedOrder[]; hasOlder: boolean } {
  const orders: ScrapedOrder[] = [];
  let hasOlder = false;
  const seen = new Set<string>();

  // Try __NEXT_DATA__ first (populated in the live DOM, not in fetch shell)
  const nextDataEl = document.getElementById('__NEXT_DATA__');
  console.log('[WM] __NEXT_DATA__ found:', !!nextDataEl?.textContent, 'len:', nextDataEl?.textContent?.length);
  if (nextDataEl?.textContent) {
    try {
      const json = JSON.parse(nextDataEl.textContent);
      const pageProps = json?.props?.pageProps ?? json?.props ?? {};
      console.log('[WM] pageProps keys:', Object.keys(pageProps).join(','), JSON.stringify(pageProps).slice(0, 300));
      const purchaseHistory = pageProps?.phRedesignInitialData?.data?.purchaseHistory as Record<string, unknown> | undefined;
      console.log('[WM] purchaseHistory keys:', purchaseHistory ? Object.keys(purchaseHistory).join(',') : 'NOT FOUND');
      console.log('[WM] purchaseHistory sample:', JSON.stringify(purchaseHistory).slice(0, 500));
      const orderList: unknown[] =
        (purchaseHistory?.orders ?? purchaseHistory?.orderGroups ?? purchaseHistory?.items) as unknown[] ??
        pageProps?.initialData?.data?.customer?.orderHistoryData?.orderHistory?.orders ??
        pageProps?.orders ??
        pageProps?.data?.orders ??
        [];

      for (const raw of orderList) {
        const item = raw as Record<string, unknown>;
        const orderNumber = String(item.orderNo ?? item.orderId ?? item.id ?? '').replace(/\D/g, '');
        if (!orderNumber || seen.has(orderNumber)) continue;
        seen.add(orderNumber);

        const rawDate = String(item.orderDate ?? item.placedDate ?? item.createdDate ?? '');
        if (!rawDate) continue;
        const orderDate = new Date(rawDate);
        if (isNaN(orderDate.getTime())) continue;
        if (orderDate.toISOString().split('T')[0] < sinceDate.toISOString().split('T')[0]) { hasOlder = true; continue; }

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

      if (orders.length > 0 || orderList.length > 0) {
        return { orders, hasOlder };
      }
      // If orderList was empty, fall through to DOM parsing
    } catch { /* fall through */ }
  }

  // DOM fallback — read rendered order cards
  const blocks = Array.from(document.querySelectorAll(
    '[data-automation-id*="order-card"], [data-testid*="order"], .order-card, article[class*="order"]'
  ));
  console.log('[WM] DOM blocks found:', blocks.length, 'url:', location.href);
  if (blocks[0]) console.log('[WM] first block HTML:', blocks[0].innerHTML.slice(0, 600));

  for (const block of blocks) {
    const orderNumEl = block.querySelector('[data-automation-id*="order-number"], [class*="order-number"], [class*="orderNumber"]');
    const orderNumber = (orderNumEl?.textContent ?? '').replace(/\D/g, '');
    if (!orderNumber || seen.has(orderNumber)) continue;
    seen.add(orderNumber);

    const dateEl = block.querySelector('[data-automation-id*="order-date"], [class*="order-date"], time');
    const rawDate = dateEl?.getAttribute('datetime') ?? dateEl?.textContent ?? '';
    const orderDate = new Date(rawDate);
    if (isNaN(orderDate.getTime())) continue;
    if (orderDate.toISOString().split('T')[0] < sinceDate.toISOString().split('T')[0]) { hasOlder = true; continue; }

    const statusEl = block.querySelector('[data-automation-id*="delivery-status"], [class*="status"]');
    if (/cancel|return|refund/.test((statusEl?.textContent ?? '').toLowerCase())) continue;

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

function getNextPageUrl(): string | null {
  const nextEl = document.querySelector(
    '[aria-label="Next page"]:not([disabled]) a, [data-automation-id*="next-page"]:not([disabled]) a, [aria-label="Next page"]:not([disabled])'
  ) as HTMLAnchorElement | null;
  if (nextEl?.href) return nextEl.href;

  // Walmart pagination: ?page=N in URL
  const url = new URL(location.href);
  const currentPage = parseInt(url.searchParams.get('page') ?? '1');
  // Check if there's a next-page button (even if it's not an <a>)
  const nextBtn = document.querySelector('[aria-label="Next page"]:not([disabled]), [data-automation-id*="next-page"]:not([disabled])');
  if (nextBtn) {
    url.searchParams.set('page', String(currentPage + 1));
    return url.toString();
  }
  return null;
}

// ---------------------------------------------------------------------------
// Enrich order detail pages for tracking + address
// ---------------------------------------------------------------------------

async function fetchOrderDetail(orderUrl: string): Promise<{ address: string; tracking: string[] }> {
  try {
    const res = await fetch(orderUrl, { credentials: 'include' });
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    const addrEl = doc.querySelector('[data-automation-id*="shipping-address"], [class*="shipping-address"], [class*="shippingAddress"]');
    const address = (addrEl?.textContent ?? '').replace(/\s+/g, ' ').trim();

    const numbers = new Set<string>();
    const trackPatterns = [
      /trackingNumber["\s:]+["']?([A-Z0-9]{10,25})/g,
      /\b(1Z[A-Z0-9]{16})\b/g,
      /\b([0-9]{20,22})\b/g,
    ];
    for (const pat of trackPatterns) {
      let m: RegExpExecArray | null;
      while ((m = pat.exec(html)) !== null) numbers.add(m[1]);
    }

    return { address, tracking: [...numbers] };
  } catch {
    return { address: '', tracking: [] };
  }
}

// ---------------------------------------------------------------------------
// Sync state stored in sessionStorage so it survives page navigation
// ---------------------------------------------------------------------------

const STATE_KEY = '__resell_wm_sync_state__';

interface SyncState {
  sinceDate: string;
  orders: ScrapedOrder[];
  trackerUrl: string;
  apiKey: string;
  userId: string;
  page: number;
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
// Main sync
// ---------------------------------------------------------------------------

let syncing = false;

async function runSync(state: SyncState) {
  const sinceDate = new Date(state.sinceDate);

  sendMessage({ type: 'SYNC_PROGRESS', platform: 'Walmart', scraped: state.orders.length, message: `Scraping page ${state.page}…` });

  const { orders, hasOlder } = scrapeCurrentPage(sinceDate);
  const seen = new Set(state.orders.map(o => o.orderNumber));
  for (const o of orders) {
    if (!seen.has(o.orderNumber)) { seen.add(o.orderNumber); state.orders.push(o); }
  }

  const nextUrl = hasOlder ? null : (orders.length > 0 ? getNextPageUrl() : null);

  if (nextUrl && state.orders.length < 200) {
    state.page++;
    saveState(state);
    window.location.href = nextUrl;
    return;
  }

  clearState();
  const allOrders = state.orders;

  if (allOrders.length === 0) {
    setBadge('—');
    sendMessage({ type: 'SYNC_DONE', result: { platform: 'Walmart', scraped: 0, imported: 0, updated: 0 } });
    syncing = false;
    return;
  }

  sendMessage({ type: 'SYNC_PROGRESS', platform: 'Walmart', scraped: allOrders.length, message: `Found ${allOrders.length} orders, fetching details…` });

  for (let i = 0; i < allOrders.length; i++) {
    sendMessage({ type: 'SYNC_PROGRESS', platform: 'Walmart', scraped: allOrders.length, message: `Fetching details ${i + 1}/${allOrders.length}…` });
    const detail = await fetchOrderDetail(allOrders[i].sourceUrl);
    allOrders[i].shippingAddress = detail.address;
    allOrders[i].trackingNumbers = detail.tracking;
    await new Promise(r => setTimeout(r, 400));
  }

  try {
    const result = await pushOrders(state.trackerUrl, state.apiKey, state.userId, allOrders);
    await setLastSync('walmart', new Date().toISOString().split('T')[0]);
    setBadge(`+${result.imported}`, '#22c55e');
    sendMessage({ type: 'SYNC_DONE', result: { platform: 'Walmart', scraped: allOrders.length, ...result } });
  } catch (err) {
    setBadge('!', '#ef4444');
    sendMessage({ type: 'SYNC_ERROR', platform: 'Walmart', error: err instanceof Error ? err.message : String(err) });
  }

  syncing = false;
}

async function startSync() {
  console.log('[WM] startSync called, syncing:', syncing, 'url:', location.href);
  if (syncing) return;
  syncing = true;

  const settings = await getSettings();
  console.log('[WM] settings:', JSON.stringify({ trackerUrl: !!settings.trackerUrl, userId: settings.userId, walmartLastSync: settings.walmartLastSync }));
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

  if (!location.pathname.includes('/orders') && !location.pathname.includes('/account/mypurchases')) {
    const state: SyncState = {
      sinceDate: sinceDate.toISOString(),
      orders: [],
      trackerUrl: settings.trackerUrl,
      apiKey: settings.apiKey ?? '',
      userId: settings.userId,
      page: 1,
    };
    saveState(state);
    window.location.href = 'https://www.walmart.com/orders';
    return;
  }

  const state: SyncState = {
    sinceDate: sinceDate.toISOString(),
    orders: [],
    trackerUrl: settings.trackerUrl,
    apiKey: settings.apiKey ?? '',
    userId: settings.userId,
    page: 1,
  };
  saveState(state);
  await runSync(state);
}

// On page load, resume pending sync
(async () => {
  const state = loadState();
  if (state) {
    syncing = true;
    sendMessage({ type: 'SYNC_STARTED', platform: 'Walmart' });
    await runSync(state);
  }
})();

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'PING') { sendResponse('ok'); return; }
  if (msg.type === 'START_SYNC' && msg.platform === 'Walmart') startSync();
});
