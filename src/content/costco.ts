import { getSettings, setLastSync } from '../lib/storage';
import { pushOrders } from '../lib/api';
import type { ScrapedOrder, SyncMessage } from '../lib/types';

const GRAPHQL_URL = 'https://ecom-api.costco.com/ebusiness/order/v1/orders/graphql';
const PAGE_SIZE = 16;
const SKIP_STATUSES = new Set(['cancelled', 'canceled']);
const DIGITAL_CARRIERS = new Set(['electronic delivery service', 'email delivery', 'email']);

console.log('[CST] content script loaded', location.href);

function sendMessage(msg: SyncMessage) {
  chrome.runtime.sendMessage(msg).catch(() => {});
  if (msg.type === 'SYNC_PROGRESS' || msg.type === 'SYNC_STARTED') {
    chrome.storage.local.set({ costcoSyncStatus: { type: msg.type, message: (msg as { message?: string }).message ?? 'syncing…', ts: Date.now() } });
  } else if (msg.type === 'SYNC_DONE' || msg.type === 'SYNC_ERROR') {
    chrome.storage.local.set({ costcoSyncStatus: { type: msg.type, result: (msg as { result?: unknown }).result, error: (msg as { error?: string }).error, ts: Date.now() } });
  }
}

function setBadge(text: string, color = '#3b82f6') {
  chrome.runtime.sendMessage({ type: 'SET_BADGE', text, color }).catch(() => {});
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function getAuth(): Promise<{ token: string; clientId: string; warehouseNumber: string } | null> {
  try {
    const res = await fetch('/gettoken', { credentials: 'include' });
    if (!res.ok) { console.error('[CST] gettoken returned', res.status); return null; }
    const data = await res.json();
    const token: string = data.id_token ?? data.access_token ?? data.token ?? '';
    if (!token) { console.error('[CST] no token in gettoken response', Object.keys(data)); return null; }

    // Extract clientId from JWT payload
    let clientId = '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      clientId = payload.clientId ?? payload.aud ?? '';
    } catch { /* use empty */ }

    // Find warehouse number — check cookies and localStorage
    const warehouseNumber = getWarehouseNumber();
    console.log('[CST] auth ok, clientId:', clientId, 'warehouse:', warehouseNumber || '(not found, using 0)');

    return { token, clientId, warehouseNumber: warehouseNumber || '0' };
  } catch (e) {
    console.error('[CST] getAuth failed', e);
    return null;
  }
}

function getWarehouseNumber(): string {
  // Try cookies
  for (const cookie of document.cookie.split(';')) {
    const [k, v] = cookie.trim().split('=');
    if (/store|warehouse|wh/i.test(k) && v && /^\d{3,4}$/.test(v.trim())) return v.trim();
  }
  // Try localStorage
  for (const key of Object.keys(localStorage)) {
    if (/store|warehouse|wh/i.test(key)) {
      const v = localStorage.getItem(key) ?? '';
      if (/^\d{3,4}$/.test(v.trim())) return v.trim();
    }
  }
  return '';
}

const ORDER_QUERY = `query getOnlineOrders($startDate:String!, $endDate:String!, $pageNumber:Int, $pageSize:Int, $warehouseNumber:String!) {
  getOnlineOrders(startDate:$startDate, endDate:$endDate, pageNumber:$pageNumber, pageSize:$pageSize, warehouseNumber:$warehouseNumber) {
    pageNumber
    pageSize
    totalNumberOfRecords
    bcOrders {
      orderHeaderId
      orderPlacedDate: orderedDate
      orderNumber: sourceOrderNumber
      orderTotal
      warehouseNumber
      status
      orderLineItems {
        itemDescription
        status
        carrierItemCategory
        shipment {
          trackingNumber
          carrierName
        }
      }
    }
  }
}`;

interface Shipment { trackingNumber: string; carrierName: string }
interface LineItem { itemDescription: string; status: string; carrierItemCategory: string; shipment: Shipment[] }
interface BcOrder {
  orderHeaderId: string;
  orderPlacedDate: string;
  orderNumber: string;
  orderTotal: number;
  status: string;
  orderLineItems: LineItem[];
}

async function fetchPage(
  auth: { token: string; clientId: string; warehouseNumber: string },
  startDate: string,
  endDate: string,
  pageNumber: number,
): Promise<{ orders: BcOrder[]; total: number } | null> {
  try {
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json-patch+json',
        'costco-x-authorization': `Bearer ${auth.token}`,
        'costco-x-wcs-clientId': auth.clientId,
        'costco.env': 'ecom',
        'costco.service': 'restOrders',
        'Origin': 'https://www.costco.com',
        'Referer': 'https://www.costco.com/',
      },
      body: JSON.stringify({
        query: ORDER_QUERY,
        variables: { startDate, endDate, pageNumber, pageSize: PAGE_SIZE, warehouseNumber: auth.warehouseNumber },
      }),
    });
    if (!res.ok) { console.error('[CST] GraphQL error', res.status, await res.text()); return null; }
    const json = await res.json();
    const result = json?.data?.getOnlineOrders?.[0];
    if (!result) { console.error('[CST] unexpected GraphQL response shape', JSON.stringify(json).slice(0, 200)); return null; }
    return { orders: result.bcOrders ?? [], total: result.totalNumberOfRecords ?? 0 };
  } catch (e) {
    console.error('[CST] fetchPage failed', e);
    return null;
  }
}

function mapOrder(o: BcOrder): ScrapedOrder | null {
  if (SKIP_STATUSES.has(o.status.toLowerCase())) return null;

  const activeItems = o.orderLineItems.filter(li => !SKIP_STATUSES.has(li.status.toLowerCase()));

  const descriptions = [...new Set(
    activeItems.map(li => li.itemDescription?.trim()).filter(Boolean),
  )];
  const itemDescription = descriptions.join(', ').slice(0, 200);

  const tracking = [...new Set(
    activeItems
      .flatMap(li => li.shipment)
      .filter(s => s.trackingNumber && !DIGITAL_CARRIERS.has(s.carrierName.toLowerCase()))
      .map(s => s.trackingNumber),
  )];

  return {
    platform: 'Costco',
    orderNumber: o.orderNumber,
    orderDate: o.orderPlacedDate.split('T')[0],
    itemDescription,
    cost: o.orderTotal,
    shippingCost: 0,
    shippingAddress: '',
    trackingNumbers: tracking,
    sourceUrl: `https://www.costco.com/myaccount/#/app/${o.orderHeaderId}/orderdetails`,
  };
}

let syncing = false;

async function runSync() {
  if (syncing) return;
  syncing = true;

  const settings = await getSettings();
  if (!settings.trackerUrl || !settings.userId) {
    sendMessage({ type: 'SYNC_ERROR', platform: 'Costco', error: 'Tracker URL or user not configured — open Settings.' });
    setBadge('!', '#ef4444');
    syncing = false;
    return;
  }

  setBadge('…');
  sendMessage({ type: 'SYNC_STARTED', platform: 'Costco' });
  sendMessage({ type: 'SYNC_PROGRESS', platform: 'Costco', scraped: 0, message: 'Getting auth…' });

  const auth = await getAuth();
  if (!auth) {
    sendMessage({ type: 'SYNC_ERROR', platform: 'Costco', error: 'Could not get Costco auth token — make sure you are logged in.' });
    setBadge('!', '#ef4444');
    syncing = false;
    return;
  }

  const sinceDate = settings.costcoLastSync
    ? new Date(settings.costcoLastSync)
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const now = new Date();
  const startDate = formatDate(sinceDate);
  const endDate = formatDate(now);

  console.log('[CST] syncing', startDate, '→', endDate);
  sendMessage({ type: 'SYNC_PROGRESS', platform: 'Costco', scraped: 0, message: 'Fetching orders…' });

  const allOrders: ScrapedOrder[] = [];
  let pageNumber = 1;
  let total = Infinity;

  let fetchFailed = false;
  while ((pageNumber - 1) * PAGE_SIZE < total) {
    if (pageNumber > 1) await new Promise(r => setTimeout(r, 600));
    const page = await fetchPage(auth, startDate, endDate, pageNumber);
    if (!page) { fetchFailed = true; break; }
    total = page.total;

    for (const o of page.orders) {
      const mapped = mapOrder(o);
      if (mapped) allOrders.push(mapped);
    }

    sendMessage({ type: 'SYNC_PROGRESS', platform: 'Costco', scraped: allOrders.length, message: `Fetched ${allOrders.length} of ${total} orders…` });
    pageNumber++;
  }

  if (fetchFailed && allOrders.length === 0) {
    setBadge('!', '#ef4444');
    sendMessage({ type: 'SYNC_ERROR', platform: 'Costco', error: 'GraphQL request failed — check console for details.' });
    syncing = false;
    return;
  }

  if (allOrders.length === 0) {
    setBadge('—');
    sendMessage({ type: 'SYNC_DONE', result: { platform: 'Costco', scraped: 0, imported: 0, updated: 0 } });
    syncing = false;
    return;
  }

  try {
    const result = await pushOrders(settings.trackerUrl, settings.apiKey ?? '', settings.userId, allOrders);
    await setLastSync('costco', now.toISOString().split('T')[0]);
    setBadge(`+${result.imported}`, '#22c55e');
    sendMessage({ type: 'SYNC_DONE', result: { platform: 'Costco', scraped: allOrders.length, ...result } });
  } catch (err) {
    setBadge('!', '#ef4444');
    sendMessage({ type: 'SYNC_ERROR', platform: 'Costco', error: err instanceof Error ? err.message : String(err) });
  }

  syncing = false;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'PING') { sendResponse('ok'); return; }
  if (msg.type === 'START_SYNC' && msg.platform === 'Costco') runSync();
});
