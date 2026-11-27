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
  async function pushOrders(trackerUrl, apiKey, userId, orders) {
    const res = await chrome.runtime.sendMessage({ type: "PUSH_ORDERS", trackerUrl, apiKey, userId, orders });
    if (res?.error) throw new Error(res.error);
    return res;
  }
  var import_browser_polyfill_min2;
  var init_api = __esm({
    "src/lib/api.ts"() {
      "use strict";
      import_browser_polyfill_min2 = __toESM(require_browser_polyfill_min(), 1);
    }
  });

  // src/lib/scrapeConfig.default.json
  var scrapeConfig_default_default;
  var init_scrapeConfig_default = __esm({
    "src/lib/scrapeConfig.default.json"() {
      scrapeConfig_default_default = {
        version: 2,
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
              alert: 'div.ui-message[role="alert"], [role="alert"]',
              submitButton: '#submitBtn, button[type="submit"], input[type="submit"]',
              buttons: "button",
              nextButton: 'input[id$="wdt-nav-next"], button[id$="wdt-nav-next"]',
              counter: "#wdt-page-counter",
              labelCells: "td, th, div, p, li, span, label",
              botCheck: 'iframe[src*="_Incapsula_Resource"], iframe[src*="captcha" i], iframe[title*="challenge" i]'
            },
            labels: {
              openLabel: "Access eGift",
              nextLabel: "next",
              codeLabel: "Code:",
              pinLabel: "PIN:"
            },
            patterns: {
              nextButton: "^next\\b",
              alertText: "\\b(invalid|not match|incorrect|error)\\b",
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
  function adopt(config, source, etag) {
    active = config;
    activeSource = source;
    activeEtag = etag;
    resolved = /* @__PURE__ */ new Map();
  }
  function chromeStore() {
    return {
      async get() {
        return (await chrome.storage.local.get(SCRAPE_STORAGE_KEY))[SCRAPE_STORAGE_KEY];
      },
      async put(v) {
        await chrome.storage.local.set({ [SCRAPE_STORAGE_KEY]: v });
      },
      async putStatus(s) {
        await chrome.storage.local.set({ [SCRAPE_STATUS_KEY]: s });
      }
    };
  }
  function readStored(raw) {
    if (!isPlainObject(raw)) return null;
    const v = validateScrapeConfig(raw.config);
    if (!v.ok) return null;
    return { config: v.config, etag: typeof raw.etag === "string" ? raw.etag : null, fetchedAt: typeof raw.fetchedAt === "number" ? raw.fetchedAt : 0 };
  }
  function adoptStored(stored) {
    if (stored && stored.config.version >= BUNDLED_SCRAPE_CONFIG.version) {
      adopt(stored.config, "cache", stored.etag);
      return true;
    }
    return false;
  }
  function initScrapeConfig(store) {
    if (!initPromise) {
      const s = store ?? chromeStore();
      initPromise = (async () => {
        try {
          adoptStored(readStored(await s.get()));
        } catch {
        }
        if (!store && typeof chrome !== "undefined" && chrome.storage?.onChanged) {
          chrome.storage.onChanged.addListener((changes, area) => {
            const ch = changes[SCRAPE_STORAGE_KEY];
            if (area !== "local" || !ch) return;
            const next = readStored(ch.newValue);
            if (next && next.config.version >= active.version) adopt(next.config, "cache", next.etag);
          });
        }
      })();
    }
    return initPromise;
  }
  function compile(src, flags) {
    if (src === void 0) return null;
    try {
      return new RegExp(src, flags);
    } catch {
      return null;
    }
  }
  function getScrape(siteKey) {
    const hit = resolved.get(siteKey);
    if (hit) return hit;
    const def = Object.prototype.hasOwnProperty.call(BUNDLED_SCRAPE_CONFIG.sites, siteKey) ? BUNDLED_SCRAPE_CONFIG.sites[siteKey] : void 0;
    const cur = Object.prototype.hasOwnProperty.call(active.sites, siteKey) ? active.sites[siteKey] : void 0;
    const out = {
      selectors: { ...def?.selectors, ...cur?.selectors },
      labels: { ...def?.labels, ...cur?.labels },
      patterns: { ...def?.patterns, ...cur?.patterns },
      urls: { ...def?.urls, ...cur?.urls },
      timeoutsMs: { ...def?.timeoutsMs, ...cur?.timeoutsMs },
      regex(name, flags) {
        return compile(out.patterns[name], flags) ?? compile(def?.patterns[name], flags) ?? new RegExp("(?!)", flags && flags.replace(/[uv]/g, ""));
      }
    };
    resolved.set(siteKey, out);
    return out;
  }
  var import_browser_polyfill_min3, SCRAPE_CATEGORIES, NAME_RE, SITE_RE, MAX_STRING, MAX_MS, bundledCheck, BUNDLED_SCRAPE_CONFIG, active, activeSource, activeEtag, resolved, initPromise, SCRAPE_STORAGE_KEY, SCRAPE_STATUS_KEY;
  var init_scrapeConfig = __esm({
    "src/lib/scrapeConfig.ts"() {
      "use strict";
      import_browser_polyfill_min3 = __toESM(require_browser_polyfill_min(), 1);
      init_scrapeConfig_default();
      SCRAPE_CATEGORIES = ["selectors", "labels", "patterns", "urls", "timeoutsMs"];
      NAME_RE = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
      SITE_RE = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
      MAX_STRING = 2e4;
      MAX_MS = 864e5;
      bundledCheck = validateScrapeConfig(scrapeConfig_default_default);
      BUNDLED_SCRAPE_CONFIG = bundledCheck.ok ? bundledCheck.config : scrapeConfig_default_default;
      active = BUNDLED_SCRAPE_CONFIG;
      activeSource = "bundled";
      activeEtag = null;
      resolved = /* @__PURE__ */ new Map();
      initPromise = null;
      SCRAPE_STORAGE_KEY = "scrapeConfig";
      SCRAPE_STATUS_KEY = "scrapeConfigStatus";
    }
  });

  // src/content/walmart.ts
  var require_walmart = __commonJS({
    "src/content/walmart.ts"() {
      var import_browser_polyfill_min4 = __toESM(require_browser_polyfill_min());
      init_storage();
      init_api();
      init_scrapeConfig();
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
        const S = getScrape("walmart");
        const rx = S.regex;
        const blocks = Array.from(document.querySelectorAll(S.selectors.orderBlocks));
        console.log("[WM] DOM blocks found:", blocks.length, "url:", location.href);
        blocks.slice(0, 3).forEach((b, i) => console.log(`[WM] block[${i}] testid:`, b.getAttribute("data-testid"), "text:", (b.textContent ?? "").replace(/\s+/g, " ").slice(0, 300)));
        const isCancelledOrReturned = (text) => rx("cancelledOrReturned", "i").test(text);
        for (const block of blocks) {
          const blockText = (block.textContent ?? "").replace(/\s+/g, " ");
          let orderNumber = "";
          const captionEl = block.querySelector(S.selectors.orderCaption);
          if (captionEl) {
            const idMatch = captionEl.id.match(rx("captionOrderNumber"));
            if (idMatch) orderNumber = idMatch[1];
          }
          if (!orderNumber) {
            const m = blockText.match(rx("orderNumberLabeled", "i"));
            if (m) orderNumber = m[1];
          }
          if (!orderNumber) {
            const m = blockText.match(rx("orderNumberBare"));
            if (m) orderNumber = m[1];
          }
          if (!orderNumber || seen.has(orderNumber)) continue;
          seen.add(orderNumber);
          const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
          let orderDate;
          const dateMatch = blockText.match(rx("dateLabeledFull", "i")) ?? blockText.match(rx("dateFull", "i")) ?? blockText.match(rx("dateLabeledNoYear", "i"));
          if (dateMatch) {
            let rawDateStr = /\d{4}/.test(dateMatch[1]) ? dateMatch[1] : `${dateMatch[1]} ${currentYear}`;
            orderDate = new Date(rawDateStr);
            const sixtyDaysOut = /* @__PURE__ */ new Date();
            sixtyDaysOut.setDate(sixtyDaysOut.getDate() + 60);
            if (!isNaN(orderDate.getTime()) && orderDate > sixtyDaysOut) {
              rawDateStr = /\d{4}/.test(dateMatch[1]) ? dateMatch[1] : `${dateMatch[1]} ${currentYear - 1}`;
              orderDate = new Date(rawDateStr);
            }
            if (isNaN(orderDate.getTime())) {
              console.log("[WM] skipping order", orderNumber, "- bad date:", dateMatch[1]);
              continue;
            }
          } else {
            console.log("[WM] no date found for order", orderNumber, "\u2014 will fetch detail for real date");
            if (isCancelledOrReturned(blockText)) continue;
            const totalMatch2 = blockText.match(rx("orderTotal", "i"));
            const itemEl2 = block.querySelector(S.selectors.itemFallback);
            orders.push({
              platform: "Walmart",
              orderNumber,
              orderDate: "",
              itemDescription: (itemEl2?.textContent ?? "").trim().slice(0, 120),
              cost: totalMatch2 ? parseMoney(totalMatch2[1]) : 0,
              shippingCost: 0,
              shippingAddress: "",
              trackingNumbers: [],
              sourceUrl: S.urls.orderDetail.replace("{orderNumber}", () => orderNumber)
            });
            continue;
          }
          if (orderDate.toISOString().split("T")[0] < sinceDate.toISOString().split("T")[0]) {
            console.log("[WM] order too old:", orderNumber, orderDate.toISOString().split("T")[0], "< sinceDate", sinceDate.toISOString().split("T")[0]);
            hasOlder = true;
            continue;
          }
          if (isCancelledOrReturned(blockText)) continue;
          if (rx("storePickup", "i").test(blockText)) {
            console.log("[WM] skipping store-pickup order:", orderNumber);
            continue;
          }
          const totalMatch = blockText.match(rx("orderTotal", "i"));
          const cost = totalMatch ? parseMoney(totalMatch[1]) : 0;
          const productNameEl = block.querySelector(S.selectors.productName);
          const fallbackItemEl = block.querySelector(S.selectors.itemFallback);
          let itemDescription = (productNameEl?.textContent ?? fallbackItemEl?.textContent ?? "").trim().slice(0, 120);
          if (rx("genericTitle", "i").test(itemDescription)) {
            console.log("[WM] rejecting generic item description, treating as empty:", itemDescription);
            itemDescription = "";
          }
          const last4Match = blockText.match(rx("cardLast4", "i"));
          const paymentLast4 = last4Match?.[1];
          console.log("[WM] adding order", orderNumber, "date:", orderDate.toISOString().split("T")[0], "paymentLast4:", paymentLast4 ?? "(none)", "blockText snippet:", blockText.slice(0, 240));
          orders.push({
            platform: "Walmart",
            orderNumber,
            orderDate: orderDate.toISOString().split("T")[0],
            itemDescription,
            cost,
            shippingCost: 0,
            shippingAddress: "",
            trackingNumbers: [],
            sourceUrl: S.urls.orderDetail.replace("{orderNumber}", () => orderNumber),
            paymentLast4
          });
        }
        console.log("[WM] scraped orders this page:", orders.length, "hasOlder:", hasOlder);
        return { orders, hasOlder };
      }
      async function fetchOrderDetail(orderNumber, orderUrl) {
        const S = getScrape("walmart");
        const rx = S.regex;
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), S.timeoutsMs.detailFetchMs);
          const res = await fetch(orderUrl, { credentials: "include", signal: ctrl.signal });
          clearTimeout(timer);
          console.log("[WM] detail fetch status:", orderNumber, res.status, res.url);
          const html = await res.text();
          const doc = new DOMParser().parseFromString(html, "text/html");
          let address = "";
          const nextDataEl = doc.querySelector(S.selectors.nextData);
          let ndOrder = null;
          if (nextDataEl?.textContent) {
            try {
              const nd = JSON.parse(nextDataEl.textContent);
              ndOrder = nd?.props?.pageProps?.initialData?.data?.order ?? null;
              if (ndOrder) {
                const groupsKey = Object.keys(ndOrder).find((k) => k.startsWith(S.labels.groupsKeyPrefix));
                const firstGroup = groupsKey ? ndOrder[groupsKey]?.[0] : null;
                const addrStr = firstGroup?.deliveryAddress?.address;
                if (addrStr?.addressString) address = String(addrStr.addressString);
              }
            } catch {
            }
          }
          if (!address) {
            const addrEl = doc.querySelector(S.selectors.detailAddress);
            address = (addrEl?.textContent ?? "").replace(/\s+/g, " ").trim();
          }
          const numbers = /* @__PURE__ */ new Set();
          const trackPatterns = [
            ["trackingNumber-field", rx("trackingField", "g")],
            ["ups-1Z", rx("trackingUps", "g")],
            ["digits-20-22", rx("trackingDigits", "g")]
          ];
          const numberOrigins = /* @__PURE__ */ new Map();
          for (const [name, pat] of trackPatterns) {
            let m;
            while ((m = pat.exec(html)) !== null) {
              numbers.add(m[1]);
              if (!numberOrigins.has(m[1])) numberOrigins.set(m[1], name);
            }
          }
          if (numbers.size > 0 || ndOrder) {
            const status = ndOrder?.status ?? ndOrder?.fulfillment?.status;
            console.log(
              "[WM/diag]",
              orderNumber,
              "status:",
              status ?? "(none)",
              "candidates:",
              Array.from(numbers).map((n) => `${n}[${numberOrigins.get(n)}]`).join(", ") || "(none)"
            );
          }
          const isWalmartInternal = (n) => rx("internalTracking").test(n);
          let hadInternalTracking = false;
          for (const n of [...numbers]) {
            if (isWalmartInternal(n)) {
              console.log("[WM] dropping walmart internal number:", n);
              numbers.delete(n);
              hadInternalTracking = true;
            } else if (n === orderNumber) {
              console.log("[WM] dropping order number from tracking:", n);
              numbers.delete(n);
            }
          }
          let orderDate = null;
          let cost = null;
          let itemDescription = null;
          const scriptMatches = html.matchAll(rx("scriptBlock", "g"));
          const jsonDatePats = () => [rx("jsonOrderDate"), rx("jsonPlacedDate"), rx("jsonOrderPlacedDate"), rx("jsonCreatedDate")];
          for (const sm of scriptMatches) {
            const s = sm[1];
            if (!s.includes("orderDate") && !s.includes("placedDate") && !s.includes("totalAmount") && !s.includes("financeTotal")) continue;
            try {
              const parsed = JSON.parse(s);
              const str = JSON.stringify(parsed);
              if (!orderDate) {
                for (const pat of jsonDatePats()) {
                  const m = str.match(pat);
                  if (m) {
                    orderDate = m[1];
                    break;
                  }
                }
              }
              if (cost == null) {
                const m = str.match(rx("jsonCost"));
                if (m) cost = parseFloat(m[1]);
              }
              if (!itemDescription) {
                const m = str.match(rx("jsonProductName"));
                if (m && !rx("genericTitleJson", "i").test(m[1])) itemDescription = m[1];
              }
            } catch {
            }
          }
          if (ndOrder) {
            if (cost == null) {
              const gt = ndOrder.priceDetails?.grandTotal;
              if (gt?.value != null) cost = Number(gt.value);
            }
            if (!itemDescription) {
              const groupsKey = Object.keys(ndOrder).find((k) => k.startsWith(S.labels.groupsKeyPrefix));
              const firstGroup = groupsKey ? ndOrder[groupsKey]?.[0] : null;
              const firstItem = firstGroup?.items?.[0];
              const name = firstItem?.productInfo?.name;
              if (name) itemDescription = name.slice(0, 120);
            }
            if (!orderDate) {
              const str = JSON.stringify(ndOrder);
              for (const pat of jsonDatePats()) {
                const m = str.match(pat);
                if (m) {
                  orderDate = m[1];
                  break;
                }
              }
            }
          }
          if (cost == null) {
            const m = html.match(rx("htmlTotal", "i"));
            if (m) cost = parseMoney(m[1]);
          }
          if (!orderDate) {
            const m = html.match(rx("htmlPlaced"));
            if (m) orderDate = m[1];
          }
          if (cost == null) {
            const totalEl = doc.querySelector(S.selectors.detailTotal);
            if (totalEl) cost = parseMoney(totalEl.textContent ?? "");
          }
          if (!itemDescription) {
            const itemEl = doc.querySelector(S.selectors.detailItem);
            if (itemEl) itemDescription = (itemEl.textContent ?? "").trim().slice(0, 120) || null;
          }
          if (itemDescription && rx("genericTitle", "i").test(itemDescription.trim())) {
            console.log("[WM] rejecting generic detail item description:", itemDescription);
            itemDescription = null;
          }
          let paymentLast4;
          let last4Source = "none";
          const jsonFieldPats = [
            ["lastFour", rx("jsonLastFour")],
            ["lastFourDigits", rx("jsonLastFourDigits")],
            ["cardLast4", rx("jsonCardLast4")],
            ["last4", rx("jsonLast4")],
            ["cardNumberLast4", rx("jsonCardNumberLast4")],
            ["accountNumberLast4", rx("jsonAccountNumberLast4")]
          ];
          for (const [name, pat] of jsonFieldPats) {
            const m = html.match(pat);
            if (m) {
              paymentLast4 = m[1];
              last4Source = `json:${name}`;
              break;
            }
          }
          if (!paymentLast4) {
            const textPats = [
              ["ending-in", rx("textEndingIn", "i")],
              ["ending", rx("textEnding", "i")],
              ["asterisks", rx("textAsterisks")],
              ["xs", rx("textXs", "i")],
              ["bullets", rx("textBullets")],
              ["html-bullet", rx("textHtmlBullet", "i")]
            ];
            for (const [name, pat] of textPats) {
              const m = html.match(pat);
              if (m) {
                paymentLast4 = m[1];
                last4Source = `text:${name}`;
                break;
              }
            }
          }
          let deliveryPhotoUrl;
          let deliveryPhotoBase64;
          let deliveryPhotoMime;
          const photoImg = doc.querySelector(S.selectors.deliveryPhoto);
          const photoSrc = photoImg?.getAttribute("src") || "";
          if (photoSrc && rx("httpUrl", "i").test(photoSrc)) {
            deliveryPhotoUrl = photoSrc;
            try {
              const r = await chrome.runtime.sendMessage({ type: "FETCH_IMAGE_BYTES", url: photoSrc });
              if (r?.base64) {
                deliveryPhotoBase64 = r.base64;
                deliveryPhotoMime = r.mimeType;
              } else {
                console.warn("[WM] photo bytes fetch failed:", r?.error);
              }
            } catch (e) {
              console.warn("[WM] photo bytes fetch threw:", e);
            }
          }
          console.log("[WM] detail:", orderNumber, "date:", orderDate, "cost:", cost, "item:", itemDescription?.slice(0, 40), "last4:", paymentLast4 ?? "(none)", `[${last4Source}]`, "photo:", deliveryPhotoUrl ? "yes" : "no");
          return { address, tracking: [...numbers], orderDate, cost, itemDescription, hadInternalTracking, paymentLast4, deliveryPhotoUrl, deliveryPhotoBase64, deliveryPhotoMime };
        } catch (e) {
          console.log("[WM] detail fetch failed:", orderNumber, String(e));
          return { address: "", tracking: [], orderDate: null, cost: null, itemDescription: null, hadInternalTracking: false };
        }
      }
      var syncing = false;
      function getFirstBlockFingerprint() {
        const sel = getScrape("walmart").selectors;
        const block = document.querySelector(sel.orderBlocks);
        if (!block) return "";
        const caption = block.querySelector(sel.orderCaption);
        if (caption?.id) return caption.id;
        return (block.textContent ?? "").replace(/\s+/g, " ").slice(0, 80);
      }
      function waitForOrdersToLoad(previousFingerprint = "", timeoutMs = getScrape("walmart").timeoutsMs.pageLoadMs) {
        return new Promise((resolve) => {
          const start = Date.now();
          const T = getScrape("walmart");
          function check() {
            const blocks = document.querySelectorAll(T.selectors.orderBlocks);
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
            setTimeout(check, T.timeoutsMs.loadPollMs);
          }
          check();
        });
      }
      function clickNextPage() {
        const btn = document.querySelector(getScrape("walmart").selectors.nextClick);
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
        await initScrapeConfig();
        const W = getScrape("walmart");
        const settings = await getSettings();
        if (!settings.trackerUrl || !settings.userId) {
          sendMessage({ type: "SYNC_ERROR", platform: "Walmart", error: "Tracker URL or user not configured \u2014 open Settings." });
          setBadge("!", "#ef4444");
          syncing = false;
          return;
        }
        const sinceDate = settings.walmartLastSync ? new Date(new Date(settings.walmartLastSync).getTime() - 48 * 60 * 60 * 1e3) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
        console.log("[WM] sinceDate:", sinceDate.toISOString(), "walmartLastSync:", settings.walmartLastSync);
        setBadge("\u2026");
        sendMessage({ type: "SYNC_STARTED", platform: "Walmart" });
        const isOrdersPage = location.pathname.includes(W.urls.ordersPath) || location.pathname.includes(W.urls.purchasesPath);
        const currentPage = new URL(location.href).searchParams.get("page");
        if (!isOrdersPage || currentPage && parseInt(currentPage) > 1) {
          sessionStorage.setItem("__resell_wm_sync__", "1");
          window.location.href = W.urls.orders;
          syncing = false;
          return;
        }
        try {
          await waitForOrdersToLoad("", W.timeoutsMs.firstLoadMs);
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
          if (allOrders.length > 0) {
            try {
              const lockedRes = await fetch(`${settings.trackerUrl.replace(/\/$/, "")}/api/orders/locked-order-numbers?platform=walmart`, {
                headers: { "X-Extension-User-Id": settings.userId, "X-API-Key": settings.apiKey ?? "" },
                credentials: "include"
              });
              if (lockedRes.ok) {
                const lockedData = await lockedRes.json();
                const lockedSet = new Set(lockedData.orderNumbers ?? []);
                if (lockedSet.size > 0) {
                  const before = allOrders.length;
                  const kept = allOrders.filter((o) => !lockedSet.has(o.orderNumber));
                  allOrders.length = 0;
                  for (const o of kept) allOrders.push(o);
                  console.log(`[WM] skipping ${before - allOrders.length} locked order(s); ${allOrders.length} remain`);
                }
              }
            } catch (e) {
              console.warn("[WM] locked-order-numbers fetch failed:", e);
            }
          }
          if (allOrders.length === 0) {
            setBadge("\u2014");
            await setLastSync("walmart", (/* @__PURE__ */ new Date()).toISOString().split("T")[0]);
            sendMessage({ type: "SYNC_DONE", result: { platform: "Walmart", scraped: 0, imported: 0, updated: 0 } });
            return;
          }
          sendMessage({ type: "SYNC_PROGRESS", platform: "Walmart", scraped: allOrders.length, message: "Fetching order details\u2026" });
          const CONCURRENCY = 3;
          for (let i = 0; i < allOrders.length; i += CONCURRENCY) {
            await Promise.all(allOrders.slice(i, i + CONCURRENCY).map(async (order) => {
              console.log("[WM] fetching detail:", order.orderNumber, order.sourceUrl);
              const detail = await fetchOrderDetail(order.orderNumber, order.sourceUrl);
              console.log("[WM] detail done:", order.orderNumber, "address:", detail.address.slice(0, 40) || "(none)", "tracking:", detail.tracking, "orderDate:", detail.orderDate);
              if (detail.address) order.shippingAddress = detail.address;
              if (detail.tracking.length) {
                order.trackingNumbers = detail.tracking;
              }
              if (detail.cost != null && detail.cost > 0 && order.cost === 0) order.cost = detail.cost;
              if (detail.itemDescription && !order.itemDescription) order.itemDescription = detail.itemDescription;
              if (detail.paymentLast4 && !order.paymentLast4) order.paymentLast4 = detail.paymentLast4;
              if (detail.deliveryPhotoUrl) order.deliveryPhotoUrl = detail.deliveryPhotoUrl;
              if (detail.deliveryPhotoBase64) order.deliveryPhotoBase64 = detail.deliveryPhotoBase64;
              if (detail.deliveryPhotoMime) order.deliveryPhotoMime = detail.deliveryPhotoMime;
              if (detail.orderDate) {
                order.orderDate = detail.orderDate;
              } else if (!order.orderDate) {
                order.orderDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
              }
              console.log("[WM] order date:", order.orderNumber, order.orderDate);
            }));
          }
          const todayStr = sinceDate.toISOString().split("T")[0];
          const filteredOrders = allOrders.filter((o) => o.orderDate >= todayStr);
          console.log("[WM] after date filter:", filteredOrders.length, "/", allOrders.length);
          const result = await pushOrders(settings.trackerUrl, settings.apiKey ?? "", settings.userId, filteredOrders);
          console.log("[WM] push result:", JSON.stringify(result));
          await setLastSync("walmart", (/* @__PURE__ */ new Date()).toISOString().split("T")[0]);
          setBadge(`+${result.imported ?? 0}`, "#22c55e");
          sendMessage({ type: "SYNC_DONE", result: { platform: "Walmart", scraped: filteredOrders.length, imported: result.imported ?? 0, updated: result.updated ?? 0, verified: result.verified ?? 0, eventId: result.eventId ?? null } });
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
        initScrapeConfig().then(() => setTimeout(() => startSync(), getScrape("walmart").timeoutsMs.resumeDelayMs));
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
