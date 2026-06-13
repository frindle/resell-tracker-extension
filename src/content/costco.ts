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

function getMsalRefreshToken(): string {
  for (const storage of [sessionStorage, localStorage]) {
    for (const key of Object.keys(storage)) {
      if (!key.toLowerCase().includes('refreshtoken')) continue;
      if (!key.includes('a3a5186b')) continue;
      try {
        const item = JSON.parse(storage.getItem(key) ?? '{}');
        if (item.secret) return item.secret;
      } catch { /* skip */ }
    }
  }
  return '';
}

function dumpMsalAccessTokens() {
  for (const storage of [sessionStorage, localStorage]) {
    for (const key of Object.keys(storage)) {
      if (!key.toLowerCase().includes('accesstoken')) continue;
      try {
        const item = JSON.parse(storage.getItem(key) ?? '{}');
        console.log('[CST] msal accesstoken key:', key);
        console.log('[CST] msal accesstoken target/scope:', item.target, 'realm:', item.realm, 'exp:', item.expiresOn, 'secret prefix:', item.secret?.slice(0, 40));
      } catch { /* skip */ }
    }
  }
}

async function getMsalToken(): Promise<string> {
  const refreshToken = getMsalRefreshToken();
  if (!refreshToken) { console.log('[CST] no refresh token found'); return ''; }

  console.log('[CST] exchanging refresh token for fresh id_token…');
  try {
    const res = await fetch(
      'https://signin.costco.com/e0714dd4-784d-46d6-a278-3e29553483eb/B2C_1A_SSO_WCS_signup_signin_209/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: 'a3a5186b-7c89-4b4c-93a8-dd604e930757',
          scope: 'openid profile offline_access',
        }).toString(),
      },
    );
    if (!res.ok) { console.error('[CST] token refresh failed', res.status, await res.text()); return ''; }
    const data = await res.json();
    console.log('[CST] token refresh ok, keys:', Object.keys(data));
    return data.id_token ?? data.access_token ?? '';
  } catch (e) {
    console.error('[CST] token refresh error', e);
    return '';
  }
}

async function getAuth(): Promise<{ token: string; clientId: string; warehouseNumber: string } | null> {
  try {
    // Only the intercepted token works for the API — /gettoken and MSAL fallbacks return id_tokens
    // which are rejected by ecom-api.costco.com with 401. The interceptor captures the real access token
    // from Costco's own XHR calls when the orders page loads.
    const intercepted = await chrome.runtime.sendMessage({ type: 'GET_COSTCO_AUTH' }).catch(() => null) as { token: string; clientId: string } | null;
    if (intercepted?.token && intercepted?.clientId) {
      console.log('[CST] using intercepted auth token');
      return { token: intercepted.token, clientId: intercepted.clientId, warehouseNumber: getWarehouseNumber() || '0' };
    }
    console.log('[CST] no intercepted token — hard-refresh the Costco orders page and wait for orders to load, then sync');
    return null;
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

const RECEIPT_LIST_QUERY = `query receiptsWithCounts($startDate: String!, $endDate: String!, $documentType: String!, $documentSubType: String!) {
  receiptsWithCounts(startDate: $startDate, endDate: $endDate, documentType: $documentType, documentSubType: $documentSubType) {
    receipts {
      transactionBarcode
      transactionDateTime
      warehouseName
      total
      itemArray { itemNumber }
    }
  }
}`;

const RECEIPT_DETAIL_QUERY = `query receiptsWithCounts($barcode: String!, $documentType: String!) {
  receiptsWithCounts(barcode: $barcode, documentType: $documentType) {
    receipts {
      warehouseName warehouseAddress1 warehouseAddress2 warehouseCity warehouseState warehousePostalCode
      transactionDateTime transactionDate companyNumber warehouseNumber operatorNumber warehouseShortName
      registerNumber transactionNumber transactionType transactionBarcode
      total subTotal taxes instantSavings totalItemCount membershipNumber
      itemArray {
        itemNumber itemDescription01 itemDescription02 itemIdentifier itemDepartmentNumber
        unit amount taxFlag itemUnitPriceAmount
      }
      tenderArray { tenderTypeCode tenderDescription amountTender }
      couponArray { upcnumberCoupon }
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
    const body = JSON.stringify({
      query: ORDER_QUERY,
      variables: { startDate, endDate, pageNumber, pageSize: PAGE_SIZE, warehouseNumber: auth.warehouseNumber },
    });
    const resp = await chrome.runtime.sendMessage({ type: 'COSTCO_GRAPHQL', token: auth.token, clientId: auth.clientId, body });
    if (resp?.error) { console.error('[CST] GraphQL background error', resp.error); return null; }
    if (!resp?.ok) { console.error('[CST] GraphQL error', resp?.status, resp?.text); return null; }
    const json = JSON.parse(resp.text);
    const result = json?.data?.getOnlineOrders?.[0];
    if (!result) { console.error('[CST] unexpected GraphQL response shape', JSON.stringify(json).slice(0, 200)); return null; }
    return { orders: result.bcOrders ?? [], total: result.totalNumberOfRecords ?? 0 };
  } catch (e) {
    console.error('[CST] fetchPage failed', e);
    return null;
  }
}

function mapOrder(o: BcOrder): ScrapedOrder | null {
  if (SKIP_STATUSES.has((o.status ?? '').toLowerCase())) return null;

  const activeItems = o.orderLineItems.filter(li => !SKIP_STATUSES.has((li.status ?? '').toLowerCase()));

  const descriptions = [...new Set(
    activeItems.map(li => li.itemDescription?.trim()).filter(Boolean),
  )];
  const itemDescription = descriptions.join(', ').slice(0, 200);

  const tracking = [...new Set(
    activeItems
      .flatMap(li => li.shipment ?? [])
      .filter(s => s.trackingNumber && !DIGITAL_CARRIERS.has((s.carrierName ?? '').toLowerCase()))
      .map(s => s.trackingNumber),
  )];

  return {
    platform: 'Costco',
    orderNumber: o.orderNumber,
    orderDate: (o.orderPlacedDate ?? '').split('T')[0],
    itemDescription,
    cost: o.orderTotal,
    shippingCost: 0,
    shippingAddress: '',
    trackingNumbers: tracking,
    sourceUrl: `https://www.costco.com/myaccount/#/app/4900eb1f-0c10-4bd9-99c3-c59e6c1ecebf/orderdetails/${o.orderNumber}`,
  };
}

async function fetchCapturedReceipts(): Promise<{ list: Record<string, unknown>[]; details: Record<string, Record<string, unknown>> }> {
  try {
    const captured = await chrome.runtime.sendMessage({ type: 'GET_CAPTURED_RECEIPTS' }).catch(() => null);
    return captured ?? { list: [], details: {} };
  } catch {
    return { list: [], details: {} };
  }
}

async function pushReceipts(trackerUrl: string, apiKey: string, userId: string | number, receipts: Record<string, unknown>[]): Promise<{ linked: number; unlinked: number; skipped: number }> {
  const res = await chrome.runtime.sendMessage({ type: 'PUSH_COSTCO_RECEIPTS', trackerUrl, apiKey, userId, receipts });
  if (res?.error) throw new Error(res.error);
  return res;
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
    sendMessage({ type: 'SYNC_ERROR', platform: 'Costco', error: 'No auth token — hard-refresh the Costco orders page, wait for orders to load, then sync.' });
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

  // Auto-click through date range options back to sinceDate
  await chrome.runtime.sendMessage({ type: 'CYCLE_DATE_FILTER', sinceDate: startDate }).catch(() => {});

  const allOrders: ScrapedOrder[] = [];

  // Try captured response first (Costco's own page load — bypasses Akamai bot protection)
  const captured = await chrome.runtime.sendMessage({ type: 'GET_CAPTURED_ORDERS' }).catch(() => null) as unknown[] | null;
  if (Array.isArray(captured) && captured.length > 0) {
    console.log('[CST] using captured orders from', captured.length, 'page(s)');
    for (const page of captured) {
      const p = page as { bcOrders?: BcOrder[] };
      for (const o of p.bcOrders ?? []) {
        const mapped = mapOrder(o);
        if (mapped) allOrders.push(mapped);
      }
    }
    console.log('[CST] captured orders:', allOrders.length);
  } else {
    // Fall back to direct API calls
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
      sendMessage({ type: 'SYNC_ERROR', platform: 'Costco', error: 'GraphQL request failed — navigate to your Costco Orders & Purchases page first, then sync.' });
      syncing = false;
      return;
    }
  }

  // Filter to only orders on or after sinceDate
  const filteredOrders = allOrders.filter(o => new Date(o.orderDate) >= sinceDate);
  console.log('[CST] filtered to', filteredOrders.length, 'orders on/after', startDate, '(dropped', allOrders.length - filteredOrders.length, 'older)');

  try {
    const result = filteredOrders.length > 0
      ? await pushOrders(settings.trackerUrl, settings.apiKey ?? '', settings.userId, filteredOrders)
      : { imported: 0, updated: 0 };

    // Push warehouse receipts captured from the page's own API calls
    sendMessage({ type: 'SYNC_PROGRESS', platform: 'Costco', scraped: filteredOrders.length, message: 'Fetching receipts…' });
    let receiptResult = { linked: 0, unlinked: 0, skipped: 0 };
    try {
      const captured = await fetchCapturedReceipts();
      const toSend: Record<string, unknown>[] = [];
      for (const r of captured.list) {
        const barcode = r.transactionBarcode as string;
        // Prefer full detail if we captured it, otherwise use list data
        toSend.push(captured.details[barcode] ?? r);
      }
      console.log('[CST] captured receipts:', toSend.length, 'userId=', settings.userId, 'trackerUrl=', settings.trackerUrl);
      if (toSend.length > 0) {
        receiptResult = await pushReceipts(settings.trackerUrl, settings.apiKey ?? '', settings.userId, toSend);
        console.log('[CST] receipt push result:', JSON.stringify(receiptResult));
      }
    } catch (e) {
      console.error('[CST] receipt sync failed (non-fatal)', e);
    }

    await setLastSync('costco', now.toISOString().split('T')[0]);
    setBadge(filteredOrders.length === 0 ? '—' : `+${result.imported}`, filteredOrders.length === 0 ? '#6b7280' : '#22c55e');
    sendMessage({ type: 'SYNC_DONE', result: { platform: 'Costco', scraped: filteredOrders.length, ...result, receiptsLinked: receiptResult.linked, receiptsUnlinked: receiptResult.unlinked } });
  } catch (err) {
    setBadge('!', '#ef4444');
    sendMessage({ type: 'SYNC_ERROR', platform: 'Costco', error: err instanceof Error ? err.message : String(err) });
  } finally {
    syncing = false;
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'PING') { sendResponse('ok'); return; }
  if (msg.type === 'START_SYNC' && msg.platform === 'Costco') runSync();
});
