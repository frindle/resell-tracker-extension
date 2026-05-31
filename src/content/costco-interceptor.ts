// Runs in MAIN world at document_start — wraps fetch AND XHR to capture the
// token Costco's own app uses for ecom-api calls, then stores it for our sync.
console.log('[CST-INT] interceptor script executing');

(function () {
  // Save pristine fetch before any page scripts wrap it
  (window as Record<string, unknown>).__origFetch = window.fetch.bind(window);
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
    if (!url.includes('ecom-api.costco.com')) return;
    const auth = headers['costco-x-authorization'] ?? headers['authorization'] ?? '';
    const clientId = headers['costco-x-wcs-clientid'] ?? '';
    console.log('[CST-INT] ecom-api →', url);
    console.log('[CST-INT] all headers:', JSON.stringify(headers));
    if (auth.startsWith('Bearer ') && clientId) {
      console.log('[CST-INT] captured ecom-api auth token');
      (window as Record<string, unknown>).__costcoAuth = { token: auth.slice(7), clientId, allHeaders: { ...headers } };
    }
  }

  // Wrap fetch
  const origFetch = (window as Record<string, unknown>).__origFetch as typeof fetch;
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
    tryCapture(url, headersToPlain(init?.headers));
    const res = await origFetch(input, init);
    if (url.includes('ecom-api.costco.com')) {
      console.log('[CST-INT] response ←', url, res.status, res.ok ? 'OK' : 'FAIL');
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
    if (url.includes('ecom-api.costco.com')) {
      this.addEventListener('load', function () {
        console.log('[CST-INT] XHR response ←', url, this.status, this.status < 400 ? 'OK' : 'FAIL');
        if (this.status < 400 && url.includes('order/v1/orders/graphql')) {
          try {
            const data = JSON.parse(this.responseText);
            const pages = data?.data?.getOnlineOrders;
            if (Array.isArray(pages)) {
              const w = window as Record<string, unknown>;
              const existing = (w.__costcoAllOrders as unknown[]) ?? [];
              for (const page of pages) existing.push(page);
              w.__costcoAllOrders = existing;
              console.log('[CST-INT] accumulated orders, total pages:', existing.length);
            }
          } catch { /* skip */ }
        }
      });
    }
    return (origSend as Function).call(this, body);
  };
})();
