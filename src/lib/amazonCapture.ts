// Pure helpers for the passive Amazon page capture. No chrome.* and no network
// access in here, so they can be unit-tested under plain node with a DOM shim.
//
// The extension only ever reads the DOM of an Amazon page the user opened.
// Nothing in this file (or the content script that calls it) fetches, opens,
// navigates or clicks anything.

import { getScrape } from './scrapeConfig.ts';

export type AmazonPageKind = 'orders' | 'detail' | 'tracking';

export const MAX_CLEAN_BYTES = 1_500_000;
export const DEDUPE_WINDOW_MS = 10 * 60 * 1000;
export const QUEUE_MAX_ENTRIES = 20;
export const QUEUE_MAX_BYTES = 6_000_000;

export function classifyAmazonUrl(rawUrl: string): AmazonPageKind | null {
  let u: URL;
  try { u = new URL(rawUrl); } catch { return null; }
  const S = getScrape('amazon');
  if (u.protocol !== 'https:' || u.hostname !== S.urls.host) return null;
  // Amazon often appends a /ref=... segment to the same page.
  const p = u.pathname.replace(S.regex('refSuffix'), '').replace(/\/+$/, '');
  if (S.regex('ordersPath').test(p)) return 'orders';
  if (S.regex('detailPath').test(p)) return 'detail';
  if (S.regex('trackingPath').test(p)) return 'tracking';
  return null;
}

/** True for sign-in pages, CAPTCHA pages and the agent-block interstitial. Nothing is sent for these. */
export function isBlockedPage(doc: Document): boolean {
  // Every signed-in Amazon page carries a hidden <form id="ap_navbar_form"
  // name="signIn"> in the top nav (the account flyout). It is not a sign-in
  // page, and counting it blocked every Sync now on page 1 (2026-11-20).
  const S = getScrape('amazon');
  if (doc.querySelector(S.selectors.blockedSignIn)) return true;
  if (doc.querySelector(S.selectors.blockedCaptcha)) return true;
  const text = doc.documentElement?.textContent ?? '';
  if (S.regex('agentBlock', 'i').test(text.slice(0, 20000))) return true;
  return false;
}

/**
 * Returns a cleaned HTML string for the document: scripts/styles/svg/etc.
 * removed, inline event attributes dropped, data: URIs removed. Works on a
 * clone, so the live page is never modified.
 */
export function cleanDocumentHtml(doc: Document): string {
  const root = doc.documentElement.cloneNode(true) as HTMLElement;
  root.querySelectorAll(getScrape('amazon').selectors.stripElements).forEach(el => el.remove());
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
  /** From a TRACK_AMAZON run: the tracker may fill a blank tracking number. */
  trackRun?: boolean;
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

/** The tracker answers `{ ok, result }`; the per-page numbers and `list` live under `result`. */
export function unwrapPageResponse(body: unknown): PageResult & { list?: unknown } {
  const b = (body ?? {}) as { result?: unknown };
  return (b.result && typeof b.result === 'object' ? b.result : {}) as PageResult & { list?: unknown };
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
