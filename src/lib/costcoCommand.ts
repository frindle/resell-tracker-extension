// Costco commands from the tracker (SYNC_COSTCO, SYNC_COSTCO_ORDER) that run
// with nobody at the browser. Pure parts only, for tests: the background
// code that opens tabs is in src/background/costcoRun.ts.

/**
 * What a failed result says when Costco shows a sign-in page. The tracker
 * recognises "sign-in needed" in it (lib/syncStatus.ts isSignInNeededResult)
 * and backs the automatic sync off to once a day.
 */
export const COSTCO_SIGN_IN_MESSAGE = 'Costco sign-in needed - sign in to costco.com in this browser';

/** Orders looked up per SYNC_COSTCO_ORDER command; the rest wait for the next one. */
export const MAX_DETAIL_ORDERS = 25;

/** Costco's account app id, as in the order links. The page's own hash route is used when it has one. */
export const COSTCO_APP_ID = '4900eb1f-0c10-4bd9-99c3-c59e6c1ecebf';

const SKIP_STATUSES = new Set(['cancelled', 'canceled']);
const DIGITAL_CARRIERS = new Set(['electronic delivery service', 'email delivery', 'email']);

/** True for the address of Costco's sign-in pages (what /myaccount redirects to when signed out). */
export function isSignInUrl(url: string | null | undefined): boolean {
  return /signin\.costco\.com|\/logon|LogonForm|\/login/i.test(String(url ?? ''));
}

/** True for a costco.com address. Checked before closing a remembered tab, whose id a restarted browser may have given to another page. */
export function isCostcoUrl(url: string | null | undefined): boolean {
  return /^https:\/\/([a-z0-9-]+\.)*costco\.com(\/|$)/i.test(String(url ?? ''));
}

export type OrderCommandPlan =
  | { action: 'run'; orderNumbers: string[] }
  | { action: 'fail'; error: string };

/** Which orders a SYNC_COSTCO_ORDER command asks for: digits only, no repeats, at most MAX_DETAIL_ORDERS. */
export function orderCommandPlan(payloadJson: string | null, settingsUserId: string | number | undefined): OrderCommandPlan {
  let p: { orderNumbers?: unknown; userId?: unknown } | null = null;
  try { p = payloadJson ? JSON.parse(payloadJson) : null; } catch { p = null; }
  if (!p || !Array.isArray(p.orderNumbers)) return { action: 'fail', error: 'bad payload' };
  // This browser is signed in to one Costco account: the extension's user. With no
  // user saved there is nothing to compare, so only a real mismatch is refused.
  const mine = String(settingsUserId ?? '').trim();
  if (mine && p.userId != null && String(p.userId) !== mine) {
    return { action: 'fail', error: `orders belong to user ${String(p.userId)}, this extension is user ${mine}` };
  }
  const orderNumbers = [...new Set(p.orderNumbers.map(o => String(o ?? '').replace(/\D/g, '')).filter(Boolean))].slice(0, MAX_DETAIL_ORDERS);
  if (!orderNumbers.length) return { action: 'fail', error: 'no order numbers' };
  return { action: 'run', orderNumbers };
}

// ── getOrderDetails -> tracker row (same mapping as the sidecar's costco.js) ──

type Payment = { cardNumber?: unknown; totalCharged?: unknown; paymentType?: unknown; isGOMPayment?: unknown };
type ShipTo = {
  isShipToWarehouse?: unknown; firstName?: unknown; lastName?: unknown; line1?: unknown; line2?: unknown; line3?: unknown;
  city?: unknown; state?: unknown; postalCode?: unknown;
  orderLineItems?: { itemDescription?: unknown; orderStatus?: unknown; shipment?: { trackingNumber?: unknown; carrierName?: unknown }[] }[];
};
export type CostcoOrderDetails = {
  orderNumber?: unknown; status?: unknown; orderPlacedDate?: unknown; orderTotal?: unknown;
  merchandiseTotal?: unknown; discountAmount?: unknown;
  shipToAddress?: ShipTo[]; orderPayment?: Payment[];
};

export type CostcoOrderRow = {
  platform: 'Costco';
  orderNumber: string;
  orderDate: string;
  itemDescription: string;
  cost: number;
  shippingCost: number;
  shippingAddress: string;
  trackingNumbers: string[];
  sourceUrl: string;
  paymentLast4?: string;
  merchandiseSubtotal?: number;
};

// Coupons, shop cards and gift-of-membership credits sit next to the real card;
// their "cardNumber" is a coupon or card id, not a card.
const NOT_A_CARD = /coupon|shop\s*card|gift|cash|stored\s*value|membership/i;

/** Last four digits of the card that paid the most, or undefined when no real card paid. */
export function costcoCardLast4(payments: readonly Payment[] | null | undefined): string | undefined {
  const cards = (payments ?? [])
    .filter(p => p && !p.isGOMPayment && !NOT_A_CARD.test(String(p.paymentType ?? '')))
    .map(p => ({ raw: String(p.cardNumber ?? ''), charged: Number(p.totalCharged) || 0 }))
    // Four digits, or a masked number ending in four.
    .filter(c => /^\d{4}$/.test(c.raw) || /^[*xX•\s-]+\d{4}$/.test(c.raw))
    .map(c => ({ last4: c.raw.slice(-4), charged: c.charged }));
  if (!cards.length) return undefined;
  cards.sort((a, b) => b.charged - a.charged);
  return cards[0].last4;
}

/** "Name, street, line 2, City, ST 12345" for the first ship-to that is not a warehouse pickup. */
export function costcoShipAddress(shipTos: readonly ShipTo[] | null | undefined): string {
  const s = (shipTos ?? []).find(x => x && !x.isShipToWarehouse && String(x.line1 ?? '').trim());
  if (!s) return '';
  const t = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();
  const name = [t(s.firstName), t(s.lastName)].filter(Boolean).join(' ');
  const cityLine = [t(s.city) && `${t(s.city)},`, t(s.state), t(s.postalCode)].filter(Boolean).join(' ').replace(/,$/, '');
  return [name, t(s.line1), t(s.line2), t(s.line3), cityLine].filter(Boolean).join(', ');
}

/** Merchandise less discounts, before tax and shipping: the base of the Costco reward. Null when Costco gave no merchandise total. */
export function costcoMerchandiseSubtotal(o: CostcoOrderDetails | null | undefined): number | null {
  if (!o || o.merchandiseTotal == null || o.merchandiseTotal === '') return null;
  const mt = Number(o.merchandiseTotal);
  if (!Number.isFinite(mt)) return null;
  const disc = Math.abs(Number(o.discountAmount) || 0);
  return Math.round(Math.max(0, mt - disc) * 100) / 100;
}

/** One getOrderDetails response as a tracker row; null for a cancelled order or one with no number. */
export function mapOrderDetails(o: CostcoOrderDetails | null | undefined): CostcoOrderRow | null {
  if (!o || !o.orderNumber) return null;
  if (SKIP_STATUSES.has(String(o.status ?? '').toLowerCase())) return null;
  const lines = (o.shipToAddress ?? []).flatMap(s => (s && s.orderLineItems) || [])
    .filter(li => !SKIP_STATUSES.has(String(li.orderStatus ?? '').toLowerCase()));
  const descriptions = [...new Set(lines.map(li => String(li.itemDescription ?? '').trim()).filter(Boolean))];
  const tracking = [...new Set(
    lines.flatMap(li => li.shipment ?? [])
      .filter(s => s && s.trackingNumber && !DIGITAL_CARRIERS.has(String(s.carrierName ?? '').toLowerCase()))
      .map(s => String(s.trackingNumber)),
  )];
  const row: CostcoOrderRow = {
    platform: 'Costco',
    orderNumber: String(o.orderNumber),
    orderDate: String(o.orderPlacedDate ?? '').split('T')[0],
    itemDescription: descriptions.join(', ').slice(0, 200),
    cost: Number(o.orderTotal) || 0,
    shippingCost: 0,
    shippingAddress: costcoShipAddress(o.shipToAddress),
    trackingNumbers: tracking,
    sourceUrl: `https://www.costco.com/myaccount/#/app/${COSTCO_APP_ID}/orderdetails/${o.orderNumber}`,
  };
  const last4 = costcoCardLast4(o.orderPayment);
  if (last4) row.paymentLast4 = last4;
  const sub = costcoMerchandiseSubtotal(o);
  if (sub != null) row.merchandiseSubtotal = sub;
  return row;
}

// ── What gets reported to the tracker ──

/** The page never showed the order list in time and is not on a sign-in page. Not a sign-in problem. */
export const COSTCO_TIMEOUT_MESSAGE = 'Costco page did not load in time';

export type CostcoOutcome =
  | { kind: 'done'; result: Record<string, unknown> }
  | { kind: 'timeout'; message: string }
  | { kind: 'error'; message: string };

export type CommandReport = { status: 'done'; result: Record<string, unknown> } | { status: 'failed'; result: { error: string; signInNeeded?: true } };

/** A run's outcome as the status and result the tracker stores. Sign-in failures carry a flag the tracker can read. */
export function costcoReport(o: CostcoOutcome): CommandReport {
  if (o.kind === 'done') return { status: 'done', result: o.result };
  // A timeout never carries the sign-in flag, so the tracker does not back off to once a day.
  if (o.kind === 'timeout') return { status: 'failed', result: { error: String(o.message || COSTCO_TIMEOUT_MESSAGE).slice(0, 300) } };
  const error = String(o.message || 'run failed').slice(0, 300);
  return error === COSTCO_SIGN_IN_MESSAGE
    ? { status: 'failed', result: { error, signInNeeded: true } }
    : { status: 'failed', result: { error } };
}

/**
 * What a waiting-for-orders loop concludes from one look at the tab.
 * `listSeen`: the page's order-list response arrived, even with no orders in it.
 */
export type TabLook = { url: string; hasAuth: boolean; orderPages: number; listSeen: boolean };

/**
 * One look at the Costco tab while waiting for its own app to load: a sign-in
 * address ends the wait at once; an order-list response (empty or not) means a
 * signed-in account; otherwise keep waiting. A token alone is not proof: the
 * page makes guest calls with one before it redirects a signed-out visitor.
 */
export function judgeTab(look: TabLook): 'signed-out' | 'ready' | 'wait' {
  if (isSignInUrl(look.url)) return 'signed-out';
  if (look.listSeen || look.orderPages > 0) return 'ready';
  return 'wait';
}

/** The verdict when the wait ran out: only a sign-in address counts as signed out; anything else is a slow page. */
export function judgeDeadline(look: TabLook): 'signed-out' | 'timeout' {
  return isSignInUrl(look.url) ? 'signed-out' : 'timeout';
}

/**
 * Why a SYNC_COSTCO_ORDER run that read no order failed, counting the orders it
 * skipped on purpose and the ones never tried because the overall time ran out.
 */
export function noDetailsMessage(timedOut: number, skipped: number, deferred = 0): string {
  const base = `Costco order details: none of ${timedOut} page(s) loaded`;
  const notes = [
    skipped > 0 ? `${skipped} other order(s) skipped` : '',
    deferred > 0 ? `${deferred} not tried, out of time` : '',
  ].filter(Boolean);
  return notes.length ? `${base} (${notes.join(', ')})` : base;
}
