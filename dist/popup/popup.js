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

  // src/popup/popup.ts
  var require_popup = __commonJS({
    "src/popup/popup.ts"() {
      var import_browser_polyfill_min2 = __toESM(require_browser_polyfill_min());
      init_storage();
      function setStatus(platform, text, cls) {
        const id = platform === "Amazon" ? "amazonStatus" : platform === "Walmart" ? "walmartStatus" : platform === "Costco" ? "costcoStatus" : "bigskyStatus";
        const el = document.getElementById(id);
        el.textContent = text;
        el.className = `status ${cls}`;
      }
      function setMeta(platform, text) {
        const id = platform === "Amazon" ? "amazonMeta" : platform === "Walmart" ? "walmartMeta" : platform === "Costco" ? "costcoMeta" : "bigskyMeta";
        const el = document.getElementById(id);
        el.textContent = text;
      }
      function setSyncBtn(platform, disabled, cancel = false) {
        const id = platform === "Amazon" ? "syncAmazon" : platform === "Walmart" ? "syncWalmart" : platform === "Costco" ? "syncCostco" : "syncBigsky";
        const btn = document.getElementById(id);
        btn.disabled = disabled && !cancel;
        btn.textContent = cancel ? "Cancel" : "Sync";
        btn.dataset.cancel = cancel ? "1" : "";
      }
      async function cancelSync(platform) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;
        chrome.tabs.sendMessage(tab.id, { type: "CANCEL_SYNC", platform }).catch(() => {
        });
        setSyncBtn(platform, false);
        setStatus(platform, "cancelled", "idle");
      }
      async function triggerSync(platform) {
        setSyncBtn(platform, true, platform === "Amazon");
        setStatus(platform, "syncing\u2026", "syncing");
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.runtime.sendMessage({ type: "TRIGGER_SYNC", platform, activeTabId: tab?.id, activeTabUrl: tab?.url }).catch(() => {
        });
      }
      async function checkVersions(trackerUrl) {
        const manifest = chrome.runtime.getManifest();
        const extVersion = manifest.version;
        document.getElementById("versionLabel").textContent = `Extension v${extVersion}`;
        try {
          const [extTags, appVersion] = await Promise.all([
            fetch("https://api.github.com/repos/frindle/resell-tracker-extension/tags", { headers: { "User-Agent": "resell-tracker-extension" } }).then((r) => r.json()).catch(() => []),
            trackerUrl ? fetch(`${trackerUrl.replace(/\/$/, "")}/api/version`).then((r) => r.json()).catch(() => null) : Promise.resolve(null)
          ]);
          const latestExt = extTags.find((t) => /^v?\d/.test(t.name))?.name.replace(/^v/, "");
          const extOutdated = latestExt && latestExt !== extVersion;
          const appOutdated = appVersion?.outdated;
          if (extOutdated || appOutdated) {
            document.getElementById("versionUpdate").style.display = "inline";
            const parts = [];
            if (extOutdated) parts.push(`ext v${latestExt}`);
            if (appOutdated) parts.push(`app v${appVersion.latest}`);
            document.getElementById("versionUpdate").textContent = `update available: ${parts.join(", ")}`;
          }
        } catch {
        }
      }
      async function init() {
        const settings = await getSettings();
        if (!settings.trackerUrl || !settings.userId) {
          document.getElementById("notConfigured").style.display = "block";
        }
        checkVersions(settings.trackerUrl).catch(() => {
        });
        if (settings.amazonLastSync) setMeta("Amazon", `Last sync: ${settings.amazonLastSync}`);
        if (settings.walmartLastSync) setMeta("Walmart", `Last sync: ${settings.walmartLastSync}`);
        if (settings.costcoLastSync) setMeta("Costco", `Last sync: ${settings.costcoLastSync}`);
        if (settings.bigskyLastSync) setMeta("BigSkyBuyers", `Last sync: ${settings.bigskyLastSync}`);
        const stored = await chrome.storage.local.get(["amazonSyncStatus", "walmartSyncStatus", "costcoSyncStatus", "bigskyStatus"]);
        const s = stored.amazonSyncStatus;
        if (s) {
          if ((s.type === "SYNC_STARTED" || s.type === "SYNC_PROGRESS") && Date.now() - s.ts < 5 * 60 * 1e3) {
            setStatus("Amazon", s.message ?? "syncing\u2026", "syncing");
            setSyncBtn("Amazon", true, true);
          } else if (s.type === "SYNC_DONE" && s.result) {
            const text = s.result.scraped === 0 ? "no new orders" : `+${s.result.imported} new, ${s.result.updated} updated`;
            setStatus("Amazon", text, "ok");
          } else if (s.type === "SYNC_ERROR") {
            setStatus("Amazon", `Error: ${s.error}`, "fail");
          }
        }
        const ws = stored.walmartSyncStatus;
        if (ws) {
          if ((ws.type === "SYNC_STARTED" || ws.type === "SYNC_PROGRESS") && Date.now() - ws.ts < 5 * 60 * 1e3) {
            setStatus("Walmart", ws.message ?? "syncing\u2026", "syncing");
            setSyncBtn("Walmart", true);
          } else if (ws.type === "SYNC_DONE" && ws.result) {
            const text = ws.result.scraped === 0 ? "no new orders" : `+${ws.result.imported} new, ${ws.result.updated} updated`;
            setStatus("Walmart", text, "ok");
          } else if (ws.type === "SYNC_ERROR") {
            setStatus("Walmart", `Error: ${ws.error}`, "fail");
          }
        }
        const cs = stored.costcoSyncStatus;
        if (cs) {
          if ((cs.type === "SYNC_STARTED" || cs.type === "SYNC_PROGRESS") && Date.now() - cs.ts < 5 * 60 * 1e3) {
            setStatus("Costco", cs.message ?? "syncing\u2026", "syncing");
            setSyncBtn("Costco", true);
          } else if (cs.type === "SYNC_DONE" && cs.result) {
            const text = cs.result.scraped === 0 ? "no new orders" : `+${cs.result.imported} new, ${cs.result.updated} updated`;
            setStatus("Costco", text, "ok");
          } else if (cs.type === "SYNC_ERROR") {
            setStatus("Costco", `Error: ${cs.error}`, "fail");
          }
        }
        const bs = stored.bigskyStatus;
        if (bs) {
          if ((bs.type === "SYNC_STARTED" || bs.type === "SYNC_PROGRESS") && Date.now() - bs.ts < 5 * 60 * 1e3) {
            setStatus("BigSkyBuyers", bs.message ?? "syncing\u2026", "syncing");
            setSyncBtn("BigSkyBuyers", true);
          } else if (bs.type === "SYNC_DONE" && bs.result) {
            const text = bs.result.scraped === 0 ? "no new orders" : `${bs.result.updated} updated`;
            setStatus("BigSkyBuyers", text, "ok");
          } else if (bs.type === "SYNC_ERROR") {
            setStatus("BigSkyBuyers", `Error: ${bs.error}`, "fail");
          }
        }
        chrome.storage.onChanged.addListener((changes) => {
          if (changes.amazonLastSync?.newValue) setMeta("Amazon", `Last sync: ${changes.amazonLastSync.newValue}`);
          if (changes.walmartLastSync?.newValue) setMeta("Walmart", `Last sync: ${changes.walmartLastSync.newValue}`);
          if (changes.costcoLastSync?.newValue) setMeta("Costco", `Last sync: ${changes.costcoLastSync.newValue}`);
          if (changes.bigskyLastSync?.newValue) setMeta("BigSkyBuyers", `Last sync: ${changes.bigskyLastSync.newValue}`);
          const bs2 = changes.bigskyStatus?.newValue;
          if (bs2) {
            if (bs2.type === "SYNC_STARTED" || bs2.type === "SYNC_PROGRESS") {
              setStatus("BigSkyBuyers", bs2.message ?? "syncing\u2026", "syncing");
              setSyncBtn("BigSkyBuyers", true);
            } else if (bs2.type === "SYNC_DONE" && bs2.result) {
              const text = bs2.result.scraped === 0 ? "no new orders" : `+${bs2.result.imported} new, ${bs2.result.updated} updated`;
              setStatus("BigSkyBuyers", text, "ok");
              setSyncBtn("BigSkyBuyers", false);
            } else if (bs2.type === "SYNC_ERROR") {
              setStatus("BigSkyBuyers", `Error: ${bs2.error}`, "fail");
              setSyncBtn("BigSkyBuyers", false);
            }
          }
          const cs2 = changes.costcoSyncStatus?.newValue;
          if (cs2) {
            if (cs2.type === "SYNC_STARTED" || cs2.type === "SYNC_PROGRESS") {
              setStatus("Costco", cs2.message ?? "syncing\u2026", "syncing");
              setSyncBtn("Costco", true);
            } else if (cs2.type === "SYNC_DONE" && cs2.result) {
              const text = cs2.result.scraped === 0 ? "no new orders" : `+${cs2.result.imported} new, ${cs2.result.updated} updated`;
              setStatus("Costco", text, "ok");
              setSyncBtn("Costco", false);
            } else if (cs2.type === "SYNC_ERROR") {
              setStatus("Costco", `Error: ${cs2.error}`, "fail");
              setSyncBtn("Costco", false);
            }
          }
          const s2 = changes.amazonSyncStatus?.newValue;
          if (s2) {
            if (s2.type === "SYNC_STARTED" || s2.type === "SYNC_PROGRESS") {
              setStatus("Amazon", s2.message ?? "syncing\u2026", "syncing");
              setSyncBtn("Amazon", true, true);
            } else if (s2.type === "SYNC_DONE" && s2.result) {
              const text = s2.result.scraped === 0 ? "no new orders" : `+${s2.result.imported} new, ${s2.result.updated} updated`;
              setStatus("Amazon", text, "ok");
              setSyncBtn("Amazon", false);
            } else if (s2.type === "SYNC_ERROR") {
              setStatus("Amazon", `Error: ${s2.error}`, "fail");
              setSyncBtn("Amazon", false);
            }
          }
        });
        document.getElementById("syncAmazon").addEventListener("click", (e) => {
          const btn = e.currentTarget;
          if (btn.dataset.cancel) cancelSync("Amazon");
          else triggerSync("Amazon");
        });
        document.getElementById("syncWalmart").addEventListener("click", () => triggerSync("Walmart"));
        document.getElementById("syncCostco").addEventListener("click", () => triggerSync("Costco"));
        document.getElementById("syncBigsky").addEventListener("click", () => triggerSync("BigSkyBuyers"));
        document.getElementById("openSettings").addEventListener("click", (e) => {
          e.preventDefault();
          chrome.runtime.openOptionsPage();
        });
        chrome.runtime.onMessage.addListener((message) => {
          if (message.type === "SYNC_STARTED") {
            setStatus(message.platform, "syncing\u2026", "syncing");
            setSyncBtn(message.platform, true, message.platform === "Amazon");
          } else if (message.type === "SYNC_PROGRESS") {
            setStatus(message.platform, message.message, "syncing");
          } else if (message.type === "SYNC_DONE") {
            const { result } = message;
            const text = result.scraped === 0 ? "no new orders" : `+${result.imported} new, ${result.updated} updated`;
            setStatus(result.platform, text, "ok");
            setMeta(result.platform, `Last sync: ${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}`);
            setSyncBtn(result.platform, false);
          } else if (message.type === "SYNC_ERROR") {
            setStatus(message.platform, `Error: ${message.error}`, "fail");
            setSyncBtn(message.platform, false);
          }
        });
      }
      init();
    }
  });
  require_popup();
})();
