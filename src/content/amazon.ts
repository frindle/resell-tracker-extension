import { getSettings, setLastSync } from '../lib/storage';
import { pushOrders } from '../lib/api';
import type { ScrapedOrder, SyncMessage } from '../lib/types';

// Mirror all console.log/warn calls to the background service worker so
// the scrape transcript survives the tab close. Background logs them to
// its own persistent console (visible via about:debugging → Inspect on
// the Reselling Tracker Sync background page).
(function installLogForwarder() {
  const origLog = console.log.bind(console);
  const origWarn = console.warn.bind(console);
  function stringifyArg(a: unknown): string {
    if (a == null) return String(a);
    if (typeof a === 'string') return a;
    if (typeof a === 'number' || typeof a === 'boolean') return String(a);
    try { return JSON.stringify(a); } catch { return String(a); }
  }
  console.log = (...args: unknown[]) => {
    origLog(...args);
    try {
      chrome.runtime.sendMessage({ type: 'SCRAPE_LOG', level: 'log', args: args.map(stringifyArg) }).catch(() => {});
    } catch {}
  };
  console.warn = (...args: unknown[]) => {
    origWarn(...args);
    try {
      chrome.runtime.sendMessage({ type: 'SCRAPE_LOG', level: 'warn', args: args.map(stringifyArg) }).catch(() => {});
    } catch {}
  };
})();

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
  console.log('[AMZ] scrapeDoc found', orderLinks.length, 'order links:', orderLinks.map(a => a.href.match(/[oO]rder[Ii][Dd]=([0-9A-Z-]{10,})/)?.[1]).filter(Boolean).join(', '));
  // Log all hrefs containing order-like patterns to discover unknown URL formats
  const allOrderHrefs = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href]'))
    .map(a => a.href)
    .filter(h => /order|invoice/i.test(h) && h.includes('amazon.com'))
    .filter((h, i, arr) => arr.indexOf(h) === i);
  console.log('[AMZ] all order-related hrefs:', allOrderHrefs);

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

    // Capture the payment method's last 4 if present in the order card.
    // Match only clearly card-related patterns — earlier "any non-alnum run"
    // pattern was false-positive on years and similar 4-digit runs.
    let paymentLast4: string | undefined;
    const textPats: Array<RegExp> = [
      /\bending\s+in\s+(\d{4})\b/i,
      /\bending\s+(\d{4})\b/i,
      /\*{2,}\s*(\d{4})\b/,
      /\bx{4,}\s*(\d{4})\b/i,
      /[•·․⋅●]{2,}\s*(\d{4})\b/,
    ];
    for (const pat of textPats) {
      const m = cardText.match(pat);
      if (m) { paymentLast4 = m[1]; break; }
    }

    // Amazon injects credit-card referral promo cards into the orders DOM
    // with order-detail-style links. They have a date (today) and order IDs
    // in 113-... format but don't resolve in the user's account. Detect by:
    //   1. "Apply now" CTA in the card text (specific to promos, not payment)
    //   2. Total is $0 AND the card text contains specific promo wording
    // These conditions deliberately don't fire on real orders paid with an
    // Amazon Visa — payment method strings don't contain "Apply now" or the
    // promo phrasing we look for.
    const hasApplyNow = /\bApply\s+now\b/i.test(cardText);
    const promoPhrase = /\b(?:Earn\s+(?:up\s+to\s+)?\d+%|Get\s+the\s+Amazon\s+(?:Business\s+)?(?:Prime\s+)?Visa|Get\s+a\s+\$?\d+\s+Amazon\.com\s+(?:Gift\s+Card|Credit)|No\s+annual\s+fee|Card\s+Member)\b/i.test(cardText);
    if (hasApplyNow || (cost === 0 && promoPhrase)) {
      console.log('[AMZ] skipping promo card:', orderId, 'hasApplyNow:', hasApplyNow, 'promoPhrase:', promoPhrase, '— cardText:', cardText.slice(0, 200));
      continue;
    }

    // Store-pickup orders don't go to a group and shouldn't be imported.
    // Amazon shows "Ready for pickup" / "Pick up at" / "Locker" / "Fresh
    // Pickup" on the order card. Also skip if there's no "Ship to" address
    // AND the card mentions any pickup phrasing — safer than either alone.
    const pickupPhrase = /\b(?:Ready\s+for\s+pickup|Pick\s+up\s+at|Amazon\s+Locker|Fresh\s+Pickup|Store\s+Pickup|Whole\s+Foods\s+Market\b)\b/i;
    if (pickupPhrase.test(cardText)) {
      console.log('[AMZ] skipping store-pickup order:', orderId, '— cardText:', cardText.slice(0, 200));
      continue;
    }

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

    // Capture "Track package" links right on the order card. For split
    // shipments Amazon shows N of these per order on the LIST page BEFORE
    // the detail page aggregates them. We surface these into the scraped
    // order so fetchOrderDetails can prefer them over (or supplement) the
    // detail-page links — which often only have preship/cancel-items
    // URLs for split shipments where only one part has shipped.
    const trackButtons = Array.from(card.querySelectorAll<HTMLAnchorElement>('a[href*="ship-track"], a[href*="progress-tracker"], a[href*="package-tracking"]'))
      .map(a => a.href)
      .filter(h => !/\/(preship|cancel-items?|return|refund|replacement)\b/i.test(h))
      .filter((href, i, arr) => arr.indexOf(href) === i);
    if (trackButtons.length > 0) {
      console.log('[AMZ] order', orderId, 'has', trackButtons.length, 'list-page track links');
    }

    console.log('[AMZ] adding order', orderId, 'item:', itemDescription.slice(0, 60), 'cost:', cost, 'last4:', paymentLast4 ?? '(none)', 'cardText:', cardText.slice(0, 200));
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
      paymentLast4,
      _listTrackingUrls: trackButtons,
    });
  }

  return { orders, hasOlder };
}

function getNextStartIndex(doc: Document): number | null {
  const strictEl = doc.querySelector(
    '.a-pagination .a-last:not(.a-disabled) a, [aria-label="Next page"] a'
  ) as HTMLAnchorElement | null;
  if (strictEl?.href) {
    const m = strictEl.href.match(/startIndex=(\d+)/);
    if (m) {
      console.log('[AMZ] pagination: strict selector hit startIndex=', m[1]);
      return parseInt(m[1]);
    }
  }
  // Fallback: scan every anchor with a startIndex= param. Amazon swapped
  // wrappers (mid-2026 markup uses `ref_=ppx_yo2ov_dt_b_pagination_1_2`
  // and no longer sits inside .a-pagination .a-last). We match by anchor
  // text/href rather than wrapper class.
  const candidates = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href*="startIndex="]'));
  console.log('[AMZ] pagination: strict miss, fallback candidates =', candidates.length);
  if (candidates.length > 0) {
    console.log('[AMZ] pagination: candidate texts =', candidates.map(a => (a.textContent ?? '').trim().slice(0, 40)));
    console.log('[AMZ] pagination: candidate hrefs =', candidates.map(a => a.getAttribute('href')?.slice(0, 80)));
  }
  for (const a of candidates) {
    const text = (a.textContent ?? '').trim();
    if (/^Next\b/i.test(text) || text.includes('→')) {
      const m = a.href.match(/startIndex=(\d+)/);
      if (m) {
        console.log('[AMZ] pagination: fallback hit startIndex=', m[1], 'via text:', text.slice(0, 20));
        return parseInt(m[1]);
      }
    }
  }
  // Last-ditch: pick the highest startIndex value greater than 0 among
  // candidates. Amazon's pagination block usually has Next pointing to
  // the largest start index visible from page 1.
  let best = 0;
  for (const a of candidates) {
    const m = (a.getAttribute('href') ?? '').match(/startIndex=(\d+)/);
    if (m) {
      const v = parseInt(m[1]);
      if (v > best) best = v;
    }
  }
  if (best > 0) {
    console.log('[AMZ] pagination: last-ditch picked highest startIndex=', best);
    return best;
  }
  console.log('[AMZ] pagination: no Next found');
  return null;
}

// ---------------------------------------------------------------------------
// Fetch HTML via background worker (avoids trust token quota)
// ---------------------------------------------------------------------------

async function fetchHtml(url: string): Promise<Document | null> {
  // Fetch directly from the content script (amazon.com origin) rather
  // than via the background SW. Amazon appears to serve a SPA shell
  // (no order links rendered) when current-year requests come from a
  // cross-origin context (Sec-Fetch-Site: cross-site). Same-origin
  // fetches from the orders page itself get the SSR HTML the user
  // would normally see. Past years work either way because Amazon
  // SSRs them regardless.
  try {
    const r = await fetch(url, { credentials: 'same-origin' });
    if (!r.ok) { console.warn('[AMZ] direct fetch HTTP', r.status, 'for', url); return null; }
    const html = await r.text();
    return new DOMParser().parseFromString(html, 'text/html');
  } catch (e) {
    console.warn('[AMZ] direct fetch error', url, e);
    return null;
  }
}

function extractCarrierTracking(doc: Document): string[] {
  const found: string[] = [];
  const text = (doc.body?.textContent ?? '').replace(/\s+/g, ' ');

  // Explicit hook: Amazon's new package-tracker UI renders the tracking number
  // inside `.pt-delivery-card-trackingId` ("Tracking ID: 9339…"). Grab the
  // numeric/alphanumeric value out of that div first — it's the most reliable
  // signal when present, and we want it ahead of anything text-scanned.
  const ptCards = Array.from(doc.querySelectorAll<HTMLElement>('.pt-delivery-card-trackingId, [class*="trackingId"]'));
  for (const el of ptCards) {
    const v = (el.textContent ?? '').replace(/Tracking\s*(?:ID|number)?[:\s]*/i, '').trim().split(/\s+/)[0];
    if (v && /^[A-Z0-9]{8,30}$/i.test(v)) found.unshift(v);
  }

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
    .filter(h => /usps\.com|ups\.com|fedex\.com|dhl\.com|ontrac\.com|lasership\.com/i.test(h));
  for (const href of carrierLinks) {
    const m = href.match(/[?&](?:qtc_tLabels1|tLabels|tracknum|InquiryNumber\d*|tracknumbers|trknbr|AWB|tracking[_-]?number[s]?|trackingNumber)=([A-Z0-9]{8,30})/i);
    if (m) found.unshift(m[1]);
  }

  return [...new Set(found)];
}

function extractTitleFromDoc(doc: Document): string {
  // Try structured selectors first
  const bySelector = [
    doc.querySelector('[data-component="itemTitle"] a'),
    doc.querySelector('.yohtmlc-item a.a-link-normal'),
    doc.querySelector('.a-link-normal[href*="/dp/"]'),
    doc.querySelector('.a-link-normal[href*="/gp/product/"]'),
  ];
  for (const el of bySelector) {
    const text = (el?.textContent ?? '').trim().replace(/\s+/g, ' ');
    if (text.length > 5) return text.slice(0, 120);
  }
  // Fallback: any anchor whose href contains an ASIN pattern
  for (const a of Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href]'))) {
    if (!/\/dp\/[A-Z0-9]{10}|\/gp\/product\/[A-Z0-9]{10}/.test(a.href)) continue;
    const text = (a.textContent ?? '').trim().replace(/\s+/g, ' ');
    if (text.length > 5) return text.slice(0, 120);
  }
  console.warn('[AMZ] extractTitle: no match — sample links:', Array.from(doc.querySelectorAll('a[href]')).slice(0, 5).map(a => (a as HTMLAnchorElement).href));
  return '';
}

function extractAddressFromDoc(doc: Document): string {
  // Amazon detail page: <h5>Ship to</h5> followed by <ul> with <li> items
  // Items are: name, street address, "United States"
  const headers = Array.from(doc.querySelectorAll('h5'));
  for (const h of headers) {
    if (!/ship\s+to/i.test(h.textContent ?? '')) continue;
    const ul = h.nextElementSibling;
    if (!ul || ul.tagName !== 'UL') continue;
    const items = Array.from(ul.querySelectorAll('li span.a-list-item'))
      .map(el => (el.innerHTML ?? '').replace(/<br\s*\/?>/gi, ', ').replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' '))
      .filter(t => t && !/^united states$/i.test(t));
    // First item is the name, remaining items are the address lines
    const addrItems = items.slice(1);
    if (addrItems.length > 0) return addrItems.join(', ').slice(0, 200);
  }
  console.warn('[AMZ] extractAddress: no "Ship to" h5 found');
  return '';
}

function extractCostFromDoc(doc: Document): number {
  const text = (doc.body?.textContent ?? '').replace(/\s+/g, ' ');
  // Look for "Order Total: $XX.XX" or "Grand Total: $XX.XX"
  const totalMatch = text.match(/(?:Order Total|Grand Total)[:\s]+\$?([\d,]+\.?\d*)/i);
  if (totalMatch) return parseMoney(totalMatch[1]);
  // Fallback: look for "Total: $XX.XX" near order summary
  const fallbackMatch = text.match(/\bTotal[:\s]+\$?([\d,]+\.?\d*)/i);
  if (fallbackMatch) return parseMoney(fallbackMatch[1]);
  return 0;
}

async function fetchOrderDetails(orderId: string, extraTrackingUrls: string[] = []): Promise<{ tracking: string[]; title: string; address: string; cost: number; orderDate: string | null; paymentLast4?: string; paymentRatePercent?: number; noRushBonusPercent?: number; deliveryPhotoUrl?: string; notFound?: boolean }> {
  console.log('[AMZ] fetchOrderDetails', orderId);
  const detailDoc = await fetchHtml(`https://www.amazon.com/gp/your-account/order-details?orderID=${orderId}`);
  if (!detailDoc) { console.warn('[AMZ] fetchOrderDetails: no doc for', orderId); return { tracking: [], title: '', address: '', cost: 0, orderDate: null, paymentLast4: undefined }; }

  // Detect Amazon Business / sub-account / not-found pages. Common signal:
  // a hero block that says "Looking for an order?" / "We can't find an
  // order with that number" — and zero order content. The 113- prefix is
  // an Amazon Business order ID, which the user's personal session can't
  // open at all. Skip the import entirely so we don't pollute the orders
  // list with empty rows.
  const detailDocHtml = detailDoc.documentElement?.outerHTML ?? '';
  const looksLikeNotFound =
    /We can't find an order with that number|Looking for an order|Page Not Found/i.test(detailDocHtml) ||
    !/order-details|order-summary|orderDetails|pmts-payments/i.test(detailDocHtml);
  if (looksLikeNotFound) {
    console.log('[AMZ] detail page not accessible for', orderId, '(Business order or out-of-session) — skipping');
    return { tracking: [], title: '', address: '', cost: 0, orderDate: null, paymentLast4: undefined, notFound: true };
  }

  const title = extractTitleFromDoc(detailDoc);
  const address = extractAddressFromDoc(detailDoc);
  const cost = extractCostFromDoc(detailDoc);
  const orderDate = extractOrderDateFromDoc(detailDoc, orderId);

  // Last-4 extraction from the detail page. The Payment Method section
  // usually says "Visa ending in 1234" / "Mastercard ending in 1234". List
  // cards often hide this, so the detail page is the more reliable source.
  //
  // Match against outerHTML (the parsed doc serialized back to a string).
  // DOMParser-created docs have no layout, so .innerText is "" — and even
  // textContent strips inter-element whitespace in ways that can swallow
  // the prefix word. Raw HTML works regardless.
  // No-Rush delivery bonus. Amazon shows a supplemental box under the
  // payment method on delayed-shipping orders:
  //   "Earns 5% back and extra 2% on items using No-Rush delivery."
  // Capture the "extra N%" so we can flag the order + remember the
  // promised bonus for analytics.
  let noRushBonusPercent: number | undefined;
  const noRushMatch = detailDocHtml.match(/(?:extra|additional)\s+(\d+(?:\.\d+)?)\s*%[^<]{0,80}No[- ]?Rush/i);
  if (noRushMatch) noRushBonusPercent = parseFloat(noRushMatch[1]);

  // Scope to the actual charged-payment-method box(es) first — the whole
  // page can contain other "ending in ####" text (gift card balance, promo
  // card upsells, split-payment lines) earlier in the DOM than the real
  // charge. The rewards-rate text ("Earns 5% back and extra 1% on...")
  // lives in a sibling supplemental box with the same class fragment, so
  // scope to ALL matching boxes, not just the first.
  const paymentBoxes = Array.from(detailDoc.querySelectorAll('[class*="paystationpaymentmethod"]'));
  const detailHtml = paymentBoxes.length > 0
    ? paymentBoxes.map(el => el.outerHTML).join(' ')
    : (detailDoc.documentElement?.outerHTML ?? '');

  let paymentLast4: string | undefined;
  const detailPats: Array<RegExp> = [
    /\bending\s+in\s+(\d{4})\b/i,
    /\bending\s+(\d{4})\b/i,
    /\*{2,}\s*(\d{4})\b/,
    /\bx{4,}\s*(\d{4})\b/i,
    /[•·․⋅●]{2,}\s*(\d{4})\b/,
  ];
  for (const pat of detailPats) {
    const m = detailHtml.match(pat);
    if (m) { paymentLast4 = m[1]; break; }
  }

  // Total effective cashback rate for the card actually used, per the
  // payment box's own "Earns X% back[, and extra Y% on ...]" text — this
  // is how Amazon Store Card's variable-bonus tiers (base / +Amazon Day /
  // +No-Rush / stacked) show up, and it's the only reliable signal for
  // picking the right rate-tier card when several saved cards share the
  // same last4 (same physical card, different bonus-rate entries).
  let paymentRatePercent: number | undefined;
  const rateMatch = detailHtml.match(/(?:Earns|Get)\s+(\d+(?:\.\d+)?)\s*%\s*back/i);
  if (rateMatch) {
    paymentRatePercent = parseFloat(rateMatch[1]);
    const extraMatches = detailHtml.matchAll(/extra\s+(\d+(?:\.\d+)?)\s*%/gi);
    for (const m of extraMatches) paymentRatePercent += parseFloat(m[1]);
  }

  // Extract tracking sub-page URLs. Amazon uses two patterns:
  //  - legacy ship-track URLs (?orderId=&shipmentId=)
  //  - new package-tracker URLs (/progress-tracker/package/)
  // Each shipment has its own URL; we follow both shapes.
  //
  // CRITICAL: Amazon's progress-tracker namespace also includes pre-ship
  // and cancellation pages (e.g. /progress-tracker/package/preship/cancel-items)
  // which match our `*"progress-tracker"*` selector but contain no tracking.
  // Skip those — they consume our 8-page cap, return nothing, and worse,
  // the user reported the entire order ending up with empty tracking when
  // only preship URLs were present. Filter on URL path keywords.
  const detailPageUrls = Array.from(detailDoc.querySelectorAll<HTMLAnchorElement>(
    'a[href*="ship-track"], a[href*="progress-tracker"], a[href*="package-tracking"]'
  ))
    .map(a => a.href)
    .filter(h => !/\/(preship|cancel-items?|return|refund|replacement)\b/i.test(h));
  // Merge with the list-page tracking URLs the caller passed in (split
  // shipments — Amazon shows "Track package" buttons on the list before
  // the detail page aggregates them). De-dupe across both sources.
  const trackingPageUrls = [...detailPageUrls, ...extraTrackingUrls]
    .filter((href, i, arr) => arr.indexOf(href) === i);
  if (extraTrackingUrls.length > 0) {
    console.log('[AMZ]', orderId, 'detail had', detailPageUrls.length, 'tracking URLs, list added', extraTrackingUrls.length);
  }

  // Even with no link, scan the detail page itself — the new pt-delivery-card
  // sometimes inlines the tracking ID directly on the order page.
  const fromDetail = extractCarrierTracking(detailDoc);
  if (trackingPageUrls.length === 0 && fromDetail.length === 0) {
    console.log('[AMZ] no tracking pages or inline tracking for', orderId, '| title:', title || '(none)', '| addr:', address || '(none)', '| cost:', cost, '| noRush:', noRushBonusPercent ?? '-');
    return { tracking: [], title, address, cost, orderDate, paymentLast4, paymentRatePercent, noRushBonusPercent };
  }

  // Fetch each tracking page and extract carrier tracking numbers.
  // Cap at 8 — split shipments routinely exceed 3 (raised after a real miss).
  const tracking: string[] = [...fromDetail];
  let deliveryPhotoUrl: string | undefined;
  for (const url of trackingPageUrls.slice(0, 8)) {
    await new Promise(r => setTimeout(r, 600));
    const doc = await fetchHtml(url);
    if (!doc) continue;

    // Remove nav/footer to avoid picking up tracking numbers from other orders in sidebar
    doc.querySelectorAll('nav, footer, #navbar, #navFooter, #rhf').forEach(el => el.remove());

    const fromPage = extractCarrierTracking(doc);
    if (fromPage.length === 0) {
      console.warn('[AMZ] shipTrack page yielded no tracking:', url);
    }
    tracking.push(...fromPage);

    // Photo-on-delivery thumbnail lives in img.photo-on-delivery-img-thumb
    // on the progress-tracker page. Take the first one we find — the URL
    // is signed (X-Amz-Expires=259200, so 3 days), so the server will
    // download bytes before it expires.
    if (!deliveryPhotoUrl) {
      const photoImg = doc.querySelector<HTMLImageElement>('img.photo-on-delivery-img-thumb, img[class*="photo-on-delivery"]');
      const candidate = photoImg?.getAttribute('data-src') || photoImg?.getAttribute('src') || '';
      if (candidate && /^https?:\/\//i.test(candidate)) {
        deliveryPhotoUrl = candidate;
        console.log('[AMZ] delivery photo found for', orderId);
      }
    }
  }

  // Clean each candidate: strip trailing letters from non-UPS only.
  // UPS 1Z numbers can legitimately end in [A-Z] (last char is part of the
  // 16-char tail), so stripping there corrupts the number.
  const cleaned = [...new Set(tracking)].map(t => /^1Z/i.test(t) ? t : t.replace(/[A-Za-z]+$/, ''));
  // Drop empty / too-short entries first — an "" was leaking through the
  // dedupe filter (any non-empty other made startsWith(other) false, so ""
  // survived). 8 chars is the floor for any real carrier tracking number.
  const cleanedNonEmpty = [...new Set(cleaned)].filter(t => t && t.length >= 8);
  // Drop any entry that is a superstring of another (keep the shorter canonical form)
  const unique = cleanedNonEmpty.filter(t => !cleanedNonEmpty.some(other => other !== t && t.startsWith(other))).slice(0, 5);
  console.log('[AMZ] tracking for', orderId, ':', unique, '| title:', title || '(none)', '| addr:', address || '(none)', '| cost:', cost, '| orderDate:', orderDate, '| last4:', paymentLast4 ?? '(none)', '| photo:', deliveryPhotoUrl ? 'yes' : 'no');
  return { tracking: unique, title, address, cost, orderDate, paymentLast4, paymentRatePercent, noRushBonusPercent, deliveryPhotoUrl };
}

// Probe Amazon's order detail page for a placed timestamp. Amazon's UI usually
// only shows the date as plain text ("Order placed: May 22, 2026"), but
// occasional ISO timestamps appear in embedded JSON / data attributes / JSON-LD.
// We log every candidate so we can refine once we see real pages.
function extractOrderDateFromDoc(doc: Document, orderId: string): string | null {
  const html = doc.documentElement.outerHTML;
  const candidates: string[] = [];

  // JSON-style ISO timestamps
  for (const pat of [
    /"orderDate"\s*:\s*"([^"]+)"/i,
    /"orderPlacedDate"\s*:\s*"([^"]+)"/i,
    /"placedDate"\s*:\s*"([^"]+)"/i,
    /"orderTimestamp"\s*:\s*"?([^",}]+)"?/i,
    /"creationDate"\s*:\s*"([^"]+)"/i,
  ]) {
    const m = html.match(pat);
    if (m) candidates.push(`${pat.source} → ${m[1]}`);
  }

  // data-order-date attributes
  const dataEls = doc.querySelectorAll('[data-order-date], [data-order-placed-date], [data-order-timestamp]');
  dataEls.forEach(el => {
    for (const attr of ['data-order-date', 'data-order-placed-date', 'data-order-timestamp']) {
      const v = el.getAttribute(attr);
      if (v) candidates.push(`${attr} → ${v}`);
    }
  });

  // Visible text fallback: "Order placed: May 22, 2026" with optional time
  const textMatch = html.match(/Order placed[:\s]+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}(?:\s+\d{1,2}:\d{2}(?:\s?[AP]M)?)?)/i);
  if (textMatch) candidates.push(`text → ${textMatch[1]}`);

  if (candidates.length === 0) {
    console.log('[AMZ] no order date candidates found for', orderId);
    return null;
  }
  console.log('[AMZ] order date candidates for', orderId, ':', candidates);

  // Prefer the first ISO-like timestamp; fall back to first candidate raw value.
  for (const c of candidates) {
    const v = c.split(' → ').pop()!;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) return v;
  }
  const fallback = candidates[0].split(' → ').pop()!;
  const parsed = new Date(fallback);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

async function fetchOrdersPage(startIndex: number, year?: number): Promise<Document | null> {
  // Without timeFilter, Amazon's orders page only returns ~30 days regardless
  // of how far back the user wants to scrape. timeFilter=year-YYYY widens
  // it to the full calendar year. For spans that cross years, the caller
  // iterates one year at a time.
  const params = new URLSearchParams({ startIndex: String(startIndex) });
  if (year !== undefined) params.set('timeFilter', `year-${year}`);
  return fetchHtml(`https://www.amazon.com/your-orders/orders?${params}`);
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
  // Current-year pagination resume — set when the script navigates the
  // live tab to the next page (`?startIndex=N&timeFilter=year-YYYY`) and
  // expects the new content-script instance to continue scraping from
  // there. Past years use fetchOrdersPage (Amazon SSRs them) so they
  // don't need navigation-based resume.
  resumeStartIndex?: number;
  resumeYear?: number;
  resumeOrders?: ScrapedOrder[];
  resumeSeen?: string[];
}

function saveState(state: SyncState) {
  sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
  chrome.storage.local.set({ [STORAGE_KEY]: { ...state, ts: Date.now() } });
}

async function loadState(): Promise<SyncState | null> {
  // sessionStorage is per-tab. That's exactly the isolation we want:
  // only the tab that actually initiated the sync should auto-resume on
  // page load. Falling back to chrome.storage.local (a browser-wide
  // shared store) caused every OTHER open Amazon tab to see the fresh
  // pending state and hijack it — a user with 3 Amazon tabs open would
  // watch all 3 start syncing. The initiating tab's sessionStorage
  // survives the same-tab window.location.href navigations we use for
  // current-year pagination, so nothing is lost.
  //
  // The "new tab from popup" flow doesn't rely on this fallback either:
  // the background SW opens a fresh tab, waits for load, and sends
  // START_SYNC directly to it — which triggers startSync() → saveState()
  // → sessionStorage in that specific tab.
  try {
    const raw = sessionStorage.getItem(STATE_KEY);
    if (raw) return JSON.parse(raw);
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
let cancelRequested = false;

async function runSync(state: SyncState) {
  try {
  const sinceDate = new Date(state.sinceDate);
  const allOrders: ScrapedOrder[] = state.resumeOrders ? [...state.resumeOrders] : [];
  const seen = new Set<string>(state.resumeSeen ?? []);

  // Amazon's orders page only returns ~30 days unless we pin it to a
  // year via timeFilter=year-YYYY. We iterate from the current calendar
  // year down through sinceDate's year so a "since Jan 1 2026" sync on
  // a July 2026 day pulls all of 2026, and a "since Aug 2025" sync also
  // pulls 2025 after exhausting 2026.
  const fromYear = sinceDate.getFullYear();
  const toYear   = new Date().getFullYear();
  const resuming = state.resumeStartIndex != null && state.resumeYear === toYear;
  console.log('[AMZ] sinceDate:', sinceDate.toISOString().split('T')[0],
              '→ scraping years', fromYear, 'to', toYear,
              resuming ? `(resuming current year at startIndex=${state.resumeStartIndex})` : '');

  // CURRENT YEAR — walk pages via live-tab navigation. Amazon's current-
  // year orders page is fully React-rendered: static fetches (regardless
  // of origin or Sec-Fetch-Site) return an empty SPA shell. The React app
  // only populates order cards when full JS executes. So we navigate the
  // tab itself, wait for orders to render, scrape the live DOM, save
  // state, and `location.href` to the next page. The new content-script
  // instance picks up via the on-load handler and resumes the loop.
  //
  // Past years skip this entirely (Amazon SSRs them, fetch works fine).
  let hasOlderHit = false;
  if (toYear >= fromYear && allOrders.length < 500 && !cancelRequested) {
    const year = toYear;
    if (!resuming) {
      sendMessage({ type: 'SYNC_PROGRESS', platform: 'Amazon', scraped: 0, message: `Scraping ${year}, page 1…` });
    } else {
      sendMessage({ type: 'SYNC_PROGRESS', platform: 'Amazon', scraped: allOrders.length, message: `Scraping ${year}, startIndex=${state.resumeStartIndex}…` });
    }
    await waitForOrders();
    // Wait for the pagination block — Amazon lazy-injects it after the
    // order cards render.
    await new Promise(r => setTimeout(r, 1500));
    const { orders, hasOlder } = scrapeDoc(document, sinceDate);
    console.log(`[AMZ] ${year} ${resuming ? `startIndex=${state.resumeStartIndex}` : 'page 1'}:`, orders.length, 'orders, hasOlder:', hasOlder);
    for (const o of orders) {
      if (!seen.has(o.orderNumber)) { seen.add(o.orderNumber); allOrders.push(o); }
    }
    hasOlderHit = hasOlder;
    if (!hasOlderHit) {
      const nextIndex = getNextStartIndex(document);
      if (nextIndex != null && allOrders.length < 500 && !cancelRequested) {
        // Save state and navigate. Script exits; on-load handler will
        // resume with the new live DOM.
        console.log('[AMZ] navigating live tab → startIndex=', nextIndex);
        sendMessage({ type: 'SYNC_PROGRESS', platform: 'Amazon', scraped: allOrders.length, message: `Loading next page (startIndex=${nextIndex})…` });
        saveState({ ...state, resumeStartIndex: nextIndex, resumeYear: year, resumeOrders: allOrders, resumeSeen: Array.from(seen) });
        await new Promise(r => setTimeout(r, 200));
        window.location.href = `https://www.amazon.com/your-orders/orders?startIndex=${nextIndex}&timeFilter=year-${year}`;
        return; // Tab navigates, new content script picks up
      }
    }
  }

  // PAST YEARS — fetch-based (Amazon SSRs old years, so this works).
  if (!hasOlderHit) {
    yearLoop:
    for (let year = toYear - 1; year >= fromYear; year--) {
      if (cancelRequested || allOrders.length >= 500) break;
      sendMessage({ type: 'SYNC_PROGRESS', platform: 'Amazon', scraped: allOrders.length, message: `Scraping ${year}, page 1…` });
      const page1Doc = await fetchOrdersPage(0, year);
      if (!page1Doc) {
        console.warn('[AMZ] no doc for year', year);
        continue;
      }
      const page1 = scrapeDoc(page1Doc, sinceDate);
      console.log(`[AMZ] ${year} page 1:`, page1.orders.length, 'orders, hasOlder:', page1.hasOlder);
      for (const o of page1.orders) {
        if (!seen.has(o.orderNumber)) { seen.add(o.orderNumber); allOrders.push(o); }
      }
      if (page1.hasOlder) break yearLoop;

      let nextIndex = getNextStartIndex(page1Doc);
      let pageNum = 2;
      while (nextIndex !== null && allOrders.length < 500 && !cancelRequested) {
        sendMessage({ type: 'SYNC_PROGRESS', platform: 'Amazon', scraped: allOrders.length, message: `Scraping ${year}, page ${pageNum}…` });
        await new Promise(r => setTimeout(r, 1500));
        const doc = await fetchOrdersPage(nextIndex, year);
        if (!doc) break;
        const { orders, hasOlder } = scrapeDoc(doc, sinceDate);
        console.log(`[AMZ] ${year} page ${pageNum}:`, orders.length, 'orders, hasOlder:', hasOlder);
        for (const o of orders) {
          if (!seen.has(o.orderNumber)) { seen.add(o.orderNumber); allOrders.push(o); }
        }
        if (hasOlder) break yearLoop;
        nextIndex = getNextStartIndex(doc);
        pageNum++;
      }
    }
  }

  // Clear resume fields — past-year and detail fetch all happen here.
  const finalState: SyncState = { ...state };
  delete finalState.resumeStartIndex;
  delete finalState.resumeYear;
  delete finalState.resumeOrders;
  delete finalState.resumeSeen;

  // Skip re-checking any order the tracker has already locked. Locked orders
  // reject writes server-side anyway, so the per-order detail fetch (which
  // is where the rescrape cost lives — one HTTP round-trip per order) is
  // pure waste. This grows with backlog, so short-circuit early.
  if (allOrders.length > 0) {
    try {
      const lockedRes = await fetch(`${state.trackerUrl.replace(/\/$/, '')}/api/orders/locked-order-numbers?platform=amazon`, {
        headers: { 'X-Extension-User-Id': state.userId, 'X-API-Key': state.apiKey },
        credentials: 'include',
      });
      if (lockedRes.ok) {
        const lockedData = await lockedRes.json() as { orderNumbers?: string[] };
        const lockedSet = new Set(lockedData.orderNumbers ?? []);
        if (lockedSet.size > 0) {
          const before = allOrders.length;
          const kept: ScrapedOrder[] = [];
          for (const o of allOrders) {
            if (lockedSet.has(o.orderNumber)) continue;
            kept.push(o);
          }
          allOrders.length = 0;
          for (const o of kept) allOrders.push(o);
          console.log(`[AMZ] skipping ${before - allOrders.length} locked order(s); ${allOrders.length} remain for detail fetch`);
        }
      } else {
        console.warn(`[AMZ] locked-order-numbers HTTP ${lockedRes.status} — proceeding without skip`);
      }
    } catch (e) {
      console.warn('[AMZ] locked-order-numbers fetch failed — proceeding without skip:', e);
    }
  }

  // Fetch tracking + fill missing titles from order detail pages
  if (allOrders.length > 0) {
    for (let i = 0; i < allOrders.length; i++) {
      if (cancelRequested) {
        console.log('[AMZ] sync cancelled during detail fetch');
        break;
      }
      const order = allOrders[i];
      sendMessage({ type: 'SYNC_PROGRESS', platform: 'Amazon', scraped: allOrders.length, message: `Fetching details for order ${i + 1} of ${allOrders.length}…` });
      await new Promise(r => setTimeout(r, 800));
      const timeout = new Promise<{ tracking: string[]; title: string; address: string; cost: number; orderDate: string | null; paymentLast4?: string; paymentRatePercent?: number; noRushBonusPercent?: number; deliveryPhotoUrl?: string; notFound?: boolean }>(
        r => setTimeout(() => r({ tracking: [], title: '', address: '', cost: 0, orderDate: null }), 12000)
      );
      const { tracking, title, address, cost, orderDate, paymentLast4, paymentRatePercent, noRushBonusPercent, deliveryPhotoUrl, notFound } = await Promise.race([fetchOrderDetails(order.orderNumber, order._listTrackingUrls ?? []), timeout]);
      if (notFound) {
        // Amazon Business order or otherwise inaccessible — mark for
        // exclusion from the import so we don't pollute the orders list.
        order._skipBusiness = true;
        continue;
      }
      if (tracking.length > 0) order.trackingNumbers = tracking;
      if (!order.itemDescription && title) order.itemDescription = title;
      if (!order.shippingAddress && address) order.shippingAddress = address;
      if (!order.cost && cost) order.cost = cost;
      if (deliveryPhotoUrl) order.deliveryPhotoUrl = deliveryPhotoUrl;
      if (!order.paymentLast4 && paymentLast4) order.paymentLast4 = paymentLast4;
      if (paymentRatePercent != null) order.paymentRatePercent = paymentRatePercent;
      if (noRushBonusPercent != null) order.noRushBonusPercent = noRushBonusPercent;
      // Prefer detail's orderDate if it has a time component (T...:); otherwise
      // keep the listing's date-only value.
      if (orderDate && /T\d{2}:\d{2}/.test(orderDate)) order.orderDate = orderDate;
    }
  }

  // Drop Business / inaccessible orders so they don't go to the server.
  const filteredOrders = allOrders.filter(o => !o._skipBusiness);
  const skippedBusiness = allOrders.length - filteredOrders.length;
  if (skippedBusiness > 0) {
    console.log(`[AMZ] skipping ${skippedBusiness} order(s) — detail page inaccessible (likely Amazon Business)`);
  }
  allOrders.length = 0;
  for (const o of filteredOrders) allOrders.push(o);

  if (allOrders.length === 0) {
    clearState();
    setBadge('—');
    sendMessage({ type: 'SYNC_DONE', result: { platform: 'Amazon', scraped: 0, imported: 0, updated: 0 } });
    return;
  }

  try {
    const result = await pushOrders(state.trackerUrl, state.apiKey, state.userId, allOrders);
    clearState();
    await setLastSync('amazon', new Date().toISOString().split('T')[0]);
    setBadge(`+${result.imported ?? 0}`, '#22c55e');
    sendMessage({ type: 'SYNC_DONE', result: { platform: 'Amazon', scraped: allOrders.length, ...result } });
  } catch (err) {
    setBadge('!', '#ef4444');
    sendMessage({ type: 'SYNC_ERROR', platform: 'Amazon', error: err instanceof Error ? err.message : String(err) });
  }

  } catch (err) {
    setBadge('!', '#ef4444');
    sendMessage({ type: 'SYNC_ERROR', platform: 'Amazon', error: err instanceof Error ? err.message : String(err) });
  } finally {
    syncing = false;
  }
}

async function startSync() {
  if (syncing) return;
  syncing = true;
  cancelRequested = false;

  const settings = await getSettings();
  if (!settings.trackerUrl || !settings.userId) {
    sendMessage({ type: 'SYNC_ERROR', platform: 'Amazon', error: 'Tracker URL or user not configured — open Settings.' });
    setBadge('!', '#ef4444');
    syncing = false;
    return;
  }

  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const lastSyncDate = settings.amazonLastSync ? new Date(settings.amazonLastSync) : null;
  // First sync (no lastSyncDate): fall back to the 60-day floor.
  // Long gap (lastSyncDate older than 60 days): keep scanning back to
  // lastSyncDate so catch-up is complete.
  // Normal case: scan from lastSyncDate + 1-day overlap buffer, NOT the
  // 60-day floor — forcing the floor every time re-walked the full
  // 60-day window on every routine sync, which was the over-scrape bug.
  const sinceDate = !lastSyncDate
    ? sixtyDaysAgo
    : lastSyncDate < sixtyDaysAgo
      ? lastSyncDate
      : new Date(lastSyncDate.getTime() - 24 * 60 * 60 * 1000);

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
    cancelRequested = false;
    sendMessage({ type: 'SYNC_STARTED', platform: 'Amazon' });
    await runSync(state);
  }
})();

async function scrapeAmazonOrders(orderNumbers: string[]): Promise<{ scraped: number; imported: number; updated: number; eventId?: number | null }> {
  const settings = await getSettings();
  if (!settings.trackerUrl || !settings.userId) {
    throw new Error('Tracker URL or user not configured — open Settings.');
  }

  // Same skip-locked pattern as the main sync — a manual rescrape of
  // a locked order costs a full detail fetch for no gain (server rejects
  // the write). Cheap upfront filter.
  const trackerBase = settings.trackerUrl.replace(/\/$/, '');
  let filtered = [...orderNumbers];
  try {
    const lockedRes = await fetch(`${trackerBase}/api/orders/locked-order-numbers?platform=amazon`, {
      headers: { 'X-Extension-User-Id': settings.userId, 'X-API-Key': settings.apiKey ?? '' },
      credentials: 'include',
    });
    if (lockedRes.ok) {
      const lockedData = await lockedRes.json() as { orderNumbers?: string[] };
      const lockedSet = new Set(lockedData.orderNumbers ?? []);
      if (lockedSet.size > 0) {
        const before = filtered.length;
        filtered = filtered.filter(id => !lockedSet.has(id));
        if (before !== filtered.length) {
          console.log(`[AMZ] SCRAPE_AMAZON_ORDER: skipping ${before - filtered.length} locked; ${filtered.length} remain`);
        }
      }
    } else {
      console.warn(`[AMZ] SCRAPE_AMAZON_ORDER: locked-order-numbers HTTP ${lockedRes.status} — proceeding without skip`);
    }
  } catch (e) {
    console.warn('[AMZ] SCRAPE_AMAZON_ORDER: locked-order-numbers fetch failed — proceeding without skip:', e);
  }

  const orders: ScrapedOrder[] = [];
  for (const orderId of filtered) {
    console.log('[AMZ] SCRAPE_AMAZON_ORDER: fetching', orderId);
    const timeout = new Promise<{ tracking: string[]; title: string; address: string; cost: number; orderDate: string | null; paymentLast4?: string; paymentRatePercent?: number }>(
      r => setTimeout(() => r({ tracking: [], title: '', address: '', cost: 0, orderDate: null }), 20000)
    );
    const { tracking, title, address, cost, orderDate, paymentLast4, paymentRatePercent } = await Promise.race([fetchOrderDetails(orderId), timeout]);
    const today = new Date().toISOString().split('T')[0];
    orders.push({
      platform: 'Amazon',
      orderNumber: orderId,
      orderDate: orderDate ?? today,
      itemDescription: title,
      cost,
      shippingCost: 0,
      shippingAddress: address,
      trackingNumbers: tracking,
      sourceUrl: `https://www.amazon.com/gp/your-account/order-details?orderID=${orderId}`,
      paymentLast4,
      paymentRatePercent,
    });
    await new Promise(r => setTimeout(r, 800));
  }

  if (orders.length === 0) return { scraped: 0, imported: 0, updated: 0, eventId: null };

  const result = await pushOrders(settings.trackerUrl, settings.apiKey ?? '', settings.userId, orders);
  return { scraped: orders.length, imported: result.imported ?? 0, updated: result.updated ?? 0, eventId: result.eventId ?? null };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'PING') { sendResponse('ok'); return; }
  if (msg.type === 'START_SYNC' && msg.platform === 'Amazon') startSync();
  if (msg.type === 'CANCEL_SYNC' && msg.platform === 'Amazon') {
    cancelRequested = true;
    sendResponse('ok');
  }
  if (msg.type === 'SCRAPE_AMAZON_ORDER') {
    const orderNumbers: string[] = Array.isArray(msg.orderNumbers) ? msg.orderNumbers : [];
    scrapeAmazonOrders(orderNumbers)
      .then(result => sendResponse({ ok: true, ...result }))
      .catch(err => sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }));
    return true; // keep channel open for async response
  }
});
