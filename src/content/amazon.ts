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
// Scrape the live DOM — Amazon is a React SPA so fetch() only gets a shell.
// The content script reads document directly when on the orders page.
// ---------------------------------------------------------------------------

function scrapeCurrentPage(sinceDate: Date): { orders: ScrapedOrder[]; hasOlder: boolean } {
  const orders: ScrapedOrder[] = [];
  let hasOlder = false;
  const seen = new Set<string>();

  // Find order detail links — each unique orderID link anchors one order card
  const orderLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>(
    'a[href*="orderID="], a[href*="orderId="], a[href*="order-details"]'
  ));

  for (const link of orderLinks) {
    const idMatch = link.href.match(/[oO]rder[Ii][Dd]=([0-9A-Z-]{10,})/);
    if (!idMatch) continue;
    const orderId = idMatch[1];
    if (seen.has(orderId)) continue;
    seen.add(orderId);

    // Walk up until we find a container with substantial content (the full order card)
    let card: Element | null = link;
    for (let i = 0; i < 12; i++) {
      card = card?.parentElement ?? null;
      if (!card) break;
      const t = (card.textContent ?? '').trim();
      // Stop when we find a block that has a dollar amount and a date — that's the order card
      if (t.length > 200 && /\$[\d,]+/.test(t) && /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})\b/.test(t)) break;
    }

    if (!card) continue;
    const cardText = (card.textContent ?? '').replace(/\s+/g, ' ');

    if (orders.length === 0) {
      console.log('[Amazon] first card text:', cardText.slice(0, 400));
    }

    // Date
    const dateMatch =
      cardText.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i) ??
      cardText.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4}/i) ??
      cardText.match(/(\d{4}-\d{2}-\d{2})/);

    if (!dateMatch) {
      if (orders.length === 0) console.log('[Amazon] no date found in card, cardText sample:', cardText.slice(0, 200));
      continue;
    }

    const orderDate = new Date(dateMatch[1] ?? dateMatch[0]);
    if (isNaN(orderDate.getTime())) continue;
    if (orderDate < sinceDate) { hasOlder = true; continue; }

    if (/\b(cancelled|canceled|refunded|returned)\b/i.test(cardText)) continue;

    const totalMatch = cardText.match(/(?:order total|grand total)[^$\d]*\$?([\d,]+\.?\d*)/i) ??
      cardText.match(/\$([\d,]+\.\d{2})/);
    const cost = totalMatch ? parseMoney(totalMatch[1]) : 0;

    const titleEl = card.querySelector('[class*="product-title"],[class*="item-title"],a[href*="/dp/"]');
    const itemDescription = (titleEl?.textContent ?? '').trim().slice(0, 120);

    orders.push({
      platform: 'Amazon',
      orderNumber: orderId,
      orderDate: orderDate.toISOString().split('T')[0],
      itemDescription,
      cost,
      shippingCost: 0,
      shippingAddress: '',
      trackingNumbers: [],
      sourceUrl: `https://www.amazon.com/gp/your-account/order-details?orderID=${orderId}`,
    });
  }

  return { orders, hasOlder };
}

function getNextPageUrl(): string | null {
  const nextEl = document.querySelector(
    '.a-pagination .a-last:not(.a-disabled) a, [aria-label="Next page"] a'
  ) as HTMLAnchorElement | null;
  return nextEl?.href ?? null;
}

// ---------------------------------------------------------------------------
// Navigate to a URL and wait for the page to settle
// ---------------------------------------------------------------------------

function navigateTo(url: string): Promise<void> {
  return new Promise(resolve => {
    window.location.href = url;
    // Page will reload — the new content script instance will pick up via the
    // stored sync state. We resolve after a short delay as a fallback.
    setTimeout(resolve, 3000);
  });
}

// ---------------------------------------------------------------------------
// Fetch order detail for tracking + address (fetch is fine for detail pages
// since they're server-rendered)
// ---------------------------------------------------------------------------

async function fetchOrderDetail(orderUrl: string): Promise<{ address: string; tracking: string[] }> {
  try {
    const res = await fetch(orderUrl, { credentials: 'include' });
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    const addrEl = doc.querySelector('.displayAddressDiv, [class*="ship-to"], #shippingAddress');
    const address = (addrEl?.textContent ?? '').replace(/\s+/g, ' ').trim();

    const trackNums = new Set<string>();
    const patterns = [/trackingId[=\s"':]+([A-Z0-9]{10,30})/g, /\b(1Z[A-Z0-9]{16})\b/g];
    for (const pat of patterns) {
      let tm: RegExpExecArray | null;
      while ((tm = pat.exec(html)) !== null) trackNums.add(tm[1]);
    }

    return { address, tracking: [...trackNums] };
  } catch {
    return { address: '', tracking: [] };
  }
}

// ---------------------------------------------------------------------------
// Sync state stored in sessionStorage so it survives page navigation
// ---------------------------------------------------------------------------

const STATE_KEY = '__resell_sync_state__';

interface SyncState {
  sinceDate: string;
  orders: ScrapedOrder[];
  nextUrl: string | null;
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
// Main sync — single-page scrape + pagination via navigation
// ---------------------------------------------------------------------------

let syncing = false;

async function runSync(state: SyncState) {
  const sinceDate = new Date(state.sinceDate);

  sendMessage({ type: 'SYNC_PROGRESS', platform: 'Amazon', scraped: state.orders.length, message: `Scraping page ${state.page}…` });

  const { orders, hasOlder } = scrapeCurrentPage(sinceDate);
  const seen = new Set(state.orders.map(o => o.orderNumber));
  for (const o of orders) {
    if (!seen.has(o.orderNumber)) { seen.add(o.orderNumber); state.orders.push(o); }
  }

  const nextUrl = hasOlder ? null : getNextPageUrl();

  if (nextUrl && state.orders.length < 200) {
    // Navigate to next page — save state first, new page load will resume
    state.nextUrl = nextUrl;
    state.page++;
    saveState(state);
    window.location.href = nextUrl;
    return; // new page load takes over
  }

  // Done paginating — enrich with details then push
  clearState();
  const allOrders = state.orders;

  if (allOrders.length === 0) {
    setBadge('—');
    sendMessage({ type: 'SYNC_DONE', result: { platform: 'Amazon', scraped: 0, imported: 0, updated: 0 } });
    syncing = false;
    return;
  }

  sendMessage({ type: 'SYNC_PROGRESS', platform: 'Amazon', scraped: allOrders.length, message: `Found ${allOrders.length} orders, fetching details…` });

  for (let i = 0; i < allOrders.length; i++) {
    sendMessage({ type: 'SYNC_PROGRESS', platform: 'Amazon', scraped: allOrders.length, message: `Fetching details ${i + 1}/${allOrders.length}…` });
    const detail = await fetchOrderDetail(allOrders[i].sourceUrl);
    allOrders[i].shippingAddress = detail.address;
    allOrders[i].trackingNumbers = detail.tracking;
    await new Promise(r => setTimeout(r, 300));
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
    ? new Date(settings.amazonLastSync)
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  setBadge('…');
  sendMessage({ type: 'SYNC_STARTED', platform: 'Amazon' });

  // Navigate to orders page if not already there
  if (!location.pathname.includes('your-orders') && !location.pathname.includes('order-history') && !location.href.includes('order-history')) {
    const state: SyncState = {
      sinceDate: sinceDate.toISOString(),
      orders: [],
      nextUrl: null,
      trackerUrl: settings.trackerUrl,
      apiKey: settings.apiKey ?? '',
      userId: settings.userId,
      page: 1,
    };
    saveState(state);
    window.location.href = 'https://www.amazon.com/your-orders/orders';
    return;
  }

  const state: SyncState = {
    sinceDate: sinceDate.toISOString(),
    orders: [],
    nextUrl: null,
    trackerUrl: settings.trackerUrl,
    apiKey: settings.apiKey ?? '',
    userId: settings.userId,
    page: 1,
  };
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

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'START_SYNC' && msg.platform === 'Amazon') startSync();
});
