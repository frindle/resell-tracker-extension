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
  async function saveSettings(settings) {
    await chrome.storage.sync.set(settings);
  }
  async function savePaired(p) {
    await saveSettings({ extensionSecret: p.secret, userId: p.userId, userName: p.userName });
  }
  var import_browser_polyfill_min, DEFAULTS;
  var init_storage = __esm({
    "src/lib/storage.ts"() {
      "use strict";
      import_browser_polyfill_min = __toESM(require_browser_polyfill_min(), 1);
      DEFAULTS = {
        trackerUrl: "",
        apiKey: "",
        extensionSecret: "",
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
  async function fetchUsers(trackerUrl) {
    await chrome.runtime.sendMessage({ type: "PING" }).catch(() => {
    });
    const res = await chrome.runtime.sendMessage({ type: "FETCH_USERS", trackerUrl });
    if (res?.error) throw new Error(res.error);
    if (!Array.isArray(res)) throw new Error("Unexpected response from background");
    return res.map((u) => ({ id: u.id, name: u.name }));
  }
  var import_browser_polyfill_min2;
  var init_api = __esm({
    "src/lib/api.ts"() {
      "use strict";
      import_browser_polyfill_min2 = __toESM(require_browser_polyfill_min(), 1);
    }
  });

  // src/lib/access.ts
  function originsFor(trackerUrl) {
    const out = [...AMAZON_ORIGINS];
    if (trackerUrl) {
      try {
        const u = new URL(trackerUrl.startsWith("http") ? trackerUrl : `http://${trackerUrl}`);
        out.push(`http://${u.hostname}/*`, `https://${u.hostname}/*`);
      } catch {
      }
    }
    return out;
  }
  var import_browser_polyfill_min3, AMAZON_ORIGINS;
  var init_access = __esm({
    "src/lib/access.ts"() {
      "use strict";
      import_browser_polyfill_min3 = __toESM(require_browser_polyfill_min(), 1);
      AMAZON_ORIGINS = ["https://www.amazon.com/*"];
    }
  });

  // src/lib/tracker-script.ts
  function hostPatternFor(trackerUrl) {
    try {
      const u = new URL(trackerUrl.startsWith("http") ? trackerUrl : `http://${trackerUrl}`);
      return `*://${u.hostname}/*`;
    } catch {
      return null;
    }
  }
  async function registerTrackerScript(pattern) {
    try {
      await chrome.scripting.unregisterContentScripts({ ids: [TRACKER_SCRIPT_ID] });
    } catch {
    }
    await chrome.scripting.registerContentScripts([{
      id: TRACKER_SCRIPT_ID,
      matches: [pattern],
      js: ["content/tracker-status.js"],
      runAt: "document_idle"
    }]);
  }
  async function grantTrackerAccess(trackerUrl) {
    const pattern = hostPatternFor(trackerUrl);
    if (!pattern) return false;
    const origins = originsFor(trackerUrl).filter((o) => !o.includes("amazon.com"));
    await chrome.permissions.request({ origins }).catch(() => false);
    if (!await chrome.permissions.contains({ origins }).catch(() => false)) return false;
    await registerTrackerScript(pattern);
    return true;
  }
  async function ensureTrackerScriptRegistered(trackerUrl) {
    const pattern = hostPatternFor(trackerUrl);
    if (!pattern) return;
    const has = await chrome.permissions.contains({ origins: [pattern] }).catch(() => false);
    if (!has) return;
    await registerTrackerScript(pattern);
  }
  var import_browser_polyfill_min4, TRACKER_SCRIPT_ID;
  var init_tracker_script = __esm({
    "src/lib/tracker-script.ts"() {
      "use strict";
      import_browser_polyfill_min4 = __toESM(require_browser_polyfill_min(), 1);
      init_access();
      TRACKER_SCRIPT_ID = "tracker-status";
    }
  });

  // src/lib/scrapeConfig.default.json
  var scrapeConfig_default_default;
  var init_scrapeConfig_default = __esm({
    "src/lib/scrapeConfig.default.json"() {
      scrapeConfig_default_default = {
        version: 4,
        sites: {
          amazon: {
            selectors: {
              blockedSignIn: 'form[name="signIn"]:not(#ap_navbar_form), #ap_email, #ap_password, input[name="password"][type="password"]',
              blockedCaptcha: 'form[action*="validateCaptcha"], #captchacharacters, img[src*="captcha"]',
              stripElements: 'script, noscript, style, link, meta, iframe, svg, template, input[type="hidden"], [id^="shipToData-"]'
            },
            labels: {},
            patterns: {
              agentBlock: "unauthorized AI agent|violates Amazon'?s Conditions of Use|automated access",
              refSuffix: "\\/ref=[^/]*\\/?$",
              ordersPath: "^(?:/your-orders/orders|/gp/css/order-history|/gp/your-account/order-history)$",
              detailPath: "^(?:/gp/your-account/order-details|/your-orders/order-details|/gp/css/order-details|/gp/css/summary/edit\\.html)$",
              trackingPath: "^(?:/progress-tracker/package(?:/.*)?|/gp/your-account/ship-track|/gp/css/shiptrack/view\\.html)$"
            },
            urls: {
              host: "www.amazon.com"
            },
            timeoutsMs: {
              quietMs: 1500,
              maxWaitMs: 15e3,
              urlPollMs: 2e3,
              runWaitMs: 3e4
            }
          },
          costco: {
            selectors: {},
            labels: {
              refreshTokenKey: "refreshtoken",
              accessTokenKey: "accesstoken",
              msalKeyMarker: "a3a5186b",
              msalClientId: "a3a5186b-7c89-4b4c-93a8-dd604e930757",
              msalScope: "openid profile offline_access"
            },
            patterns: {
              warehouseKey: "store|warehouse|wh",
              warehouseValue: "^\\d{3,4}$",
              appIdHash: "^#\\/app\\/([^/]+)\\/"
            },
            urls: {
              tokenRefresh: "https://signin.costco.com/e0714dd4-784d-46d6-a278-3e29553483eb/B2C_1A_SSO_WCS_signup_signin_209/oauth2/v2.0/token",
              orderDetail: "https://www.costco.com/myaccount/#/app/4900eb1f-0c10-4bd9-99c3-c59e6c1ecebf/orderdetails/{orderNumber}",
              orders: "https://www.costco.com/myaccount/",
              orderDetailHash: "#/app/{appId}/orderdetails/{orderNumber}",
              apiHost: "ecom-api.costco.com",
              graphqlPath: "order/v1/orders/graphql"
            },
            timeoutsMs: {
              authWaitMs: 2e4,
              authPollMs: 1e3,
              pageDelayMs: 600,
              readyWaitMs: 45e3,
              syncTimeoutMs: 24e4,
              detailWaitMs: 2e4,
              ordersTimeoutMs: 3e5,
              detailDelayMs: 500,
              pollMs: 500
            }
          },
          walmart: {
            selectors: {
              orderBlocks: '[data-testid*="orderGroup"], [data-testid*="order-card"], [data-testid*="orderCard"]',
              orderCaption: '[id^="caption-"]',
              itemFallback: 'a[href*="/ip/"], [data-testid*="product"], [data-testid*="item"]',
              productName: '[data-testid="productName"]',
              nextPageLink: '[aria-label="Next page"]:not([disabled]) a, [data-automation-id*="next-page"]:not([disabled]) a, [aria-label="Next page"]:not([disabled])',
              nextPageButton: '[aria-label="Next page"]:not([disabled]), [data-automation-id*="next-page"]:not([disabled])',
              nextClick: '[aria-label="Next page"]:not([disabled]), [data-automation-id*="next-page"]:not([disabled]), button[aria-label*="next" i]:not([disabled])',
              nextData: "#__NEXT_DATA__",
              detailAddress: '[data-automation-id*="shipping-address"], [class*="shipping-address"], [class*="shippingAddress"]',
              detailTotal: '[data-automation-id*="order-total"], [class*="orderTotal"], [class*="order-total"]',
              detailItem: '[data-automation-id*="product-title"], [class*="product-title"], h2[class*="item"]',
              deliveryPhoto: 'img[alt="Proof of delivery location"], img[src*="/delivery-photo/"]'
            },
            labels: {
              groupsKeyPrefix: "groups_"
            },
            patterns: {
              cancelledOrReturned: "(?:\\b(?:cancell?ed|cancellation|returned|refunded)\\b|we had to cancel|we['\u2019]ve canceled|cancel these items|won['\u2019]t be charged|released the temporary hold)",
              captionOrderNumber: "caption-(\\d+)",
              orderNumberLabeled: "Order\\s*#?\\s*(\\d{10,})",
              orderNumberBare: "\\b(\\d{13,20})\\b",
              dateLabeledFull: "(?:Placed|Ordered|Delivered|on)\\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+\\d{1,2},?\\s+\\d{4})",
              dateFull: "\\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+\\d{1,2},?\\s+\\d{4})",
              dateLabeledNoYear: "(?:Placed|Ordered|Delivered|on)\\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+\\d{1,2})(?!\\d)",
              storePickup: "\\b(?:Free\\s+store\\s+pickup|Curbside\\s+pickup|Pickup\\s+at|Ready\\s+for\\s+pickup|Store\\s+Pickup|Pickup\\s+order)\\b",
              orderTotal: "Total\\s+\\$?([\\d,]+\\.?\\d*)",
              genericTitle: "^(Walmart\\.com|Walmart|Loading|\u2014|\u2014\\s*\u2014)$",
              genericTitleJson: "^(Walmart\\.com|Walmart|Loading)$",
              cardLast4: "(?:ending\\s+(?:in)?|\\*{2,}|\\.{2,})\\s*(\\d{4})\\b",
              trackingField: `trackingNumber["\\s:]+["']?([A-Z0-9]{10,25})`,
              trackingUps: "\\b(1Z[A-Z0-9]{16})\\b",
              trackingDigits: "\\b([0-9]{20,22})\\b",
              internalTracking: "^555\\d{15,}$",
              scriptBlock: "<script[^>]*>([\\s\\S]*?)<\\/script>",
              jsonOrderDate: '"orderDate":"([^"]+)"',
              jsonPlacedDate: '"placedDate":"([^"]+)"',
              jsonOrderPlacedDate: '"orderPlacedDate":"([^"]+)"',
              jsonCreatedDate: '"createdDate":"([^"]+)"',
              jsonCost: '"(?:totalAmount|financeTotal|orderTotal|grandTotal|chargeTotal|estimatedTotal|totalCharges|orderTotalAmount|total)"\\s*:\\s*([\\d.]+)',
              jsonProductName: '"(?:productName|itemDescription)"\\s*:\\s*"([^"]{5,120})"',
              htmlTotal: "(?:order\\s+)?total[^$\\d]{0,30}\\$\\s*([\\d,]+\\.?\\d*)",
              htmlPlaced: "[Pp]laced[^<]{0,80}?(\\d{4}-\\d{2}-\\d{2})",
              jsonLastFour: '"lastFour"\\s*:\\s*"?(\\d{4})"?',
              jsonLastFourDigits: '"lastFourDigits"\\s*:\\s*"?(\\d{4})"?',
              jsonCardLast4: '"cardLast4"\\s*:\\s*"?(\\d{4})"?',
              jsonLast4: '"last4"\\s*:\\s*"?(\\d{4})"?',
              jsonCardNumberLast4: '"cardNumberLast4"\\s*:\\s*"?(\\d{4})"?',
              jsonAccountNumberLast4: '"accountNumberLast4"\\s*:\\s*"?(\\d{4})"?',
              textEndingIn: "\\bending\\s+in\\s+(\\d{4})\\b",
              textEnding: "\\bending\\s+(\\d{4})\\b",
              textAsterisks: "\\*{2,}\\s*(\\d{4})\\b",
              textXs: "\\bx{4,}\\s*(\\d{4})\\b",
              textBullets: "[\u2022\xB7\u2024\u22C5\u25CF]{2,}\\s*(\\d{4})\\b",
              textHtmlBullet: "(?:&bull;|&middot;|&#x2022;|&#8226;){2,}\\s*(\\d{4})\\b",
              httpUrl: "^https?:\\/\\/"
            },
            urls: {
              orders: "https://www.walmart.com/orders",
              orderDetail: "https://www.walmart.com/orders/{orderNumber}",
              ordersPath: "/orders",
              purchasesPath: "/account/mypurchases"
            },
            timeoutsMs: {
              detailFetchMs: 5e3,
              firstLoadMs: 15e3,
              pageLoadMs: 12e3,
              loadPollMs: 400,
              resumeDelayMs: 2e3
            }
          },
          costcoEgift: {
            selectors: {
              clickables: 'button, a, [role="button"], input[type="button"], input[type="submit"]',
              emailInput: '#p2, input[type="email"], input[placeholder*="mail" i], input[name*="email" i], input[id*="email" i]',
              alert: 'div.ui-message[role="alert"], [role="alert"], .ui-messages-error, .ui-message-error, .ui-growl-message-error',
              submitButton: '#submitBtn, button[type="submit"], input[type="submit"]',
              buttons: "button",
              nextButton: 'input[id$="wdt-nav-next"], button[id$="wdt-nav-next"]',
              counter: "#wdt-page-counter",
              labelCells: "td, th, div, p, li, span, label",
              botCheck: 'iframe[src*="_Incapsula_Resource"], iframe[src*="captcha" i], iframe[title*="challenge" i]',
              itemTitle: "section.order-item .order-item-title",
              cardImage: "#print-content-section, #body-canvas"
            },
            labels: {
              openLabel: "Access eGift",
              nextLabel: "next",
              codeLabel: "Code:",
              pinLabel: "PIN:"
            },
            patterns: {
              nextButton: "^next\\b",
              alertText: "\\b(invalid|not match|incorrect|error|not found|unable|could ?n[o']t|not recogni[sz]ed|try again|not valid|no (?:order|record)s?)\\b",
              submitText: "submit|continue|next|view|access",
              code: "\\bCode:\\s*([A-Za-z0-9-]{4,64})",
              codeValue: "^[A-Za-z0-9][A-Za-z0-9 -]{2,62}[A-Za-z0-9]$",
              pin: "\\bPIN:\\s*([A-Za-z0-9]{2,32})",
              pinValue: "^[A-Za-z0-9]{2,32}$",
              sequence: "\\b(\\d{1,3})\\s+of\\s+(\\d{1,3})\\b",
              amount: "\\$\\s?(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})?|\\d+(?:\\.\\d{2})?)",
              botCheckText: "incapsula|incident id|additional security check|verify (?:that )?you are (?:a )?human|are you a robot|press (?:&|and) hold"
            },
            urls: {
              host: "www.memberedelivery.com"
            },
            timeoutsMs: {
              pollMs: 1500,
              waitMs: 4e4,
              stepDelayMs: 3e3,
              newTabWaitMs: 1e4
            }
          },
          bestbuyEgift: {
            selectors: {},
            labels: {},
            patterns: {},
            urls: {},
            timeoutsMs: {}
          }
        }
      };
    }
  });

  // src/lib/scrapeConfig.ts
  function isPlainObject(v) {
    if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
    const proto = Object.getPrototypeOf(v);
    return proto === Object.prototype || proto === null;
  }
  function validateScrapeConfig(raw) {
    const fail = (error) => ({ ok: false, error });
    if (!isPlainObject(raw)) return fail("config must be an object");
    for (const k of Object.keys(raw)) {
      if (k !== "version" && k !== "sites") return fail(`unknown top-level key "${k}"`);
    }
    const version = raw.version;
    if (typeof version !== "number" || !Number.isInteger(version) || version < 1) return fail("version must be a positive integer");
    if (!isPlainObject(raw.sites)) return fail("sites must be an object");
    const sites = {};
    for (const [siteKey, siteRaw] of Object.entries(raw.sites)) {
      if (!SITE_RE.test(siteKey)) return fail(`bad site key "${siteKey}"`);
      if (!isPlainObject(siteRaw)) return fail(`site "${siteKey}" must be an object`);
      for (const k of Object.keys(siteRaw)) {
        if (!SCRAPE_CATEGORIES.includes(k)) return fail(`site "${siteKey}": unknown key "${k}"`);
      }
      const site = { selectors: {}, labels: {}, patterns: {}, urls: {}, timeoutsMs: {} };
      for (const cat of SCRAPE_CATEGORIES) {
        const group = siteRaw[cat];
        if (!isPlainObject(group)) return fail(`site "${siteKey}": ${cat} must be an object`);
        for (const [name, value] of Object.entries(group)) {
          const where = `${siteKey}.${cat}.${name}`;
          if (!NAME_RE.test(name)) return fail(`bad entry name "${where}"`);
          if (cat === "timeoutsMs") {
            if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > MAX_MS) return fail(`${where} must be an integer 0..${MAX_MS}`);
            site.timeoutsMs[name] = value;
            continue;
          }
          if (typeof value !== "string") return fail(`${where} must be a string`);
          if (value.length > MAX_STRING) return fail(`${where} is too long`);
          if (cat === "patterns") {
            try {
              new RegExp(value);
            } catch {
              return fail(`${where} is not a valid regex`);
            }
          }
          site[cat][name] = value;
        }
      }
      sites[siteKey] = site;
    }
    return { ok: true, config: { version, sites } };
  }
  function describeScrapeStatus(s) {
    const x = s ?? { version: BUNDLED_SCRAPE_CONFIG.version, source: "bundled" };
    return `Scrape config v${x.version} (${x.source})`;
  }
  var import_browser_polyfill_min5, SCRAPE_CATEGORIES, NAME_RE, SITE_RE, MAX_STRING, MAX_MS, bundledCheck, BUNDLED_SCRAPE_CONFIG, SCRAPE_STATUS_KEY;
  var init_scrapeConfig = __esm({
    "src/lib/scrapeConfig.ts"() {
      "use strict";
      import_browser_polyfill_min5 = __toESM(require_browser_polyfill_min(), 1);
      init_scrapeConfig_default();
      SCRAPE_CATEGORIES = ["selectors", "labels", "patterns", "urls", "timeoutsMs"];
      NAME_RE = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
      SITE_RE = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
      MAX_STRING = 2e4;
      MAX_MS = 864e5;
      bundledCheck = validateScrapeConfig(scrapeConfig_default_default);
      BUNDLED_SCRAPE_CONFIG = bundledCheck.ok ? bundledCheck.config : scrapeConfig_default_default;
      SCRAPE_STATUS_KEY = "scrapeConfigStatus";
    }
  });

  // src/lib/plans.default.json
  var plans_default_default;
  var init_plans_default = __esm({
    "src/lib/plans.default.json"() {
      plans_default_default = {
        version: 1,
        plans: {
          costcoEgift: {
            hosts: [
              "www.memberedelivery.com"
            ],
            inputs: [
              "link",
              "email",
              "orderId"
            ],
            limits: {
              steps: 600,
              repeat: 50,
              runMs: 9e5,
              tabs: 3
            },
            timing: {
              pollMs: 1500,
              waitMs: 4e4,
              newTabWaitMs: 1e4
            },
            page: {
              clickables: 'button, a, [role="button"], input[type="button"], input[type="submit"]',
              labelCells: "td, th, div, p, li, span, label",
              alert: 'div.ui-message[role="alert"], [role="alert"], .ui-messages-error, .ui-message-error, .ui-growl-message-error',
              alertText: "\\b(invalid|not match|incorrect|error|not found|unable|could ?n[o']t|not recogni[sz]ed|try again|not valid|no (?:order|record)s?)\\b",
              botCheck: 'iframe[src*="_Incapsula_Resource"], iframe[src*="captcha" i], iframe[title*="challenge" i]',
              botCheckText: "incapsula|incident id|additional security check|verify (?:that )?you are (?:a )?human|are you a robot|press (?:&|and) hold"
            },
            patterns: {
              code: "\\bCode:\\s*([A-Za-z0-9-]{4,64})",
              codeValue: "^[A-Za-z0-9][A-Za-z0-9 -]{2,62}[A-Za-z0-9]$",
              pin: "\\bPIN:\\s*([A-Za-z0-9]{2,32})",
              pinValue: "^[A-Za-z0-9]{2,32}$",
              sequence: "\\b(\\d{1,3})\\s+of\\s+(\\d{1,3})\\b",
              amount: "\\$\\s?(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})?|\\d+(?:\\.\\d{2})?)"
            },
            steps: [
              {
                id: "open",
                do: "open",
                url: "$link"
              },
              {
                id: "first",
                do: "wait",
                any: [
                  {
                    when: {
                      clickable: "Access eGift"
                    },
                    go: "list"
                  },
                  {
                    when: {
                      label: "Code:"
                    },
                    go: "list"
                  },
                  {
                    when: {
                      exists: '#p2, input[type="email"], input[placeholder*="mail" i], input[name*="email" i], input[id*="email" i]'
                    },
                    go: "email"
                  }
                ],
                timeout: "page-timeout",
                alert: "email-rejected"
              },
              {
                id: "email",
                do: "fill",
                selector: '#p2, input[type="email"], input[placeholder*="mail" i], input[name*="email" i], input[id*="email" i]',
                value: "$email",
                submit: true,
                submitButton: '#submitBtn, button[type="submit"], input[type="submit"]',
                buttons: "button",
                submitText: "submit|continue|next|view|access",
                delayMs: 3e3
              },
              {
                id: "list",
                do: "wait",
                any: [
                  {
                    when: {
                      clickable: "Access eGift"
                    },
                    go: "titles"
                  },
                  {
                    when: {
                      label: "Code:"
                    },
                    go: "cards",
                    opened: "same-tab"
                  }
                ],
                timeout: "page-timeout",
                timeoutAlt: {
                  when: {
                    exists: '#p2, input[type="email"], input[placeholder*="mail" i], input[name*="email" i], input[id*="email" i]'
                  },
                  code: "email-no-response"
                },
                alert: "email-rejected"
              },
              {
                id: "titles",
                do: "read",
                into: "titles",
                all: "section.order-item .order-item-title"
              },
              {
                id: "access",
                do: "click",
                clickable: "Access eGift",
                follow: "new-tab-or-same",
                landed: {
                  label: "Code:"
                },
                retryKeepInTab: true,
                delayMs: 3e3,
                else: "no-open-button"
              },
              {
                id: "cards",
                do: "repeat",
                max: 50,
                onMax: "ended-early",
                steps: [
                  {
                    id: "cardWait",
                    do: "wait",
                    until: {
                      label: "Code:",
                      changed: true
                    },
                    timeout: "ended-early",
                    timeoutFirst: "page-timeout"
                  },
                  {
                    id: "cardRead",
                    do: "read",
                    into: "card",
                    fields: {
                      code: {
                        label: "Code:"
                      },
                      pin: {
                        label: "PIN:"
                      },
                      counter: {
                        selector: "#wdt-page-counter"
                      },
                      text: {
                        selector: "body"
                      }
                    },
                    secret: [
                      "code",
                      "pin",
                      "text"
                    ],
                    parse: "card"
                  },
                  {
                    id: "cardShot",
                    do: "shoot",
                    selector: "#print-content-section, #body-canvas",
                    into: "image"
                  },
                  {
                    id: "cardPost",
                    do: "post",
                    to: "egift",
                    body: {
                      card: "$card",
                      title: "$title",
                      image: "$image"
                    },
                    else: "save-failed"
                  },
                  {
                    id: "cardEnd",
                    do: "stopIf",
                    when: {
                      counterAtEnd: true
                    }
                  },
                  {
                    id: "cardNext",
                    do: "click",
                    selector: 'input[id$="wdt-nav-next"], button[id$="wdt-nav-next"]',
                    orText: "^next\\b",
                    delayMs: 3e3,
                    else: "ended-early"
                  }
                ]
              }
            ]
          }
        }
      };
    }
  });

  // src/lib/egiftCommand.ts
  var import_browser_polyfill_min6, EGIFT_HOSTS;
  var init_egiftCommand = __esm({
    "src/lib/egiftCommand.ts"() {
      "use strict";
      import_browser_polyfill_min6 = __toESM(require_browser_polyfill_min(), 1);
      EGIFT_HOSTS = ["www.memberedelivery.com"];
    }
  });

  // src/lib/stepPlan.ts
  function effectiveLimits(plan) {
    const l = plan.limits ?? {};
    return {
      steps: Math.min(l.steps ?? PLAN_CAPS.steps, PLAN_CAPS.steps),
      repeat: Math.min(l.repeat ?? PLAN_CAPS.repeat, PLAN_CAPS.repeat),
      runMs: Math.min(l.runMs ?? PLAN_CAPS.runMs, PLAN_CAPS.runMs),
      tabs: Math.min(l.tabs ?? PLAN_CAPS.tabs, PLAN_CAPS.tabs)
    };
  }
  function isObj(v) {
    if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
    const p = Object.getPrototypeOf(v);
    return p === Object.prototype || p === null;
  }
  function onlyKeys(o, allowed, where) {
    for (const k of Object.keys(o)) if (!allowed.includes(k)) bad(`${where}: unknown key "${k}"`);
  }
  function str(v, where, max = MAX_STR) {
    if (typeof v !== "string" || !v || v.length > max) return bad(`${where} must be a non-empty string up to ${max} characters`);
    return v;
  }
  function rx(v, where) {
    const s = str(v, where, MAX_RX);
    try {
      new RegExp(s, "i");
    } catch {
      bad(`${where} is not a valid regex`);
    }
    return s;
  }
  function int(v, where, min, max) {
    if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) return bad(`${where} must be an integer ${min}..${max}`);
    return v;
  }
  function code(v, where) {
    if (typeof v !== "string" || !PLAN_FAILURE_CODES.includes(v)) bad(`${where} is not a known failure code`);
  }
  function cond(v, where, opts = {}) {
    if (!isObj(v)) return bad(`${where} must be an object`);
    onlyKeys(v, ["exists", "clickable", "label", "text", "alert", "changed", "counterAtEnd"], where);
    const kinds = ["exists", "clickable", "label", "text", "alert", "counterAtEnd"].filter((k) => k in v);
    if (kinds.length !== 1) bad(`${where} needs exactly one of exists, clickable, label, text, alert, counterAtEnd`);
    if ("exists" in v) str(v.exists, `${where}.exists`);
    if ("clickable" in v) str(v.clickable, `${where}.clickable`);
    if ("label" in v) str(v.label, `${where}.label`);
    if ("text" in v) rx(v.text, `${where}.text`);
    if ("alert" in v && v.alert !== true) bad(`${where}.alert must be true`);
    if ("counterAtEnd" in v) {
      if (v.counterAtEnd !== true) bad(`${where}.counterAtEnd must be true`);
      if (!opts.counter) bad(`${where}: counterAtEnd is only for stopIf`);
    }
    if ("changed" in v && (v.changed !== true || !("label" in v))) bad(`${where}.changed needs a label condition`);
  }
  function inputValue(v, where, inputs) {
    const s = str(v, where);
    if (s.includes("$")) {
      const name = /^\$([A-Za-z]+)$/.exec(s)?.[1];
      if (!name || !VALUE_INPUTS.includes(name)) bad(`${where} may only be $link or $email, never a page read`);
      if (!inputs.includes(name)) bad(`${where} uses input "${name}" the plan does not declare`);
    }
    return s;
  }
  function step(raw, ctx, nested, inLoop) {
    if (!isObj(raw)) return bad("a step must be an object");
    if (++ctx.count > PLAN_CAPS.steps) bad(`more than ${PLAN_CAPS.steps} steps`);
    const id = str(raw.id, "step id", 48);
    if (!ID_RE.test(id)) bad(`bad step id "${id}"`);
    if (ctx.ids.has(id)) bad(`duplicate step id "${id}"`);
    ctx.ids.add(id);
    const w = `step "${id}"`;
    const d = raw.do;
    switch (d) {
      case "open": {
        onlyKeys(raw, ["id", "do", "url"], w);
        const url = inputValue(raw.url, `${w}.url`, ctx.inputs);
        if (!url.startsWith("$")) {
          let u = null;
          try {
            u = new URL(url);
          } catch {
          }
          if (!u || u.protocol !== "https:" || !ctx.hosts.includes(u.hostname.toLowerCase())) bad(`${w}.url must be $link or an https URL on a plan host`);
        }
        return;
      }
      case "wait": {
        onlyKeys(raw, ["id", "do", "any", "until", "timeout", "timeoutFirst", "timeoutAlt", "alert", "timeoutMs"], w);
        if ("any" in raw === "until" in raw) bad(`${w} needs exactly one of any, until`);
        if ("any" in raw) {
          if (nested) bad(`${w}: any/go only at the top level`);
          if (!Array.isArray(raw.any) || !raw.any.length || raw.any.length > 12) bad(`${w}.any must be 1..12 entries`);
          for (const [i, a] of raw.any.entries()) {
            if (!isObj(a)) return bad(`${w}.any[${i}] must be an object`);
            onlyKeys(a, ["when", "go", "opened"], `${w}.any[${i}]`);
            cond(a.when, `${w}.any[${i}].when`);
            str(a.go, `${w}.any[${i}].go`, 48);
            if ("opened" in a && !OPENED.includes(a.opened)) bad(`${w}.any[${i}].opened is not known`);
          }
        } else cond(raw.until, `${w}.until`);
        code(raw.timeout, `${w}.timeout`);
        if ("timeoutFirst" in raw) code(raw.timeoutFirst, `${w}.timeoutFirst`);
        if ("alert" in raw) code(raw.alert, `${w}.alert`);
        if ("timeoutAlt" in raw) {
          const a = raw.timeoutAlt;
          if (!isObj(a)) return bad(`${w}.timeoutAlt must be an object`);
          onlyKeys(a, ["when", "code"], `${w}.timeoutAlt`);
          cond(a.when, `${w}.timeoutAlt.when`);
          code(a.code, `${w}.timeoutAlt.code`);
        }
        if ("timeoutMs" in raw) int(raw.timeoutMs, `${w}.timeoutMs`, 1, MAX_MS2);
        return;
      }
      case "click": {
        onlyKeys(raw, ["id", "do", "selector", "clickable", "orText", "follow", "landed", "retryKeepInTab", "delayMs", "else"], w);
        if (!("selector" in raw || "clickable" in raw || "orText" in raw)) bad(`${w} needs selector, clickable or orText`);
        if ("selector" in raw) str(raw.selector, `${w}.selector`);
        if ("clickable" in raw) str(raw.clickable, `${w}.clickable`);
        if ("orText" in raw) rx(raw.orText, `${w}.orText`);
        if ("follow" in raw) {
          if (raw.follow !== "new-tab-or-same") bad(`${w}.follow must be "new-tab-or-same"`);
          if (nested) bad(`${w}: follow only at the top level`);
          if (!("landed" in raw)) bad(`${w}.follow needs a landed condition`);
          cond(raw.landed, `${w}.landed`);
          const l = raw.landed;
          if ("changed" in l) bad(`${w}.landed cannot use changed`);
        } else if ("landed" in raw || "retryKeepInTab" in raw) bad(`${w}: landed and retryKeepInTab need follow`);
        if ("retryKeepInTab" in raw && typeof raw.retryKeepInTab !== "boolean") bad(`${w}.retryKeepInTab must be a boolean`);
        if ("delayMs" in raw) int(raw.delayMs, `${w}.delayMs`, 0, MAX_MS2);
        if ("else" in raw) code(raw.else, `${w}.else`);
        return;
      }
      case "fill": {
        onlyKeys(raw, ["id", "do", "selector", "value", "submit", "submitButton", "buttons", "submitText", "delayMs", "else"], w);
        str(raw.selector, `${w}.selector`);
        if (!str(raw.value, `${w}.value`).startsWith("$")) bad(`${w}.value must be $link or $email`);
        inputValue(raw.value, `${w}.value`, ctx.inputs);
        if ("submit" in raw && typeof raw.submit !== "boolean") bad(`${w}.submit must be a boolean`);
        if ("submitButton" in raw) str(raw.submitButton, `${w}.submitButton`);
        if ("buttons" in raw) str(raw.buttons, `${w}.buttons`);
        if ("submitText" in raw) rx(raw.submitText, `${w}.submitText`);
        if ("delayMs" in raw) int(raw.delayMs, `${w}.delayMs`, 0, MAX_MS2);
        if ("else" in raw) code(raw.else, `${w}.else`);
        return;
      }
      case "read": {
        onlyKeys(raw, ["id", "do", "into", "all", "fields", "secret", "parse"], w);
        const into = str(raw.into, `${w}.into`, 48);
        if (!ID_RE.test(into)) bad(`${w}.into is not a valid name`);
        if ("all" in raw === "fields" in raw) bad(`${w} needs exactly one of all, fields`);
        if ("all" in raw) str(raw.all, `${w}.all`);
        const names = [];
        if ("fields" in raw) {
          if (!isObj(raw.fields) || !Object.keys(raw.fields).length || Object.keys(raw.fields).length > 12) bad(`${w}.fields must hold 1..12 entries`);
          for (const [k, f] of Object.entries(raw.fields)) {
            if (!ID_RE.test(k)) bad(`${w}.fields: bad name "${k}"`);
            if (!isObj(f)) return bad(`${w}.fields.${k} must be an object`);
            onlyKeys(f, ["label", "selector", "regex"], `${w}.fields.${k}`);
            if (Object.keys(f).length !== 1) bad(`${w}.fields.${k} needs exactly one of label, selector, regex`);
            if ("label" in f) str(f.label, `${w}.fields.${k}.label`);
            if ("selector" in f) str(f.selector, `${w}.fields.${k}.selector`);
            if ("regex" in f) rx(f.regex, `${w}.fields.${k}.regex`);
            names.push(k);
          }
        }
        if ("secret" in raw) {
          if (!Array.isArray(raw.secret) || raw.secret.some((s) => typeof s !== "string" || !names.includes(s))) bad(`${w}.secret must list field names`);
        }
        if ("parse" in raw) {
          if (raw.parse !== "card") bad(`${w}.parse must be "card"`);
          if (!inLoop) bad(`${w}: parse only inside repeat`);
        }
        ctx.vars.add(into);
        return;
      }
      case "shoot": {
        onlyKeys(raw, ["id", "do", "selector", "into"], w);
        str(raw.selector, `${w}.selector`);
        const into = str(raw.into, `${w}.into`, 48);
        if (!ID_RE.test(into)) bad(`${w}.into is not a valid name`);
        ctx.vars.add(into);
        return;
      }
      case "post": {
        onlyKeys(raw, ["id", "do", "to", "body", "else"], w);
        const to = str(raw.to, `${w}.to`, 48);
        if (!Object.prototype.hasOwnProperty.call(PLAN_ENDPOINTS, to)) bad(`${w}.to "${to}" is not a known endpoint`);
        if (!isObj(raw.body) || Object.keys(raw.body).length > 12) bad(`${w}.body must be an object`);
        for (const [k, v] of Object.entries(raw.body)) {
          if (!ID_RE.test(k)) bad(`${w}.body: bad key "${k}"`);
          const s = str(v, `${w}.body.${k}`, 80);
          if (!/^\$[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)?$/.test(s)) bad(`${w}.body.${k} must be a $variable`);
        }
        if ("else" in raw) code(raw.else, `${w}.else`);
        return;
      }
      case "repeat": {
        onlyKeys(raw, ["id", "do", "max", "steps", "onMax"], w);
        if (nested) bad(`${w}: repeat cannot nest`);
        int(raw.max, `${w}.max`, 1, PLAN_CAPS.repeat);
        if (!Array.isArray(raw.steps) || !raw.steps.length) bad(`${w}.steps must be a non-empty list`);
        if ("onMax" in raw) code(raw.onMax, `${w}.onMax`);
        for (const s of raw.steps) step(s, ctx, true, true);
        return;
      }
      case "stopIf": {
        onlyKeys(raw, ["id", "do", "when"], w);
        if (!inLoop) bad(`${w}: stopIf only inside repeat`);
        cond(raw.when, `${w}.when`, { counter: true });
        return;
      }
      case "go": {
        onlyKeys(raw, ["id", "do", "to"], w);
        if (nested) bad(`${w}: go only at the top level`);
        str(raw.to, `${w}.to`, 48);
        return;
      }
      case "fail": {
        onlyKeys(raw, ["id", "do", "code"], w);
        code(raw.code, `${w}.code`);
        return;
      }
      default:
        return bad(`${w}: unknown step "${String(d).slice(0, 40)}"`);
    }
  }
  function gotoTargets(steps, top) {
    for (const s of steps) {
      if (s.do === "go" && !top.has(s.to)) bad(`step "${String(s.id)}": go target "${String(s.to)}" is not a top-level step`);
      if (s.do === "wait" && Array.isArray(s.any)) {
        for (const a of s.any) if (!top.has(a.go)) bad(`step "${String(s.id)}": go target "${a.go}" is not a top-level step`);
      }
    }
  }
  function checkPlan(raw) {
    if (!isObj(raw)) return bad("plan must be an object");
    onlyKeys(raw, ["hosts", "inputs", "limits", "timing", "page", "patterns", "steps"], "plan");
    if (!Array.isArray(raw.hosts) || !raw.hosts.length || raw.hosts.length > 8) bad("hosts must be 1..8 hostnames");
    const hosts = raw.hosts.map((h) => str(h, "host", 253).toLowerCase());
    for (const h of hosts) if (!PLAN_HOST_ALLOWLIST.includes(h)) bad(`host "${h}" is outside the bundled allowlist`);
    if (!Array.isArray(raw.inputs) || raw.inputs.some((i) => !PLAN_INPUTS.includes(i))) bad("inputs must be from link, email, orderId");
    const inputs = raw.inputs;
    if ("limits" in raw) {
      const l = raw.limits;
      if (!isObj(l)) return bad("limits must be an object");
      onlyKeys(l, ["steps", "repeat", "runMs", "tabs"], "limits");
      for (const k of ["steps", "repeat", "runMs", "tabs"]) {
        if (k in l) int(l[k], `limits.${k}`, 1, PLAN_CAPS[k]);
      }
    }
    if ("timing" in raw) {
      const t = raw.timing;
      if (!isObj(t)) return bad("timing must be an object");
      onlyKeys(t, ["pollMs", "waitMs", "newTabWaitMs"], "timing");
      if ("pollMs" in t) int(t.pollMs, "timing.pollMs", 100, MAX_MS2);
      for (const k of ["waitMs", "newTabWaitMs"]) if (k in t) int(t[k], `timing.${k}`, 1, MAX_MS2);
    }
    const p = raw.page;
    if (!isObj(p)) return bad("page must be an object");
    onlyKeys(p, ["clickables", "labelCells", "alert", "alertText", "botCheck", "botCheckText"], "page");
    for (const k of ["clickables", "labelCells", "alert", "botCheck"]) if (k in p) str(p[k], `page.${k}`);
    for (const k of ["clickables", "labelCells", "alert", "alertText", "botCheck", "botCheckText"]) if (!(k in p)) bad(`page.${k} is required`);
    rx(p.alertText, "page.alertText");
    rx(p.botCheckText, "page.botCheckText");
    if ("patterns" in raw) {
      if (!isObj(raw.patterns)) return bad("patterns must be an object");
      for (const [k, v] of Object.entries(raw.patterns)) {
        if (!ID_RE.test(k)) bad(`patterns: bad name "${k}"`);
        rx(v, `patterns.${k}`);
      }
    }
    if (!Array.isArray(raw.steps) || !raw.steps.length) return bad("steps must be a non-empty list");
    const ctx = { ids: /* @__PURE__ */ new Set(), top: /* @__PURE__ */ new Set(), plan: raw, inputs, hosts, count: 0, vars: /* @__PURE__ */ new Set() };
    for (const s of raw.steps) if (isObj(s) && typeof s.id === "string") ctx.top.add(s.id);
    for (const s of raw.steps) step(s, ctx, false, false);
    gotoTargets(raw.steps, ctx.top);
    const lim = effectiveLimits({ limits: raw.limits });
    if (ctx.count > lim.steps) bad(`plan has ${ctx.count} steps, over its limit of ${lim.steps}`);
  }
  function validatePlan(raw) {
    try {
      checkPlan(raw);
      return { ok: true };
    } catch (e) {
      if (e instanceof Bad) return { ok: false, reason: e.message };
      return { ok: false, reason: "plan could not be checked" };
    }
  }
  function validatePlanFile(raw) {
    if (!isObj(raw)) return { ok: false, reason: "plan file must be an object" };
    for (const k of Object.keys(raw)) if (k !== "version" && k !== "plans") return { ok: false, reason: `unknown top-level key "${k}"` };
    if (typeof raw.version !== "number" || !Number.isInteger(raw.version) || raw.version < 1) return { ok: false, reason: "version must be a positive integer" };
    if (!isObj(raw.plans)) return { ok: false, reason: "plans must be an object" };
    for (const [name, plan] of Object.entries(raw.plans)) {
      if (!ID_RE.test(name)) return { ok: false, reason: `bad plan name "${name}"` };
      const c = validatePlan(plan);
      if (!c.ok) return { ok: false, reason: `plan "${name}": ${c.reason}` };
    }
    return { ok: true, file: raw };
  }
  var import_browser_polyfill_min7, PLAN_CAPS, PLAN_HOST_ALLOWLIST, PLAN_ENDPOINTS, PLAN_INPUTS, VALUE_INPUTS, PLAN_FAILURE_CODES, ID_RE, MAX_STR, MAX_RX, MAX_MS2, OPENED, Bad, bad, bundledCheck2, BUNDLED_PLANS, BUNDLED_PLANS_ERROR;
  var init_stepPlan = __esm({
    "src/lib/stepPlan.ts"() {
      "use strict";
      import_browser_polyfill_min7 = __toESM(require_browser_polyfill_min(), 1);
      init_plans_default();
      init_egiftCommand();
      PLAN_CAPS = { steps: 600, repeat: 100, runMs: 12e5, tabs: 4 };
      PLAN_HOST_ALLOWLIST = EGIFT_HOSTS;
      PLAN_ENDPOINTS = { egift: "/api/extension/egift" };
      PLAN_INPUTS = ["link", "email", "orderId"];
      VALUE_INPUTS = ["link", "email"];
      PLAN_FAILURE_CODES = [
        "page-timeout",
        "bot-check",
        "email-rejected",
        "email-no-response",
        "no-open-button",
        "out-of-sequence",
        "total-mismatch",
        "ended-early",
        "save-failed",
        "link-rejected",
        "click-denied",
        "plan-failed"
      ];
      ID_RE = /^[A-Za-z][A-Za-z0-9_-]{0,47}$/;
      MAX_STR = 2e3;
      MAX_RX = 500;
      MAX_MS2 = 3e5;
      OPENED = ["new-tab", "same-tab", "kept-in-tab"];
      Bad = class extends Error {
      };
      bad = (m) => {
        throw new Bad(m);
      };
      bundledCheck2 = validatePlanFile(plans_default_default);
      BUNDLED_PLANS = bundledCheck2.ok ? bundledCheck2.file : null;
      BUNDLED_PLANS_ERROR = bundledCheck2.ok ? null : bundledCheck2.reason;
    }
  });

  // src/lib/planKey.ts
  var import_browser_polyfill_min8;
  var init_planKey = __esm({
    "src/lib/planKey.ts"() {
      "use strict";
      import_browser_polyfill_min8 = __toESM(require_browser_polyfill_min(), 1);
    }
  });

  // src/lib/planRemote.ts
  function describePlanStatus(s) {
    const x = s ?? { source: "bundled", version: BUNDLED_PLANS?.version ?? 0, code: "no-tracker" };
    return `Plans v${x.version} (${x.source}, ${x.code})`;
  }
  var import_browser_polyfill_min9, PLAN_STATUS_KEY;
  var init_planRemote = __esm({
    "src/lib/planRemote.ts"() {
      "use strict";
      import_browser_polyfill_min9 = __toESM(require_browser_polyfill_min(), 1);
      init_stepPlan();
      init_planKey();
      PLAN_STATUS_KEY = "remotePlansStatus";
    }
  });

  // src/lib/pairing.ts
  function trackerBase(trackerUrl) {
    return trackerUrl.trim().replace(/\/+$/, "");
  }
  function approvalUrl(trackerUrl, code2) {
    return `${trackerBase(trackerUrl)}/extension/pair?code=${encodeURIComponent(code2)}`;
  }
  async function beginPairing(trackerUrl, browser, fetchImpl, now) {
    const base = trackerBase(trackerUrl);
    const res = await fetchImpl(`${base}/api/extension/pair`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ browser })
    });
    if (res.status === 429) throw new Error("Too many pairings waiting on the tracker; try again in a few minutes.");
    if (!res.ok) throw new Error(`The tracker refused to start pairing (HTTP ${res.status}). Update the tracker?`);
    const body = await res.json().catch(() => null);
    if (typeof body?.code !== "string" || typeof body?.claim !== "string" || !body.code || !body.claim) {
      throw new Error("The tracker sent an unexpected pairing reply.");
    }
    return { trackerUrl: base, code: body.code, claim: body.claim, expiresAt: now + PAIRING_TTL_MS };
  }
  async function stepPairing(store, save, fetchImpl, now) {
    const p = await store.get();
    if (!p) return { state: "none" };
    if (now >= p.expiresAt) {
      await store.clear(p.code);
      return { state: "expired" };
    }
    let res;
    try {
      res = await fetchImpl(`${p.trackerUrl}/api/extension/pair/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: p.code, claim: p.claim })
      });
    } catch {
      return { state: "error", message: "Could not reach the tracker." };
    }
    if (res.status === 404) {
      await store.clear(p.code);
      return { state: "unknown" };
    }
    if (!res.ok) return { state: "error", message: `Pairing check failed (HTTP ${res.status}).` };
    const body = await res.json().catch(() => null);
    if (body?.status === "pending") return { state: "pending", expiresAt: p.expiresAt };
    if (body?.status !== "approved" || typeof body.secret !== "string" || body.userId == null) {
      return { state: "error", message: "The tracker sent an unexpected pairing reply." };
    }
    const userName = typeof body.userName === "string" ? body.userName : "";
    await save({ secret: body.secret, userId: String(body.userId), userName });
    await store.clear(p.code);
    return { state: "paired", userName };
  }
  async function checkSecret(trackerUrl, userId, secret, fetchImpl) {
    try {
      const res = await fetchImpl(`${trackerBase(trackerUrl)}/api/extension/scrape-config`, {
        // The user-id header sends the request down the tracker's extension path; any value does.
        headers: { "X-Extension-User-Id": userId || "0", "X-Extension-Secret": secret }
      });
      if (res.status === 401) return "rejected";
      return res.ok || res.status === 304 ? "ok" : "unreachable";
    } catch {
      return "unreachable";
    }
  }
  function localPairingStore() {
    return {
      async get() {
        const got = await chrome.storage.local.get(PAIRING_KEY).catch(() => ({}));
        const p = got[PAIRING_KEY];
        return p && typeof p.code === "string" && typeof p.claim === "string" ? p : null;
      },
      async set(p) {
        await chrome.storage.local.set({ [PAIRING_KEY]: p });
      },
      async clear(code2) {
        const got = await chrome.storage.local.get(PAIRING_KEY).catch(() => ({}));
        if (got[PAIRING_KEY]?.code === code2) await chrome.storage.local.remove(PAIRING_KEY);
      }
    };
  }
  var import_browser_polyfill_min10, PAIRING_KEY, PAIRING_TTL_MS, PAIRING_POLL_MS;
  var init_pairing = __esm({
    "src/lib/pairing.ts"() {
      "use strict";
      import_browser_polyfill_min10 = __toESM(require_browser_polyfill_min(), 1);
      PAIRING_KEY = "pendingPairing";
      PAIRING_TTL_MS = 9.5 * 6e4;
      PAIRING_POLL_MS = 2e3;
    }
  });

  // src/lib/scrubLink.ts
  var import_browser_polyfill_min11;
  var init_scrubLink = __esm({
    "src/lib/scrubLink.ts"() {
      "use strict";
      import_browser_polyfill_min11 = __toESM(require_browser_polyfill_min(), 1);
    }
  });

  // src/lib/groupLinks.ts
  function isGroupEnabled(s, key) {
    return s?.[key] === true;
  }
  function originsForGroup(site) {
    return [`https://*.${site.domain}/*`, `https://${site.domain}/*`];
  }
  var import_browser_polyfill_min12, GROUP_SITES, GROUP_LINKS_KEY;
  var init_groupLinks = __esm({
    "src/lib/groupLinks.ts"() {
      "use strict";
      import_browser_polyfill_min12 = __toESM(require_browser_polyfill_min(), 1);
      init_scrubLink();
      GROUP_SITES = [
        { key: "bfmr", label: "BFMR", domain: "bfmr.com" },
        { key: "bg", label: "BuyingGroup", domain: "buyinggroup.com" },
        { key: "bigsky", label: "Big Sky Buyers", domain: "bigskybuyers.com" },
        { key: "cok", label: "Cash Out Kings", domain: "thecashoutkings.com", note: "Only redirects your clicks; reads and sends nothing from the page." }
      ];
      GROUP_LINKS_KEY = "groupLinkSites";
    }
  });

  // src/lib/groupLinkScripts.ts
  async function syncGroupLinkScripts() {
    const got = await chrome.storage.sync.get(GROUP_LINKS_KEY).catch(() => ({}));
    const settings = got[GROUP_LINKS_KEY];
    for (const site of GROUP_SITES) {
      try {
        await chrome.scripting.unregisterContentScripts({ ids: [idFor(site)] });
      } catch {
      }
      if (!isGroupEnabled(settings, site.key)) continue;
      const origins = originsForGroup(site);
      if (!await chrome.permissions.contains({ origins }).catch(() => false)) continue;
      await chrome.scripting.registerContentScripts([{
        id: idFor(site),
        matches: origins,
        js: ["content/group-links.js"],
        runAt: "document_start"
      }]).catch(() => {
      });
    }
  }
  var import_browser_polyfill_min13, idFor;
  var init_groupLinkScripts = __esm({
    "src/lib/groupLinkScripts.ts"() {
      "use strict";
      import_browser_polyfill_min13 = __toESM(require_browser_polyfill_min(), 1);
      init_groupLinks();
      idFor = (s) => `group-links-${s.key}`;
    }
  });

  // src/lib/browserTarget.ts
  function extensionBrowser(extensionBaseUrl) {
    return extensionBaseUrl.startsWith("moz-extension://") ? "firefox" : "chrome";
  }
  var import_browser_polyfill_min14;
  var init_browserTarget = __esm({
    "src/lib/browserTarget.ts"() {
      "use strict";
      import_browser_polyfill_min14 = __toESM(require_browser_polyfill_min(), 1);
    }
  });

  // src/options/options.ts
  var require_options = __commonJS({
    "src/options/options.ts"() {
      var import_browser_polyfill_min15 = __toESM(require_browser_polyfill_min());
      init_storage();
      init_api();
      init_tracker_script();
      init_scrapeConfig();
      init_planRemote();
      init_pairing();
      init_groupLinks();
      init_groupLinkScripts();
      init_browserTarget();
      async function showScrapeConfig() {
        const el = document.getElementById("scrapeConfigLabel");
        if (!el) return;
        const got = await chrome.storage.local.get([SCRAPE_STATUS_KEY, PLAN_STATUS_KEY]).catch(() => ({}));
        el.textContent = describeScrapeStatus(got[SCRAPE_STATUS_KEY]) + " \xB7 " + describePlanStatus(got[PLAN_STATUS_KEY]);
      }
      showScrapeConfig();
      var users = [];
      var http = (url, init2) => fetch(url, init2);
      function setPairStatus(text, kind = "") {
        const el = document.getElementById("pairStatus");
        el.textContent = text;
        el.className = `status${kind ? " " + kind : ""}`;
      }
      async function showUsers(trackerUrl) {
        await loadUsers(trackerUrl);
        const { userId } = await getSettings();
        if (userId) document.getElementById("userSelect").value = userId;
      }
      var pairTimer;
      function watchPairing(trackerUrl) {
        clearInterval(pairTimer);
        let busy = false;
        const stop = () => {
          clearInterval(pairTimer);
          pairTimer = void 0;
        };
        pairTimer = setInterval(async () => {
          if (busy) return;
          busy = true;
          try {
            const r = await stepPairing(localPairingStore(), savePaired, http, Date.now());
            if (r.state === "pending") return;
            if (r.state === "error") {
              setPairStatus(`${r.message} Still trying\u2026`, "fail");
              return;
            }
            stop();
            if (r.state === "paired") {
              setPairStatus(`Paired as ${r.userName || "your tracker user"}.`, "ok");
              await showUsers(trackerUrl);
            } else if (r.state === "expired") {
              setPairStatus("Pairing timed out. Click Connect to try again.", "fail");
            } else {
              await showPairState(trackerUrl, "Pairing ended without approval. Click Connect to try again.");
            }
          } finally {
            busy = false;
          }
        }, PAIRING_POLL_MS);
      }
      async function showPairState(trackerUrl, notPaired = "Not paired. Click Connect to pair this browser.") {
        const s = await getSettings();
        const check = await checkSecret(trackerUrl, s.userId, s.extensionSecret, http);
        if (check === "ok") {
          setPairStatus(s.userName ? `Paired as ${s.userName}.` : "Paired.", "ok");
          await showUsers(trackerUrl);
          return check;
        }
        setPairStatus(check === "rejected" ? notPaired : "Could not reach the tracker.", "fail");
        return check;
      }
      async function startPairing(trackerUrl) {
        setPairStatus("Starting pairing\u2026");
        try {
          const p = await beginPairing(trackerUrl, extensionBrowser(chrome.runtime.getURL("")), http, Date.now());
          await localPairingStore().set(p);
          await chrome.tabs.create({ url: approvalUrl(p.trackerUrl, p.code) });
          setPairStatus("Approve this browser in the tracker tab that just opened (sign in if asked). Waiting\u2026");
          watchPairing(p.trackerUrl);
        } catch (err) {
          setPairStatus(err instanceof Error ? err.message : String(err), "fail");
        }
      }
      async function loadUsers(trackerUrl) {
        const select = document.getElementById("userSelect");
        const userSection = document.getElementById("userSection");
        const userStatus = document.getElementById("userStatus");
        userStatus.textContent = "Fetching users\u2026";
        userStatus.className = "status";
        try {
          users = await fetchUsers(trackerUrl);
          select.innerHTML = '<option value="">\u2014 select user \u2014</option>' + users.map((u) => `<option value="${u.id}">${u.name}</option>`).join("");
          userSection.style.display = "block";
          userStatus.textContent = "";
        } catch (err) {
          userStatus.textContent = `Could not load users: ${err instanceof Error ? err.message : String(err)}`;
          userStatus.className = "status fail";
        }
      }
      async function initGroupLinks() {
        const box = document.getElementById("groupLinks");
        const status = document.getElementById("groupLinksStatus");
        const got = await chrome.storage.sync.get(GROUP_LINKS_KEY).catch(() => ({}));
        const current = got[GROUP_LINKS_KEY] ?? {};
        for (const site of GROUP_SITES) {
          const label = document.createElement("label");
          label.style.cssText = "display:flex;flex-direction:row;gap:8px;align-items:center;margin:4px 0";
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.checked = current[site.key] === true;
          label.append(cb, document.createTextNode(` ${site.label}${site.note ? " \u2014 " + site.note : ""}`));
          cb.addEventListener("change", () => {
            const on = cb.checked;
            const granting = on ? chrome.permissions.request({ origins: originsForGroup(site) }).catch(() => false) : Promise.resolve(true);
            (async () => {
              if (on && !await granting) {
                cb.checked = false;
                status.textContent = `${site.label}: permission not granted.`;
                status.className = "status fail";
                return;
              }
              current[site.key] = on;
              await chrome.storage.sync.set({ [GROUP_LINKS_KEY]: current });
              await syncGroupLinkScripts();
              status.textContent = `${site.label} ${on ? "on" : "off"}. Reload open ${site.label} tabs.`;
              status.className = "status ok";
            })();
          });
          box.append(label);
        }
      }
      async function init() {
        initGroupLinks().catch(() => {
        });
        const settings = await getSettings();
        document.getElementById("trackerUrl").value = settings.trackerUrl;
        document.getElementById("amazonLastSync").value = settings.amazonLastSync;
        document.getElementById("walmartLastSync").value = settings.walmartLastSync;
        document.getElementById("costcoLastSync").value = settings.costcoLastSync;
        const select = document.getElementById("userSelect");
        if (settings.trackerUrl) {
          const waiting = await localPairingStore().get();
          if (waiting && waiting.trackerUrl === trackerBase(settings.trackerUrl)) {
            setPairStatus("Waiting for approval in the tracker tab\u2026");
            watchPairing(waiting.trackerUrl);
            await showUsers(settings.trackerUrl);
          } else {
            await showPairState(settings.trackerUrl);
          }
          await ensureTrackerScriptRegistered(settings.trackerUrl);
        }
        document.getElementById("connect").addEventListener("click", async () => {
          const trackerUrl = trackerBase(document.getElementById("trackerUrl").value);
          if (!trackerUrl) return;
          const granting = grantTrackerAccess(trackerUrl).catch(() => false);
          await saveSettings({ trackerUrl });
          await granting;
          if (await showPairState(trackerUrl) === "rejected") await startPairing(trackerUrl);
        });
        document.getElementById("saveUser").addEventListener("click", async () => {
          const userId = select.value;
          const user = users.find((u) => String(u.id) === userId);
          await saveSettings({ userId, userName: user?.name ?? "" });
          const saved = document.getElementById("userSaved");
          saved.style.display = "inline";
          setTimeout(() => {
            saved.style.display = "none";
          }, 2e3);
        });
        document.getElementById("saveDates").addEventListener("click", async () => {
          const amazonLastSync = document.getElementById("amazonLastSync").value;
          const walmartLastSync = document.getElementById("walmartLastSync").value;
          const costcoLastSync = document.getElementById("costcoLastSync").value;
          await saveSettings({ amazonLastSync, walmartLastSync, costcoLastSync });
          const saved = document.getElementById("datesSaved");
          saved.style.display = "inline";
          setTimeout(() => {
            saved.style.display = "none";
          }, 2e3);
        });
        document.getElementById("backfillBtn").addEventListener("click", async () => {
          const btn = document.getElementById("backfillBtn");
          const status = document.getElementById("backfillStatus");
          const currentSettings = await getSettings();
          if (!currentSettings.trackerUrl || !currentSettings.userId) {
            status.textContent = "Configure tracker URL and user first.";
            status.className = "status fail";
            return;
          }
          btn.disabled = true;
          status.textContent = "Fetching orders\u2026";
          status.className = "status";
          try {
            const res = await fetch(`${currentSettings.trackerUrl}/api/orders/backfill`, {
              headers: { "X-Extension-User-Id": currentSettings.userId, ...currentSettings.apiKey ? { "X-API-Key": currentSettings.apiKey } : {}, ...currentSettings.extensionSecret ? { "X-Extension-Secret": currentSettings.extensionSecret } : {} }
            });
            if (!res.ok) throw new Error(`API error ${res.status}`);
            const orders = await res.json();
            if (orders.length === 0) {
              status.textContent = "Nothing to backfill.";
              status.className = "status ok";
              btn.disabled = false;
              return;
            }
            status.textContent = `Backfilling ${orders.length} orders\u2026`;
            let filled = 0;
            let skipped = 0;
            for (const order of orders) {
              status.textContent = `Backfilling ${filled + skipped + 1}/${orders.length}\u2026`;
              await new Promise((r) => setTimeout(r, 800));
              try {
                if (order.platform !== "Walmart") {
                  skipped++;
                  continue;
                }
                const url = order.sourceUrl ?? `https://www.walmart.com/orders/${order.orderNumber}`;
                const resp = await chrome.runtime.sendMessage({ type: "FETCH_HTML", url });
                if (resp?.error || !resp?.html) {
                  skipped++;
                  continue;
                }
                const doc = new DOMParser().parseFromString(resp.html, "text/html");
                let title = "";
                let address = "";
                if (order.platform === "Walmart") {
                  if (!order.itemDescription || !order.shippingAddress) {
                    const nextDataEl = doc.querySelector("#__NEXT_DATA__");
                    if (nextDataEl?.textContent) {
                      try {
                        const nd = JSON.parse(nextDataEl.textContent);
                        const ndOrder = nd.props?.pageProps?.initialData?.data?.order;
                        if (ndOrder) {
                          const groupsKey = Object.keys(ndOrder).find((k) => k.startsWith("groups_"));
                          const firstGroup = groupsKey ? ndOrder[groupsKey]?.[0] : null;
                          if (!order.itemDescription) {
                            const firstItem = firstGroup?.items?.[0];
                            const name = firstItem?.productInfo?.name;
                            if (name) title = name.slice(0, 120);
                          }
                          if (!order.shippingAddress) {
                            const addrStr = firstGroup?.deliveryAddress?.address?.addressString;
                            if (typeof addrStr === "string" && addrStr.trim()) address = addrStr.slice(0, 200);
                          }
                        }
                      } catch {
                      }
                    }
                    if (!title) {
                      const productEl = doc.querySelector('[data-testid="productName"]');
                      const t = (productEl?.textContent ?? "").trim();
                      if (t.length > 5) title = t.slice(0, 120);
                    }
                  }
                }
                if (!title && !address) {
                  skipped++;
                  continue;
                }
                const patch = {};
                if (title) patch.itemDescription = title;
                if (address) patch.shippingAddress = address;
                await fetch(`${currentSettings.trackerUrl}/api/orders/${order.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json", "X-Extension-User-Id": currentSettings.userId, ...currentSettings.apiKey ? { "X-API-Key": currentSettings.apiKey } : {}, ...currentSettings.extensionSecret ? { "X-Extension-Secret": currentSettings.extensionSecret } : {} },
                  body: JSON.stringify(patch)
                });
                filled++;
              } catch {
                skipped++;
              }
            }
            status.textContent = `Done \u2014 ${filled} updated, ${skipped} skipped.`;
            status.className = "status ok";
          } catch (err) {
            status.textContent = `Failed: ${err instanceof Error ? err.message : String(err)}`;
            status.className = "status fail";
          }
          btn.disabled = false;
        });
      }
      init();
    }
  });
  require_options();
})();
