"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
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

  // src/content/tracker-status.ts
  var require_tracker_status = __commonJS({
    "src/content/tracker-status.ts"() {
      var import_browser_polyfill_min = __toESM(require_browser_polyfill_min());
      var PLATFORMS = [
        { key: "amazonSyncStatus", name: "Amazon", color: "#ff9900" },
        { key: "walmartSyncStatus", name: "Walmart", color: "#0071dc" },
        { key: "costcoSyncStatus", name: "Costco", color: "#e31837" },
        { key: "bigskySyncStatus", name: "BigSky", color: "#0ea5e9" }
      ];
      async function isOnTrackerPage() {
        const { trackerUrl } = await chrome.storage.sync.get(["trackerUrl"]);
        if (!trackerUrl) return false;
        try {
          const tracker = new URL(trackerUrl.startsWith("http") ? trackerUrl : `http://${trackerUrl}`);
          return location.hostname === tracker.hostname;
        } catch {
          return false;
        }
      }
      function renderStatus(statuses) {
        const mountTarget = document.querySelector("[data-rt-sync-target]");
        const container = document.getElementById("rt-sync-banner") ?? (() => {
          const d = document.createElement("div");
          d.id = "rt-sync-banner";
          if (mountTarget) {
            d.style.cssText = [
              "display:flex",
              "flex-direction:row",
              "flex-wrap:wrap",
              "gap:6px",
              "font-family:system-ui,-apple-system,sans-serif",
              "font-size:13px",
              "align-items:flex-start",
              "justify-content:flex-end"
            ].join(";");
            mountTarget.appendChild(d);
          } else {
            d.style.cssText = [
              "position:fixed",
              "bottom:16px",
              "right:16px",
              "z-index:2147483647",
              "display:flex",
              "flex-direction:row",
              "flex-wrap:wrap",
              "gap:8px",
              "font-family:system-ui,-apple-system,sans-serif",
              "font-size:13px",
              "pointer-events:none",
              // children re-enable
              "align-items:flex-start",
              "justify-content:flex-end",
              "max-width:calc(100vw - 32px)"
            ].join(";");
            document.body.appendChild(d);
          }
          return d;
        })();
        const now = Date.now();
        const cards = [];
        for (const p of PLATFORMS) {
          const s = statuses[p.key];
          if (!s) continue;
          const isActive = s.type === "SYNC_STARTED" || s.type === "SYNC_PROGRESS";
          const isError = s.type === "SYNC_ERROR";
          const isDone = s.type === "SYNC_DONE";
          if ((isDone || isError) && now - s.ts > 3e4) continue;
          const accent = isError ? "#dc2626" : isDone ? "#16a34a" : p.color;
          const label = isActive ? s.message ?? "syncing\u2026" : isError ? `error: ${s.error ?? "unknown"}` : isDone ? formatResult(s.result) : s.type;
          const spinner = isActive ? '<span class="rt-spin">\u27F3</span>' : "";
          const eventId = isDone ? s.result?.eventId ?? null : null;
          const clickable = eventId != null;
          cards.push(`
      <div data-rt-card="${p.key}" data-rt-event="${eventId ?? ""}" style="pointer-events:auto;background:#111827;color:#e5e7eb;border:1px solid #374151;border-left:3px solid ${accent};border-radius:6px;padding:8px 12px;box-shadow:0 4px 12px rgba(0,0,0,.4);max-width:320px;display:flex;align-items:center;gap:8px;${clickable ? "cursor:pointer;" : ""}">
        ${spinner}
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;color:${accent}">${p.name}${clickable ? ' <span style="color:#6b7280;font-weight:400;font-size:10px;">view \u2192</span>' : ""}</div>
          <div style="font-size:11px;color:#9ca3af;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(label)}</div>
        </div>
        ${isDone || isError ? `<button data-rt-dismiss="${p.key}" style="background:none;border:none;color:#6b7280;cursor:pointer;padding:0 4px;font-size:14px;line-height:1;">\xD7</button>` : ""}
      </div>
    `);
        }
        container.innerHTML = cards.length === 0 ? "" : `
    <style>
      @keyframes rt-spin { from { transform:rotate(0); } to { transform:rotate(360deg); } }
      #rt-sync-banner .rt-spin { display:inline-block; animation: rt-spin 1.2s linear infinite; color:#60a5fa; }
    </style>
    ${cards.join("")}
  `;
        container.querySelectorAll("[data-rt-dismiss]").forEach((btn) => {
          btn.onclick = (e) => {
            e.stopPropagation();
            const key = btn.getAttribute("data-rt-dismiss");
            if (key) chrome.storage.local.remove(key);
          };
        });
        container.querySelectorAll("[data-rt-card]").forEach((card) => {
          const eventId = card.getAttribute("data-rt-event");
          if (!eventId) return;
          card.onclick = () => {
            window.location.href = `/sync-history?event=${eventId}`;
          };
        });
      }
      function formatResult(r) {
        if (!r) return "done";
        const parts = [];
        if (typeof r.imported === "number") parts.push(`${r.imported} new`);
        if (typeof r.updated === "number") parts.push(`${r.updated} updated`);
        if (typeof r.skipped === "number" && r.skipped > 0) parts.push(`${r.skipped} skipped`);
        if (typeof r.scraped === "number" && parts.length === 0) parts.push(`${r.scraped} scraped`);
        return parts.length ? `done \xB7 ${parts.join(", ")}` : "done";
      }
      function escapeHtml(s) {
        return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
      }
      async function refresh() {
        const keys = PLATFORMS.map((p) => p.key);
        const data = await chrome.storage.local.get(keys);
        renderStatus(data);
      }
      (async () => {
        if (!await isOnTrackerPage()) return;
        refresh();
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area !== "local") return;
          if (Object.keys(changes).some((k) => PLATFORMS.some((p) => p.key === k))) refresh();
        });
        setInterval(refresh, 5e3);
        const nudge = () => chrome.runtime.sendMessage({ type: "POLL_COMMANDS_NOW" }).catch(() => null);
        nudge();
        setInterval(nudge, 15e3);
      })();
    }
  });
  require_tracker_status();
})();
