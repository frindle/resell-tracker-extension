import type { ScrapedOrder, TrackerUser } from './types';

export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
}

export async function fetchUsers(trackerUrl: string): Promise<TrackerUser[]> {
  const res = await chrome.runtime.sendMessage({ type: 'FETCH_USERS', trackerUrl });
  if (res?.error) throw new Error(res.error);
  return res.map((u: { id: number; name: string }) => ({ id: u.id, name: u.name }));
}

export async function pushOrders(
  trackerUrl: string,
  apiKey: string,
  userId: string,
  orders: ScrapedOrder[],
): Promise<ImportResult> {
  const res = await chrome.runtime.sendMessage({ type: 'PUSH_ORDERS', trackerUrl, apiKey, userId, orders });
  if (res?.error) throw new Error(res.error);
  return res;
}
