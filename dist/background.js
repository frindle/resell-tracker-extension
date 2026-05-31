"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/background/index.ts
  var require_background = __commonJS({
    "src/background/index.ts"() {
      chrome.runtime.onInstalled.addListener(() => {
        console.log("[Reselling Tracker] Extension installed.");
      });
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
      async function inPageCostcoGraphql(token, clientId, body) {
        const fetchFn = window.__origFetch ?? fetch;
        console.log("[CST-MAIN] using __origFetch:", !!window.__origFetch);
        const res = await fetchFn("https://ecom-api.costco.com/ebusiness/order/v1/orders/graphql", {
          method: "POST",
          headers: {
            "Content-Type": "application/json-patch+json",
            "costco-x-authorization": `Bearer ${token}`,
            "costco-x-wcs-clientid": clientId,
            "costco.env": "ecom",
            "costco.service": "restOrders",
            "client-identifier": crypto.randomUUID()
          },
          body
        });
        const text = await res.text();
        return { ok: res.ok, status: res.status, text };
      }
      async function handleFetchUsers(trackerUrl) {
        const url = `${trackerUrl.replace(/\/$/, "")}/api/users`;
        const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
        if (!res.ok) throw new Error(`${res.status}: ${await res.text().catch(() => res.statusText)}`);
        return res.json();
      }
      async function handlePushOrders(trackerUrl, apiKey, userId, orders) {
        const url = `${trackerUrl.replace(/\/$/, "")}/api/import`;
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
          throw new Error(`Tracker API error ${res.status}: ${text}`);
        }
        return res.json();
      }
    }
  });
  require_background();
})();
