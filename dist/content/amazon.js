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

  // src/content/amazon.ts
  var require_amazon = __commonJS({
    "src/content/amazon.ts"() {
      var import_browser_polyfill_min3 = __toESM(require_browser_polyfill_min());
      init_storage();
      init_api();
      console.log("[AMZ] content script loaded", location.href);
      function parseMoney(text) {
        return parseFloat(text.replace(/[^0-9.-]/g, "")) || 0;
      }
      function sendMessage(msg) {
        chrome.runtime.sendMessage(msg).catch(() => {
        });
        if (msg.type === "SYNC_PROGRESS" || msg.type === "SYNC_STARTED") {
          chrome.storage.local.set({ amazonSyncStatus: { type: msg.type, message: msg.message ?? "syncing\u2026", ts: Date.now() } });
        } else if (msg.type === "SYNC_DONE" || msg.type === "SYNC_ERROR") {
          chrome.storage.local.set({ amazonSyncStatus: { type: msg.type, result: msg.result, error: msg.error, ts: Date.now() } });
        }
      }
      function setBadge(text, color = "#3b82f6") {
        chrome.runtime.sendMessage({ type: "SET_BADGE", text, color }).catch(() => {
        });
      }
      function scrapeDoc(doc, sinceDate) {
        const orders = [];
        let hasOlder = false;
        const seen = /* @__PURE__ */ new Set();
        const orderLinks = Array.from(doc.querySelectorAll(
          'a[href*="orderID="], a[href*="orderId="], a[href*="order-details"]'
        ));
        console.log("[AMZ] scrapeDoc found", orderLinks.length, "order links:", orderLinks.map((a) => a.href.match(/[oO]rder[Ii][Dd]=([0-9A-Z-]{10,})/)?.[1]).filter(Boolean).join(", "));
        const allOrderHrefs = Array.from(doc.querySelectorAll("a[href]")).map((a) => a.href).filter((h) => /order|invoice/i.test(h) && h.includes("amazon.com")).filter((h, i, arr) => arr.indexOf(h) === i);
        console.log("[AMZ] all order-related hrefs:", allOrderHrefs);
        for (const link of orderLinks) {
          const idMatch = link.href.match(/[oO]rder[Ii][Dd]=([0-9A-Z-]{10,})/);
          if (!idMatch) continue;
          const orderId = idMatch[1];
          if (seen.has(orderId)) continue;
          seen.add(orderId);
          let card = link;
          for (let i = 0; i < 20; i++) {
            card = card?.parentElement ?? null;
            if (!card) break;
            const t = (card.textContent ?? "").replace(/\s+/g, " ");
            if (t.length > 100 && /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)/i.test(t)) break;
          }
          if (!card) {
            console.warn("[AMZ] no card for", orderId);
            continue;
          }
          const rawText = "innerText" in card ? card.innerText : card.textContent ?? "";
          const cardText = rawText.replace(/\s+/g, " ");
          const dateMatch = cardText.match(/Order placed\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})/i) ?? cardText.match(/((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/i) ?? cardText.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4})/i);
          if (!dateMatch) {
            console.warn("[AMZ] no date for", orderId, "\u2014 cardText:", cardText.slice(0, 200));
            continue;
          }
          const orderDate = new Date(dateMatch[1]);
          if (isNaN(orderDate.getTime())) {
            console.warn("[AMZ] bad date for", orderId, dateMatch[1]);
            continue;
          }
          if (orderDate.toISOString().split("T")[0] < sinceDate.toISOString().split("T")[0]) {
            hasOlder = true;
            continue;
          }
          if (/\b(cancelled|canceled|refunded|returned)\b/i.test(cardText)) continue;
          const totalMatch = cardText.match(/Total\s+\$?([\d,]+\.?\d*)/i);
          const cost = totalMatch ? parseMoney(totalMatch[1]) : 0;
          let shippingAddress = "";
          const addrMatch = cardText.match(/Ship to\s+(.+?)\s+United States/is);
          if (addrMatch) {
            const full = addrMatch[1].replace(/\s+/g, " ").trim();
            const digitIdx = full.search(/\d/);
            shippingAddress = digitIdx > 0 ? full.slice(digitIdx) : full;
          }
          const titleEl = card.querySelector(
            '[class*="product-title"],[class*="item-title"],[class*="yohtmlc-item"],[class*="a-link-normal"][href*="/dp/"],[data-component*="item"] a,a[href*="/dp/"],a[href*="/gp/product/"]'
          );
          let itemDescription = (titleEl?.textContent ?? "").trim().slice(0, 120);
          if (!itemDescription) {
            const productLink = card.querySelector('a[href*="/dp/"], a[href*="/gp/product/"]');
            itemDescription = (productLink?.textContent ?? "").trim().slice(0, 120);
          }
          orders.push({
            platform: "Amazon",
            orderNumber: orderId,
            orderDate: orderDate.toISOString().split("T")[0],
            itemDescription,
            cost,
            shippingCost: 0,
            shippingAddress,
            trackingNumbers: [],
            sourceUrl: `https://www.amazon.com/gp/your-account/order-details?orderID=${orderId}`
          });
        }
        return { orders, hasOlder };
      }
      function getNextStartIndex(doc) {
        const nextEl = doc.querySelector(
          '.a-pagination .a-last:not(.a-disabled) a, [aria-label="Next page"] a'
        );
        if (!nextEl?.href) return null;
        const m = nextEl.href.match(/startIndex=(\d+)/);
        return m ? parseInt(m[1]) : null;
      }
      async function fetchHtml(url) {
        try {
          const resp = await chrome.runtime.sendMessage({ type: "FETCH_HTML", url });
          if (resp?.error) {
            console.warn("[AMZ] fetch error", url, resp.error);
            return null;
          }
          return new DOMParser().parseFromString(resp.html, "text/html");
        } catch (e) {
          console.warn("[AMZ] fetch error", url, e);
          return null;
        }
      }
      function extractCarrierTracking(doc) {
        const found = [];
        const text = (doc.body?.textContent ?? "").replace(/\s+/g, " ");
        const amzl = text.match(/\bTBA(\d{12,15})(?!\d)/g)?.map((m) => m.replace(/\D+$/, ""));
        const ups = text.match(/\b(1Z[A-Z0-9]{16})\b/g);
        const usps = text.match(/\b(9[0-9]{19,21})\b/g);
        const fedex = text.match(/\b([1-8][0-9]{14})\b/g);
        const nearLabel = text.match(/Tracking(?:\s+ID|\s+number)?[:\s]+([A-Z0-9]{10,30})/gi) ?? [];
        for (const m of nearLabel) {
          const val = m.replace(/Tracking(?:\s+ID|\s+number)?[:\s]+/i, "").trim().split(" ")[0];
          if (val) found.unshift(val);
        }
        if (amzl) found.push(...amzl);
        if (ups) found.push(...ups);
        if (usps) found.push(...usps);
        if (fedex) found.push(...fedex);
        const carrierLinks = Array.from(doc.querySelectorAll("a[href]")).map((a) => a.href).filter((h) => /usps\.com|ups\.com|fedex\.com|dhl\.com/i.test(h));
        for (const href of carrierLinks) {
          const m = href.match(/[?&](?:qtc_tLabels1|tLabels|tracknum|InquiryNumber\d*|tracknumbers|trknbr|AWB)=([A-Z0-9]{8,30})/i);
          if (m) found.unshift(m[1]);
        }
        return [...new Set(found)];
      }
      function extractTitleFromDoc(doc) {
        const bySelector = [
          doc.querySelector('[data-component="itemTitle"] a'),
          doc.querySelector(".yohtmlc-item a.a-link-normal"),
          doc.querySelector('.a-link-normal[href*="/dp/"]'),
          doc.querySelector('.a-link-normal[href*="/gp/product/"]')
        ];
        for (const el of bySelector) {
          const text = (el?.textContent ?? "").trim().replace(/\s+/g, " ");
          if (text.length > 5) return text.slice(0, 120);
        }
        for (const a of Array.from(doc.querySelectorAll("a[href]"))) {
          if (!/\/dp\/[A-Z0-9]{10}|\/gp\/product\/[A-Z0-9]{10}/.test(a.href)) continue;
          const text = (a.textContent ?? "").trim().replace(/\s+/g, " ");
          if (text.length > 5) return text.slice(0, 120);
        }
        console.warn("[AMZ] extractTitle: no match \u2014 sample links:", Array.from(doc.querySelectorAll("a[href]")).slice(0, 5).map((a) => a.href));
        return "";
      }
      function extractAddressFromDoc(doc) {
        const headers = Array.from(doc.querySelectorAll("h5"));
        for (const h of headers) {
          if (!/ship\s+to/i.test(h.textContent ?? "")) continue;
          const ul = h.nextElementSibling;
          if (!ul || ul.tagName !== "UL") continue;
          const items = Array.from(ul.querySelectorAll("li span.a-list-item")).map((el) => (el.innerHTML ?? "").replace(/<br\s*\/?>/gi, ", ").replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " ")).filter((t) => t && !/^united states$/i.test(t));
          const addrItems = items.slice(1);
          if (addrItems.length > 0) return addrItems.join(", ").slice(0, 200);
        }
        console.warn('[AMZ] extractAddress: no "Ship to" h5 found');
        return "";
      }
      async function fetchOrderDetails(orderId) {
        console.log("[AMZ] fetchOrderDetails", orderId);
        const detailDoc = await fetchHtml(`https://www.amazon.com/gp/your-account/order-details?orderID=${orderId}`);
        if (!detailDoc) {
          console.warn("[AMZ] fetchOrderDetails: no doc for", orderId);
          return { tracking: [], title: "", address: "" };
        }
        const title = extractTitleFromDoc(detailDoc);
        const address = extractAddressFromDoc(detailDoc);
        const shipTrackUrls = Array.from(detailDoc.querySelectorAll('a[href*="ship-track"]')).map((a) => a.href).filter((href, i, arr) => arr.indexOf(href) === i);
        if (shipTrackUrls.length === 0) {
          console.log("[AMZ] no ship-track links for", orderId, "| title:", title || "(none)", "| addr:", address || "(none)");
          return { tracking: [], title, address };
        }
        const tracking = [];
        for (const url of shipTrackUrls.slice(0, 3)) {
          await new Promise((r) => setTimeout(r, 600));
          const doc = await fetchHtml(url);
          if (!doc) continue;
          doc.querySelectorAll("nav, footer, #navbar, #navFooter, #rhf").forEach((el) => el.remove());
          const fromPage = extractCarrierTracking(doc);
          tracking.push(...fromPage);
        }
        const cleaned = [...new Set(tracking)].map((t) => t.replace(/[A-Za-z]+$/, ""));
        const unique = [...new Set(cleaned)].filter((t) => !cleaned.some((other) => other !== t && t.startsWith(other))).slice(0, 5);
        console.log("[AMZ] tracking for", orderId, ":", unique, "| title:", title || "(none)", "| addr:", address || "(none)");
        return { tracking: unique, title, address };
      }
      async function fetchOrdersPage(startIndex) {
        return fetchHtml(`https://www.amazon.com/your-orders/orders?startIndex=${startIndex}`);
      }
      function waitForOrders(timeoutMs = 15e3) {
        return new Promise((resolve) => {
          const start = Date.now();
          function check() {
            const links = document.querySelectorAll('a[href*="orderID="], a[href*="orderId="], a[href*="order-details"]');
            if (links.length > 0) {
              console.log("[AMZ] found", links.length, "order links");
              resolve();
              return;
            }
            if (Date.now() - start > timeoutMs) {
              console.warn("[AMZ] waitForOrders timed out \u2014 url:", location.href, "\u2014 sample links:", Array.from(document.querySelectorAll("a[href]")).slice(0, 5).map((a) => a.href));
              resolve();
              return;
            }
            setTimeout(check, 500);
          }
          check();
        });
      }
      var STATE_KEY = "__resell_sync_state__";
      var STORAGE_KEY = "amazonPendingSync";
      function saveState(state) {
        sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
        chrome.storage.local.set({ [STORAGE_KEY]: { ...state, ts: Date.now() } });
      }
      async function loadState() {
        try {
          const raw = sessionStorage.getItem(STATE_KEY);
          if (raw) return JSON.parse(raw);
        } catch {
        }
        try {
          const result = await chrome.storage.local.get(STORAGE_KEY);
          const stored = result[STORAGE_KEY];
          if (stored && Date.now() - stored.ts < 2 * 60 * 1e3) return stored;
        } catch {
        }
        return null;
      }
      function clearState() {
        sessionStorage.removeItem(STATE_KEY);
        chrome.storage.local.remove(STORAGE_KEY);
      }
      var syncing = false;
      var cancelRequested = false;
      async function runSync(state) {
        try {
          const sinceDate = new Date(state.sinceDate);
          const allOrders = [];
          const seen = /* @__PURE__ */ new Set();
          sendMessage({ type: "SYNC_PROGRESS", platform: "Amazon", scraped: 0, message: "Scraping page 1\u2026" });
          console.log("[AMZ] waiting for orders on", location.href);
          await waitForOrders();
          console.log("[AMZ] scraping page 1, sinceDate:", sinceDate.toISOString().split("T")[0]);
          const page1 = scrapeDoc(document, sinceDate);
          console.log("[AMZ] page 1 result:", page1.orders.length, "orders, hasOlder:", page1.hasOlder);
          if (page1.orders.length) console.log("[AMZ] orders found:", page1.orders.map((o) => `${o.orderDate} #${o.orderNumber} $${o.cost} addr=${o.shippingAddress || "none"}`).join(" | "));
          for (const o of page1.orders) {
            if (!seen.has(o.orderNumber)) {
              seen.add(o.orderNumber);
              allOrders.push(o);
            }
          }
          if (!page1.hasOlder && allOrders.length < 200) {
            let nextIndex = getNextStartIndex(document);
            let pageNum = 2;
            while (nextIndex !== null && allOrders.length < 200 && !cancelRequested) {
              sendMessage({ type: "SYNC_PROGRESS", platform: "Amazon", scraped: allOrders.length, message: `Scraping page ${pageNum}\u2026` });
              await new Promise((r) => setTimeout(r, 1500));
              const doc = await fetchOrdersPage(nextIndex);
              if (!doc) break;
              const { orders, hasOlder } = scrapeDoc(doc, sinceDate);
              for (const o of orders) {
                if (!seen.has(o.orderNumber)) {
                  seen.add(o.orderNumber);
                  allOrders.push(o);
                }
              }
              if (hasOlder) break;
              nextIndex = getNextStartIndex(doc);
              pageNum++;
            }
          }
          if (allOrders.length > 0) {
            for (let i = 0; i < allOrders.length; i++) {
              if (cancelRequested) {
                console.log("[AMZ] sync cancelled during detail fetch");
                break;
              }
              const order = allOrders[i];
              sendMessage({ type: "SYNC_PROGRESS", platform: "Amazon", scraped: allOrders.length, message: `Fetching details for order ${i + 1} of ${allOrders.length}\u2026` });
              await new Promise((r) => setTimeout(r, 800));
              const timeout = new Promise(
                (r) => setTimeout(() => r({ tracking: [], title: "", address: "" }), 12e3)
              );
              const { tracking, title, address } = await Promise.race([fetchOrderDetails(order.orderNumber), timeout]);
              if (tracking.length > 0) order.trackingNumbers = tracking;
              if (!order.itemDescription && title) order.itemDescription = title;
              if (!order.shippingAddress && address) order.shippingAddress = address;
            }
          }
          if (allOrders.length === 0) {
            clearState();
            setBadge("\u2014");
            sendMessage({ type: "SYNC_DONE", result: { platform: "Amazon", scraped: 0, imported: 0, updated: 0 } });
            return;
          }
          try {
            const result = await pushOrders(state.trackerUrl, state.apiKey, state.userId, allOrders);
            clearState();
            await setLastSync("amazon", (/* @__PURE__ */ new Date()).toISOString().split("T")[0]);
            setBadge(`+${result.imported ?? 0}`, "#22c55e");
            sendMessage({ type: "SYNC_DONE", result: { platform: "Amazon", scraped: allOrders.length, ...result } });
          } catch (err) {
            setBadge("!", "#ef4444");
            sendMessage({ type: "SYNC_ERROR", platform: "Amazon", error: err instanceof Error ? err.message : String(err) });
          }
        } catch (err) {
          setBadge("!", "#ef4444");
          sendMessage({ type: "SYNC_ERROR", platform: "Amazon", error: err instanceof Error ? err.message : String(err) });
        } finally {
          syncing = false;
        }
      }
      async function startSync() {
        if (syncing) return;
        syncing = true;
        cancelRequested = false;
        const settings = await getSettings();
        if (!settings.trackerUrl || !settings.userId) {
          sendMessage({ type: "SYNC_ERROR", platform: "Amazon", error: "Tracker URL or user not configured \u2014 open Settings." });
          setBadge("!", "#ef4444");
          syncing = false;
          return;
        }
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1e3);
        const lastSyncDate = settings.amazonLastSync ? new Date(settings.amazonLastSync) : null;
        const sinceDate = lastSyncDate && lastSyncDate < sixtyDaysAgo ? lastSyncDate : sixtyDaysAgo;
        setBadge("\u2026");
        sendMessage({ type: "SYNC_STARTED", platform: "Amazon" });
        const state = {
          sinceDate: sinceDate.toISOString(),
          trackerUrl: settings.trackerUrl,
          apiKey: settings.apiKey ?? "",
          userId: settings.userId
        };
        const cleanOrdersUrl = "https://www.amazon.com/your-orders/orders";
        if (location.href.replace(/\/$/, "") === cleanOrdersUrl) {
          saveState(state);
          await runSync(state);
        } else {
          saveState(state);
          window.location.href = cleanOrdersUrl;
        }
      }
      (async () => {
        if (!location.pathname.includes("your-orders") && !location.pathname.includes("order-history")) return;
        const state = await loadState();
        if (state) {
          syncing = true;
          cancelRequested = false;
          sendMessage({ type: "SYNC_STARTED", platform: "Amazon" });
          await runSync(state);
        }
      })();
      chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (msg.type === "PING") {
          sendResponse("ok");
          return;
        }
        if (msg.type === "START_SYNC" && msg.platform === "Amazon") startSync();
        if (msg.type === "CANCEL_SYNC" && msg.platform === "Amazon") {
          cancelRequested = true;
          sendResponse("ok");
        }
      });
    }
  });
  require_amazon();
})();
