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
        if (message.type === "PUSH_ORDERS") {
          handlePushOrders(message.trackerUrl, message.apiKey, message.userId, message.orders).then(sendResponse).catch((e) => sendResponse({ error: String(e) }));
          return true;
        }
      });
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
