// Background side of the passive Amazon capture: dedupe, send to the tracker,
// persisted retry queue, badge and stats. The only network call made here goes
// to the user's own tracker; nothing is ever requested from amazon.com.
import { getSettings } from '../lib/storage';
import {
  classifyAmazonUrl, isDuplicate, markSeen, enqueue, summarizeResult, unwrapPageResponse,
  type QueueItem, type SeenMap, type PageResult, type AmazonPageKind,
} from '../lib/amazonCapture';

const K_QUEUE = 'amazonCaptureQueue';
const K_SEEN = 'amazonCaptureSeen';
const K_STATS = 'amazonCaptureStats';

export interface CaptureStats {
  day: string;
  sentToday: number;
  lastAt: number;
  lastOk: boolean;
  lastText: string;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function upgradeUrl(trackerUrl: string): string {
  const stripped = trackerUrl.replace(/\/$/, '');
  if (/^http:\/\/(localhost|\d)/i.test(stripped)) return stripped;
  return stripped.replace(/^http:\/\//i, 'https://');
}

async function getStats(): Promise<CaptureStats> {
  const r = await chrome.storage.local.get(K_STATS);
  const s = r[K_STATS] as CaptureStats | undefined;
  if (!s || s.day !== today()) return { day: today(), sentToday: 0, lastAt: s?.lastAt ?? 0, lastOk: s?.lastOk ?? true, lastText: s?.lastText ?? '' };
  return s;
}

async function setStats(s: CaptureStats) {
  await chrome.storage.local.set({ [K_STATS]: s });
  try {
    const queued = ((await chrome.storage.local.get(K_QUEUE))[K_QUEUE] as QueueItem[] | undefined)?.length ?? 0;
    const text = queued > 0 ? `!${queued}` : s.sentToday > 0 ? String(s.sentToday) : '';
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color: queued > 0 ? '#d97706' : '#16a34a' });
  } catch { /* badge is cosmetic */ }
}

async function postPage(item: QueueItem): Promise<PageResult & { list?: unknown }> {
  const { trackerUrl, apiKey, extensionSecret, userId } = await getSettings();
  if (!trackerUrl) throw new Error('tracker URL not set');
  const res = await fetch(`${upgradeUrl(trackerUrl)}/api/extension/amazon-page`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'X-API-Key': apiKey } : {}),
      ...(extensionSecret ? { 'X-Extension-Secret': extensionSecret } : {}),
      ...(userId ? { 'X-Extension-User-Id': userId } : {}),
    },
    body: JSON.stringify({ url: item.url, kind: item.kind, html: item.html, hash: item.hash, capturedAt: item.capturedAt, ...(item.trackRun ? { trackRun: true } : {}) }),
  });
  if (!res.ok) {
    // 4xx other than auth/rate limit will never succeed on retry.
    const err = new Error(`tracker responded ${res.status}`) as Error & { permanent?: boolean };
    err.permanent = res.status >= 400 && res.status < 500 && ![401, 403, 408, 429].includes(res.status);
    throw err;
  }
  return unwrapPageResponse(await res.json().catch(() => null));
}

async function recordResult(r: PageResult) {
  const s = await getStats();
  s.sentToday += 1;
  s.lastAt = Date.now();
  s.lastOk = true;
  s.lastText = summarizeResult(r);
  await setStats(s);
}

async function recordFailure(msg: string) {
  const s = await getStats();
  s.lastAt = Date.now();
  s.lastOk = false;
  s.lastText = `send failed: ${msg}; queued for retry`;
  await setStats(s);
}

export async function handleCapture(msg: { url: string; kind: AmazonPageKind; html: string; hash: string }, force = false, trackRun = false) {
  // Re-validate in the worker: only known Amazon order pages are accepted.
  const kind = classifyAmazonUrl(msg.url);
  if (!kind || typeof msg.html !== 'string' || !msg.hash) return { ok: false, reason: 'rejected' };
  const now = Date.now();
  const seen = ((await chrome.storage.local.get(K_SEEN))[K_SEEN] as SeenMap | undefined) ?? {};
  if (!force && isDuplicate(seen, msg.hash, now)) return { ok: true, duplicate: true };
  await chrome.storage.local.set({ [K_SEEN]: markSeen(seen, msg.hash, now) });

  const item: QueueItem = { url: msg.url, kind, html: msg.html, hash: msg.hash, capturedAt: now, attempts: 0, ...(trackRun ? { trackRun: true } : {}) };
  try {
    const result = await postPage(item);
    await recordResult(result);
    return { ok: true, result };
  } catch (e) {
    const permanent = (e as { permanent?: boolean }).permanent === true;
    if (!permanent) {
      const q = ((await chrome.storage.local.get(K_QUEUE))[K_QUEUE] as QueueItem[] | undefined) ?? [];
      await chrome.storage.local.set({ [K_QUEUE]: enqueue(q, item) });
    }
    await recordFailure(String((e as Error).message || e));
    return { ok: false, queued: !permanent };
  }
}

/** Retry queued pages. Called from the existing one-minute tracker poll tick; it only talks to the tracker. */
export async function flushQueue() {
  const q = ((await chrome.storage.local.get(K_QUEUE))[K_QUEUE] as QueueItem[] | undefined) ?? [];
  if (!q.length) return;
  const remaining: QueueItem[] = [];
  for (let i = 0; i < q.length; i++) {
    const item = q[i];
    try {
      const result = await postPage(item);
      await recordResult(result);
    } catch (e) {
      const permanent = (e as { permanent?: boolean }).permanent === true;
      item.attempts += 1;
      if (!permanent && item.attempts < 20) remaining.push(item);
      // Tracker unreachable: keep the rest untouched and stop.
      if (!permanent) { remaining.push(...q.slice(i + 1)); break; }
    }
  }
  await chrome.storage.local.set({ [K_QUEUE]: remaining });
  await setStats(await getStats());
}

export async function getCaptureStatus() {
  const q = ((await chrome.storage.local.get(K_QUEUE))[K_QUEUE] as QueueItem[] | undefined) ?? [];
  return { ...(await getStats()), queued: q.length };
}

export interface StoredRun { at: number; text: string; status: string }

export async function saveRun(text: string, status: string) {
  await chrome.storage.local.set({ amazonLastRun: { at: Date.now(), text, status } satisfies StoredRun });
}

export async function getLastRun(): Promise<StoredRun | null> {
  return ((await chrome.storage.local.get('amazonLastRun')).amazonLastRun as StoredRun | undefined) ?? null;
}

/** Tells the tracker how a Sync now run went, so it shows in Sync Status. Tracker only. */
export async function reportRun(summary: Record<string, unknown>) {
  try {
    const { trackerUrl, apiKey, extensionSecret, userId } = await getSettings();
    if (!trackerUrl) return;
    await fetch(`${upgradeUrl(trackerUrl)}/api/extension/amazon-run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-API-Key': apiKey } : {}),
        ...(extensionSecret ? { 'X-Extension-Secret': extensionSecret } : {}),
        ...(userId ? { 'X-Extension-User-Id': userId } : {}),
      },
      body: JSON.stringify(summary),
    });
  } catch { /* reporting is best-effort */ }
}
