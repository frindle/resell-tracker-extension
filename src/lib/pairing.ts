// Pairing: the tracker hands this extension its shared secret once a signed-in user approves it,
// so nobody copies a secret between the extension and the tracker's .env.
//
// 1. beginPairing POSTs /api/extension/pair and gets a code (shown in the approval page URL) and a
//    claim (kept here, never shown). The approval page opens in a tab.
// 2. The user approves on the tracker, signed in.
// 3. stepPairing POSTs /api/extension/pair/claim with both until the tracker answers 'approved' with
//    the secret and the approving user, once. The options page calls it every 2 s while open, and the
//    background calls it on each poll alarm, so closing the page does not lose the pairing.
//
// The pending pairing lives in chrome.storage.local (this device only), not sync.

export const PAIRING_KEY = 'pendingPairing';
// The tracker forgets a pairing after 10 minutes; stop a little sooner.
export const PAIRING_TTL_MS = 9.5 * 60_000;
export const PAIRING_POLL_MS = 2_000;

export interface PendingPairing { trackerUrl: string; code: string; claim: string; expiresAt: number }

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface PairingStore {
  get(): Promise<PendingPairing | null>;
  set(p: PendingPairing): Promise<void>;
  /** Removes the pending pairing only if it is still this code (another caller may have replaced it). */
  clear(code: string): Promise<void>;
}

export interface Paired { secret: string; userId: string; userName: string }

export type StepResult =
  | { state: 'none' }
  | { state: 'pending'; expiresAt: number }
  | { state: 'paired'; userName: string }
  | { state: 'expired' }
  | { state: 'unknown' }
  | { state: 'error'; message: string };

export function trackerBase(trackerUrl: string): string {
  return trackerUrl.trim().replace(/\/+$/, '');
}

/** The approval page, built here from the code so a tab is only ever opened on the tracker itself. */
export function approvalUrl(trackerUrl: string, code: string): string {
  return `${trackerBase(trackerUrl)}/extension/pair?code=${encodeURIComponent(code)}`;
}

export async function beginPairing(
  trackerUrl: string, browser: 'chrome' | 'firefox', fetchImpl: FetchLike, now: number,
): Promise<PendingPairing> {
  const base = trackerBase(trackerUrl);
  const res = await fetchImpl(`${base}/api/extension/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ browser }),
  });
  if (res.status === 429) throw new Error('Too many pairings waiting on the tracker; try again in a few minutes.');
  if (!res.ok) throw new Error(`The tracker refused to start pairing (HTTP ${res.status}). Update the tracker?`);
  const body = await res.json().catch(() => null) as { code?: unknown; claim?: unknown } | null;
  if (typeof body?.code !== 'string' || typeof body?.claim !== 'string' || !body.code || !body.claim) {
    throw new Error('The tracker sent an unexpected pairing reply.');
  }
  return { trackerUrl: base, code: body.code, claim: body.claim, expiresAt: now + PAIRING_TTL_MS };
}

/**
 * One claim attempt for the stored pairing. On 'paired' the secret and user are already saved
 * through `save` and the pending pairing is gone.
 */
export async function stepPairing(
  store: PairingStore, save: (p: Paired) => Promise<void>, fetchImpl: FetchLike, now: number,
): Promise<StepResult> {
  const p = await store.get();
  if (!p) return { state: 'none' };
  if (now >= p.expiresAt) { await store.clear(p.code); return { state: 'expired' }; }

  let res: Response;
  try {
    res = await fetchImpl(`${p.trackerUrl}/api/extension/pair/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: p.code, claim: p.claim }),
    });
  } catch {
    return { state: 'error', message: 'Could not reach the tracker.' };
  }
  // 404: the tracker no longer knows this pairing (expired, restarted, or another caller claimed it).
  if (res.status === 404) { await store.clear(p.code); return { state: 'unknown' }; }
  if (!res.ok) return { state: 'error', message: `Pairing check failed (HTTP ${res.status}).` };

  const body = await res.json().catch(() => null) as
    { status?: unknown; secret?: unknown; userId?: unknown; userName?: unknown } | null;
  if (body?.status === 'pending') return { state: 'pending', expiresAt: p.expiresAt };
  if (body?.status !== 'approved' || typeof body.secret !== 'string' || body.userId == null) {
    return { state: 'error', message: 'The tracker sent an unexpected pairing reply.' };
  }
  const userName = typeof body.userName === 'string' ? body.userName : '';
  await save({ secret: body.secret, userId: String(body.userId), userName });
  await store.clear(p.code);
  return { state: 'paired', userName };
}

/** Whether the saved secret is accepted: 'ok', 'rejected' (pair again), or 'unreachable'. */
export async function checkSecret(
  trackerUrl: string, userId: string, secret: string, fetchImpl: FetchLike,
): Promise<'ok' | 'rejected' | 'unreachable'> {
  try {
    const res = await fetchImpl(`${trackerBase(trackerUrl)}/api/extension/scrape-config`, {
      // The user-id header sends the request down the tracker's extension path; any value does.
      headers: { 'X-Extension-User-Id': userId || '0', 'X-Extension-Secret': secret },
    });
    if (res.status === 401) return 'rejected';
    return res.ok || res.status === 304 ? 'ok' : 'unreachable';
  } catch {
    return 'unreachable';
  }
}

/** chrome.storage.local-backed store for the pending pairing. */
export function localPairingStore(): PairingStore {
  return {
    async get() {
      const got = await chrome.storage.local.get(PAIRING_KEY).catch(() => ({} as Record<string, unknown>));
      const p = got[PAIRING_KEY] as PendingPairing | undefined;
      return p && typeof p.code === 'string' && typeof p.claim === 'string' ? p : null;
    },
    async set(p) { await chrome.storage.local.set({ [PAIRING_KEY]: p }); },
    async clear(code) {
      const got = await chrome.storage.local.get(PAIRING_KEY).catch(() => ({} as Record<string, unknown>));
      if ((got[PAIRING_KEY] as PendingPairing | undefined)?.code === code) await chrome.storage.local.remove(PAIRING_KEY);
    },
  };
}
