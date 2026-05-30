"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/lib/storage.ts
  async function getSettings() {
    const result = await chrome.storage.sync.get(Object.keys(DEFAULTS));
    return { ...DEFAULTS, ...result };
  }
  async function setLastSync(platform, date) {
    const key = platform === "amazon" ? "amazonLastSync" : "walmartLastSync";
    await chrome.storage.sync.set({ [key]: date });
  }
  var DEFAULTS;
  var init_storage = __esm({
    "src/lib/storage.ts"() {
      "use strict";
      DEFAULTS = {
        trackerUrl: "",
        apiKey: "",
        userId: "",
        userName: "",
        amazonLastSync: "",
        walmartLastSync: ""
      };
    }
  });

  // src/lib/api.ts
  async function pushOrders(trackerUrl, apiKey, userId, orders) {
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
  var init_api = __esm({
    "src/lib/api.ts"() {
      "use strict";
    }
  });

  // src/content/amazon.ts
  var require_amazon = __commonJS({
    "src/content/amazon.ts"() {
      init_storage();
      init_api();
      function parseMoney(text) {
        return parseFloat(text.replace(/[^0-9.-]/g, "")) || 0;
      }
      function sendMessage(msg) {
        chrome.runtime.sendMessage(msg).catch(() => {
        });
      }
      function setBadge(text, color = "#3b82f6") {
        chrome.runtime.sendMessage({ type: "SET_BADGE", text, color }).catch(() => {
        });
      }
      async function fetchShippingAddress(orderId) {
        try {
          const url = `https://www.amazon.com/gp/your-account/order-details?orderID=${orderId}`;
          const res = await fetch(url, { credentials: "include" });
          const html = await res.text();
          const doc = new DOMParser().parseFromString(html, "text/html");
          const addrEls = doc.querySelectorAll('.displayAddressDiv, [class*="shipToData"], [class*="ship-to"]');
          for (const el of Array.from(addrEls)) {
            const text = el.textContent?.replace(/\s+/g, " ").trim() ?? "";
            if (text.length > 5) return text;
          }
          const labels = Array.from(doc.querySelectorAll("b, strong, h5, span"));
          for (const lbl of labels) {
            if (/shipping address/i.test(lbl.textContent ?? "")) {
              const sibling = lbl.closest("td, div")?.nextElementSibling ?? lbl.parentElement?.nextElementSibling;
              const text = sibling?.textContent?.replace(/\s+/g, " ").trim() ?? "";
              if (text.length > 5) return text;
            }
          }
        } catch {
        }
        return "";
      }
      async function fetchOrdersFromApi(year, startIndex) {
        const url = `https://www.amazon.com/gp/your-account/order-history?opt=ab&digitalOrders=1&unifiedOrders=1&returnTo=&orderFilter=year-${year}&startIndex=${startIndex}`;
        const res = await fetch(url, {
          credentials: "include",
          headers: { "Accept": "application/json" }
        });
        if (!res.ok) throw new Error(`Amazon API ${res.status}`);
        return res.json();
      }
      async function scrapeOrders(sinceDate) {
        const orders = [];
        const seen = /* @__PURE__ */ new Set();
        const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
        const sinceYear = sinceDate.getFullYear();
        for (let year = currentYear; year >= sinceYear; year--) {
          let startIndex = 0;
          let hasMore = true;
          while (hasMore) {
            let data;
            try {
              data = await fetchOrdersFromApi(year, startIndex);
            } catch {
              break;
            }
            const items = data.orders ?? [];
            if (items.length === 0) {
              hasMore = false;
              break;
            }
            let foundOlder = false;
            for (const item of items) {
              const orderId = item.id ?? item.orderId ?? "";
              if (!orderId || seen.has(orderId)) continue;
              const rawDate = item.orderPlacedDate ?? item.orderDate ?? "";
              const orderDate = rawDate ? new Date(rawDate).toISOString().split("T")[0] : "";
              if (!orderDate) continue;
              const oDate = new Date(orderDate);
              if (oDate < sinceDate) {
                foundOlder = true;
                continue;
              }
              seen.add(orderId);
              const totalObj = item.grandTotal ?? item.orderTotal ?? {};
              const costStr = totalObj.amount;
              const costNum = totalObj.value;
              const cost = costNum ?? parseMoney(costStr ?? "0");
              const firstItem = (item.items ?? [])[0];
              const itemDescription = (firstItem?.title ?? firstItem?.name ?? "").slice(0, 120);
              const trackingNumbers = [];
              for (const shipment of item.shipments ?? []) {
                if (shipment.trackingId) trackingNumbers.push(shipment.trackingId);
                for (const pkg of shipment.packages ?? []) {
                  if (pkg.trackingId) trackingNumbers.push(pkg.trackingId);
                }
              }
              orders.push({
                platform: "Amazon",
                orderNumber: orderId,
                orderDate,
                itemDescription,
                cost,
                shippingCost: 0,
                shippingAddress: "",
                trackingNumbers: [...new Set(trackingNumbers)],
                sourceUrl: `https://www.amazon.com/gp/your-account/order-details?orderID=${orderId}`
              });
            }
            if (foundOlder && items.every((item) => {
              const rawDate = item.orderPlacedDate ?? item.orderDate ?? "";
              return rawDate && new Date(rawDate) < sinceDate;
            })) {
              hasMore = false;
            } else {
              startIndex += items.length;
              if (items.length < 10) hasMore = false;
              await new Promise((r) => setTimeout(r, 300));
            }
          }
        }
        return orders;
      }
      var syncing = false;
      async function sync() {
        if (syncing) return;
        syncing = true;
        const settings = await getSettings();
        if (!settings.trackerUrl || !settings.userId) {
          sendMessage({ type: "SYNC_ERROR", platform: "Amazon", error: "Tracker URL or user not configured \u2014 open Settings." });
          setBadge("!", "#ef4444");
          syncing = false;
          return;
        }
        const sinceDate = settings.amazonLastSync ? new Date(settings.amazonLastSync) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
        setBadge("\u2026");
        sendMessage({ type: "SYNC_STARTED", platform: "Amazon" });
        let orders;
        try {
          sendMessage({ type: "SYNC_PROGRESS", platform: "Amazon", scraped: 0, message: "Fetching orders from Amazon\u2026" });
          orders = await scrapeOrders(sinceDate);
        } catch (err) {
          setBadge("!", "#ef4444");
          sendMessage({ type: "SYNC_ERROR", platform: "Amazon", error: err instanceof Error ? err.message : String(err) });
          syncing = false;
          return;
        }
        sendMessage({ type: "SYNC_PROGRESS", platform: "Amazon", scraped: orders.length, message: `Found ${orders.length} orders, fetching addresses\u2026` });
        for (let i = 0; i < orders.length; i++) {
          orders[i].shippingAddress = await fetchShippingAddress(orders[i].orderNumber);
          await new Promise((r) => setTimeout(r, 250));
          if ((i + 1) % 5 === 0) {
            sendMessage({ type: "SYNC_PROGRESS", platform: "Amazon", scraped: orders.length, message: `Fetching addresses\u2026 ${i + 1}/${orders.length}` });
          }
        }
        sendMessage({ type: "SYNC_PROGRESS", platform: "Amazon", scraped: orders.length, message: `Found ${orders.length} orders\u2026` });
        if (orders.length === 0) {
          setBadge("\u2014");
          sendMessage({ type: "SYNC_DONE", result: { platform: "Amazon", scraped: 0, imported: 0, updated: 0 } });
          syncing = false;
          return;
        }
        try {
          const result = await pushOrders(settings.trackerUrl, settings.apiKey, settings.userId, orders);
          await setLastSync("amazon", (/* @__PURE__ */ new Date()).toISOString().split("T")[0]);
          setBadge(`+${result.imported}`, "#22c55e");
          sendMessage({ type: "SYNC_DONE", result: { platform: "Amazon", scraped: orders.length, ...result } });
        } catch (err) {
          setBadge("!", "#ef4444");
          sendMessage({ type: "SYNC_ERROR", platform: "Amazon", error: err instanceof Error ? err.message : String(err) });
        }
        syncing = false;
      }
      chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === "START_SYNC" && msg.platform === "Amazon") sync();
      });
    }
  });
  require_amazon();
})();
