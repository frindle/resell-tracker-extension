import { getSettings, setLastSync } from '../lib/storage';
import { pushOrders } from '../lib/api';
import type { ScrapedOrder, SyncMessage } from '../lib/types';

console.log('[WM] content script loaded', location.href);

function parseMoney(text: string): number {
  return parseFloat(text.replace(/[^0-9.-]/g, '')) || 0;
}

function sendMessage(msg: SyncMessage) {
  const m = msg as Record<string, unknown>;
  if (m.type === 'SYNC_STARTED' || m.type === 'SYNC_PROGRESS') {
    chrome.storage.local.set({ walmartSyncStatus: { type: m.type, message: (m.message as string) ?? 'syncing…', ts: Date.now() } });
  } else {
    chrome.storage.local.set({ walmartSyncStatus: { type: m.type, result: m.result, error: m.error, ts: Date.now() } });
  }
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

  // __NEXT_DATA__ on walmart.com is a static shell — orders are client-rendered.
  // Read the live DOM directly.
  const blocks = Array.from(document.querySelectorAll('[data-testid*="orderGroup"]'));
  console.log('[WM] DOM blocks found:', blocks.length, 'url:', location.href);
  if (blocks[0]) console.log('[WM] first block text:', (blocks[0].textContent ?? '').replace(/\s+/g, ' ').slice(0, 600));

  for (const block of blocks) {
    const blockText = (block.textContent ?? '').replace(/\s+/g, ' ');

    // Order number — from id="caption-XXXXXXXXX..." or text "Order # XXXXXXXXX"
    let orderNumber = '';
    const captionEl = block.querySelector('[id^="caption-"]');
    if (captionEl) {
      const idMatch = captionEl.id.match(/caption-(\d+)/);
      if (idMatch) orderNumber = idMatch[1];
    }
    if (!orderNumber) {
      const m = blockText.match(/Order\s*#?\s*(\d{10,})/i);
      if (m) orderNumber = m[1];
    }
    if (!orderNumber) {
      const m = blockText.match(/\b(\d{13,20})\b/);
      if (m) orderNumber = m[1];
    }
    if (!orderNumber || seen.has(orderNumber)) continue;
    seen.add(orderNumber);

    // Date — "on May 22" (no year), "May 22, 2026", "Placed Jan 3, 2026"
    // Parse date BEFORE the cancelled check so older cancelled orders still set hasOlder.
    const currentYear = new Date().getFullYear();

    // Check for relative date "Today" first
    let orderDate: Date;
    if (/\btoday\b/i.test(blockText)) {
      orderDate = new Date();
      orderDate.setHours(0, 0, 0, 0);
    } else {
      const dateMatch =
        blockText.match(/(?:Placed|Ordered|Delivered|on)\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})/i) ??
        blockText.match(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})/i) ??
        blockText.match(/(?:Placed|Ordered|Delivered|on)\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2})(?!\d)/i);
      if (!dateMatch) {
        console.log('[WM] skipping order', orderNumber, '- no date found in:', blockText.slice(0, 200));
        continue;
      }
      // Append current year if missing; if result is more than a day in the future, use prior year
      let rawDateStr = /\d{4}/.test(dateMatch[1]) ? dateMatch[1] : `${dateMatch[1]} ${currentYear}`;
      orderDate = new Date(rawDateStr);
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      if (!isNaN(orderDate.getTime()) && orderDate > tomorrow) {
        rawDateStr = /\d{4}/.test(dateMatch[1]) ? dateMatch[1] : `${dateMatch[1]} ${currentYear - 1}`;
        orderDate = new Date(rawDateStr);
      }
      if (isNaN(orderDate.getTime())) {
        console.log('[WM] skipping order', orderNumber, '- bad date:', dateMatch[1]);
        continue;
      }
    }
    if (orderDate.toISOString().split('T')[0] < sinceDate.toISOString().split('T')[0]) {
      console.log('[WM] order too old:', orderNumber, orderDate.toISOString().split('T')[0], '< sinceDate', sinceDate.toISOString().split('T')[0]);
      hasOlder = true; continue;
    }

    // Skip cancelled/returned orders (after date check so older ones still stop pagination)
    if (/\b(cancel\w*|return\w*|refund\w*)\b/i.test(blockText)) continue;

    // Total — "Total $XX.XX"
    const totalMatch = blockText.match(/Total\s+\$?([\d,]+\.?\d*)/i);
    const cost = totalMatch ? parseMoney(totalMatch[1]) : 0;

    // Item description — first product link or heading text
    const itemEl = block.querySelector('a[href*="/ip/"], [data-testid*="product"], [data-testid*="item"]');
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

  console.log('[WM] scraped orders this page:', orders.length, 'hasOlder:', hasOlder);
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

async function fetchOrderDetail(orderNumber: string, orderUrl: string): Promise<{ address: string; tracking: string[] }> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(orderUrl, { credentials: 'include', signal: ctrl.signal });
    clearTimeout(timer);
    console.log('[WM] detail fetch status:', orderNumber, res.status, res.url);
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // Try parsing __NEXT_DATA__ JSON for the shipping address
    let address = '';
    const nextDataEl = doc.querySelector('#__NEXT_DATA__');
    if (nextDataEl?.textContent) {
      try {
        const nd = JSON.parse(nextDataEl.textContent);
        const str = JSON.stringify(nd);
        // Look for shippingAddress object in the JSON
        const addrMatch = str.match(/"shippingAddress"\s*:\s*\{([^}]{0,500})\}/);
        if (addrMatch) {
          const addrObj = JSON.parse(`{${addrMatch[1]}}`);
          const parts = [addrObj.addressLineOne, addrObj.addressLineTwo, addrObj.city, addrObj.state, addrObj.postalCode]
            .filter(Boolean);
          address = parts.join(' ').trim();
        }
        if (!address) {
          // Fallback: look for address1/address2/city/state/zip pattern
          const m = str.match(/"address1":"([^"]+)".*?"city":"([^"]+)".*?"state":"([^"]+)".*?"zip(?:Code)?":"([^"]+)"/);
          if (m) address = `${m[1]} ${m[2]} ${m[3]} ${m[4]}`.trim();
        }
      } catch { /* ignore */ }
    }
    if (!address) {
      const addrEl = doc.querySelector('[data-automation-id*="shipping-address"], [class*="shipping-address"], [class*="shippingAddress"]');
      address = (addrEl?.textContent ?? '').replace(/\s+/g, ' ').trim();
    }

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
  } catch (e) {
    console.log('[WM] detail fetch failed:', orderNumber, String(e));
    return { address: '', tracking: [] };
  }
}

// ---------------------------------------------------------------------------
// Main sync — all in-page, no navigation (Walmart is a React SPA)
// ---------------------------------------------------------------------------

let syncing = false;

function getFirstBlockFingerprint(): string {
  const block = document.querySelector('[data-testid*="orderGroup"]');
  if (!block) return '';
  // Use caption element id (contains actual order number) as the stable fingerprint
  const caption = block.querySelector('[id^="caption-"]');
  if (caption?.id) return caption.id;
  // Fall back to a slice of text content (order numbers, dates, amounts — changes per page)
  return (block.textContent ?? '').replace(/\s+/g, ' ').slice(0, 80);
}

function waitForOrdersToLoad(previousFingerprint = '', timeoutMs = 12000): Promise<void> {
  return new Promise(resolve => {
    const start = Date.now();
    function check() {
      const blocks = document.querySelectorAll('[data-testid*="orderGroup"]');
      if (blocks.length > 0 && (blocks[0].textContent ?? '').length > 100) {
        const fp = getFirstBlockFingerprint();
        if (!previousFingerprint || fp !== previousFingerprint) { resolve(); return; }
      }
      if (Date.now() - start > timeoutMs) { resolve(); return; }
      setTimeout(check, 400);
    }
    check();
  });
}

function clickNextPage(): boolean {
  const btn = document.querySelector(
    '[aria-label="Next page"]:not([disabled]), [data-automation-id*="next-page"]:not([disabled]), button[aria-label*="next" i]:not([disabled])'
  ) as HTMLElement | null;
  if (btn) { btn.click(); return true; }
  return false;
}

async function startSync() {
  console.log('[WM] startSync called, syncing:', syncing, 'url:', location.href);
  if (syncing) return;
  syncing = true;

  const settings = await getSettings();
  if (!settings.trackerUrl || !settings.userId) {
    sendMessage({ type: 'SYNC_ERROR', platform: 'Walmart', error: 'Tracker URL or user not configured — open Settings.' });
    setBadge('!', '#ef4444');
    syncing = false;
    return;
  }

  const sinceDate = settings.walmartLastSync
    ? new Date(new Date(settings.walmartLastSync).getTime() - 24 * 60 * 60 * 1000)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  setBadge('…');
  sendMessage({ type: 'SYNC_STARTED', platform: 'Walmart' });

  // Always start from page 1 — if not on /orders or at page > 1, navigate there and resume via sessionStorage
  const isOrdersPage = location.pathname.includes('/orders') || location.pathname.includes('/account/mypurchases');
  const currentPage = new URL(location.href).searchParams.get('page');
  if (!isOrdersPage || (currentPage && parseInt(currentPage) > 1)) {
    sessionStorage.setItem('__resell_wm_sync__', '1');
    window.location.href = 'https://www.walmart.com/orders';
    syncing = false;
    return;
  }

  try {
    await waitForOrdersToLoad('', 15000);

    const allOrders: ScrapedOrder[] = [];
    const seen = new Set<string>();
    let page = 1;

    while (page <= 20 && allOrders.length < 200) {
      sendMessage({ type: 'SYNC_PROGRESS', platform: 'Walmart', scraped: allOrders.length, message: `Scraping page ${page}…` } as never);

      const { orders, hasOlder } = scrapeCurrentPage(sinceDate);
      for (const o of orders) {
        if (!seen.has(o.orderNumber)) { seen.add(o.orderNumber); allOrders.push(o); }
      }
      console.log('[WM] page', page, 'scraped:', orders.length, 'total:', allOrders.length, 'hasOlder:', hasOlder);

      if (hasOlder) break;

      const fingerprint = getFirstBlockFingerprint();
      if (!clickNextPage()) { console.log('[WM] no next page button, done'); break; }
      await waitForOrdersToLoad(fingerprint);
      page++;
    }

    console.log('[WM] done scraping, total orders:', allOrders.length);

    if (allOrders.length === 0) {
      setBadge('—');
      await setLastSync('walmart', new Date().toISOString().split('T')[0]);
      sendMessage({ type: 'SYNC_DONE', result: { platform: 'Walmart', scraped: 0, imported: 0, updated: 0 } });
      return;
    }

    sendMessage({ type: 'SYNC_PROGRESS', platform: 'Walmart', scraped: allOrders.length, message: 'Fetching order details…' } as never);

    await Promise.all(allOrders.map(async order => {
      console.log('[WM] fetching detail:', order.orderNumber, order.sourceUrl);
      const detail = await fetchOrderDetail(order.orderNumber, order.sourceUrl);
      console.log('[WM] detail done:', order.orderNumber, 'address:', detail.address.slice(0, 40) || '(none)', 'tracking:', detail.tracking);
      if (detail.address) order.shippingAddress = detail.address;
      if (detail.tracking.length) order.trackingNumbers = detail.tracking;
    }));

    const result = await pushOrders(settings.trackerUrl, settings.apiKey ?? '', settings.userId, allOrders);
    console.log('[WM] push result:', JSON.stringify(result));
    await setLastSync('walmart', new Date().toISOString().split('T')[0]);
    setBadge(`+${result.imported ?? 0}`, '#22c55e');
    sendMessage({ type: 'SYNC_DONE', result: { platform: 'Walmart', scraped: allOrders.length, imported: result.imported ?? 0, updated: result.updated ?? 0 } });
  } catch (err) {
    console.error('[WM] sync error:', err);
    sendMessage({ type: 'SYNC_ERROR', platform: 'Walmart', error: String(err) });
    setBadge('!', '#ef4444');
  } finally {
    syncing = false;
  }
}

// Resume sync if we navigated here from a wrong page
if (sessionStorage.getItem('__resell_wm_sync__')) {
  sessionStorage.removeItem('__resell_wm_sync__');
  // Wait for Walmart's React to hydrate before scraping
  setTimeout(() => startSync(), 2000);
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'PING') { sendResponse('ok'); return; }
  if (msg.type === 'START_SYNC' && msg.platform === 'Walmart') startSync();
});
