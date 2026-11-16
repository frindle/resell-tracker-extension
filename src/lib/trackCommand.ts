// What the extension does with a TRACK_AMAZON command from the tracker
// (tracking for Amazon orders the sidecar couldn't read). Pure, for tests.

export type TrackCommandPlan =
  | { action: 'run'; orders: string[] }
  | { action: 'wait' }
  | { action: 'fail'; error: string };

const AMAZON_ORDER = /^\d{3}-\d{7}-\d{7}$/;

export function trackCommandPlan(payloadJson: string | null, settingsUserId: string | number | undefined, runActive: boolean): TrackCommandPlan {
  if (runActive) return { action: 'wait' };
  let p: { orderNumbers?: unknown; userId?: unknown } | null = null;
  try { p = payloadJson ? JSON.parse(payloadJson) : null; } catch { p = null; }
  if (!p || !Array.isArray(p.orderNumbers)) return { action: 'fail', error: 'bad payload' };
  // This browser is signed in to one Amazon account: the extension's user.
  if (p.userId != null && String(p.userId) !== String(settingsUserId ?? '')) {
    return { action: 'fail', error: `orders belong to user ${String(p.userId)}, this extension is user ${String(settingsUserId ?? 'unset')}` };
  }
  const orders = [...new Set(p.orderNumbers.map(o => String(o).trim()).filter(o => AMAZON_ORDER.test(o)))];
  if (!orders.length) return { action: 'fail', error: 'no Amazon order numbers' };
  return { action: 'run', orders };
}
