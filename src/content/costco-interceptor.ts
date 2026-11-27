// Runs in MAIN world at document_start — wraps fetch AND XHR to capture the
// token Costco's own app uses for ecom-api calls, then stores it for our sync.
import { getScrape } from '../lib/scrapeConfig';

console.log('[CST-INT] interceptor script executing');

// MAIN world: no chrome.* here, so the URL patterns are the bundled defaults
// (src/lib/scrapeConfig.default.json); a remote change to them needs the
// isolated-world bridge (like api-spy-bridge.ts) that hands the cached values over.
const API_HOST = getScrape('costco').urls.apiHost;
const GRAPHQL_PATH = getScrape('costco').urls.graphqlPath;

(function () {
  // Save pristine fetch before any page scripts wrap it
  (window as unknown as Record<string, unknown>).__origFetch = window.fetch.bind(window);
  console.log('[CST-INT] __origFetch saved, interceptor installed');

  function headersToPlain(h: HeadersInit | undefined): Record<string, string> {
    if (!h) return {};
    if (h instanceof Headers) {
      const out: Record<string, string> = {};
      h.forEach((v, k) => { out[k.toLowerCase()] = v; });
      return out;
    }
    if (Array.isArray(h)) {
      const out: Record<string, string> = {};
      for (const [k, v] of h) out[k.toLowerCase()] = v;
      return out;
    }
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(h as Record<string, string>)) out[k.toLowerCase()] = v;
    return out;
  }

  function tryCapture(url: string, headers: Record<string, string>) {
    if (!url.includes(API_HOST)) return;
    const auth = headers['costco-x-authorization'] ?? headers['authorization'] ?? '';
    const clientId = headers['costco-x-wcs-clientid'] ?? '';
    console.log('[CST-INT] ecom-api →', url);
    console.log('[CST-INT] all headers:', JSON.stringify(headers));
    if (auth.startsWith('Bearer ') && clientId) {
      console.log('[CST-INT] captured ecom-api auth token');
      (window as unknown as Record<string, unknown>).__costcoAuth = { token: auth.slice(7), clientId, allHeaders: { ...headers } };
    }
  }

  // The order details page's own response (SYNC_COSTCO_ORDER reads it), keyed
  // by order number digits. A query we send ourselves gets a 401 from Costco's
  // bot checks, so only the page's own response is used.
  function captureOrderDetails(data: unknown) {
    try {
      const od = ((data as Record<string, unknown>)?.data as Record<string, unknown> | undefined)?.getOrderDetails;
      if (!od) return;
      const w = window as unknown as Record<string, unknown>;
      const byNumber = (w.__costcoOrderDetails as Record<string, unknown>) ?? {};
      for (const o of Array.isArray(od) ? od : [od]) {
        const key = String((o as Record<string, unknown>)?.orderNumber ?? '').replace(/\D/g, '');
        if (key) byNumber[key] = o;
      }
      w.__costcoOrderDetails = byNumber;
    } catch { /* never break the page */ }
  }

  // The page's own order-list response. `__costcoListSeen` is set whenever the
  // response arrives, even with an empty list, so the run can tell a signed-in
  // account with no orders from a page that never loaded. Used by both the
  // fetch and the XHR path.
  function captureOrderList(data: unknown) {
    try {
      const pages = ((data as Record<string, unknown>)?.data as Record<string, unknown> | undefined)?.getOnlineOrders;
      if (pages == null) return;
      const w = window as unknown as Record<string, unknown>;
      w.__costcoListSeen = true;
      if (Array.isArray(pages)) {
        const existing = (w.__costcoAllOrders as unknown[]) ?? [];
        for (const page of pages) existing.push(page);
        w.__costcoAllOrders = existing;
        console.log('[CST-INT] accumulated orders, total pages:', existing.length);
      }
    } catch { /* never break the page */ }
  }

  // Wrap fetch
  const origFetch = (window as unknown as Record<string, unknown>).__origFetch as typeof fetch;
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
    tryCapture(url, headersToPlain(init?.headers));
    const res = await origFetch(input, init);
    if (url.includes(API_HOST)) {
      console.log('[CST-INT] response ←', url, res.status, res.ok ? 'OK' : 'FAIL');
      if (res.ok && url.includes(GRAPHQL_PATH)) {
        res.clone().json().then((data: Record<string, unknown>) => {
          captureOrderDetails(data);
          captureOrderList(data);
          const w = window as unknown as Record<string, unknown>;
          const rc = (data?.data as Record<string, unknown>)?.receiptsWithCounts as { receipts?: Record<string, unknown>[] } | undefined;
          if (rc) {
            const receipts = rc.receipts ?? [];
            const list = (w.__costcoReceiptList as Record<string, unknown>[]) ?? [];
            const details = (w.__costcoReceiptDetails as Record<string, Record<string, unknown>>) ?? {};
            if (receipts.length > 1) {
              for (const r of receipts) {
                if (r.transactionBarcode && !list.find((x) => x.transactionBarcode === r.transactionBarcode)) {
                  list.push(r);
                }
              }
              console.log('[CST-INT] fetch: accumulated receipts, total:', list.length);
            } else if (receipts.length === 1 && receipts[0]?.transactionBarcode) {
              const r = receipts[0];
              const bc = r.transactionBarcode as string;
              const idx = list.findIndex((x) => x.transactionBarcode === bc);
              if (idx >= 0) list[idx] = r; else list.push(r);
              details[bc] = r;
              console.log('[CST-INT] fetch: stored receipt detail for', bc);
            }
            w.__costcoReceiptList = list;
            w.__costcoReceiptDetails = details;
          }
        }).catch(() => {});
      }
    }
    return res;
  };

  // Wrap XHR — capture headers and responses
  const origOpen = XMLHttpRequest.prototype.open;
  const origSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method: string, url: string, ...rest: unknown[]) {
    (this as unknown as Record<string, unknown>).__xhrUrl = url;
    (this as unknown as Record<string, unknown>).__xhrHeaders = {};
    return (origOpen as Function).call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.setRequestHeader = function (name: string, value: string) {
    const self = this as unknown as Record<string, unknown>;
    const h = self.__xhrHeaders as Record<string, string>;
    h[name.toLowerCase()] = value;
    tryCapture((self.__xhrUrl as string) ?? '', h);
    return (origSetHeader as Function).call(this, name, value);
  };
  XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
    const self = this as unknown as Record<string, unknown>;
    const url = (self.__xhrUrl as string) ?? '';
    if (url.includes(API_HOST)) {
      this.addEventListener('load', function () {
        console.log('[CST-INT] XHR response ←', url, this.status, this.status < 400 ? 'OK' : 'FAIL');
        if (this.status < 400 && url.includes(GRAPHQL_PATH)) {
          try {
            const data = JSON.parse(this.responseText);
            const w = window as unknown as Record<string, unknown>;
            captureOrderDetails(data);

            captureOrderList(data);

            const rc = data?.data?.receiptsWithCounts;
            if (rc) {
              const receipts = rc.receipts ?? [];
              const list = (w.__costcoReceiptList as Record<string, unknown>[]) ?? [];
              const details = (w.__costcoReceiptDetails as Record<string, Record<string, unknown>>) ?? {};
              if (receipts.length > 1) {
                // List response — add new barcodes only
                for (const r of receipts) {
                  if (r.transactionBarcode && !list.find((x) => x.transactionBarcode === r.transactionBarcode)) {
                    list.push(r);
                  }
                }
                console.log('[CST-INT] accumulated receipts, total:', list.length);
              } else if (receipts.length === 1 && receipts[0]?.transactionBarcode) {
                // Detail response — overwrite list entry and store in details
                const r = receipts[0];
                const bc = r.transactionBarcode as string;
                const idx = list.findIndex((x) => x.transactionBarcode === bc);
                if (idx >= 0) list[idx] = r; else list.push(r);
                details[bc] = r;
                console.log('[CST-INT] stored receipt detail for', bc);
              }
              w.__costcoReceiptList = list;
              w.__costcoReceiptDetails = details;
            }
          } catch { /* skip */ }
        }
      });
    }
    return (origSend as Function).call(this, body);
  };
})();
