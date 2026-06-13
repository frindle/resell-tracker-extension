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
          const res = await origFetch(input, init);
          if (url.includes("ecom-api.costco.com")) {
            console.log("[CST-INT] response \u2190", url, res.status, res.ok ? "OK" : "FAIL");
            if (res.ok && url.includes("order/v1/orders/graphql")) {
              res.clone().json().then((data) => {
                const w = window;
                const rc = data?.data?.receiptsWithCounts;
                if (rc) {
                  const receipts = rc.receipts ?? [];
                  const list = w.__costcoReceiptList ?? [];
                  const details = w.__costcoReceiptDetails ?? {};
                  if (receipts.length > 1) {
                    for (const r of receipts) {
                      if (r.transactionBarcode && !list.find((x) => x.transactionBarcode === r.transactionBarcode)) {
                        list.push(r);
                      }
                    }
                    console.log("[CST-INT] fetch: accumulated receipts, total:", list.length);
                  } else if (receipts.length === 1 && receipts[0]?.transactionBarcode) {
                    const r = receipts[0];
                    const bc = r.transactionBarcode;
                    const idx = list.findIndex((x) => x.transactionBarcode === bc);
                    if (idx >= 0) list[idx] = r;
                    else list.push(r);
                    details[bc] = r;
                    console.log("[CST-INT] fetch: stored receipt detail for", bc);
                  }
                  w.__costcoReceiptList = list;
                  w.__costcoReceiptDetails = details;
                }
              }).catch(() => {
              });
            }
          }
          return res;
        };
        const origOpen = XMLHttpRequest.prototype.open;
        const origSetHeader = XMLHttpRequest.prototype.setRequestHeader;
        const origSend = XMLHttpRequest.prototype.send;
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
        XMLHttpRequest.prototype.send = function(body) {
          const self = this;
          const url = self.__xhrUrl ?? "";
          if (url.includes("ecom-api.costco.com")) {
            this.addEventListener("load", function() {
              console.log("[CST-INT] XHR response \u2190", url, this.status, this.status < 400 ? "OK" : "FAIL");
              if (this.status < 400 && url.includes("order/v1/orders/graphql")) {
                try {
                  const data = JSON.parse(this.responseText);
                  const w = window;
                  const pages = data?.data?.getOnlineOrders;
                  if (Array.isArray(pages)) {
                    const existing = w.__costcoAllOrders ?? [];
                    for (const page of pages) existing.push(page);
                    w.__costcoAllOrders = existing;
                    console.log("[CST-INT] accumulated orders, total pages:", existing.length);
                  }
                  const rc = data?.data?.receiptsWithCounts;
                  if (rc) {
                    const receipts = rc.receipts ?? [];
                    const list = w.__costcoReceiptList ?? [];
                    const details = w.__costcoReceiptDetails ?? {};
                    if (receipts.length > 1) {
                      for (const r of receipts) {
                        if (r.transactionBarcode && !list.find((x) => x.transactionBarcode === r.transactionBarcode)) {
                          list.push(r);
                        }
                      }
                      console.log("[CST-INT] accumulated receipts, total:", list.length);
                    } else if (receipts.length === 1 && receipts[0]?.transactionBarcode) {
                      const r = receipts[0];
                      const bc = r.transactionBarcode;
                      const idx = list.findIndex((x) => x.transactionBarcode === bc);
                      if (idx >= 0) list[idx] = r;
                      else list.push(r);
                      details[bc] = r;
                      console.log("[CST-INT] stored receipt detail for", bc);
                    }
                    w.__costcoReceiptList = list;
                    w.__costcoReceiptDetails = details;
                  }
                } catch {
                }
              }
            });
          }
          return origSend.call(this, body);
        };
      })();
    }
  });
  require_costco_interceptor();
})();
