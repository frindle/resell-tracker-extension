// SCRAPE_EGIFT: pure parts (payload, link check, page-text parsing, POST body, result), for tests.
// The tab-driving code is in src/background/egiftRun.ts. Card numbers, PINs, the email and the
// delivery link are secrets: nothing here puts them in a result, error or log.

/** The only delivery host the tracker accepts (lib/egiftLinkParse.ts parseCostcoDeliveryLink). */
export const EGIFT_HOSTS: readonly string[] = ['www.memberedelivery.com'];

/** Cards read per run, a guard against a page that never ends. */
export const MAX_CARDS = 50;

/** Fixed failure reasons: the only text a failed run reports. */
export type EgiftFailure =
  | 'no-link' | 'link-rejected' | 'email-rejected' | 'email-no-response' | 'no-open-button' | 'page-timeout' | 'bot-check'
  | 'out-of-sequence' | 'total-mismatch' | 'ended-early' | 'save-failed' | 'run-busy' | 'error'
  | 'click-denied' | 'plan-failed' | 'plan-error' | `plan-error-${EgiftErrorKind}`
  | `info-http-${number}` | `error-${EgiftStep}` | `error-${EgiftStep}-${EgiftErrorKind}`;

/** Where a run threw, so a failed run says which step broke instead of a bare "error". */
export type EgiftStep = 'info' | 'tab' | 'page' | 'email' | 'open' | 'card-tab' | 'next';
export type EgiftErrorKind = 'error-page' | 'permission' | 'tab-gone' | 'navigated' | 'network';

/**
 * A fixed code for an exception thrown at `step`. The error text itself is never reported: Chrome's
 * messages can carry the delivery link ("Cannot access contents of url ...").
 */
export function egiftErrorCode(step: EgiftStep, err: unknown): EgiftFailure {
  const m = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  const kind: EgiftErrorKind | null =
    /chrome-error:|error page/i.test(m) ? 'error-page'
    : /cannot access|permission/i.test(m) ? 'permission'
    : /no tab with id|tab was closed|tabs cannot be edited/i.test(m) ? 'tab-gone'
    : /frame with id|frame was removed|navigat/i.test(m) ? 'navigated'
    : /failed to fetch|networkerror|load failed/i.test(m) ? 'network'
    : null;
  return kind ? `error-${step}-${kind}` : `error-${step}`;
}

/** `runner: 'plan'` opts into the step-plan runner (bundled plan); `dryRun` is for the plan runner only. */
export type EgiftPayload = { orderId: number; runner?: 'plan'; dryRun?: true };

export function parseEgiftPayload(raw: string | null, userId: string | undefined): EgiftPayload | { error: string } {
  let p: { userId?: unknown; orderId?: unknown; runner?: unknown; dryRun?: unknown } | null;
  try { p = JSON.parse(raw ?? 'null') as typeof p; } catch { return { error: 'bad payload' }; }
  if (!p || typeof p !== 'object') return { error: 'bad payload' };
  if (userId && p.userId != null && String(p.userId) !== String(userId)) return { error: 'command is for another user' };
  const orderId = Number(p.orderId);
  if (typeof p.orderId === 'boolean' || p.orderId === null || !Number.isInteger(orderId) || orderId <= 0) return { error: 'bad payload' };
  if (p.runner != null && p.runner !== 'plan' && p.runner !== 'builtin') return { error: 'bad payload' };
  if (p.dryRun != null && typeof p.dryRun !== 'boolean') return { error: 'bad payload' };
  const plan = p.runner === 'plan';
  if (p.dryRun === true && !plan) return { error: 'dryRun needs the plan runner' };
  return { orderId, ...(plan ? { runner: 'plan' as const } : {}), ...(plan && p.dryRun === true ? { dryRun: true as const } : {}) };
}

/** Same rules as the tracker's parseCostcoDeliveryLink: https, exact host, no credentials, a login token. */
export function isAllowedEgiftLink(raw: unknown): boolean {
  if (typeof raw !== 'string') return false;
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  return u.protocol === 'https:' && EGIFT_HOSTS.includes(u.hostname.toLowerCase()) && !u.username && !u.password && !!u.searchParams.get('login');
}

/** Link and email from GET /api/extension/egift, or null when either is missing. */
export function parseEgiftInfo(body: unknown): { link: string; email: string } | null {
  const b = body as { link?: unknown; email?: unknown } | null;
  if (!b || typeof b.link !== 'string' || typeof b.email !== 'string') return null;
  const email = b.email.trim();
  return b.link && email ? { link: b.link, email } : null;
}

export type EgiftCard = { index: number; total: number; code: string; pin: string | null; value: number | null };

/** The regexes a card is read with: the tracker's scrape config (costcoEgift.patterns), else these defaults. */
export interface CardPatterns {
  code?: RegExp; pin?: RegExp; sequence?: RegExp; amount?: RegExp;
  /** A code or PIN read from its labelled cell must look like one, else the text match is used. */
  codeValue?: RegExp; pinValue?: RegExp;
}
const DEFAULT_PATTERNS: Required<CardPatterns> = {
  code: /\bCode:\s*([A-Za-z0-9-]{4,64})/,
  pin: /\bPIN:\s*([A-Za-z0-9]{2,32})/i,
  sequence: /\b(\d{1,3})\s+of\s+(\d{1,3})\b/i,
  amount: /\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)/,
  codeValue: /^[A-Za-z0-9][A-Za-z0-9 -]{2,62}[A-Za-z0-9]$/,
  pinValue: /^[A-Za-z0-9]{2,32}$/,
};

/** What the page script reads: the visible text, plus the labelled code/PIN cells and the pager counter when found. */
export type CardPage = { text: string; code?: string | null; pin?: string | null; counter?: string | null };

function amountOf(text: string, re: RegExp): number | null {
  const amt = re.exec(text)?.[1];
  const value = amt ? Number(amt.replace(/,/g, '')) : NaN;
  return Number.isFinite(value) && value > 0 && value <= 10000 ? value : null;
}

/** Reads one card from the page's visible text. The labels are the portal's ('Code:', 'PIN:'). */
export function parseCardText(text: string, pats: CardPatterns = {}): EgiftCard | null {
  return readCard({ text }, pats);
}

/**
 * Reads one card: the code and PIN from their labelled cells when the page script found them (the
 * portal puts the value in a <span> next to "Code:"), else from the text; the position from the
 * pager counter ("N of M") when present, else from the text.
 */
export function readCard(page: CardPage, pats: CardPatterns = {}): EgiftCard | null {
  const p = { ...DEFAULT_PATTERNS, ...pats };
  const text = page.text ?? '';
  const cell = (v: string | null | undefined, ok: RegExp) => {
    const t = (v ?? '').trim().replace(/\s+/g, ' ');
    return t && ok.test(t) ? t : null;
  };
  const code = cell(page.code, p.codeValue) ?? p.code.exec(text)?.[1] ?? null;
  if (!code) return null;
  const pin = cell(page.pin, p.pinValue) ?? p.pin.exec(text)?.[1] ?? null;
  const seq = p.sequence.exec(page.counter ?? '') ?? p.sequence.exec(text);
  return {
    index: seq ? Number(seq[1]) : 1,
    total: seq ? Number(seq[2]) : 1,
    code, pin,
    value: amountOf(text, p.amount),
  };
}

/** Merchant and value from a card's title on the redemption page (one title per card, "Brand $25"). */
export type CardTitle = { merchant: string; value: number };

const TITLE_EDGE = /^[\s\-–—:|,.]+|[\s\-–—:|,.]+$/g;
const TITLE_SUFFIX = /(?:^|\s)(?:e-?gifts?|gifts?|cards?|digital|codes?)$/i;
const TITLE_PREFIX = /^(?:e-?gifts?|digital)(?:\s+(?:gift\s+)?cards?)?\b/i;

/** The brand around the amount: the text before it, else the text after it, without "eGift"/"Gift Card" words. */
function titleMerchant(part: string): string {
  let s = part.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').replace(TITLE_EDGE, '');
  for (let i = 0; i < 4 && TITLE_SUFFIX.test(s); i++) s = s.replace(TITLE_SUFFIX, '').replace(TITLE_EDGE, '');
  s = s.replace(TITLE_PREFIX, '').replace(TITLE_EDGE, '');
  return /[A-Za-z]/.test(s) ? s.slice(0, 80) : '';
}

/** Reads "Brand $25" (or "$25 Brand eGift"): null when either the brand or the amount is missing. */
export function parseCardTitle(title: string, amount: RegExp = DEFAULT_PATTERNS.amount): CardTitle | null {
  const t = (title ?? '').replace(/\s+/g, ' ').trim();
  const re = new RegExp(amount.source, amount.flags.replace('g', ''));
  const m = re.exec(t);
  if (!m) return null;
  const value = amountOf(m[0], re);
  if (value == null) return null;
  const merchant = titleMerchant(t.slice(0, m.index)) || titleMerchant(t.slice(m.index + m[0].length));
  return merchant ? { merchant, value } : null;
}

/**
 * The title for card `index` of `total`: by position when the page lists one per card, else the one
 * title they all share (same brand and value). Null when neither holds, so the card goes to review.
 */
export function titleFor(titles: readonly string[], index: number, total: number, amount?: RegExp): CardTitle | null {
  const parsed = titles.map(t => parseCardTitle(t, amount));
  if (parsed.length === total) return parsed[index - 1] ?? null;
  const first = parsed[0];
  if (!first) return null;
  return parsed.every(p => p && p.merchant.toLowerCase() === first.merchant.toLowerCase() && p.value === first.value) ? first : null;
}

/**
 * Body for POST /api/extension/egift: { orderId, cardNumber, pin?, merchant?, value?, image? }.
 * Merchant and value come from the card's redemption-page title; without a title the server
 * (parseEgiftCard) keeps the card flagged for review. `image` is the card photo, base64 JPEG.
 */
export function egiftPostBody(orderId: number, card: EgiftCard, extra: { title?: CardTitle | null; image?: string | null } = {}): Record<string, unknown> {
  const body: Record<string, unknown> = { orderId, cardNumber: card.code };
  if (card.pin) body.pin = card.pin;
  if (extra.title) { body.merchant = extra.title.merchant; body.value = extra.title.value; }
  else if (card.value != null) body.value = card.value;
  if (extra.image) body.image = extra.image;
  return body;
}

/** How the card page was reached: the portal's new tab, the run's own tab, or the run's tab after a blocked new tab. */
export type EgiftOpened = 'new-tab' | 'same-tab' | 'kept-in-tab';

/** Per-run counts beside cards/saved: photos sent, cards sent with a merchant and value, title vs print-page amount disagreements. */
export type EgiftCounts = { images?: number; named?: number; mismatched?: number };

export type EgiftReport = { status: 'done' | 'failed'; result: { cards: number; saved: number; error?: string; opened?: EgiftOpened } & EgiftCounts };

/** Counts only (plus how the card page opened, when it did). Done when every card found was saved. */
export function egiftReport(cards: number, saved: number, failure: EgiftFailure | null, opened?: EgiftOpened, counts: EgiftCounts = {}): EgiftReport {
  const via = { ...(opened ? { opened } : {}), ...counts };
  if (!failure && cards > 0 && saved === cards) return { status: 'done', result: { cards, saved, ...via } };
  return { status: 'failed', result: { cards, saved, error: failure ?? 'no-cards', ...via } };
}
