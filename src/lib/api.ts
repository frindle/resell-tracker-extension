import type { ScrapedOrder, TrackerUser } from './types';

export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
}

export async function fetchUsers(trackerUrl: string): Promise<TrackerUser[]> {
  const url = `${trackerUrl.replace(/\/$/, '')}/api/users`;
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text().catch(() => res.statusText)}`);
  const data = await res.json();
  return data.map((u: { id: number; name: string }) => ({ id: u.id, name: u.name }));
}

export async function pushOrders(
  trackerUrl: string,
  apiKey: string,
  userId: string,
  orders: ScrapedOrder[],
): Promise<ImportResult> {
  const url = `${trackerUrl.replace(/\/$/, '')}/api/import`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'X-Extension-User-Id': userId } : {}),
      ...(apiKey ? { 'X-API-Key': apiKey } : {}),
    },
    body: JSON.stringify(orders.map(o => ({
      platform: o.platform,
      orderNumber: o.orderNumber,
      orderDate: o.orderDate,
      itemDescription: o.itemDescription,
      cost: o.cost,
      shippingCost: o.shippingCost,
      shippingAddress: o.shippingAddress,
      trackingNumbers: o.trackingNumbers,
      sourceUrl: o.sourceUrl || null,
    }))),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Tracker API error ${res.status}: ${text}`);
  }

  return res.json();
}

