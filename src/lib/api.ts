import type { ScrapedOrder, TrackerUser } from './types';

export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
}

export async function fetchUsers(trackerUrl: string): Promise<TrackerUser[]> {
  // Route through background — Firefox blocks fetches to local IPs from
  // moz-extension:// pages (secure context LNA restrictions), but the
  // background event page can make them freely.
  // Ping first to ensure the background is awake in Firefox.
  await chrome.runtime.sendMessage({ type: 'PING' }).catch(() => {});
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
