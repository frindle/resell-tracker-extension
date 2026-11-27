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

export function parseEgiftPayload(raw: string | null, userId: string | undefined): { orderId: number } | { error: string } {
  let p: { userId?: unknown; orderId?: unknown } | null;
  try { p = JSON.parse(raw ?? 'null') as typeof p; } catch { return { error: 'bad payload' }; }
  if (!p || typeof p !== 'object') return { error: 'bad payload' };
  if (userId && p.userId != null && String(p.userId) !== String(userId)) return { error: 'command is for another user' };
  const orderId = Number(p.orderId);
  if (typeof p.orderId === 'boolean' || p.orderId === null || !Number.isInteger(orderId) || orderId <= 0) return { error: 'bad payload' };
  return { orderId };
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

/**
 * Body for POST /api/extension/egift: { orderId, cardNumber, pin?, merchant?, value? }.
 * The server (parseEgiftCard) keeps a card with no merchant and value, flagged for review, so
 * merchant is left out (the page does not name it reliably) and value only when it was read.
 */
export function egiftPostBody(orderId: number, card: EgiftCard): Record<string, unknown> {
  const body: Record<string, unknown> = { orderId, cardNumber: card.code };
  if (card.pin) body.pin = card.pin;
  if (card.value != null) body.value = card.value;
  return body;
}

/** How the card page was reached: the portal's new tab, the run's own tab, or the run's tab after a blocked new tab. */
export type EgiftOpened = 'new-tab' | 'same-tab' | 'kept-in-tab';

export type EgiftReport = { status: 'done' | 'failed'; result: { cards: number; saved: number; error?: string; opened?: EgiftOpened } };

/** Counts only (plus how the card page opened, when it did). Done when every card found was saved. */
export function egiftReport(cards: number, saved: number, failure: EgiftFailure | null, opened?: EgiftOpened): EgiftReport {
  const via = opened ? { opened } : {};
  if (!failure && cards > 0 && saved === cards) return { status: 'done', result: { cards, saved, ...via } };
  return { status: 'failed', result: { cards, saved, error: failure ?? 'no-cards', ...via } };
}
