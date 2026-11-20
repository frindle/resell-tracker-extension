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

/**
 * The wait before the next page. Never a fixed beat: between 0.75x and 2.25x
 * the base, and about one time in six a longer pause of 3x to 5x, the way a
 * person stops to read something.
 */
export function paceDelay(baseMs: number, rnd: () => number = Math.random): number {
  if (rnd() < 1 / 6) return Math.round(baseMs * (3 + 2 * rnd()));
  return Math.round(baseMs * (0.75 + 1.5 * rnd()));
}

/** A shuffled copy, so detail pages are not visited in page order every run. */
export function shuffled<T>(items: T[], rnd: () => number = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** What the tracker wants visited for one order (lib/amazonVisitPlan.ts on the server). */
export interface Visit { orderNumber: string; url?: string | null; stages: ('detail' | 'track')[] }
/** The tracker's answer to a Sync click: the pending visits, and whether order-list page 1 is due (once a day). */
export interface VisitPlan { visits: Visit[]; listDue: boolean }
/** Orders in one clicked run, whatever the sources (the tracker's list and the order list's own needs). */
export const CLICK_MAX_ORDERS = 10;

export interface NeedItem { orderNumber: string; detailUrl?: string | null; trackUrls?: string[] }
export const MAX_TRACK_PAGES_PER_ORDER = 3;
const digitsOf = (s: string) => String(s ?? '').replace(/\D/g, '') || String(s ?? '');
export const detailUrlFor = (orderNumber: string) =>
  `https://www.amazon.com/gp/your-account/order-details?orderID=${encodeURIComponent(orderNumber)}`;

/** The stored link only when it is an https www.amazon.com order-details page; otherwise the page built from the order number. */
export function visitUrlFor(v: Visit): string {
  return v.url && classifyAmazonUrl(v.url) === 'detail' ? v.url : detailUrlFor(v.orderNumber);
}

export interface ListInfo {
  /** Some order on this page is already in the tracker, so the run need not page further back. */
  anyKnown?: boolean;
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
  /** Clicked runs only: the tracker's pending visits. Null when it cannot be reached (the run then reads the order list as before). */
  fetchVisits?(): Promise<VisitPlan | null>;
}

export interface RunSummary {
  status: 'done' | 'blocked' | 'capped' | 'error';
  pages: number;
  created: number;
  updated: number;
  unchanged: number;
  discrepancies: number;
  /** pages the tracker ignored as sign-in/block pages */
  ignored?: number;
  /** pages the tracker could not parse */
  unparsed?: number;
  mode?: string;
  message: string;
  blockedUrl?: string;
}

export function formatRunSummary(s: RunSummary): string {
  if (s.status === 'blocked') return `blocked after ${s.pages} page(s); tab left open for you`;
  const compare = s.mode === 'compare';
  let base = `${s.pages} page(s): ${s.created} ${compare ? 'would create' : 'new'}, ${s.updated} ${compare ? 'would update' : 'updated'}, ${s.unchanged} unchanged, ${s.discrepancies} needs review`;
  if (s.ignored) base += ` (${s.ignored} page ignored as sign-in/block)`;
  if (s.unparsed) base += ` (${s.unparsed} page could not be parsed)`;
  if (compare) base += ' (compare only)';
  return s.status === 'capped' ? `${base} (page cap reached)` : s.status === 'error' ? `${base} (${s.message})` : base;
}

export function createSyncRunner(deps: RunDeps) {
  let running = false;

  /**
   * opts.orders: a tracking run, only these orders' detail and Track package pages.
   * opts.visits: the tracker's email-triggered visits (each order's detail page,
   * then its Track package page when the visit has a track stage).
   * Neither: a clicked run (see below).
   */
  async function run(opts: { maxPages?: number; paceMs?: number; startUrl?: string; orders?: string[]; visits?: Visit[] } = {}): Promise<RunSummary | { started: false; reason: string }> {
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
        await deps.sleep(paceDelay(paceMs));
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
        if (out.result.blocked) sum.ignored = (sum.ignored ?? 0) + 1;
        if (out.result.parseFailed) sum.unparsed = (sum.unparsed ?? 0) + 1;
        if (out.result.mode) sum.mode = out.result.mode;
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

      if (opts.visits) {
        // Email-triggered run: each order once, detail page first.
        const seen = new Set<string>();
        outer: for (const v of opts.visits) {
          const key = digitsOf(v.orderNumber);
          if (seen.has(key)) continue;
          seen.add(key);
          const out = await visit(visitUrlFor(v));
          if (!out) break;
          if (!v.stages.includes('track')) continue;
          const trackUrls = out.kind === 'result' ? (out.result.detail?.trackUrls ?? []).slice(0, MAX_TRACK_PAGES_PER_ORDER) : [];
          for (const u of trackUrls) if (!(await visit(u))) break outer;
        }
        return sum;
      }

      // Clicked run. The tracker already knows which orders need a page, so
      // go to them (a random few, shuffled, with the usual random waits).
      // Order-list page 1 is read only when the tracker says it is due (about
      // once a day, to catch an order whose email never came), and further
      // pages only while nothing on page 1 is known to the tracker.
      const plan = deps.fetchVisits ? await deps.fetchVisits().catch(() => null) : null;
      const targets = new Map<string, Visit>();
      for (const v of plan?.visits ?? []) targets.set(digitsOf(v.orderNumber), v);

      if (!plan || plan.listDue) {
        let listUrl: string | null = opts.startUrl ?? START_URL;
        const seenLists = new Set<string>();
        while (listUrl && !seenLists.has(listUrl)) {
          seenLists.add(listUrl);
          const out = await visit(listUrl);
          if (!out) break;
          const list = out.kind === 'result' ? out.result.list : undefined;
          for (const n of list?.needs ?? []) {
            const key = digitsOf(n.orderNumber);
            if (!needs.has(n.orderNumber)) needs.set(n.orderNumber, n);
            // A link the tracker handed over that is not an Amazon order page is never opened.
            if (n.detailUrl && classifyAmazonUrl(n.detailUrl) !== 'detail') continue;
            if (!targets.has(key)) targets.set(key, { orderNumber: n.orderNumber, url: n.detailUrl, stages: [] });
          }
          if (!list || list.reachedWindow || list.allComplete || !list.nextUrl) break;
          // Without the tracker's say-so (old server) keep the old walk; with it, stop at the first known order.
          if (plan && list.anyKnown) break;
          listUrl = list.nextUrl;
        }
      }

      if (sum.status === 'done') {
        outer: for (const v of shuffled([...targets.values()]).slice(0, CLICK_MAX_ORDERS)) {
          const out = await visit(visitUrlFor(v));
          if (!out) break;
          const fromList = needs.get(v.orderNumber);
          const trackUrls = v.stages.includes('track')
            ? (out.kind === 'result' ? (out.result.detail?.trackUrls ?? []).slice(0, MAX_TRACK_PAGES_PER_ORDER) : [])
            : fromList?.trackUrls?.slice(0, 1) ?? [];
          for (const u of trackUrls) if (!(await visit(u))) break outer;
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
