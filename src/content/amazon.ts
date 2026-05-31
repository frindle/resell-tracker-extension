import { getSettings, setLastSync } from '../lib/storage';
import { pushOrders } from '../lib/api';
import type { ScrapedOrder, SyncMessage } from '../lib/types';

console.log('[AMZ] content script loaded', location.href);

function parseMoney(text: string): number {
  return parseFloat(text.replace(/[^0-9.-]/g, '')) || 0;
}

function sendMessage(msg: SyncMessage) {
  chrome.runtime.sendMessage(msg).catch(() => {});
  // Persist status to storage so popup can read it after reopening
  if (msg.type === 'SYNC_PROGRESS' || msg.type === 'SYNC_STARTED') {
    chrome.storage.local.set({ amazonSyncStatus: { type: msg.type, message: (msg as {message?: string}).message ?? 'syncing…', ts: Date.now() } });
  } else if (msg.type === 'SYNC_DONE' || msg.type === 'SYNC_ERROR') {
    chrome.storage.local.set({ amazonSyncStatus: { type: msg.type, result: (msg as {result?: unknown}).result, error: (msg as {error?: string}).error, ts: Date.now() } });
  }
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

    // Walk up until we find a container that includes date text
    let card: Element | null = link;
    for (let i = 0; i < 20; i++) {
      card = card?.parentElement ?? null;
      if (!card) break;
      const t = (card.textContent ?? '').replace(/\s+/g, ' ');
      if (t.length > 100 && /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)/i.test(t)) break;
    }
    if (!card) { console.warn('[AMZ] no card for', orderId); continue; }
    // innerText adds spaces/newlines between block elements; textContent doesn't
    const rawText = ('innerText' in card) ? (card as HTMLElement).innerText : (card.textContent ?? '');
    const cardText = rawText.replace(/\s+/g, ' ');

    const dateMatch = cardText.match(/Order placed\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})/i)
      ?? cardText.match(/((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/i)
      ?? cardText.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4})/i);

    if (!dateMatch) { console.warn('[AMZ] no date for', orderId, '— cardText:', cardText.slice(0, 200)); continue; }

    const orderDate = new Date(dateMatch[1]);
    if (isNaN(orderDate.getTime())) { console.warn('[AMZ] bad date for', orderId, dateMatch[1]); continue; }
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
      '[class*="product-title"],[class*="item-title"],[class*="yohtmlc-item"],[class*="a-link-normal"][href*="/dp/"],[data-component*="item"] a,a[href*="/dp/"],a[href*="/gp/product/"]'
    );
    // Fallback: look specifically for product page links (/dp/ or /gp/product/)
    let itemDescription = (titleEl?.textContent ?? '').trim().slice(0, 120);
    if (!itemDescription) {
      const productLink = card.querySelector<HTMLAnchorElement>('a[href*="/dp/"], a[href*="/gp/product/"]');
      itemDescription = (productLink?.textContent ?? '').trim().slice(0, 120);
    }

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
// Fetch HTML via background worker (avoids trust token quota)
// ---------------------------------------------------------------------------

async function fetchHtml(url: string): Promise<Document | null> {
  try {
    const resp = await chrome.runtime.sendMessage({ type: 'FETCH_HTML', url });
    if (resp?.error) { console.warn('[AMZ] fetch error', url, resp.error); return null; }
    return new DOMParser().parseFromString(resp.html, 'text/html');
  } catch (e) {
    console.warn('[AMZ] fetch error', url, e);
    return null;
  }
}

function extractCarrierTracking(doc: Document): string[] {
  const found: string[] = [];
  const text = (doc.body?.textContent ?? '').replace(/\s+/g, ' ');

  // Amazon Logistics: TBA + 12-15 digits only (no letters after)
  const amzl = text.match(/\bTBA(\d{12,15})(?!\d)/g)?.map(m => m.replace(/\D+$/, ''));
  // UPS: 1Z + 16 alphanumeric
  const ups = text.match(/\b(1Z[A-Z0-9]{16})\b/g);
  // USPS: 20-22 digits starting with 9
  const usps = text.match(/\b(9[0-9]{19,21})\b/g);
  // FedEx: exactly 15 digits not starting with 9
  const fedex = text.match(/\b([1-8][0-9]{14})\b/g);

  // Prefer numbers near a "Tracking" label — more likely to be the right one
  const nearLabel = text.match(/Tracking(?:\s+ID|\s+number)?[:\s]+([A-Z0-9]{10,30})/gi) ?? [];
  for (const m of nearLabel) {
    const val = m.replace(/Tracking(?:\s+ID|\s+number)?[:\s]+/i, '').trim().split(' ')[0];
    if (val) found.unshift(val); // prioritise label-adjacent matches
  }

  if (amzl) found.push(...amzl);
  if (ups) found.push(...ups);
  if (usps) found.push(...usps);
  if (fedex) found.push(...fedex);

  // Also check carrier links
  const carrierLinks = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href]'))
    .map(a => a.href)
    .filter(h => /usps\.com|ups\.com|fedex\.com|dhl\.com/i.test(h));
  for (const href of carrierLinks) {
    const m = href.match(/[?&](?:qtc_tLabels1|tLabels|tracknum|InquiryNumber\d*|tracknumbers|trknbr|AWB)=([A-Z0-9]{8,30})/i);
    if (m) found.unshift(m[1]);
  }

  return [...new Set(found)];
}

function extractTitleFromDoc(doc: Document): string {
  const candidates = [
    doc.querySelector('[data-component="itemTitle"] a'),
    doc.querySelector('.yohtmlc-item a.a-link-normal'),
    ...Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href]')).filter(a =>
      /\/dp\/[A-Z0-9]{10}/.test(a.href) || /\/gp\/product\/[A-Z0-9]{10}/.test(a.href)
    ),
  ];
  for (const el of candidates) {
    const text = (el?.textContent ?? '').trim().replace(/\s+/g, ' ');
    if (text.length > 5) return text.slice(0, 120);
  }
  return '';
}

function extractAddressFromDoc(doc: Document): string {
  const text = (doc.body?.innerText ?? doc.body?.textContent ?? '').replace(/\s+/g, ' ');
  // Look for address after "Ship to" or "Deliver to" labels
  const m = text.match(/(?:Ship(?:s)? to|Deliver(?:ed)? to)[:\s]+([^\n]{10,200})/i);
  if (m) {
    const full = m[1].replace(/\s+/g, ' ').trim();
    // Strip leading name (before first digit)
    const digitIdx = full.search(/\d/);
    return digitIdx > 0 ? full.slice(digitIdx).trim() : full;
  }
  return '';
}

async function fetchOrderDetails(orderId: string): Promise<{ tracking: string[]; title: string; address: string }> {
  const detailDoc = await fetchHtml(`https://www.amazon.com/gp/your-account/order-details?orderID=${orderId}`);
  if (!detailDoc) return { tracking: [], title: '', address: '' };

  const title = extractTitleFromDoc(detailDoc);
  const address = extractAddressFromDoc(detailDoc);

  // Extract ship-track URLs — each has a unique shipmentId
  const shipTrackUrls = Array.from(detailDoc.querySelectorAll<HTMLAnchorElement>('a[href*="ship-track"]'))
    .map(a => a.href)
    .filter((href, i, arr) => arr.indexOf(href) === i);

  if (shipTrackUrls.length === 0) {
    console.log('[AMZ] no ship-track links for', orderId);
    return { tracking: [], title };
  }

  // Fetch each ship-track page and extract carrier tracking numbers
  const tracking: string[] = [];
  for (const url of shipTrackUrls.slice(0, 3)) {
    await new Promise(r => setTimeout(r, 600));
    const doc = await fetchHtml(url);
    if (!doc) continue;

    // Remove nav/footer to avoid picking up tracking numbers from other orders in sidebar
    doc.querySelectorAll('nav, footer, #navbar, #navFooter, #rhf').forEach(el => el.remove());

    const fromPage = extractCarrierTracking(doc);
    tracking.push(...fromPage);
  }

  // Clean each candidate: strip trailing letters (e.g. "TBA123See" → "TBA123", "9339...See" → "9339...")
  const cleaned = [...new Set(tracking)].map(t => t.replace(/[A-Za-z]+$/, ''));
  // Drop any entry that is a superstring of another (keep the shorter canonical form)
  const unique = [...new Set(cleaned)].filter(t => !cleaned.some(other => other !== t && t.startsWith(other))).slice(0, 5);
  console.log('[AMZ] tracking for', orderId, ':', unique, '| title:', title || '(none)', '| addr:', address || '(none)');
  return { tracking: unique, title, address };
}

async function fetchOrdersPage(startIndex: number): Promise<Document | null> {
  return fetchHtml(`https://www.amazon.com/your-orders/orders?startIndex=${startIndex}`);
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
// Sync state — stored in both sessionStorage (same-tab navigation) and
// chrome.storage.local (new-tab handoff from popup)
// ---------------------------------------------------------------------------

const STATE_KEY = '__resell_sync_state__';
const STORAGE_KEY = 'amazonPendingSync';

interface SyncState {
  sinceDate: string;
  trackerUrl: string;
  apiKey: string;
  userId: string;
}

function saveState(state: SyncState) {
  sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
  chrome.storage.local.set({ [STORAGE_KEY]: { ...state, ts: Date.now() } });
}

async function loadState(): Promise<SyncState | null> {
  // Prefer sessionStorage (same tab); fall back to chrome.storage (new tab from popup)
  try {
    const raw = sessionStorage.getItem(STATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const stored = result[STORAGE_KEY] as (SyncState & { ts: number }) | undefined;
    // Only use if fresh (within last 2 minutes) — avoids stale state from a previous session
    if (stored && Date.now() - stored.ts < 2 * 60 * 1000) return stored;
  } catch { /* ignore */ }
  return null;
}

function clearState() {
  sessionStorage.removeItem(STATE_KEY);
  chrome.storage.local.remove(STORAGE_KEY);
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
  if (page1.orders.length) console.log('[AMZ] orders found:', page1.orders.map(o => `${o.orderDate} #${o.orderNumber} $${o.cost} addr=${o.shippingAddress || 'none'}`).join(' | '));
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

  // Fetch tracking + fill missing titles from order detail pages
  if (allOrders.length > 0) {
    sendMessage({ type: 'SYNC_PROGRESS', platform: 'Amazon', scraped: allOrders.length, message: `Fetching details for ${allOrders.length} orders…` });
    for (const order of allOrders) {
      await new Promise(r => setTimeout(r, 800));
      const { tracking, title, address } = await fetchOrderDetails(order.orderNumber);
      if (tracking.length > 0) order.trackingNumbers = tracking;
      if (!order.itemDescription && title) order.itemDescription = title;
      if (!order.shippingAddress && address) order.shippingAddress = address;
    }
  }

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

  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const lastSyncDate = settings.amazonLastSync ? new Date(settings.amazonLastSync) : null;
  // Use whichever is further back: 60 days ago or the last sync date
  const sinceDate = lastSyncDate && lastSyncDate < sixtyDaysAgo ? lastSyncDate : sixtyDaysAgo;

  setBadge('…');
  sendMessage({ type: 'SYNC_STARTED', platform: 'Amazon' });

  const state: SyncState = {
    sinceDate: sinceDate.toISOString(),
    trackerUrl: settings.trackerUrl,
    apiKey: settings.apiKey ?? '',
    userId: settings.userId,
  };

  // Always navigate to the clean orders page 1 to ensure a consistent starting point
  const cleanOrdersUrl = 'https://www.amazon.com/your-orders/orders';
  if (location.href.replace(/\/$/, '') === cleanOrdersUrl) {
    // Already on the exact right page — run directly
    saveState(state);
    await runSync(state);
  } else {
    saveState(state);
    window.location.href = cleanOrdersUrl;
  }
}

// On page load, check if there's a pending sync to resume
(async () => {
  if (!location.pathname.includes('your-orders') && !location.pathname.includes('order-history')) return;
  const state = await loadState();
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
