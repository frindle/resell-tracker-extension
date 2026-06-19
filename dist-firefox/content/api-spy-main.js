"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/content/api-spy-main.ts
  var require_api_spy_main = __commonJS({
    "src/content/api-spy-main.ts"() {
      (function() {
        const w = window;
        if (w.__apiSpyActive) return;
        w.__apiSpyActive = true;
        const cfg = w.__apiSpyConfig ?? {};
        const REQ_LIMIT = cfg.reqLimit ?? 500;
        const RES_LIMIT = cfg.resLimit ?? 2500;
        function post(entry) {
          window.postMessage({ __apiSpyEntry: true, ...entry }, "*");
        }
        const origFetch = window.fetch.bind(window);
        window.fetch = async function(...args) {
          const input = args[0];
          const init = args[1];
          const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
          const method = (init?.method ?? (input instanceof Request ? input.method : void 0) ?? "GET").toUpperCase();
          const reqBody = typeof init?.body === "string" ? init.body.slice(0, REQ_LIMIT) : void 0;
          const ts = Date.now();
          try {
            const res = await origFetch(...args);
            const resBody = await res.clone().text().catch(() => "");
            post({ method, url, status: res.status, reqBody, resBody: resBody.slice(0, RES_LIMIT), duration: Date.now() - ts, ts });
            return res;
          } catch (e) {
            post({ method, url, error: String(e), reqBody, duration: Date.now() - ts, ts });
            throw e;
          }
        };
        const OrigXHR = window.XMLHttpRequest;
        class SpyXHR extends OrigXHR {
          constructor() {
            super(...arguments);
            this._m = "GET";
            this._u = "";
            this._ts = 0;
          }
          open(method, url, async, user, password) {
            this._m = method.toUpperCase();
            this._u = String(url);
            if (async === void 0) {
              super.open(method, url);
            } else {
              super.open(method, url, async, user, password);
            }
          }
          send(body) {
            this._ts = Date.now();
            if (typeof body === "string") this._body = body.slice(0, REQ_LIMIT);
            this.addEventListener("loadend", () => {
              post({
                method: this._m,
                url: this._u,
                status: this.status,
                reqBody: this._body,
                resBody: (this.responseText || "").slice(0, RES_LIMIT),
                duration: Date.now() - this._ts,
                ts: this._ts
              });
            });
            super.send(body);
          }
        }
        w.XMLHttpRequest = SpyXHR;
      })();
    }
  });
  require_api_spy_main();
})();
