// Runs in MAIN world — no chrome.* APIs. Wraps fetch + XHR and posts logs via postMessage.
(function () {
  const w = window as unknown as Record<string, unknown>;
  if (w.__apiSpyActive) return;
  w.__apiSpyActive = true;

  function post(entry: Record<string, unknown>) {
    window.postMessage({ __apiSpyEntry: true, ...entry }, '*');
  }

  // --- fetch ---
  const origFetch = window.fetch.bind(window);
  window.fetch = async function (...args: Parameters<typeof fetch>) {
    const input = args[0];
    const init = args[1];
    const url = typeof input === 'string' ? input
      : input instanceof URL ? input.toString()
      : (input as Request).url;
    const method = ((init?.method ?? (input instanceof Request ? input.method : undefined) ?? 'GET') as string).toUpperCase();
    const reqBody = typeof init?.body === 'string' ? (init.body as string).slice(0, 500) : undefined;
    const ts = Date.now();
    try {
      const res = await origFetch(...args);
      const resBody = await res.clone().text().catch(() => '');
      post({ method, url, status: res.status, reqBody, resBody: resBody.slice(0, 2500), duration: Date.now() - ts, ts });
      return res;
    } catch (e) {
      post({ method, url, error: String(e), reqBody, duration: Date.now() - ts, ts });
      throw e;
    }
  };

  // --- XHR ---
  const OrigXHR = window.XMLHttpRequest;
  class SpyXHR extends OrigXHR {
    private _m = 'GET';
    private _u = '';
    private _body: string | undefined;
    private _ts = 0;

    open(method: string, url: string | URL, async?: boolean, user?: string | null, password?: string | null): void {
      this._m = method.toUpperCase();
      this._u = String(url);
      if (async === undefined) {
        super.open(method, url as string);
      } else {
        super.open(method, url as string, async, user, password);
      }
    }

    send(body?: Document | XMLHttpRequestBodyInit | null): void {
      this._ts = Date.now();
      if (typeof body === 'string') this._body = (body as string).slice(0, 500);
      this.addEventListener('loadend', () => {
        post({
          method: this._m,
          url: this._u,
          status: this.status,
          reqBody: this._body,
          resBody: (this.responseText || '').slice(0, 2500),
          duration: Date.now() - this._ts,
          ts: this._ts,
        });
      });
      super.send(body);
    }
  }

  w.XMLHttpRequest = SpyXHR;
})();
