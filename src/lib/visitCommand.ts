// What the extension does with a VISIT_AMAZON command from the tracker (an
// Amazon order or shipping email said these orders need a page), and how it
// reads the tracker's answer to a Sync click. Pure, for tests. Nothing the
// tracker sends is trusted: order numbers must have Amazon's shape, a link
// must be an https www.amazon.com order-details page, and a command is capped.
import { classifyAmazonUrl } from './amazonCapture.ts';
import type { Visit, VisitPlan } from './syncRun.ts';

export type VisitCommandPlan =
  | { action: 'run'; visits: Visit[] }
  | { action: 'wait' }
  | { action: 'fail'; error: string };

const AMAZON_ORDER = /^\d{3}-\d{7}-\d{7}$/;
/** Most orders one command may carry, whatever the tracker sent. */
export const MAX_COMMAND_VISITS = 5;
/** Most orders a Sync click may carry. */
export const MAX_PLAN_VISITS = 10;

export function cleanVisits(raw: unknown, max: number): Visit[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Visit[] = [];
  for (const r of raw) {
    const v = (r ?? {}) as { orderNumber?: unknown; url?: unknown; stages?: unknown };
    const orderNumber = String(v.orderNumber ?? '').trim();
    if (!AMAZON_ORDER.test(orderNumber) || seen.has(orderNumber)) continue;
    seen.add(orderNumber);
    const stages = (Array.isArray(v.stages) ? v.stages : []).filter((s): s is 'detail' | 'track' => s === 'detail' || s === 'track');
    const url = typeof v.url === 'string' && classifyAmazonUrl(v.url) === 'detail' ? v.url : null;
    out.push({ orderNumber, url, stages: [...new Set(stages)] });
    if (out.length >= max) break;
  }
  return out;
}

export function visitCommandPlan(payloadJson: string | null, settingsUserId: string | number | undefined, runActive: boolean): VisitCommandPlan {
  if (runActive) return { action: 'wait' };
  let p: { visits?: unknown; userId?: unknown } | null = null;
  try { p = payloadJson ? JSON.parse(payloadJson) : null; } catch { p = null; }
  if (!p || !Array.isArray(p.visits)) return { action: 'fail', error: 'bad payload' };
  // This browser is signed in to one Amazon account: the extension's user.
  if (p.userId != null && String(p.userId) !== String(settingsUserId ?? '')) {
    return { action: 'fail', error: `orders belong to user ${String(p.userId)}, this extension is user ${String(settingsUserId ?? 'unset')}` };
  }
  const visits = cleanVisits(p.visits, MAX_COMMAND_VISITS);
  if (!visits.length) return { action: 'fail', error: 'no Amazon order numbers' };
  return { action: 'run', visits };
}

/** The tracker's answer to a Sync click ({ ok, visits, listDue }); null when it is not that. */
export function parseVisitPlan(body: unknown): VisitPlan | null {
  const b = body as { ok?: unknown; visits?: unknown; listDue?: unknown } | null;
  if (!b || b.ok !== true || !Array.isArray(b.visits)) return null;
  return { visits: cleanVisits(b.visits, MAX_PLAN_VISITS), listDue: b.listDue !== false };
}
