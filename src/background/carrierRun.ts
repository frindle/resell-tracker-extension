// TRACK_CARRIER: reads the public FedEx / UPS tracking page for each number the tracker asked about and posts
// the page's visible text to the tracker, which works out the status and delivery date. One page at a time in
// its own background tab, closed when the page is read (or on any failure), with a random pause between pages.
// The text is never logged here.

export type CarrierName = 'fedex' | 'ups';
export type CarrierItem = { carrier: CarrierName; trackingNumber: string };

const MAX_ITEMS = 5;
const MAX_TEXT = 200_000;
const POLL_MS = 2000;
const WAIT_MS = 40_000;
const GAP_MIN_MS = 5000;
const GAP_MAX_MS = 15_000;
const KEEPALIVE_MS = 20_000;

// A status word on the page means the tracking result has rendered (the pages fill in after load).
// The tracker sends its own list in the payload so both sides agree; this is the fallback for an older tracker.
const DEFAULT_STATUS_WORDS: readonly string[] = ['delivered', 'in transit', 'out for delivery', 'on the way', 'exception', 'delivery exception', 'label created', 'shipment created', 'pending', 'delayed', 'picked up', 'arriving'];

function statusRegex(words: readonly string[]): RegExp {
  const esc = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`\\b(${esc.join('|')})\\b`, 'i');
}

let running = false;
export function carrierRunActive(): boolean { return running; }

function pageUrl(item: CarrierItem): string {
  const n = encodeURIComponent(item.trackingNumber);
  return item.carrier === 'fedex'
    ? `https://www.fedex.com/fedextrack/?trknbr=${n}`
    : `https://www.ups.com/track?tracknum=${n}`;
}

/** Items from the command payload that are safe to open: known carrier, plain tracking number, at most five. */
export function parseCarrierPayload(raw: string | null, userId: string | undefined): { items: CarrierItem[]; statusWords: string[] } | { error: string } {
  let p: { userId?: unknown; items?: unknown; statusWords?: unknown };
  try { p = JSON.parse(raw ?? 'null') as typeof p; } catch { return { error: 'bad payload' }; }
  if (!p || !Array.isArray(p.items)) return { error: 'bad payload' };
  if (userId && p.userId != null && String(p.userId) !== String(userId)) return { error: 'command is for another user' };
  const items: CarrierItem[] = [];
  for (const it of p.items.slice(0, MAX_ITEMS)) {
    const c = (it as { carrier?: unknown })?.carrier;
    const n = String((it as { trackingNumber?: unknown })?.trackingNumber ?? '').replace(/\s+/g, '').toUpperCase();
    if ((c === 'fedex' || c === 'ups') && /^[A-Z0-9]{8,40}$/.test(n)) items.push({ carrier: c, trackingNumber: n });
  }
  const sent = Array.isArray(p.statusWords)
    ? p.statusWords.filter((w): w is string => typeof w === 'string' && w.length > 0 && w.length <= 40).slice(0, 40)
    : [];
  const statusWords = sent.length ? sent : [...DEFAULT_STATUS_WORDS];
  return items.length ? { items, statusWords } : { error: 'no usable items' };
}

// Runs inside the tracking page.
function readPage(max: number): { text: string } {
  return { text: (document.body?.innerText ?? '').slice(0, max) };
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

async function readWhenReady(tabId: number, ready: RegExp): Promise<string | null> {
  const deadline = Date.now() + WAIT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_MS);
    try {
      const res = await chrome.scripting.executeScript({ target: { tabId }, func: readPage, args: [MAX_TEXT] });
      const text = res[0]?.result?.text ?? '';
      if (ready.test(text)) return text;
    } catch { /* page still loading or navigating: try again */ }
  }
  return null;
}

async function readOne(item: CarrierItem, ready: RegExp, post: (body: Record<string, unknown>) => Promise<boolean>): Promise<boolean> {
  const url = pageUrl(item);
  let tabId: number | undefined;
  try {
    const tab = await chrome.tabs.create({ url, active: false });
    tabId = tab.id;
    if (tabId == null) return false;
    const text = await readWhenReady(tabId, ready);
    if (!text) return false;
    return await post({ carrier: item.carrier, trackingNumber: item.trackingNumber, url, text });
  } catch {
    return false;
  } finally {
    if (tabId != null) await chrome.tabs.remove(tabId).catch(() => {});
  }
}

/**
 * Runs the whole command. `post` sends one page to the tracker and says whether it was accepted.
 * Returns the counts to report back to the tracker; `ok` is false when nothing could be read.
 */
export async function runCarrierItems(
  items: readonly CarrierItem[],
  post: (body: Record<string, unknown>) => Promise<boolean>,
  statusWords: readonly string[] = DEFAULT_STATUS_WORDS,
): Promise<{ ok: boolean; done: number; failed: number }> {
  const ready = statusRegex(statusWords.length ? statusWords : DEFAULT_STATUS_WORDS);
  if (running) return { ok: false, done: 0, failed: items.length };
  running = true;
  // A background worker with nothing happening is stopped after about 30 seconds, which would end the run.
  const keep = setInterval(() => { chrome.runtime.getPlatformInfo().catch(() => {}); }, KEEPALIVE_MS);
  let done = 0;
  let failed = 0;
  try {
    for (let i = 0; i < items.length; i++) {
      if (i > 0) await sleep(GAP_MIN_MS + Math.random() * (GAP_MAX_MS - GAP_MIN_MS));
      if (await readOne(items[i], ready, post)) done++; else failed++;
    }
  } finally {
    clearInterval(keep);
    running = false;
  }
  return { ok: done > 0, done, failed };
}
