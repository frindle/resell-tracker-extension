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
    const key = platform === "amazon" ? "amazonLastSync" : platform === "walmart" ? "walmartLastSync" : "costcoLastSync";
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
        costcoLastSync: ""
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

  // src/content/costco.ts
  var require_costco = __commonJS({
    "src/content/costco.ts"() {
      var import_browser_polyfill_min3 = __toESM(require_browser_polyfill_min());
      init_storage();
      init_api();
      var PAGE_SIZE = 16;
      var SKIP_STATUSES = /* @__PURE__ */ new Set(["cancelled", "canceled"]);
      var DIGITAL_CARRIERS = /* @__PURE__ */ new Set(["electronic delivery service", "email delivery", "email"]);
      console.log("[CST] content script loaded", location.href);
      function sendMessage(msg) {
        chrome.runtime.sendMessage(msg).catch(() => {
        });
        if (msg.type === "SYNC_PROGRESS" || msg.type === "SYNC_STARTED") {
          chrome.storage.local.set({ costcoSyncStatus: { type: msg.type, message: msg.message ?? "syncing\u2026", ts: Date.now() } });
        } else if (msg.type === "SYNC_DONE" || msg.type === "SYNC_ERROR") {
          chrome.storage.local.set({ costcoSyncStatus: { type: msg.type, result: msg.result, error: msg.error, ts: Date.now() } });
        }
      }
      function setBadge(text, color = "#3b82f6") {
        chrome.runtime.sendMessage({ type: "SET_BADGE", text, color }).catch(() => {
        });
      }
      function formatDate(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      }
      function getMsalRefreshToken() {
        for (const storage of [sessionStorage, localStorage]) {
          for (const key of Object.keys(storage)) {
            if (!key.toLowerCase().includes("refreshtoken")) continue;
            if (!key.includes("a3a5186b")) continue;
            try {
              const item = JSON.parse(storage.getItem(key) ?? "{}");
              if (item.secret) return item.secret;
            } catch {
            }
          }
        }
        return "";
      }
      async function getMsalToken() {
        const refreshToken = getMsalRefreshToken();
        if (!refreshToken) {
          console.log("[CST] no refresh token found");
          return "";
        }
        console.log("[CST] exchanging refresh token for fresh id_token\u2026");
        try {
          const res = await fetch(
            "https://signin.costco.com/e0714dd4-784d-46d6-a278-3e29553483eb/B2C_1A_SSO_WCS_signup_signin_209/oauth2/v2.0/token",
            {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: refreshToken,
                client_id: "a3a5186b-7c89-4b4c-93a8-dd604e930757",
                scope: "openid profile offline_access"
              }).toString()
            }
          );
          if (!res.ok) {
            console.error("[CST] token refresh failed", res.status, await res.text());
            return "";
          }
          const data = await res.json();
          console.log("[CST] token refresh ok, keys:", Object.keys(data));
          return data.id_token ?? data.access_token ?? "";
        } catch (e) {
          console.error("[CST] token refresh error", e);
          return "";
        }
      }
      async function getAuth() {
        try {
          const intercepted = await chrome.runtime.sendMessage({ type: "GET_COSTCO_AUTH" }).catch(() => null);
          if (intercepted?.token && intercepted?.clientId) {
            console.log("[CST] using intercepted auth token");
            return { token: intercepted.token, clientId: intercepted.clientId, warehouseNumber: getWarehouseNumber() || "0" };
          }
          console.log("[CST] no intercepted token \u2014 trying live MSAL instance\u2026");
          const msalToken = await chrome.runtime.sendMessage({ type: "GET_MSAL_TOKEN" }).catch(() => null);
          if (msalToken) {
            console.log("[CST] got token from MSAL instance");
            const clientId2 = location.href.match(/\/app\/([0-9a-f-]{36})\//i)?.[1] ?? "";
            return { token: msalToken, clientId: clientId2, warehouseNumber: getWarehouseNumber() || "0" };
          }
          let token = await getMsalToken();
          console.log("[CST] msal token found:", !!token);
          if (token) {
            try {
              const p = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
              console.log("[CST] msal token aud:", p.aud, "exp:", new Date(p.exp * 1e3).toISOString());
            } catch {
            }
          }
          if (!token) {
            const res = await fetch("/gettoken", { credentials: "include" });
            if (!res.ok) {
              console.error("[CST] gettoken returned", res.status);
              return null;
            }
            const data = await res.json();
            token = data.id_token ?? data.access_token ?? data.token ?? "";
            if (!token) {
              console.error("[CST] no token in gettoken response", Object.keys(data));
              return null;
            }
          }
          let clientId = location.href.match(/\/app\/([0-9a-f-]{36})\//i)?.[1] ?? "";
          if (!clientId) {
            try {
              const res2 = await fetch("/gettoken", { credentials: "include" });
              if (res2.ok) {
                const data2 = await res2.json();
                const tok2 = data2.id_token ?? data2.access_token ?? "";
                const payload2 = JSON.parse(atob(tok2.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
                clientId = payload2.clientId ?? "";
              }
            } catch {
            }
          }
          const warehouseNumber = getWarehouseNumber();
          console.log("[CST] auth ok, clientId:", clientId, "warehouse:", warehouseNumber || "(not found, using 0)");
          return { token, clientId, warehouseNumber: warehouseNumber || "0" };
        } catch (e) {
          console.error("[CST] getAuth failed", e);
          return null;
        }
      }
      function getWarehouseNumber() {
        for (const cookie of document.cookie.split(";")) {
          const [k, v] = cookie.trim().split("=");
          if (/store|warehouse|wh/i.test(k) && v && /^\d{3,4}$/.test(v.trim())) return v.trim();
        }
        for (const key of Object.keys(localStorage)) {
          if (/store|warehouse|wh/i.test(key)) {
            const v = localStorage.getItem(key) ?? "";
            if (/^\d{3,4}$/.test(v.trim())) return v.trim();
          }
        }
        return "";
      }
      var ORDER_QUERY = `query getOnlineOrders($startDate:String!, $endDate:String!, $pageNumber:Int, $pageSize:Int, $warehouseNumber:String!) {
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
      async function fetchPage(auth, startDate, endDate, pageNumber) {
        try {
          const body = JSON.stringify({
            query: ORDER_QUERY,
            variables: { startDate, endDate, pageNumber, pageSize: PAGE_SIZE, warehouseNumber: auth.warehouseNumber }
          });
          const resp = await chrome.runtime.sendMessage({ type: "COSTCO_GRAPHQL", token: auth.token, clientId: auth.clientId, body });
          if (resp?.error) {
            console.error("[CST] GraphQL background error", resp.error);
            return null;
          }
          if (!resp?.ok) {
            console.error("[CST] GraphQL error", resp?.status, resp?.text);
            return null;
          }
          const json = JSON.parse(resp.text);
          const result = json?.data?.getOnlineOrders?.[0];
          if (!result) {
            console.error("[CST] unexpected GraphQL response shape", JSON.stringify(json).slice(0, 200));
            return null;
          }
          return { orders: result.bcOrders ?? [], total: result.totalNumberOfRecords ?? 0 };
        } catch (e) {
          console.error("[CST] fetchPage failed", e);
          return null;
        }
      }
      function mapOrder(o) {
        if (SKIP_STATUSES.has(o.status.toLowerCase())) return null;
        const activeItems = o.orderLineItems.filter((li) => !SKIP_STATUSES.has(li.status.toLowerCase()));
        const descriptions = [...new Set(
          activeItems.map((li) => li.itemDescription?.trim()).filter(Boolean)
        )];
        const itemDescription = descriptions.join(", ").slice(0, 200);
        const tracking = [...new Set(
          activeItems.flatMap((li) => li.shipment).filter((s) => s.trackingNumber && !DIGITAL_CARRIERS.has(s.carrierName.toLowerCase())).map((s) => s.trackingNumber)
        )];
        return {
          platform: "Costco",
          orderNumber: o.orderNumber,
          orderDate: o.orderPlacedDate.split("T")[0],
          itemDescription,
          cost: o.orderTotal,
          shippingCost: 0,
          shippingAddress: "",
          trackingNumbers: tracking,
          sourceUrl: `https://www.costco.com/myaccount/#/app/${o.orderHeaderId}/orderdetails`
        };
      }
      var syncing = false;
      async function runSync() {
        if (syncing) return;
        syncing = true;
        const settings = await getSettings();
        if (!settings.trackerUrl || !settings.userId) {
          sendMessage({ type: "SYNC_ERROR", platform: "Costco", error: "Tracker URL or user not configured \u2014 open Settings." });
          setBadge("!", "#ef4444");
          syncing = false;
          return;
        }
        setBadge("\u2026");
        sendMessage({ type: "SYNC_STARTED", platform: "Costco" });
        sendMessage({ type: "SYNC_PROGRESS", platform: "Costco", scraped: 0, message: "Getting auth\u2026" });
        const auth = await getAuth();
        if (!auth) {
          sendMessage({ type: "SYNC_ERROR", platform: "Costco", error: "Could not get Costco auth token \u2014 make sure you are logged in." });
          setBadge("!", "#ef4444");
          syncing = false;
          return;
        }
        const sinceDate = settings.costcoLastSync ? new Date(settings.costcoLastSync) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1e3);
        const now = /* @__PURE__ */ new Date();
        const startDate = formatDate(sinceDate);
        const endDate = formatDate(now);
        console.log("[CST] syncing", startDate, "\u2192", endDate);
        sendMessage({ type: "SYNC_PROGRESS", platform: "Costco", scraped: 0, message: "Fetching orders\u2026" });
        const allOrders = [];
        let pageNumber = 1;
        let total = Infinity;
        let fetchFailed = false;
        while ((pageNumber - 1) * PAGE_SIZE < total) {
          if (pageNumber > 1) await new Promise((r) => setTimeout(r, 600));
          const page = await fetchPage(auth, startDate, endDate, pageNumber);
          if (!page) {
            fetchFailed = true;
            break;
          }
          total = page.total;
          for (const o of page.orders) {
            const mapped = mapOrder(o);
            if (mapped) allOrders.push(mapped);
          }
          sendMessage({ type: "SYNC_PROGRESS", platform: "Costco", scraped: allOrders.length, message: `Fetched ${allOrders.length} of ${total} orders\u2026` });
          pageNumber++;
        }
        if (fetchFailed && allOrders.length === 0) {
          setBadge("!", "#ef4444");
          sendMessage({ type: "SYNC_ERROR", platform: "Costco", error: "GraphQL request failed \u2014 check console for details." });
          syncing = false;
          return;
        }
        if (allOrders.length === 0) {
          setBadge("\u2014");
          sendMessage({ type: "SYNC_DONE", result: { platform: "Costco", scraped: 0, imported: 0, updated: 0 } });
          syncing = false;
          return;
        }
        try {
          const result = await pushOrders(settings.trackerUrl, settings.apiKey ?? "", settings.userId, allOrders);
          await setLastSync("costco", now.toISOString().split("T")[0]);
          setBadge(`+${result.imported}`, "#22c55e");
          sendMessage({ type: "SYNC_DONE", result: { platform: "Costco", scraped: allOrders.length, ...result } });
        } catch (err) {
          setBadge("!", "#ef4444");
          sendMessage({ type: "SYNC_ERROR", platform: "Costco", error: err instanceof Error ? err.message : String(err) });
        }
        syncing = false;
      }
      chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (msg.type === "PING") {
          sendResponse("ok");
          return;
        }
        if (msg.type === "START_SYNC" && msg.platform === "Costco") runSync();
      });
    }
  });
  require_costco();
})();
