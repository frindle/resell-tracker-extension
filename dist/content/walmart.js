"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/webextension-polyfill/dist/browser-polyfill.min.js
  var require_browser_polyfill_min = __commonJS({
    "node_modules/webextension-polyfill/dist/browser-polyfill.min.js"(exports, module) {
      (function(a, b) {
        if ("function" == typeof define && define.amd) define("webextension-polyfill", ["module"], b);
        else if ("undefined" != typeof exports) b(module);
        else {
          var c = { exports: {} };
          b(c), a.browser = c.exports;
        }
      })("undefined" == typeof globalThis ? "undefined" == typeof self ? exports : self : globalThis, function(a) {
        "use strict";
        if (!(globalThis.chrome && globalThis.chrome.runtime && globalThis.chrome.runtime.id)) throw new Error("This script should only be loaded in a browser extension.");
        if (!(globalThis.browser && globalThis.browser.runtime && globalThis.browser.runtime.id)) {
          a.exports = ((a2) => {
            const b = { alarms: { clear: { minArgs: 0, maxArgs: 1 }, clearAll: { minArgs: 0, maxArgs: 0 }, get: { minArgs: 0, maxArgs: 1 }, getAll: { minArgs: 0, maxArgs: 0 } }, bookmarks: { create: { minArgs: 1, maxArgs: 1 }, get: { minArgs: 1, maxArgs: 1 }, getChildren: { minArgs: 1, maxArgs: 1 }, getRecent: { minArgs: 1, maxArgs: 1 }, getSubTree: { minArgs: 1, maxArgs: 1 }, getTree: { minArgs: 0, maxArgs: 0 }, move: { minArgs: 2, maxArgs: 2 }, remove: { minArgs: 1, maxArgs: 1 }, removeTree: { minArgs: 1, maxArgs: 1 }, search: { minArgs: 1, maxArgs: 1 }, update: { minArgs: 2, maxArgs: 2 } }, browserAction: { disable: { minArgs: 0, maxArgs: 1, fallbackToNoCallback: true }, enable: { minArgs: 0, maxArgs: 1, fallbackToNoCallback: true }, getBadgeBackgroundColor: { minArgs: 1, maxArgs: 1 }, getBadgeText: { minArgs: 1, maxArgs: 1 }, getPopup: { minArgs: 1, maxArgs: 1 }, getTitle: { minArgs: 1, maxArgs: 1 }, openPopup: { minArgs: 0, maxArgs: 0 }, setBadgeBackgroundColor: { minArgs: 1, maxArgs: 1, fallbackToNoCallback: true }, setBadgeText: { minArgs: 1, maxArgs: 1, fallbackToNoCallback: true }, setIcon: { minArgs: 1, maxArgs: 1 }, setPopup: { minArgs: 1, maxArgs: 1, fallbackToNoCallback: true }, setTitle: { minArgs: 1, maxArgs: 1, fallbackToNoCallback: true } }, browsingData: { remove: { minArgs: 2, maxArgs: 2 }, removeCache: { minArgs: 1, maxArgs: 1 }, removeCookies: { minArgs: 1, maxArgs: 1 }, removeDownloads: { minArgs: 1, maxArgs: 1 }, removeFormData: { minArgs: 1, maxArgs: 1 }, removeHistory: { minArgs: 1, maxArgs: 1 }, removeLocalStorage: { minArgs: 1, maxArgs: 1 }, removePasswords: { minArgs: 1, maxArgs: 1 }, removePluginData: { minArgs: 1, maxArgs: 1 }, settings: { minArgs: 0, maxArgs: 0 } }, commands: { getAll: { minArgs: 0, maxArgs: 0 } }, contextMenus: { remove: { minArgs: 1, maxArgs: 1 }, removeAll: { minArgs: 0, maxArgs: 0 }, update: { minArgs: 2, maxArgs: 2 } }, cookies: { get: { minArgs: 1, maxArgs: 1 }, getAll: { minArgs: 1, maxArgs: 1 }, getAllCookieStores: { minArgs: 0, maxArgs: 0 }, remove: { minArgs: 1, maxArgs: 1 }, set: { minArgs: 1, maxArgs: 1 } }, devtools: { inspectedWindow: { eval: { minArgs: 1, maxArgs: 2, singleCallbackArg: false } }, panels: { create: { minArgs: 3, maxArgs: 3, singleCallbackArg: true }, elements: { createSidebarPane: { minArgs: 1, maxArgs: 1 } } } }, downloads: { cancel: { minArgs: 1, maxArgs: 1 }, download: { minArgs: 1, maxArgs: 1 }, erase: { minArgs: 1, maxArgs: 1 }, getFileIcon: { minArgs: 1, maxArgs: 2 }, open: { minArgs: 1, maxArgs: 1, fallbackToNoCallback: true }, pause: { minArgs: 1, maxArgs: 1 }, removeFile: { minArgs: 1, maxArgs: 1 }, resume: { minArgs: 1, maxArgs: 1 }, search: { minArgs: 1, maxArgs: 1 }, show: { minArgs: 1, maxArgs: 1, fallbackToNoCallback: true } }, extension: { isAllowedFileSchemeAccess: { minArgs: 0, maxArgs: 0 }, isAllowedIncognitoAccess: { minArgs: 0, maxArgs: 0 } }, history: { addUrl: { minArgs: 1, maxArgs: 1 }, deleteAll: { minArgs: 0, maxArgs: 0 }, deleteRange: { minArgs: 1, maxArgs: 1 }, deleteUrl: { minArgs: 1, maxArgs: 1 }, getVisits: { minArgs: 1, maxArgs: 1 }, search: { minArgs: 1, maxArgs: 1 } }, i18n: { detectLanguage: { minArgs: 1, maxArgs: 1 }, getAcceptLanguages: { minArgs: 0, maxArgs: 0 } }, identity: { launchWebAuthFlow: { minArgs: 1, maxArgs: 1 } }, idle: { queryState: { minArgs: 1, maxArgs: 1 } }, management: { get: { minArgs: 1, maxArgs: 1 }, getAll: { minArgs: 0, maxArgs: 0 }, getSelf: { minArgs: 0, maxArgs: 0 }, setEnabled: { minArgs: 2, maxArgs: 2 }, uninstallSelf: { minArgs: 0, maxArgs: 1 } }, notifications: { clear: { minArgs: 1, maxArgs: 1 }, create: { minArgs: 1, maxArgs: 2 }, getAll: { minArgs: 0, maxArgs: 0 }, getPermissionLevel: { minArgs: 0, maxArgs: 0 }, update: { minArgs: 2, maxArgs: 2 } }, pageAction: { getPopup: { minArgs: 1, maxArgs: 1 }, getTitle: { minArgs: 1, maxArgs: 1 }, hide: { minArgs: 1, maxArgs: 1, fallbackToNoCallback: true }, setIcon: { minArgs: 1, maxArgs: 1 }, setPopup: { minArgs: 1, maxArgs: 1, fallbackToNoCallback: true }, setTitle: { minArgs: 1, maxArgs: 1, fallbackToNoCallback: true }, show: { minArgs: 1, maxArgs: 1, fallbackToNoCallback: true } }, permissions: { contains: { minArgs: 1, maxArgs: 1 }, getAll: { minArgs: 0, maxArgs: 0 }, remove: { minArgs: 1, maxArgs: 1 }, request: { minArgs: 1, maxArgs: 1 } }, runtime: { getBackgroundPage: { minArgs: 0, maxArgs: 0 }, getPlatformInfo: { minArgs: 0, maxArgs: 0 }, openOptionsPage: { minArgs: 0, maxArgs: 0 }, requestUpdateCheck: { minArgs: 0, maxArgs: 0 }, sendMessage: { minArgs: 1, maxArgs: 3 }, sendNativeMessage: { minArgs: 2, maxArgs: 2 }, setUninstallURL: { minArgs: 1, maxArgs: 1 } }, sessions: { getDevices: { minArgs: 0, maxArgs: 1 }, getRecentlyClosed: { minArgs: 0, maxArgs: 1 }, restore: { minArgs: 0, maxArgs: 1 } }, storage: { local: { clear: { minArgs: 0, maxArgs: 0 }, get: { minArgs: 0, maxArgs: 1 }, getBytesInUse: { minArgs: 0, maxArgs: 1 }, remove: { minArgs: 1, maxArgs: 1 }, set: { minArgs: 1, maxArgs: 1 } }, managed: { get: { minArgs: 0, maxArgs: 1 }, getBytesInUse: { minArgs: 0, maxArgs: 1 } }, sync: { clear: { minArgs: 0, maxArgs: 0 }, get: { minArgs: 0, maxArgs: 1 }, getBytesInUse: { minArgs: 0, maxArgs: 1 }, remove: { minArgs: 1, maxArgs: 1 }, set: { minArgs: 1, maxArgs: 1 } } }, tabs: { captureVisibleTab: { minArgs: 0, maxArgs: 2 }, create: { minArgs: 1, maxArgs: 1 }, detectLanguage: { minArgs: 0, maxArgs: 1 }, discard: { minArgs: 0, maxArgs: 1 }, duplicate: { minArgs: 1, maxArgs: 1 }, executeScript: { minArgs: 1, maxArgs: 2 }, get: { minArgs: 1, maxArgs: 1 }, getCurrent: { minArgs: 0, maxArgs: 0 }, getZoom: { minArgs: 0, maxArgs: 1 }, getZoomSettings: { minArgs: 0, maxArgs: 1 }, goBack: { minArgs: 0, maxArgs: 1 }, goForward: { minArgs: 0, maxArgs: 1 }, highlight: { minArgs: 1, maxArgs: 1 }, insertCSS: { minArgs: 1, maxArgs: 2 }, move: { minArgs: 2, maxArgs: 2 }, query: { minArgs: 1, maxArgs: 1 }, reload: { minArgs: 0, maxArgs: 2 }, remove: { minArgs: 1, maxArgs: 1 }, removeCSS: { minArgs: 1, maxArgs: 2 }, sendMessage: { minArgs: 2, maxArgs: 3 }, setZoom: { minArgs: 1, maxArgs: 2 }, setZoomSettings: { minArgs: 1, maxArgs: 2 }, update: { minArgs: 1, maxArgs: 2 } }, topSites: { get: { minArgs: 0, maxArgs: 0 } }, webNavigation: { getAllFrames: { minArgs: 1, maxArgs: 1 }, getFrame: { minArgs: 1, maxArgs: 1 } }, webRequest: { handlerBehaviorChanged: { minArgs: 0, maxArgs: 0 } }, windows: { create: { minArgs: 0, maxArgs: 1 }, get: { minArgs: 1, maxArgs: 2 }, getAll: { minArgs: 0, maxArgs: 1 }, getCurrent: { minArgs: 0, maxArgs: 1 }, getLastFocused: { minArgs: 0, maxArgs: 1 }, remove: { minArgs: 1, maxArgs: 1 }, update: { minArgs: 2, maxArgs: 2 } } };
            if (0 === Object.keys(b).length) throw new Error("api-metadata.json has not been included in browser-polyfill");
            class c extends WeakMap {
              constructor(a3, b2 = void 0) {
                super(b2), this.createItem = a3;
              }
              get(a3) {
                return this.has(a3) || this.set(a3, this.createItem(a3)), super.get(a3);
              }
            }
            const d = (a3) => a3 && "object" == typeof a3 && "function" == typeof a3.then, e = (b2, c2) => (...d2) => {
              a2.runtime.lastError ? b2.reject(new Error(a2.runtime.lastError.message)) : c2.singleCallbackArg || 1 >= d2.length && false !== c2.singleCallbackArg ? b2.resolve(d2[0]) : b2.resolve(d2);
            }, f = (a3) => 1 == a3 ? "argument" : "arguments", g = (a3, b2) => function(c2, ...d2) {
              if (d2.length < b2.minArgs) throw new Error(`Expected at least ${b2.minArgs} ${f(b2.minArgs)} for ${a3}(), got ${d2.length}`);
              if (d2.length > b2.maxArgs) throw new Error(`Expected at most ${b2.maxArgs} ${f(b2.maxArgs)} for ${a3}(), got ${d2.length}`);
              return new Promise((f2, g2) => {
                if (b2.fallbackToNoCallback) try {
                  c2[a3](...d2, e({ resolve: f2, reject: g2 }, b2));
                } catch (e2) {
                  console.warn(`${a3} API method doesn't seem to support the callback parameter, falling back to call it without a callback: `, e2), c2[a3](...d2), b2.fallbackToNoCallback = false, b2.noCallback = true, f2();
                }
                else b2.noCallback ? (c2[a3](...d2), f2()) : c2[a3](...d2, e({ resolve: f2, reject: g2 }, b2));
              });
            }, h = (a3, b2, c2) => new Proxy(b2, { apply(b3, d2, e2) {
              return c2.call(d2, a3, ...e2);
            } });
            let i = Function.call.bind(Object.prototype.hasOwnProperty);
            const j = (a3, b2 = {}, c2 = {}) => {
              let d2 = /* @__PURE__ */ Object.create(null), e2 = Object.create(a3);
              return new Proxy(e2, { has(b3, c3) {
                return c3 in a3 || c3 in d2;
              }, get(e3, f2) {
                if (f2 in d2) return d2[f2];
                if (!(f2 in a3)) return;
                let k2 = a3[f2];
                if ("function" == typeof k2) {
                  if ("function" == typeof b2[f2]) k2 = h(a3, a3[f2], b2[f2]);
                  else if (i(c2, f2)) {
                    let b3 = g(f2, c2[f2]);
                    k2 = h(a3, a3[f2], b3);
                  } else k2 = k2.bind(a3);
                } else if ("object" == typeof k2 && null !== k2 && (i(b2, f2) || i(c2, f2))) k2 = j(k2, b2[f2], c2[f2]);
                else if (i(c2, "*")) k2 = j(k2, b2[f2], c2["*"]);
                else return Object.defineProperty(d2, f2, { configurable: true, enumerable: true, get() {
                  return a3[f2];
                }, set(b3) {
                  a3[f2] = b3;
                } }), k2;
                return d2[f2] = k2, k2;
              }, set(b3, c3, e3) {
                return c3 in d2 ? d2[c3] = e3 : a3[c3] = e3, true;
              }, defineProperty(a4, b3, c3) {
                return Reflect.defineProperty(d2, b3, c3);
              }, deleteProperty(a4, b3) {
                return Reflect.deleteProperty(d2, b3);
              } });
            }, k = (a3) => ({ addListener(b2, c2, ...d2) {
              b2.addListener(a3.get(c2), ...d2);
            }, hasListener(b2, c2) {
              return b2.hasListener(a3.get(c2));
            }, removeListener(b2, c2) {
              b2.removeListener(a3.get(c2));
            } }), l = new c((a3) => "function" == typeof a3 ? function(b2) {
              const c2 = j(b2, {}, { getContent: { minArgs: 0, maxArgs: 0 } });
              a3(c2);
            } : a3), m = new c((a3) => "function" == typeof a3 ? function(b2, c2, e2) {
              let f2, g2, h2 = false, i2 = new Promise((a4) => {
                f2 = function(b3) {
                  h2 = true, a4(b3);
                };
              });
              try {
                g2 = a3(b2, c2, f2);
              } catch (a4) {
                g2 = Promise.reject(a4);
              }
              const j2 = true !== g2 && d(g2);
              if (true !== g2 && !j2 && !h2) return false;
              const k2 = (a4) => {
                a4.then((a5) => {
                  e2(a5);
                }, (a5) => {
                  let b3;
                  b3 = a5 && (a5 instanceof Error || "string" == typeof a5.message) ? a5.message : "An unexpected error occurred", e2({ __mozWebExtensionPolyfillReject__: true, message: b3 });
                }).catch((a5) => {
                  console.error("Failed to send onMessage rejected reply", a5);
                });
              };
              return j2 ? k2(g2) : k2(i2), true;
            } : a3), n = ({ reject: b2, resolve: c2 }, d2) => {
              a2.runtime.lastError ? a2.runtime.lastError.message === "The message port closed before a response was received." ? c2() : b2(new Error(a2.runtime.lastError.message)) : d2 && d2.__mozWebExtensionPolyfillReject__ ? b2(new Error(d2.message)) : c2(d2);
            }, o = (a3, b2, c2, ...d2) => {
              if (d2.length < b2.minArgs) throw new Error(`Expected at least ${b2.minArgs} ${f(b2.minArgs)} for ${a3}(), got ${d2.length}`);
              if (d2.length > b2.maxArgs) throw new Error(`Expected at most ${b2.maxArgs} ${f(b2.maxArgs)} for ${a3}(), got ${d2.length}`);
              return new Promise((a4, b3) => {
                const e2 = n.bind(null, { resolve: a4, reject: b3 });
                d2.push(e2), c2.sendMessage(...d2);
              });
            }, p = { devtools: { network: { onRequestFinished: k(l) } }, runtime: { onMessage: k(m), onMessageExternal: k(m), sendMessage: o.bind(null, "sendMessage", { minArgs: 1, maxArgs: 3 }) }, tabs: { sendMessage: o.bind(null, "sendMessage", { minArgs: 2, maxArgs: 3 }) } }, q = { clear: { minArgs: 1, maxArgs: 1 }, get: { minArgs: 1, maxArgs: 1 }, set: { minArgs: 1, maxArgs: 1 } };
            return b.privacy = { network: { "*": q }, services: { "*": q }, websites: { "*": q } }, j(a2, p, b);
          })(chrome);
        } else a.exports = globalThis.browser;
      });
    }
  });

  // src/lib/storage.ts
  async function getSettings() {
    const result = await chrome.storage.sync.get(Object.keys(DEFAULTS));
    return { ...DEFAULTS, ...result };
  }
  async function setLastSync(platform, date) {
    const key = platform === "amazon" ? "amazonLastSync" : platform === "walmart" ? "walmartLastSync" : platform === "costco" ? "costcoLastSync" : "bigskyLastSync";
    await chrome.storage.sync.set({ [key]: date });
  }
  var import_browser_polyfill_min, DEFAULTS;
  var init_storage = __esm({
    "src/lib/storage.ts"() {
      "use strict";
      import_browser_polyfill_min = __toESM(require_browser_polyfill_min());
      DEFAULTS = {
        trackerUrl: "",
        apiKey: "",
        userId: "",
        userName: "",
        amazonLastSync: "",
        walmartLastSync: "",
        costcoLastSync: "",
        bigskyLastSync: ""
      };
    }
  });

  // src/lib/api.ts
  async function pushOrders(trackerUrl, apiKey, userId, orders) {
    const res = await chrome.runtime.sendMessage({ type: "PUSH_ORDERS", trackerUrl, apiKey, userId, orders });
    if (res?.error) throw new Error(res.error);
    return res;
  }
  var import_browser_polyfill_min2;
  var init_api = __esm({
    "src/lib/api.ts"() {
      "use strict";
      import_browser_polyfill_min2 = __toESM(require_browser_polyfill_min());
    }
  });

  // src/content/walmart.ts
  var require_walmart = __commonJS({
    "src/content/walmart.ts"() {
      var import_browser_polyfill_min3 = __toESM(require_browser_polyfill_min());
      init_storage();
      init_api();
      console.log("[WM] content script loaded", location.href);
      function parseMoney(text) {
        return parseFloat(text.replace(/[^0-9.-]/g, "")) || 0;
      }
      function sendMessage(msg) {
        const m = msg;
        if (m.type === "SYNC_STARTED" || m.type === "SYNC_PROGRESS") {
          chrome.storage.local.set({ walmartSyncStatus: { type: m.type, message: m.message ?? "syncing\u2026", ts: Date.now() } });
        } else {
          chrome.storage.local.set({ walmartSyncStatus: { type: m.type, result: m.result, error: m.error, ts: Date.now() } });
        }
        chrome.runtime.sendMessage(msg).catch(() => {
        });
      }
      function setBadge(text, color = "#3b82f6") {
        chrome.runtime.sendMessage({ type: "SET_BADGE", text, color }).catch(() => {
        });
      }
      function scrapeCurrentPage(sinceDate) {
        const orders = [];
        let hasOlder = false;
        const seen = /* @__PURE__ */ new Set();
        const blocks = Array.from(document.querySelectorAll('[data-testid*="orderGroup"]'));
        console.log("[WM] DOM blocks found:", blocks.length, "url:", location.href);
        if (blocks[0]) console.log("[WM] first block text:", (blocks[0].textContent ?? "").replace(/\s+/g, " ").slice(0, 600));
        for (const block of blocks) {
          const blockText = (block.textContent ?? "").replace(/\s+/g, " ");
          let orderNumber = "";
          const captionEl = block.querySelector('[id^="caption-"]');
          if (captionEl) {
            const idMatch = captionEl.id.match(/caption-(\d+)/);
            if (idMatch) orderNumber = idMatch[1];
          }
          if (!orderNumber) {
            const m = blockText.match(/Order\s*#?\s*(\d{10,})/i);
            if (m) orderNumber = m[1];
          }
          if (!orderNumber) {
            const m = blockText.match(/\b(\d{13,20})\b/);
            if (m) orderNumber = m[1];
          }
          if (!orderNumber || seen.has(orderNumber)) continue;
          seen.add(orderNumber);
          const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
          let orderDate;
          if (/\btoday\b/i.test(blockText)) {
            orderDate = /* @__PURE__ */ new Date();
            orderDate.setHours(0, 0, 0, 0);
          } else {
            const dateMatch = blockText.match(/(?:Placed|Ordered|Delivered|on)\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})/i) ?? blockText.match(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})/i) ?? blockText.match(/(?:Placed|Ordered|Delivered|on)\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2})(?!\d)/i);
            if (!dateMatch) {
              console.log("[WM] skipping order", orderNumber, "- no date found in:", blockText.slice(0, 200));
              continue;
            }
            let rawDateStr = /\d{4}/.test(dateMatch[1]) ? dateMatch[1] : `${dateMatch[1]} ${currentYear}`;
            orderDate = new Date(rawDateStr);
            const tomorrow = /* @__PURE__ */ new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            if (!isNaN(orderDate.getTime()) && orderDate > tomorrow) {
              rawDateStr = /\d{4}/.test(dateMatch[1]) ? dateMatch[1] : `${dateMatch[1]} ${currentYear - 1}`;
              orderDate = new Date(rawDateStr);
            }
            if (isNaN(orderDate.getTime())) {
              console.log("[WM] skipping order", orderNumber, "- bad date:", dateMatch[1]);
              continue;
            }
          }
          if (orderDate.toISOString().split("T")[0] < sinceDate.toISOString().split("T")[0]) {
            console.log("[WM] order too old:", orderNumber, orderDate.toISOString().split("T")[0], "< sinceDate", sinceDate.toISOString().split("T")[0]);
            hasOlder = true;
            continue;
          }
          if (/\b(cancel\w*|return\w*|refund\w*)\b/i.test(blockText)) continue;
          const totalMatch = blockText.match(/Total\s+\$?([\d,]+\.?\d*)/i);
          const cost = totalMatch ? parseMoney(totalMatch[1]) : 0;
          const itemEl = block.querySelector('a[href*="/ip/"], [data-testid*="product"], [data-testid*="item"]');
          const itemDescription = (itemEl?.textContent ?? "").trim().slice(0, 120);
          orders.push({
            platform: "Walmart",
            orderNumber,
            orderDate: orderDate.toISOString().split("T")[0],
            itemDescription,
            cost,
            shippingCost: 0,
            shippingAddress: "",
            trackingNumbers: [],
            sourceUrl: `https://www.walmart.com/orders/${orderNumber}`
          });
        }
        console.log("[WM] scraped orders this page:", orders.length, "hasOlder:", hasOlder);
        return { orders, hasOlder };
      }
      async function fetchOrderDetail(orderNumber, orderUrl) {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 5e3);
          const res = await fetch(orderUrl, { credentials: "include", signal: ctrl.signal });
          clearTimeout(timer);
          console.log("[WM] detail fetch status:", orderNumber, res.status, res.url);
          const html = await res.text();
          const doc = new DOMParser().parseFromString(html, "text/html");
          let address = "";
          const nextDataEl = doc.querySelector("#__NEXT_DATA__");
          if (nextDataEl?.textContent) {
            try {
              const nd = JSON.parse(nextDataEl.textContent);
              const str = JSON.stringify(nd);
              const addrMatch = str.match(/"shippingAddress"\s*:\s*\{([^}]{0,500})\}/);
              if (addrMatch) {
                const addrObj = JSON.parse(`{${addrMatch[1]}}`);
                const parts = [addrObj.addressLineOne, addrObj.addressLineTwo, addrObj.city, addrObj.state, addrObj.postalCode].filter(Boolean);
                address = parts.join(" ").trim();
              }
              if (!address) {
                const m = str.match(/"address1":"([^"]+)".*?"city":"([^"]+)".*?"state":"([^"]+)".*?"zip(?:Code)?":"([^"]+)"/);
                if (m) address = `${m[1]} ${m[2]} ${m[3]} ${m[4]}`.trim();
              }
            } catch {
            }
          }
          if (!address) {
            const addrEl = doc.querySelector('[data-automation-id*="shipping-address"], [class*="shipping-address"], [class*="shippingAddress"]');
            address = (addrEl?.textContent ?? "").replace(/\s+/g, " ").trim();
          }
          const numbers = /* @__PURE__ */ new Set();
          const trackPatterns = [
            /trackingNumber["\s:]+["']?([A-Z0-9]{10,25})/g,
            /\b(1Z[A-Z0-9]{16})\b/g,
            /\b([0-9]{20,22})\b/g
          ];
          for (const pat of trackPatterns) {
            let m;
            while ((m = pat.exec(html)) !== null) numbers.add(m[1]);
          }
          return { address, tracking: [...numbers] };
        } catch (e) {
          console.log("[WM] detail fetch failed:", orderNumber, String(e));
          return { address: "", tracking: [] };
        }
      }
      var syncing = false;
      function getFirstBlockFingerprint() {
        const block = document.querySelector('[data-testid*="orderGroup"]');
        if (!block) return "";
        const caption = block.querySelector('[id^="caption-"]');
        if (caption?.id) return caption.id;
        return (block.textContent ?? "").replace(/\s+/g, " ").slice(0, 80);
      }
      function waitForOrdersToLoad(previousFingerprint = "", timeoutMs = 12e3) {
        return new Promise((resolve) => {
          const start = Date.now();
          function check() {
            const blocks = document.querySelectorAll('[data-testid*="orderGroup"]');
            if (blocks.length > 0 && (blocks[0].textContent ?? "").length > 100) {
              const fp = getFirstBlockFingerprint();
              if (!previousFingerprint || fp !== previousFingerprint) {
                resolve();
                return;
              }
            }
            if (Date.now() - start > timeoutMs) {
              resolve();
              return;
            }
            setTimeout(check, 400);
          }
          check();
        });
      }
      function clickNextPage() {
        const btn = document.querySelector(
          '[aria-label="Next page"]:not([disabled]), [data-automation-id*="next-page"]:not([disabled]), button[aria-label*="next" i]:not([disabled])'
        );
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      }
      async function startSync() {
        console.log("[WM] startSync called, syncing:", syncing, "url:", location.href);
        if (syncing) return;
        syncing = true;
        const settings = await getSettings();
        if (!settings.trackerUrl || !settings.userId) {
          sendMessage({ type: "SYNC_ERROR", platform: "Walmart", error: "Tracker URL or user not configured \u2014 open Settings." });
          setBadge("!", "#ef4444");
          syncing = false;
          return;
        }
        const sinceDate = settings.walmartLastSync ? new Date(new Date(settings.walmartLastSync).getTime() - 24 * 60 * 60 * 1e3) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
        setBadge("\u2026");
        sendMessage({ type: "SYNC_STARTED", platform: "Walmart" });
        const isOrdersPage = location.pathname.includes("/orders") || location.pathname.includes("/account/mypurchases");
        const currentPage = new URL(location.href).searchParams.get("page");
        if (!isOrdersPage || currentPage && parseInt(currentPage) > 1) {
          sessionStorage.setItem("__resell_wm_sync__", "1");
          window.location.href = "https://www.walmart.com/orders";
          syncing = false;
          return;
        }
        try {
          await waitForOrdersToLoad("", 15e3);
          const allOrders = [];
          const seen = /* @__PURE__ */ new Set();
          let page = 1;
          while (page <= 20 && allOrders.length < 200) {
            sendMessage({ type: "SYNC_PROGRESS", platform: "Walmart", scraped: allOrders.length, message: `Scraping page ${page}\u2026` });
            const { orders, hasOlder } = scrapeCurrentPage(sinceDate);
            for (const o of orders) {
              if (!seen.has(o.orderNumber)) {
                seen.add(o.orderNumber);
                allOrders.push(o);
              }
            }
            console.log("[WM] page", page, "scraped:", orders.length, "total:", allOrders.length, "hasOlder:", hasOlder);
            if (hasOlder) break;
            const fingerprint = getFirstBlockFingerprint();
            if (!clickNextPage()) {
              console.log("[WM] no next page button, done");
              break;
            }
            await waitForOrdersToLoad(fingerprint);
            page++;
          }
          console.log("[WM] done scraping, total orders:", allOrders.length);
          if (allOrders.length === 0) {
            setBadge("\u2014");
            await setLastSync("walmart", (/* @__PURE__ */ new Date()).toISOString().split("T")[0]);
            sendMessage({ type: "SYNC_DONE", result: { platform: "Walmart", scraped: 0, imported: 0, updated: 0 } });
            return;
          }
          sendMessage({ type: "SYNC_PROGRESS", platform: "Walmart", scraped: allOrders.length, message: "Fetching order details\u2026" });
          await Promise.all(allOrders.map(async (order) => {
            console.log("[WM] fetching detail:", order.orderNumber, order.sourceUrl);
            const detail = await fetchOrderDetail(order.orderNumber, order.sourceUrl);
            console.log("[WM] detail done:", order.orderNumber, "address:", detail.address.slice(0, 40) || "(none)", "tracking:", detail.tracking);
            if (detail.address) order.shippingAddress = detail.address;
            if (detail.tracking.length) order.trackingNumbers = detail.tracking;
          }));
          const result = await pushOrders(settings.trackerUrl, settings.apiKey ?? "", settings.userId, allOrders);
          console.log("[WM] push result:", JSON.stringify(result));
          await setLastSync("walmart", (/* @__PURE__ */ new Date()).toISOString().split("T")[0]);
          setBadge(`+${result.imported ?? 0}`, "#22c55e");
          sendMessage({ type: "SYNC_DONE", result: { platform: "Walmart", scraped: allOrders.length, imported: result.imported ?? 0, updated: result.updated ?? 0 } });
        } catch (err) {
          console.error("[WM] sync error:", err);
          sendMessage({ type: "SYNC_ERROR", platform: "Walmart", error: String(err) });
          setBadge("!", "#ef4444");
        } finally {
          syncing = false;
        }
      }
      if (sessionStorage.getItem("__resell_wm_sync__")) {
        sessionStorage.removeItem("__resell_wm_sync__");
        setTimeout(() => startSync(), 2e3);
      }
      chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (msg.type === "PING") {
          sendResponse("ok");
          return;
        }
        if (msg.type === "START_SYNC" && msg.platform === "Walmart") startSync();
      });
    }
  });
  require_walmart();
})();
