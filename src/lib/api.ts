import type { ScrapedOrder } from './types';

export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
}

export async function pushOrders(
  trackerUrl: string,
  apiKey: string,
  orders: ScrapedOrder[],
): Promise<ImportResult> {
  const url = `${trackerUrl.replace(/\/$/, '')}/api/import`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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

export async function testConnection(trackerUrl: string, apiKey: string): Promise<void> {
  const url = `${trackerUrl.replace(/\/$/, '')}/api/auth/me`;
  const res = await fetch(url, {
    headers: apiKey ? { 'X-API-Key': apiKey } : {},
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text().catch(() => res.statusText)}`);
}
