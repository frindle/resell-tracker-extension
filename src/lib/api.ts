import type { ScrapedOrder, TrackerUser } from './types';

export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
}

export async function fetchUsers(trackerUrl: string): Promise<TrackerUser[]> {
  // Fetch directly from the options page context — it has host permissions and
  // avoids waking the background event page (which may be asleep in Firefox).
  const url = `${trackerUrl.replace(/\/$/, '')}/api/users`;
  const res = await fetch(url);
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
  const res = await chrome.runtime.sendMessage({ type: 'PUSH_ORDERS', trackerUrl, apiKey, userId, orders });
  if (res?.error) throw new Error(res.error);
  return res;
}
