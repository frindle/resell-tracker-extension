"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/lib/storage.ts
  var storage_exports = {};
  __export(storage_exports, {
    getSettings: () => getSettings,
    saveSettings: () => saveSettings,
    setLastSync: () => setLastSync
  });
  async function getSettings() {
    const result = await chrome.storage.sync.get(Object.keys(DEFAULTS));
    return { ...DEFAULTS, ...result };
  }
  async function saveSettings(settings) {
    await chrome.storage.sync.set(settings);
  }
  async function setLastSync(platform, date) {
    const key = platform === "amazon" ? "amazonLastSync" : platform === "walmart" ? "walmartLastSync" : platform === "costco" ? "costcoLastSync" : "bigskyLastSync";
    await chrome.storage.sync.set({ [key]: date });
  }
  var DEFAULTS;
  var init_storage = __esm({
    "src/lib/storage.ts"() {
      "use strict";
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

  // src/background/index.ts
  var require_background = __commonJS({
    "src/background/index.ts"() {
      var ICON_PATHS_CHROME = { 16: "icons/icon16.png", 32: "icons/icon32.png", 48: "icons/icon48.png", 128: "icons/icon128.png" };
      var ICON_PATH_FIREFOX = "icons/icon.svg";
      var _browser = globalThis.browser;
      var extAction = (_browser ?? chrome).action;
      var isFirefox = typeof _browser !== "undefined";
      function setToolbarIcon() {
        if (isFirefox) {
          extAction?.setIcon({ path: ICON_PATH_FIREFOX });
        } else {
          extAction?.setIcon({ path: ICON_PATHS_CHROME });
        }
      }
      setToolbarIcon();
      chrome.runtime.onInstalled.addListener(() => {
        console.log("[Reselling Tracker] Extension installed.");
        setToolbarIcon();
        chrome.alarms.create("pollCommands", { when: Date.now() + 2e3, periodInMinutes: 1 });
        pollAndExecuteCommands().catch(console.error);
      });
      chrome.runtime.onStartup.addListener(() => {
        setToolbarIcon();
        chrome.alarms.create("pollCommands", { when: Date.now() + 2e3, periodInMinutes: 1 });
        pollAndExecuteCommands().catch(console.error);
      });
      chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === "pollCommands") pollAndExecuteCommands().catch(console.error);
      });
      var PLATFORM_CONFIG = {
        Amazon: { host: "www.amazon.com", url: "https://www.amazon.com/your-orders/orders", script: "content/amazon.js" },
        Walmart: { host: "www.walmart.com", url: "https://www.walmart.com/orders", script: "content/walmart.js" },
        Costco: { host: "www.costco.com", url: "https://www.costco.com/myaccount/", script: "content/costco.js" },
        BigSkyBuyers: { host: "www.bigskybuyers.com", url: "https://www.bigskybuyers.com/main", script: "content/bigskybuyers.js" }
      };
      var openedScrapeTabs = /* @__PURE__ */ new Map();
      async function triggerSyncInBackground(platform, activeTabId, activeTabUrl) {
        console.log(`[BG] triggerSync ${platform} | activeTabId=${activeTabId} | activeTabUrl=${activeTabUrl ?? "(none)"}`);
        const config = PLATFORM_CONFIG[platform];
        if (!config) {
          console.warn(`[BG] triggerSync: no config for platform ${platform}`);
          return;
        }
        let targetTabId;
        let weOpenedIt = false;
        if (activeTabId && activeTabUrl) {
          try {
            if (new URL(activeTabUrl).hostname === config.host) {
              targetTabId = activeTabId;
              console.log(`[BG] triggerSync: reusing active tab ${activeTabId} (host matches)`);
            }
          } catch {
          }
        }
        if (!targetTabId) {
          let currentWindowId;
          try {
            currentWindowId = (await chrome.windows.getCurrent()).id;
          } catch (e) {
            console.warn("[BG] windows.getCurrent failed:", e);
          }
          if (currentWindowId === void 0) {
            try {
              currentWindowId = (await chrome.windows.getLastFocused()).id;
            } catch (e) {
              console.warn("[BG] windows.getLastFocused failed:", e);
            }
          }
          console.log(`[BG] triggerSync: opening new tab in window ${currentWindowId ?? "(any)"}`);
          let newTab;
          try {
            newTab = await chrome.tabs.create({ url: config.url, active: true, windowId: currentWindowId });
          } catch (e) {
            console.error(`[BG] triggerSync: tabs.create FAILED for ${platform}`, e);
            return;
          }
          if (!newTab.id) {
            console.error(`[BG] triggerSync: tabs.create returned no id for ${platform}`);
            return;
          }
          targetTabId = newTab.id;
          weOpenedIt = true;
          openedScrapeTabs.set(newTab.id, { platform, openedAt: Date.now() });
          console.log(`[BG] triggerSync: created tab ${targetTabId}, waiting for load\u2026`);
          const loadStart = Date.now();
          const loadResult = await new Promise((resolve) => {
            let tabListener;
            const timeout = setTimeout(() => {
              chrome.tabs.onUpdated.removeListener(tabListener);
              resolve("timeout");
            }, 1e4);
            tabListener = (tabId, info) => {
              if (tabId === targetTabId && info.status === "complete") {
                chrome.tabs.onUpdated.removeListener(tabListener);
                clearTimeout(timeout);
                resolve("complete");
              }
            };
            chrome.tabs.onUpdated.addListener(tabListener);
          });
          console.log(`[BG] triggerSync: tab load ${loadResult} after ${Date.now() - loadStart}ms`);
        }
        const alive = await chrome.tabs.sendMessage(targetTabId, { type: "PING" }).catch(() => null);
        if (!alive) {
          try {
            await chrome.scripting.executeScript({ target: { tabId: targetTabId }, files: [config.script] });
            console.log(`[BG] triggerSync: injected ${config.script} into tab ${targetTabId}`);
          } catch (e) {
            console.error("[BG] injection failed", e);
            if (weOpenedIt && targetTabId) {
              openedScrapeTabs.delete(targetTabId);
              chrome.tabs.remove(targetTabId).catch(() => {
              });
            }
            return;
          }
        } else {
          console.log(`[BG] triggerSync: content script already alive in tab ${targetTabId}`);
        }
        chrome.tabs.sendMessage(targetTabId, { type: "START_SYNC", platform }).then(() => {
          console.log(`[BG] triggerSync: START_SYNC delivered to tab ${targetTabId}`);
        }).catch(
          (e) => console.error("[BG] START_SYNC failed", e)
        );
      }
      var STATUS_KEY_BY_PLATFORM = {
        Amazon: "amazonSyncStatus",
        Walmart: "walmartSyncStatus",
        Costco: "costcoSyncStatus",
        BigSkyBuyers: "bigskySyncStatus"
      };
      chrome.tabs.onRemoved.addListener((tabId) => {
        const opened = openedScrapeTabs.get(tabId);
        if (!opened) return;
        openedScrapeTabs.delete(tabId);
        const key = STATUS_KEY_BY_PLATFORM[opened.platform];
        if (!key) return;
        chrome.storage.local.get(key).then((stored) => {
          const current = stored[key];
          if (!current || current.type === "SYNC_STARTED" || current.type === "SYNC_PROGRESS") {
            chrome.storage.local.set({
              [key]: { type: "SYNC_ERROR", error: "tab closed before scan finished", ts: Date.now() }
            }).catch(() => {
            });
          }
        }).catch(() => {
        });
      });
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "PING") {
          sendResponse({ ok: true });
          return;
        }
        if (message.type === "SYNC_DONE" || message.type === "SYNC_ERROR") {
          const tabId = sender.tab?.id;
          if (tabId != null && openedScrapeTabs.has(tabId)) {
            openedScrapeTabs.delete(tabId);
            setTimeout(() => {
              chrome.tabs.remove(tabId).catch(() => {
              });
            }, 2e3);
          }
        }
        if (message.type === "POLL_COMMANDS_NOW") {
          chrome.storage.local.get("lastForcedPoll").then(({ lastForcedPoll }) => {
            const now = Date.now();
            if (typeof lastForcedPoll === "number" && now - lastForcedPoll < 1e4) {
              sendResponse({ ok: true, skipped: true });
              return;
            }
            chrome.storage.local.set({ lastForcedPoll: now });
            pollAndExecuteCommands().catch((e) => console.error("[BG] forced poll error", e));
            sendResponse({ ok: true, skipped: false });
          });
          return true;
        }
        if (message.type === "TRIGGER_SYNC") {
          triggerSyncInBackground(message.platform, message.activeTabId, message.activeTabUrl).catch(
            (e) => console.error("[BG] triggerSyncInBackground error", e)
          );
          sendResponse({ ok: true });
          return;
        }
        if (message.type === "SET_BADGE") {
          const tabId = sender.tab?.id;
          if (tabId) {
            chrome.action.setBadgeText({ text: message.text, tabId });
            chrome.action.setBadgeBackgroundColor({ color: message.color ?? "#3b82f6", tabId });
          }
        }
        if (message.type === "FETCH_USERS") {
          handleFetchUsers(message.trackerUrl).then(sendResponse).catch(
            (e) => sendResponse({ error: String(e) })
          );
          return true;
        }
        if (message.type === "FETCH_HTML") {
          fetch(message.url, { credentials: "include" }).then((r) => r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))).then((html) => sendResponse({ html })).catch((e) => sendResponse({ error: String(e) }));
          return true;
        }
        if (message.type === "FETCH_IMAGE_BYTES") {
          fetch(message.url, { credentials: "include" }).then(async (r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const buf = await r.arrayBuffer();
            if (buf.byteLength > 5 * 1024 * 1024) throw new Error(`oversized: ${buf.byteLength} bytes`);
            const bytes = new Uint8Array(buf);
            let binary = "";
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            const base64 = btoa(binary);
            sendResponse({ base64, mimeType: r.headers.get("content-type") || "image/jpeg" });
          }).catch((e) => sendResponse({ error: String(e) }));
          return true;
        }
        if (message.type === "CYCLE_DATE_FILTER") {
          const tabId = sender.tab?.id;
          if (!tabId) {
            sendResponse(null);
            return;
          }
          chrome.scripting.executeScript({
            target: { tabId },
            world: "MAIN",
            func: inPageCycleDateFilter,
            args: [message.sinceDate]
          }).then((results) => sendResponse(results[0]?.result ?? null)).catch((e) => {
            console.error("[BG] CYCLE_DATE_FILTER error", e);
            sendResponse(null);
          });
          return true;
        }
        if (message.type === "GET_CAPTURED_ORDERS") {
          const tabId = sender.tab?.id;
          if (!tabId) {
            sendResponse(null);
            return;
          }
          chrome.scripting.executeScript({
            target: { tabId },
            world: "MAIN",
            func: () => window.__costcoAllOrders ?? null
          }).then((results) => sendResponse(results[0]?.result ?? null)).catch(() => sendResponse(null));
          return true;
        }
        if (message.type === "GET_CAPTURED_RECEIPTS") {
          const tabId = sender.tab?.id;
          if (!tabId) {
            sendResponse(null);
            return;
          }
          chrome.scripting.executeScript({
            target: { tabId },
            world: "MAIN",
            func: () => ({
              list: window.__costcoReceiptList ?? [],
              details: window.__costcoReceiptDetails ?? {}
            })
          }).then((results) => sendResponse(results[0]?.result ?? null)).catch(() => sendResponse(null));
          return true;
        }
        if (message.type === "GET_MSAL_TOKEN") {
          const tabId = sender.tab?.id;
          if (!tabId) {
            sendResponse(null);
            return;
          }
          chrome.scripting.executeScript({
            target: { tabId },
            world: "MAIN",
            func: inPageGetMsalToken
          }).then((results) => sendResponse(results[0]?.result ?? null)).catch((e) => {
            console.error("[BG] GET_MSAL_TOKEN error", e);
            sendResponse(null);
          });
          return true;
        }
        if (message.type === "GET_COSTCO_AUTH") {
          const tabId = sender.tab?.id;
          if (!tabId) {
            sendResponse(null);
            return;
          }
          chrome.scripting.executeScript({
            target: { tabId },
            world: "MAIN",
            func: () => window.__costcoAuth
          }).then((results) => sendResponse(results[0]?.result ?? null)).catch(() => sendResponse(null));
          return true;
        }
        if (message.type === "COSTCO_GRAPHQL") {
          const tabId = sender.tab?.id;
          if (!tabId) {
            sendResponse({ error: "no tab id" });
            return;
          }
          chrome.scripting.executeScript({
            target: { tabId },
            world: "MAIN",
            func: inPageCostcoGraphql,
            args: [message.token, message.clientId, message.body]
          }).then((results) => sendResponse(results[0]?.result ?? { error: "no result" })).catch((e) => sendResponse({ error: String(e) }));
          return true;
        }
        if (message.type === "PUSH_ORDERS") {
          handlePushOrders(message.trackerUrl, message.apiKey, message.userId, message.orders).then(sendResponse).catch((e) => sendResponse({ error: String(e) }));
          return true;
        }
        if (message.type === "PUSH_COSTCO_RECEIPTS") {
          handlePushCostcoReceipts(message.trackerUrl, message.apiKey, message.userId, message.receipts, message.receiptHtml).then(sendResponse).catch((e) => sendResponse({ error: String(e) }));
          return true;
        }
        if (message.type === "PUSH_BIGSKY_ORDERS") {
          handlePushBigskyOrders(message.trackerUrl, message.apiKey, message.userId, message.groups).then(sendResponse).catch((e) => sendResponse({ error: String(e) }));
          return true;
        }
        if (message.type === "CBM_SCRAPE_DONE") {
          const { merchant, rates, rateCount } = message;
          const tabId = sender.tab?.id;
          (async () => {
            let ok = true;
            if (rates && rates.length > 0) {
              try {
                const { trackerUrl, apiKey, extensionSecret, userId } = await Promise.resolve().then(() => (init_storage(), storage_exports)).then((m) => m.getSettings());
                if (trackerUrl) {
                  const base = trackerUrl.replace(/\/$/, "");
                  const headers = { "Content-Type": "application/json" };
                  if (apiKey) headers["X-API-Key"] = apiKey;
                  if (extensionSecret) headers["X-Extension-Secret"] = extensionSecret;
                  if (userId) headers["X-Extension-User-Id"] = userId;
                  const res = await fetch(`${base}/api/portal-rates/bulk`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify([{ merchant, rates }])
                  });
                  ok = res.ok;
                }
              } catch {
                ok = false;
              }
            }
            const resolve = pendingCbmScrapes.get(merchant);
            if (resolve) {
              pendingCbmScrapes.delete(merchant);
              resolve(ok, rateCount);
            }
            if (tabId) chrome.tabs.remove(tabId).catch(() => {
            });
          })();
          return;
        }
        if (message.type === "API_LOG") {
          appendApiLog(message.entry).catch(() => {
          });
          return;
        }
        if (message.type === "DEV_LOGS_CLEAR") {
          chrome.storage.local.set({ apiLogs: [], apiLogNextId: 0 }).then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
          return true;
        }
        if (message.type === "DEV_SPY_NOW") {
          injectSpy(message.tabId).then(() => sendResponse({ ok: true })).catch((e) => sendResponse({ error: String(e) }));
          return true;
        }
      });
      var _apiLogQueue = Promise.resolve();
      function appendApiLog(entry) {
        _apiLogQueue = _apiLogQueue.then(async () => {
          const stored = await chrome.storage.local.get(["apiLogs", "apiLogNextId"]);
          const logs = stored.apiLogs ?? [];
          const nextId = stored.apiLogNextId ?? 0;
          logs.push({ ...entry, id: nextId });
          if (logs.length > 200) logs.splice(0, logs.length - 200);
          await chrome.storage.local.set({ apiLogs: logs, apiLogNextId: nextId + 1 });
        });
        void forwardErrorIfRelevant(entry);
        void triggerCommitmentSyncIfRelevant(entry);
      }
      var _commitmentSyncTimer = null;
      async function triggerCommitmentSyncIfRelevant(entry) {
        try {
          const status = typeof entry.status === "number" ? entry.status : 0;
          const url = typeof entry.url === "string" ? entry.url : "";
          if (status < 200 || status >= 300) return;
          if (!/buyinggroup\.com.*\/v1\/commitment\/(edit|create|delete|update|cancel)/i.test(url)) return;
          if (_commitmentSyncTimer) clearTimeout(_commitmentSyncTimer);
          _commitmentSyncTimer = setTimeout(async () => {
            _commitmentSyncTimer = null;
            try {
              const { trackerUrl, apiKey, extensionSecret, userId } = await Promise.resolve().then(() => (init_storage(), storage_exports)).then((m) => m.getSettings());
              if (!trackerUrl || !userId) return;
              const headers = { "X-Extension-User-Id": userId };
              if (apiKey) headers["X-API-Key"] = apiKey;
              if (extensionSecret) headers["X-Extension-Secret"] = extensionSecret;
              headers["X-Extension-Browser"] = isFirefox ? "firefox" : "chrome";
              console.log("[spy] auto-firing /api/buyinggroup/sync-commitments after edit_commitment");
              await fetch(`${trackerUrl.replace(/\/$/, "")}/api/buyinggroup/sync-commitments`, {
                method: "POST",
                headers
              }).catch(() => {
              });
            } catch {
            }
          }, 5e3);
        } catch {
        }
      }
      var _recentForwards = /* @__PURE__ */ new Map();
      async function forwardErrorIfRelevant(entry) {
        try {
          const status = typeof entry.status === "number" ? entry.status : 0;
          const url = typeof entry.url === "string" ? entry.url : "";
          const method = typeof entry.method === "string" ? entry.method : "";
          if (!url || status >= 200 && status < 300) return;
          if (status === 0) return;
          const group = classifyGroup(url);
          if (!group) return;
          const dedupeKey = `${group}:${method}:${url}:${status}`;
          const last = _recentForwards.get(dedupeKey) ?? 0;
          if (Date.now() - last < 6e4) return;
          _recentForwards.set(dedupeKey, Date.now());
          const { trackerUrl, apiKey, extensionSecret, userId } = await Promise.resolve().then(() => (init_storage(), storage_exports)).then((m) => m.getSettings());
          if (!trackerUrl || !userId) return;
          const headers = { "Content-Type": "application/json", "X-Extension-User-Id": userId };
          if (apiKey) headers["X-API-Key"] = apiKey;
          if (extensionSecret) headers["X-Extension-Secret"] = extensionSecret;
          headers["X-Extension-Browser"] = isFirefox ? "firefox" : "chrome";
          await fetch(`${trackerUrl.replace(/\/$/, "")}/api/api-errors`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              group,
              endpoint: url.replace(/^https?:\/\/[^/]+/, ""),
              method,
              status,
              body: typeof entry.resBody === "string" ? entry.resBody.slice(0, 1500) : void 0,
              context: "extension API spy"
            })
          }).catch(() => {
          });
        } catch {
        }
      }
      function classifyGroup(url) {
        if (/cardcenter\.cc/i.test(url)) return "CC";
        if (/buyinggroup\.com|prod\.buyinggroup\.com/i.test(url)) return "BG";
        if (/bfmr\.com/i.test(url)) return "BFMR";
        if (/bigskybuyers\.com/i.test(url)) return "BigSky";
        return null;
      }
      async function injectSpy(tabId) {
        await chrome.scripting.executeScript({ target: { tabId }, files: ["content/api-spy-bridge.js"] });
        await chrome.scripting.executeScript({ target: { tabId }, world: "MAIN", files: ["content/api-spy-main.js"] });
      }
      function urlMatchesPattern(tabUrl, pattern) {
        if (!pattern) return false;
        try {
          const tabHost = new URL(tabUrl).hostname;
          const pat = pattern.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
          return tabHost === pat || tabHost.endsWith(`.${pat}`);
        } catch {
          return false;
        }
      }
      chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
        if (!tab.url) return;
        if (info.status !== "loading" && info.status !== "complete") return;
        const stored = await chrome.storage.local.get(["devMode", "devModeUrl"]);
        if (!stored.devMode) return;
        const pattern = stored.devModeUrl ?? "";
        if (!urlMatchesPattern(tab.url, pattern)) return;
        injectSpy(tabId).catch(() => {
        });
      });
      async function inPageGetMsalToken() {
        const w = window;
        const interesting = [];
        for (const key of Object.keys(w)) {
          if (/msal|azure|token|auth|costco.*auth|azuretoken/i.test(key)) interesting.push(key);
        }
        console.log("[CST-MAIN] interesting window keys:", interesting);
        let msalInstance = null;
        function isMsal(v) {
          return !!v && typeof v === "object" && typeof v.getAllAccounts === "function" && typeof v.acquireTokenSilent === "function";
        }
        for (const key of Object.keys(w)) {
          const v = w[key];
          if (isMsal(v)) {
            msalInstance = v;
            console.log("[CST-MAIN] found MSAL at window." + key);
            break;
          }
          if (v && typeof v === "object") {
            for (const k2 of Object.keys(v)) {
              const v2 = v[k2];
              if (isMsal(v2)) {
                msalInstance = v2;
                console.log("[CST-MAIN] found MSAL at window." + key + "." + k2);
                break;
              }
            }
            if (msalInstance) break;
          }
        }
        if (!msalInstance) {
          for (const name of ["msalInstance", "msal", "__msal", "msalApp", "azureMsal", "authInstance", "pca"]) {
            if (isMsal(w[name])) {
              msalInstance = w[name];
              console.log("[CST-MAIN] found MSAL at window." + name);
              break;
            }
          }
        }
        if (!msalInstance) {
          console.log("[CST-MAIN] no MSAL instance found");
          return null;
        }
        const accounts = msalInstance.getAllAccounts();
        if (!accounts.length) {
          console.log("[CST-MAIN] MSAL: no accounts");
          return null;
        }
        const account = accounts[0];
        console.log("[CST-MAIN] found account:", account.username ?? account.localAccountId);
        try {
          const result = await msalInstance.acquireTokenSilent({ account, scopes: ["openid", "profile"] });
          console.log("[CST-MAIN] acquireTokenSilent ok, idToken:", !!result.idToken, "accessToken:", !!result.accessToken);
          return result.idToken ?? result.accessToken ?? null;
        } catch (e) {
          console.error("[CST-MAIN] acquireTokenSilent failed", String(e));
          return null;
        }
      }
      async function inPageCycleDateFilter(sinceDate) {
        const MONTHS = {
          january: 0,
          february: 1,
          march: 2,
          april: 3,
          may: 4,
          june: 5,
          july: 6,
          august: 7,
          september: 8,
          october: 9,
          november: 10,
          december: 11
        };
        const since = new Date(sinceDate);
        const sel = document.getElementById("Showing");
        if (!sel) {
          console.log("[CST-MAIN] date select not found");
          return 0;
        }
        let clicked = 0;
        for (let i = 1; i < sel.options.length; i++) {
          const text = sel.options[i].text.trim();
          const m = text.match(/^(\d{4})\s+(\w+)\s*-\s*(\w+)$/);
          if (!m) continue;
          const year = parseInt(m[1]);
          const endMonthIdx = MONTHS[m[3].toLowerCase()];
          if (endMonthIdx === void 0) continue;
          const periodEnd = new Date(year, endMonthIdx + 1, 0);
          if (periodEnd < since) break;
          const before = window.__costcoAllOrders;
          const beforeLen = before?.length ?? 0;
          sel.value = sel.options[i].value || text;
          sel.dispatchEvent(new Event("change", { bubbles: true }));
          console.log("[CST-MAIN] selected date period:", text);
          clicked++;
          await new Promise((resolve) => {
            let waited = 0;
            const interval = setInterval(() => {
              waited += 200;
              const current = window.__costcoAllOrders;
              if ((current?.length ?? 0) > beforeLen || waited >= 8e3) {
                clearInterval(interval);
                resolve();
              }
            }, 200);
          });
          await new Promise((r) => setTimeout(r, 400));
        }
        console.log("[CST-MAIN] date cycling done, clicked", clicked, "periods");
        return clicked;
      }
      function inPageCostcoGraphql(token, clientId, body) {
        return new Promise((resolve) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "https://ecom-api.costco.com/ebusiness/order/v1/orders/graphql");
          xhr.setRequestHeader("content-type", "application/json-patch+json");
          xhr.setRequestHeader("costco-x-authorization", `Bearer ${token}`);
          xhr.setRequestHeader("costco-x-wcs-clientid", clientId);
          xhr.setRequestHeader("costco.env", "ecom");
          xhr.setRequestHeader("costco.service", "restOrders");
          xhr.setRequestHeader("client-identifier", crypto.randomUUID());
          xhr.onload = () => resolve({ ok: xhr.status < 400, status: xhr.status, text: xhr.responseText });
          xhr.onerror = () => resolve({ ok: false, status: 0, text: "network error" });
          xhr.send(body);
        });
      }
      async function pollAndExecuteCommands() {
        await chrome.storage.local.set({ lastPoll: Date.now() });
        const { trackerUrl, apiKey, extensionSecret, userId } = await Promise.resolve().then(() => (init_storage(), storage_exports)).then((m) => m.getSettings());
        if (!trackerUrl) return;
        const base = upgradeUrl(trackerUrl);
        const headers = {};
        if (apiKey) headers["X-API-Key"] = apiKey;
        if (extensionSecret) headers["X-Extension-Secret"] = extensionSecret;
        if (userId) headers["X-Extension-User-Id"] = userId;
        headers["X-Extension-Browser"] = isFirefox ? "firefox" : "chrome";
        let commands = [];
        try {
          const res = await fetch(`${base}/api/extension/commands`, { headers });
          if (!res.ok) return;
          commands = await res.json();
        } catch {
          return;
        }
        for (const cmd of commands) {
          await patchCommand(base, cmd.id, "running", headers);
          try {
            let result;
            if (cmd.type === "SYNC_AMAZON") result = await runSyncCommand("Amazon");
            else if (cmd.type === "SYNC_WALMART") result = await runSyncCommand("Walmart");
            else if (cmd.type === "SYNC_COSTCO") result = await runSyncCommand("Costco");
            else if (cmd.type === "SYNC_BIGSKY") result = await runSyncCommand("BigSkyBuyers");
            else if (cmd.type === "SCRAPE_CBM") result = await runScrapeCbm(base, headers, cmd.payload);
            else if (cmd.type === "SYNC_AMAZON_ORDER") {
              let orderNumbers = [];
              if (cmd.payload) {
                try {
                  const parsed = JSON.parse(cmd.payload);
                  if (Array.isArray(parsed.orderNumbers)) orderNumbers = parsed.orderNumbers;
                } catch {
                }
              }
              result = await runAmazonOrderSync(orderNumbers);
            }
            await patchCommand(base, cmd.id, "done", headers, result);
          } catch (e) {
            await patchCommand(base, cmd.id, "failed", headers, String(e));
          }
        }
      }
      async function patchCommand(base, id, status, headers, result) {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const res = await fetch(`${base}/api/extension/commands/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json", ...headers },
              body: JSON.stringify({ status, result })
            });
            if (res.ok) return;
          } catch {
          }
          if (attempt < 2) await new Promise((r) => setTimeout(r, 2e3 * (attempt + 1)));
        }
      }
      async function runSyncCommand(platform) {
        return new Promise((resolve, reject) => {
          triggerSyncInBackground(platform).then(() => resolve({ ok: true })).catch(reject);
        });
      }
      async function runAmazonOrderSync(orderNumbers) {
        if (!orderNumbers.length) return { skipped: true, reason: "no order numbers" };
        const config = PLATFORM_CONFIG["Amazon"];
        let targetTabId;
        let existingTabs = [];
        try {
          existingTabs = await chrome.tabs.query({ url: `https://${config.host}/*` });
        } catch {
        }
        if (existingTabs.length > 0 && existingTabs[0].id) {
          targetTabId = existingTabs[0].id;
        } else {
          const newTab = await chrome.tabs.create({ url: config.url, active: false });
          if (!newTab.id) throw new Error("failed to open Amazon tab");
          targetTabId = newTab.id;
          await new Promise((resolve) => {
            let tabListener;
            const timeout = setTimeout(() => {
              chrome.tabs.onUpdated.removeListener(tabListener);
              resolve();
            }, 15e3);
            tabListener = (tabId, info) => {
              if (tabId === targetTabId && info.status === "complete") {
                chrome.tabs.onUpdated.removeListener(tabListener);
                clearTimeout(timeout);
                resolve();
              }
            };
            chrome.tabs.onUpdated.addListener(tabListener);
          });
        }
        const alive = await chrome.tabs.sendMessage(targetTabId, { type: "PING" }).catch(() => null);
        if (!alive) {
          try {
            await chrome.scripting.executeScript({ target: { tabId: targetTabId }, files: [config.script] });
          } catch (e) {
            console.error("[BG] injection failed for SYNC_AMAZON_ORDER", e);
            throw e;
          }
        }
        return new Promise((resolve) => {
          chrome.tabs.sendMessage(
            targetTabId,
            { type: "SCRAPE_AMAZON_ORDER", orderNumbers },
            (response) => {
              if (chrome.runtime.lastError) {
                resolve({ ok: false, error: chrome.runtime.lastError.message });
              } else {
                resolve(response ?? { ok: false, error: "no response" });
              }
            }
          );
        });
      }
      var pendingCbmScrapes = /* @__PURE__ */ new Map();
      async function runScrapeCbm(trackerBase, headers, rawPayload) {
        let merchants = [];
        if (rawPayload) {
          try {
            merchants = JSON.parse(rawPayload);
          } catch {
          }
        }
        if (!merchants.length) {
          const res = await fetch(`${trackerBase}/api/bfmr/vendors`, { headers });
          if (res.ok) merchants = await res.json();
        }
        if (!merchants.length) return { skipped: true, reason: "no merchants" };
        const results = [];
        for (const merchant of merchants) {
          const slug = merchant.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
          const url = `https://www.cashbackmonitor.com/cashback-store/${slug}/?vendor=${encodeURIComponent(merchant)}`;
          const result = await new Promise((resolve) => {
            let openedTabId;
            let settled = false;
            const settle = (val) => {
              if (settled) return;
              settled = true;
              resolve(val);
            };
            const timeoutId = setTimeout(() => {
              pendingCbmScrapes.delete(merchant);
              if (openedTabId) chrome.tabs.remove(openedTabId).catch(() => {
              });
              settle({ ok: false, rateCount: 0 });
            }, 15e3);
            pendingCbmScrapes.set(merchant, (ok, rateCount) => {
              clearTimeout(timeoutId);
              settle({ ok, rateCount });
            });
            chrome.tabs.create({ url, active: false }).then((tab) => {
              if (tab.id) openedTabId = tab.id;
            }).catch(() => {
              clearTimeout(timeoutId);
              pendingCbmScrapes.delete(merchant);
              settle({ ok: false, rateCount: 0 });
            });
          });
          results.push({ merchant, ...result });
        }
        return { merchants: results };
      }
      async function handlePushBigskyOrders(trackerUrl, apiKey, userId, groups) {
        const url = `${upgradeUrl(trackerUrl)}/api/bigsky/sync-orders`;
        const { extensionSecret } = await Promise.resolve().then(() => (init_storage(), storage_exports)).then((m) => m.getSettings());
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...userId ? { "X-Extension-User-Id": userId } : {},
            ...apiKey ? { "X-API-Key": apiKey } : {},
            ...extensionSecret ? { "X-Extension-Secret": extensionSecret } : {}
          },
          body: JSON.stringify({ groups })
        });
        if (!res.ok) {
          const text = await res.text().catch(() => res.statusText);
          throw new Error(`Tracker API error ${res.status} (${url}): ${text}`);
        }
        return res.json();
      }
      function upgradeUrl(trackerUrl) {
        const stripped = trackerUrl.replace(/\/$/, "");
        if (/^http:\/\/(localhost|\d)/i.test(stripped)) return stripped;
        return stripped.replace(/^http:\/\//i, "https://");
      }
      async function handleFetchUsers(trackerUrl) {
        const url = `${upgradeUrl(trackerUrl)}/api/users`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
        return res.json();
      }
      async function handlePushCostcoReceipts(trackerUrl, apiKey, userId, receipts, receiptHtml) {
        const url = `${upgradeUrl(trackerUrl)}/api/costco/receipts`;
        console.log("[RECEIPTS] pushing", receipts.length, "receipts, userId=", userId, "url=", url);
        const { extensionSecret } = await Promise.resolve().then(() => (init_storage(), storage_exports)).then((m) => m.getSettings());
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...apiKey ? { "X-API-Key": apiKey } : {},
            ...userId != null ? { "X-Extension-User-Id": String(userId) } : {},
            ...extensionSecret ? { "X-Extension-Secret": extensionSecret } : {}
          },
          body: JSON.stringify({ receipts, receiptHtml: receiptHtml ?? {} })
        });
        const text = await res.text();
        console.log("[RECEIPTS] response", res.status, text.slice(0, 200));
        if (!res.ok) throw new Error(`Tracker API error ${res.status} (${url}): ${text}`);
        return JSON.parse(text);
      }
      async function handlePushOrders(trackerUrl, apiKey, userId, orders) {
        const url = `${upgradeUrl(trackerUrl)}/api/import`;
        const { extensionSecret } = await Promise.resolve().then(() => (init_storage(), storage_exports)).then((m) => m.getSettings());
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...userId ? { "X-Extension-User-Id": userId } : {},
            ...apiKey ? { "X-API-Key": apiKey } : {},
            ...extensionSecret ? { "X-Extension-Secret": extensionSecret } : {}
          },
          body: JSON.stringify(orders.map((o) => ({
            platform: o.platform,
            orderNumber: o.orderNumber,
            orderDate: o.orderDate,
            itemDescription: o.itemDescription,
            cost: o.cost,
            shippingCost: o.shippingCost,
            shippingAddress: o.shippingAddress,
            trackingNumbers: o.trackingNumbers,
            sourceUrl: o.sourceUrl || null,
            // Forward paymentLast4 so the server can auto-assign a saved card
            // when exactly one card matches. The content scripts scrape this
            // from Amazon/Walmart payment-method markup; the previous projection
            // here silently dropped it, which is why card auto-assign never fired
            // even when last4 was visible in extension logs.
            ...o.paymentLast4 ? { paymentLast4: o.paymentLast4 } : {},
            // Amazon No-Rush delivery bonus, when detected on detail page.
            ...o.noRushBonusPercent != null ? { noRushBonusPercent: o.noRushBonusPercent } : {},
            // Carrier proof-of-delivery photo URL. Server downloads + attaches.
            ...o.deliveryPhotoUrl ? { deliveryPhotoUrl: o.deliveryPhotoUrl } : {},
            // For Walmart (and any other host whose photo URL needs the user's
            // session cookies), we ship the bytes inline so the server doesn't
            // try to fetch and 401.
            ...o.deliveryPhotoBase64 ? { deliveryPhotoBase64: o.deliveryPhotoBase64 } : {},
            ...o.deliveryPhotoMime ? { deliveryPhotoMime: o.deliveryPhotoMime } : {}
          })))
        });
        if (!res.ok) {
          const text = await res.text().catch(() => res.statusText);
          throw new Error(`Tracker API error ${res.status} (${url}): ${text}`);
        }
        return res.json();
      }
    }
  });
  require_background();
})();
