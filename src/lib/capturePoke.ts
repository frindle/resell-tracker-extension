// A run's page is read on the worker's say-so, not the page's own timers.
//
// A page in a minimized window or background tab has its timers slowed by the
// browser, so the content script's "wait until the page settles" timer could
// fire after the run had already given up on the page. Messages are not
// slowed, so during a run the worker asks the page (AMAZON_CAPTURE_NOW) every
// couple of seconds, and after a while tells it to send what it has. Still
// only a read of a page the browser already loaded: nothing is fetched.
import type { PageOutcome } from './syncRun.ts';

export const POKE_FIRST_MS = 3000;   // first ask after the page was opened
export const POKE_EVERY_MS = 2000;   // then this often
export const POKE_FORCE_MS = 12000;  // from here on a loaded page is read even while it is still changing
export const POKE_FORCE_ANY_MS = 22000; // last resort: read it even if it never finished loading
/** A page must say twice that it is not an order page (it may be mid-redirect the first time). */
export const UNRECOGNISED_REPLIES = 2;

export type CaptureState = 'sent' | 'blocked' | 'too_large' | 'unrecognised';
export interface PokeReply { state: CaptureState | 'busy'; pageId: string; path?: string }

const STATES = new Set(['sent', 'blocked', 'too_large', 'unrecognised', 'busy']);

export function parsePokeReply(raw: unknown): PokeReply | null {
  const r = raw as { state?: unknown; pageId?: unknown; path?: unknown } | null;
  if (!r || typeof r !== 'object' || typeof r.state !== 'string' || !STATES.has(r.state)) return null;
  if (typeof r.pageId !== 'string' || !r.pageId) return null;
  return { state: r.state as PokeReply['state'], pageId: r.pageId, ...(typeof r.path === 'string' ? { path: r.path.slice(0, 80) } : {}) };
}

/**
 * Reads the page's answers while a run waits on it. `stalePageId` is the page
 * the tab showed before this one: its answers (the navigation has not landed
 * yet) are ignored.
 */
export function createPokeJudge(stalePageId: string | null = null) {
  let pageId: string | null = null;
  let unrecognised = 0;
  let note = 'the page never answered';
  return {
    /** One answer (anything else when the page did not answer). An outcome ends the wait. */
    reply(raw: unknown): PageOutcome | null {
      const r = parsePokeReply(raw);
      if (!r) return null;
      if (stalePageId && r.pageId === stalePageId) { note = 'the tab stayed on the previous page'; return null; }
      if (r.pageId !== pageId) { pageId = r.pageId; unrecognised = 0; }
      if (r.state === 'unrecognised') {
        unrecognised += 1;
        note = `not an order page: ${r.path ?? 'unknown'}`;
        return unrecognised >= UNRECOGNISED_REPLIES ? { kind: 'error', message: note } : null;
      }
      unrecognised = 0;
      note = r.state === 'busy' ? 'the page was still loading'
        : r.state === 'sent' ? 'the page was sent but the tracker did not answer in time'
        : r.state === 'blocked' ? 'sign-in or block page' : 'page too large';
      return null;
    },
    /** The page that answered last, to pass as the next page's stalePageId. */
    pageId: () => pageId,
    /** Why the page was not read, for the run summary. */
    note: () => note,
  };
}

/** Whether this ask should tell a loaded page to send what it has. */
export const shouldForce = (elapsedMs: number) => elapsedMs >= POKE_FORCE_MS;
/** Whether this ask should tell the page to send what it has even though it never finished loading. */
export const shouldForceAny = (elapsedMs: number) => elapsedMs >= POKE_FORCE_ANY_MS;

/**
 * Whether the page may be read on this ask. A half-loaded page read too early
 * would be taken as the whole order, so a page that is still loading is left
 * alone until the last resort.
 */
export function mayReadNow(p: { readyState: string; quietForMs: number; quietMs: number; force?: boolean; forceAny?: boolean }): boolean {
  if (p.readyState === 'complete' && (p.quietForMs >= p.quietMs || !!p.force || !!p.forceAny)) return true;
  return !!p.forceAny && p.readyState !== 'loading';
}

/** Whether an outcome belongs to the page being waited on, not the one the tab showed before it. */
export function isStaleOutcome(pageId: unknown, stalePageId: string | null): boolean {
  return typeof pageId === 'string' && !!pageId && pageId === stalePageId;
}
