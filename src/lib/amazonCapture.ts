// Pure helpers for the passive Amazon page capture. No chrome.* and no network
// access in here, so they can be unit-tested under plain node with a DOM shim.
//
// The extension only ever reads the DOM of an Amazon page the user opened.
// Nothing in this file (or the content script that calls it) fetches, opens,
// navigates or clicks anything.

export type AmazonPageKind = 'orders' | 'detail' | 'tracking';

export const MAX_CLEAN_BYTES = 1_500_000;
export const DEDUPE_WINDOW_MS = 10 * 60 * 1000;
export const QUEUE_MAX_ENTRIES = 20;
export const QUEUE_MAX_BYTES = 6_000_000;

export function classifyAmazonUrl(rawUrl: string): AmazonPageKind | null {
  let u: URL;
  try { u = new URL(rawUrl); } catch { return null; }
  if (u.protocol !== 'https:' || u.hostname !== 'www.amazon.com') return null;
  const p = u.pathname.replace(/\/+$/, '');
  if (p === '/your-orders/orders' || p === '/gp/css/order-history' || p === '/gp/your-account/order-history') return 'orders';
  if (p === '/gp/your-account/order-details' || p === '/your-orders/order-details' || p === '/gp/css/summary/edit.html') return 'detail';
  if (p === '/progress-tracker/package' || p.startsWith('/progress-tracker/package/') || p === '/gp/your-account/ship-track' || p === '/gp/css/shiptrack/view.html') return 'tracking';
  return null;
}

const AGENT_BLOCK_RE = /unauthorized AI agent|violates Amazon'?s Conditions of Use|automated access/i;

/** True for sign-in pages, CAPTCHA pages and the agent-block interstitial. Nothing is sent for these. */
export function isBlockedPage(doc: Document): boolean {
  if (doc.querySelector('form[name="signIn"], #ap_email, #ap_password, input[name="password"][type="password"]')) return true;
  if (doc.querySelector('form[action*="validateCaptcha"], #captchacharacters, img[src*="captcha"]')) return true;
  const text = doc.documentElement?.textContent ?? '';
  if (AGENT_BLOCK_RE.test(text.slice(0, 20000))) return true;
  return false;
}

const STRIP_SELECTOR = 'script, noscript, style, link, meta, iframe, svg, template, input[type="hidden"], [id^="shipToData-"]';

/**
 * Returns a cleaned HTML string for the document: scripts/styles/svg/etc.
 * removed, inline event attributes dropped, data: URIs removed. Works on a
 * clone, so the live page is never modified.
 */
export function cleanDocumentHtml(doc: Document): string {
  const root = doc.documentElement.cloneNode(true) as HTMLElement;
  root.querySelectorAll(STRIP_SELECTOR).forEach(el => el.remove());
  const all = root.querySelectorAll('*');
  all.forEach(el => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) { el.removeAttribute(attr.name); continue; }
      if (/^\s*data:/i.test(attr.value)) { el.removeAttribute(attr.name); continue; }
      if (name === 'srcset' && /data:/i.test(attr.value)) { el.removeAttribute(attr.name); continue; }
    }
  });
  return '<!doctype html>' + root.outerHTML;
}

export function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

/** cyrb53 string hash: sync, no crypto dependency, plenty for dedupe. */
export function hashString(str: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

export type SeenMap = Record<string, number>;

/** True when this hash was already sent within the dedupe window. */
export function isDuplicate(seen: SeenMap, hash: string, now: number, windowMs = DEDUPE_WINDOW_MS): boolean {
  const t = seen[hash];
  return typeof t === 'number' && now - t < windowMs;
}

/** Records a hash and prunes expired entries. Returns a new map. */
export function markSeen(seen: SeenMap, hash: string, now: number, windowMs = DEDUPE_WINDOW_MS): SeenMap {
  const out: SeenMap = {};
  for (const [h, t] of Object.entries(seen)) if (now - t < windowMs) out[h] = t;
  out[hash] = now;
  return out;
}

export interface QueueItem {
  url: string;
  kind: AmazonPageKind;
  html: string;
  hash: string;
  capturedAt: number;
  attempts: number;
}

/** Adds an item to the retry queue, replacing the same hash, and enforces the entry and byte caps (oldest dropped first). */
export function enqueue(queue: QueueItem[], item: QueueItem, maxEntries = QUEUE_MAX_ENTRIES, maxBytes = QUEUE_MAX_BYTES): QueueItem[] {
  const q = queue.filter(i => i.hash !== item.hash);
  q.push(item);
  while (q.length > maxEntries) q.shift();
  let total = q.reduce((n, i) => n + i.html.length, 0);
  while (q.length > 1 && total > maxBytes) {
    total -= q[0].html.length;
    q.shift();
  }
  return q;
}

export interface PageResult {
  created?: number;
  updated?: number;
  unchanged?: number;
  discrepancies?: number;
  mode?: string;
  blocked?: boolean;
  parseFailed?: boolean;
}

export function summarizeResult(r: PageResult): string {
  if (r.blocked) return 'ignored (sign-in or block page)';
  if (r.parseFailed) return 'could not parse page';
  const parts: string[] = [];
  const verb = r.mode === 'compare' ? ['would create', 'would update'] : ['new', 'updated'];
  if (r.created) parts.push(`${r.created} ${verb[0]}`);
  if (r.updated) parts.push(`${r.updated} ${verb[1]}`);
  if (r.unchanged) parts.push(`${r.unchanged} unchanged`);
  if (r.discrepancies) parts.push(`${r.discrepancies} needs review`);
  const text = parts.length ? parts.join(', ') : 'nothing found';
  return r.mode === 'compare' ? `${text} (compare only)` : text;
}
