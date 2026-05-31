"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/content/costco-interceptor.ts
  var require_costco_interceptor = __commonJS({
    "src/content/costco-interceptor.ts"() {
      console.log("[CST-INT] interceptor script executing");
      (function() {
        window.__origFetch = window.fetch.bind(window);
        console.log("[CST-INT] __origFetch saved, interceptor installed");
        function headersToPlain(h) {
          if (!h) return {};
          if (h instanceof Headers) {
            const out2 = {};
            h.forEach((v, k) => {
              out2[k.toLowerCase()] = v;
            });
            return out2;
          }
          if (Array.isArray(h)) {
            const out2 = {};
            for (const [k, v] of h) out2[k.toLowerCase()] = v;
            return out2;
          }
          const out = {};
          for (const [k, v] of Object.entries(h)) out[k.toLowerCase()] = v;
          return out;
        }
        function tryCapture(url, headers) {
          if (!url.includes("ecom-api.costco.com")) return;
          const auth = headers["costco-x-authorization"] ?? headers["authorization"] ?? "";
          const clientId = headers["costco-x-wcs-clientid"] ?? "";
          console.log("[CST-INT] ecom-api \u2192", url);
          console.log("[CST-INT] all headers:", JSON.stringify(headers));
          if (auth.startsWith("Bearer ") && clientId) {
            console.log("[CST-INT] captured ecom-api auth token");
            window.__costcoAuth = { token: auth.slice(7), clientId, allHeaders: { ...headers } };
          }
        }
        const origFetch = window.__origFetch;
        window.fetch = async function(input, init) {
          const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
          tryCapture(url, headersToPlain(init?.headers));
          return origFetch(input, init);
        };
        const origOpen = XMLHttpRequest.prototype.open;
        const origSetHeader = XMLHttpRequest.prototype.setRequestHeader;
        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
          this.__xhrUrl = url;
          this.__xhrHeaders = {};
          return origOpen.call(this, method, url, ...rest);
        };
        XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
          const self = this;
          const h = self.__xhrHeaders;
          h[name.toLowerCase()] = value;
          tryCapture(self.__xhrUrl ?? "", h);
          return origSetHeader.call(this, name, value);
        };
      })();
    }
  });
  require_costco_interceptor();
})();
