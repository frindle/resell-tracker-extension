"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

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
      });
      chrome.runtime.onStartup.addListener(setToolbarIcon);
      var PLATFORM_CONFIG = {
        Amazon: { host: "www.amazon.com", url: "https://www.amazon.com/your-orders/orders", script: "content/amazon.js" },
        Walmart: { host: "www.walmart.com", url: "https://www.walmart.com/orders", script: "content/walmart.js" },
        Costco: { host: "www.costco.com", url: "https://www.costco.com/myaccount/", script: "content/costco.js" },
        BigSkyBuyers: { host: "www.bigskybuyers.com", url: "https://www.bigskybuyers.com/main", script: "content/bigskybuyers.js" }
      };
      async function triggerSyncInBackground(platform, activeTabId, activeTabUrl) {
        const config = PLATFORM_CONFIG[platform];
        if (!config) return;
        let targetTabId;
        if (activeTabId && activeTabUrl) {
          try {
            if (new URL(activeTabUrl).hostname === config.host) {
              targetTabId = activeTabId;
            }
          } catch {
          }
        }
        if (!targetTabId) {
          let existingTabs = [];
          try {
            existingTabs = await chrome.tabs.query({ url: `https://${config.host}/*` });
          } catch {
          }
          if (existingTabs.length > 0 && existingTabs[0].id) {
            targetTabId = existingTabs[0].id;
            await chrome.tabs.update(targetTabId, { active: true });
            try {
              if (existingTabs[0].windowId) await chrome.windows.update(existingTabs[0].windowId, { focused: true });
            } catch {
            }
          } else {
            const newTab = await chrome.tabs.create({ url: config.url, active: true });
            if (!newTab.id) return;
            targetTabId = newTab.id;
            try {
              if (newTab.windowId) await chrome.windows.update(newTab.windowId, { focused: true });
            } catch {
            }
            await new Promise((resolve) => {
              let tabListener;
              const timeout = setTimeout(() => {
                chrome.tabs.onUpdated.removeListener(tabListener);
                resolve();
              }, 1e4);
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
        }
        const alive = await chrome.tabs.sendMessage(targetTabId, { type: "PING" }).catch(() => null);
        if (!alive) {
          try {
            await chrome.scripting.executeScript({ target: { tabId: targetTabId }, files: [config.script] });
          } catch (e) {
            console.error("[BG] injection failed", e);
            return;
          }
        }
        chrome.tabs.sendMessage(targetTabId, { type: "START_SYNC", platform }).catch(
          (e) => console.error("[BG] START_SYNC failed", e)
        );
      }
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "PING") {
          sendResponse({ ok: true });
          return;
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
        if (message.type === "PUSH_BIGSKY_ORDERS") {
          handlePushBigskyOrders(message.trackerUrl, message.apiKey, message.userId, message.groups).then(sendResponse).catch((e) => sendResponse({ error: String(e) }));
          return true;
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
        if (info.status !== "complete" || !tab.url) return;
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
      async function handlePushBigskyOrders(trackerUrl, apiKey, userId, groups) {
        const url = `${upgradeUrl(trackerUrl)}/api/bigsky/sync-orders`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...userId ? { "X-Extension-User-Id": userId } : {},
            ...apiKey ? { "X-API-Key": apiKey } : {}
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
        return trackerUrl.replace(/\/$/, "").replace(/^http:\/\/([^0-9])/i, "https://$1");
      }
      async function handleFetchUsers(trackerUrl) {
        const url = `${upgradeUrl(trackerUrl)}/api/users`;
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("GET", url);
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch {
                reject(new Error("Invalid JSON"));
              }
            } else {
              reject(new Error(`${xhr.status}: ${xhr.statusText}`));
            }
          };
          xhr.onerror = () => reject(new Error(`NetworkError: ${url}`));
          xhr.send();
        });
      }
      async function handlePushOrders(trackerUrl, apiKey, userId, orders) {
        const url = `${upgradeUrl(trackerUrl)}/api/import`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...userId ? { "X-Extension-User-Id": userId } : {},
            ...apiKey ? { "X-API-Key": apiKey } : {}
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
            sourceUrl: o.sourceUrl || null
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
