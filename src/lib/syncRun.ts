// "Sync now" run controller. A run starts from a person's click (popup button,
// or the tracker's Sync Amazon button queueing a command), or, since Penn's
// call on 2026-11-15, from the tracker's TRACK_AMAZON command: tracking for
// orders whose shipped email had none, after the sidecar was blocked. A
// tracking run visits only those orders' detail and Track package pages, in a
// minimized window. It navigates ONE tab page by page; each page is read by the
// same passive capture path as any page the user opens by hand. No fetch() of
// Amazon pages, no workarounds for blocks: if a page is a sign-in, CAPTCHA or
// agent-block page the run stops and leaves the tab open for the user.
import { classifyAmazonUrl, type PageResult } from './amazonCapture.ts';

export const START_URL = 'https://www.amazon.com/your-orders/orders?timeFilter=last30';
export const DEFAULT_MAX_PAGES = 40;
export const DEFAULT_PACE_MS = 4000;

export interface NeedItem { orderNumber: string; detailUrl?: string | null; trackUrls?: string[] }
export const MAX_TRACK_PAGES_PER_ORDER = 3;
export const detailUrlFor = (orderNumber: string) =>
  `https://www.amazon.com/gp/your-account/order-details?orderID=${encodeURIComponent(orderNumber)}`;

export interface ListInfo {
  nextUrl?: string | null;
  reachedWindow?: boolean;
  allComplete?: boolean;
  needs?: NeedItem[];
}
export type PageOutcome =
  | { kind: 'result'; result: PageResult & { list?: ListInfo; detail?: { trackUrls?: string[] } } }
  | { kind: 'blocked' }
  | { kind: 'timeout' }
  | { kind: 'error'; message: string };

export interface RunDeps {
  openTab(url: string): Promise<number>;
  navigate(tabId: number, url: string): Promise<void>;
  waitForOutcome(tabId: number): Promise<PageOutcome>;
  closeTab(tabId: number): Promise<void>;
  sleep(ms: number): Promise<void>;
}

export interface RunSummary {
  status: 'done' | 'blocked' | 'capped' | 'error';
  pages: number;
  created: number;
  updated: number;
  unchanged: number;
  discrepancies: number;
  message: string;
  blockedUrl?: string;
}

export function formatRunSummary(s: RunSummary): string {
  if (s.status === 'blocked') return `blocked after ${s.pages} page(s); tab left open for you`;
  const base = `${s.pages} page(s): ${s.created} new, ${s.updated} updated, ${s.unchanged} unchanged, ${s.discrepancies} needs review`;
  return s.status === 'capped' ? `${base} (page cap reached)` : s.status === 'error' ? `${base} (${s.message})` : base;
}

export function createSyncRunner(deps: RunDeps) {
  let running = false;

  /** opts.orders: a tracking run, only these orders' detail and Track package pages. */
  async function run(opts: { maxPages?: number; paceMs?: number; startUrl?: string; orders?: string[] } = {}): Promise<RunSummary | { started: false; reason: string }> {
    if (running) return { started: false, reason: 'a sync is already running' };
    running = true;
    const maxPages = opts.maxPages ?? DEFAULT_MAX_PAGES;
    const paceMs = opts.paceMs ?? DEFAULT_PACE_MS;
    const sum: RunSummary = { status: 'done', pages: 0, created: 0, updated: 0, unchanged: 0, discrepancies: 0, message: '' };
    let tabId: number | null = null;
    let consecutiveTimeouts = 0;
    const needs = new Map<string, NeedItem>();

    // Visits one URL; returns the outcome, or null when the run must stop.
    const visit = async (url: string): Promise<PageOutcome | null> => {
      if (!classifyAmazonUrl(url)) return { kind: 'error', message: 'skipped non-order url' };
      if (sum.pages >= maxPages) { sum.status = 'capped'; return null; }
      if (tabId === null) {
        tabId = await deps.openTab(url);
      } else {
        await deps.sleep(paceMs);
        await deps.navigate(tabId, url);
      }
      sum.pages += 1;
      const out = await deps.waitForOutcome(tabId);
      if (out.kind === 'blocked') {
        sum.status = 'blocked';
        sum.blockedUrl = undefined; // never record page details
        sum.message = 'sign-in, CAPTCHA or block page';
        return null;
      }
      if (out.kind === 'timeout') {
        consecutiveTimeouts += 1;
        if (consecutiveTimeouts >= 3) { sum.status = 'error'; sum.message = 'pages did not load'; return null; }
      } else {
        consecutiveTimeouts = 0;
      }
      if (out.kind === 'result') {
        sum.created += out.result.created ?? 0;
        sum.updated += out.result.updated ?? 0;
        sum.unchanged += out.result.unchanged ?? 0;
        sum.discrepancies += out.result.discrepancies ?? 0;
      }
      return out;
    };

    try {
      if (opts.orders) {
        // Tracking run: each order's detail page, then the Track package
        // links the tracker returns for it while it still has no tracking.
        outer: for (const o of opts.orders) {
          const out = await visit(detailUrlFor(o));
          if (!out) break;
          const trackUrls = out.kind === 'result' ? (out.result.detail?.trackUrls ?? []).slice(0, MAX_TRACK_PAGES_PER_ORDER) : [];
          for (const u of trackUrls) {
            if (!(await visit(u))) break outer;
          }
        }
        return sum;
      }

      // 1. Walk the order-list pages until the window / known-complete orders / no next page.
      let listUrl: string | null = opts.startUrl ?? START_URL;
      const seenLists = new Set<string>();
      while (listUrl && !seenLists.has(listUrl)) {
        seenLists.add(listUrl);
        const out = await visit(listUrl);
        if (!out) break;
        const list = out.kind === 'result' ? out.result.list : undefined;
        for (const n of list?.needs ?? []) if (!needs.has(n.orderNumber)) needs.set(n.orderNumber, n);
        if (!list || list.reachedWindow || list.allComplete || !list.nextUrl) break;
        listUrl = list.nextUrl;
      }

      // 2. Visit detail then tracking pages only for orders the tracker said need them.
      if (sum.status === 'done') {
        outer: for (const n of needs.values()) {
          const urls = [n.detailUrl, n.trackUrls?.[0]].filter((u): u is string => !!u);
          for (const u of urls) {
            const out = await visit(u);
            if (!out) break outer;
          }
        }
      }
    } catch (e) {
      sum.status = 'error';
      sum.message = String((e as Error).message || e);
    } finally {
      // A blocked run leaves the tab exactly where it is for the user.
      if (tabId !== null && sum.status !== 'blocked') {
        try { await deps.closeTab(tabId); } catch { /* tab already closed */ }
      }
      running = false;
    }
    return sum;
  }

  return { run, isRunning: () => running };
}
