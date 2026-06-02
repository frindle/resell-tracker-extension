import { getSettings, setLastSync } from '../lib/storage';

interface ScanItem {
  trackingNumber: string;
  itemName: string;
  lineTotal: string;
  scanDate: string;
  paymentDate: string | null;
}

interface SyncGroup {
  trackingNumber: string;
  itemDescription: string;
  salePrice: number;
  scanDate: string;
  paymentDate: string | null;
}

function normalize(n: string): string {
  return n.replace(/\D/g, '');
}

async function fetchScanItems(): Promise<ScanItem[]> {
  const input = encodeURIComponent(JSON.stringify({ '0': { json: null, meta: { values: ['undefined'] } } }));
  const url = `https://www.bigskybuyers.com/api/trpc/scan.getScanByUser?batch=1&input=${input}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`BigSky tRPC error ${res.status}`);
  const json = await res.json() as [{ result: { data: { json: ScanItem[] } } }];
  return json[0].result.data.json;
}

function groupByTracking(items: ScanItem[]): SyncGroup[] {
  const map = new Map<string, SyncGroup>();
  for (const item of items) {
    const key = normalize(item.trackingNumber) || item.trackingNumber;
    if (!map.has(key)) {
      map.set(key, {
        trackingNumber: item.trackingNumber,
        itemDescription: item.itemName,
        salePrice: 0,
        scanDate: item.scanDate,
        paymentDate: item.paymentDate,
      });
    }
    const g = map.get(key)!;
    g.salePrice += parseFloat(item.lineTotal) || 0;
    // Use latest paymentDate (prefer paid over null)
    if (item.paymentDate && !g.paymentDate) g.paymentDate = item.paymentDate;
  }
  return Array.from(map.values());
}

let syncing = false;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'PING') { sendResponse({ ok: true }); return; }
  if (msg.type === 'START_SYNC' && msg.platform === 'BigSkyBuyers') {
    if (syncing) { sendResponse({ ok: false }); return; }
    runSync().then(() => sendResponse({ ok: true })).catch(e => sendResponse({ error: String(e) }));
    return true;
  }
});

function persistStatus(msg: Record<string, unknown>) {
  chrome.storage.local.set({ bigskyStatus: { ...msg, ts: Date.now() } });
}

function broadcast(msg: Record<string, unknown>) {
  persistStatus(msg);
  chrome.runtime.sendMessage(msg).catch(() => {});
}

async function runSync() {
  syncing = true;
  try {
    const settings = await getSettings();
    if (!settings.trackerUrl || !settings.userId) {
      broadcast({ type: 'SYNC_ERROR', platform: 'BigSkyBuyers', error: 'Not configured' });
      return;
    }

    broadcast({ type: 'SYNC_STARTED', platform: 'BigSkyBuyers' });

    const items = await fetchScanItems();
    const groups = groupByTracking(items);

    broadcast({
      type: 'SYNC_PROGRESS', platform: 'BigSkyBuyers', scraped: groups.length,
      message: `Syncing ${groups.length} tracking entries…`,
    });

    const result = await chrome.runtime.sendMessage({
      type: 'PUSH_BIGSKY_ORDERS',
      trackerUrl: settings.trackerUrl,
      apiKey: settings.apiKey,
      userId: settings.userId,
      groups,
    });

    if (result?.error) throw new Error(result.error);

    await setLastSync('bigsky', new Date().toISOString().split('T')[0]);

    broadcast({
      type: 'SYNC_DONE',
      result: {
        platform: 'BigSkyBuyers',
        scraped: groups.length,
        imported: 0,
        updated: result?.updated ?? 0,
      },
    });
  } catch (e) {
    broadcast({ type: 'SYNC_ERROR', platform: 'BigSkyBuyers', error: String(e) });
  } finally {
    syncing = false;
  }
}
