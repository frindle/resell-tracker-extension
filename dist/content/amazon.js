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
      var ORDER_HISTORY_URL = "https://www.amazon.com/your-orders/orders";
      async function fetchOrderPage(startIndex = 0) {
        try {
          const url = `${ORDER_HISTORY_URL}?startIndex=${startIndex}`;
          const res = await fetch(url, { credentials: "include" });
          if (!res.ok) return null;
          const html = await res.text();
          return new DOMParser().parseFromString(html, "text/html");
        } catch {
          return null;
        }
      }
      async function fetchOrderDetailPage(orderUrl) {
        try {
          const res = await fetch(orderUrl, { credentials: "include" });
          if (!res.ok) return null;
          const html = await res.text();
          return new DOMParser().parseFromString(html, "text/html");
        } catch {
          return null;
        }
      }
      function parseOrdersFromDoc(doc, sinceDate) {
        const orders = [];
        let hasOlder = false;
        const blocks = Array.from(doc.querySelectorAll(
          '.order, [class*="order-card"], .a-box-group.order'
        ));
        if (blocks.length === 0) {
          doc.querySelectorAll('a[href*="orderID="], a[href*="order-details"]').forEach((a) => {
            const block = a.closest('.a-box-group, .a-section, [class*="order"]');
            if (block && !blocks.includes(block)) blocks.push(block);
          });
        }
        for (const block of blocks) {
          const blockText = block.textContent ?? "";
          const orderIdMatch = blockText.match(/\b(\d{3}-\d{7}-\d{7})\b/);
          if (!orderIdMatch) continue;
          const orderNumber = orderIdMatch[1];
          const dateMatch = blockText.match(
            /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/i
          );
          if (!dateMatch) continue;
          const orderDate = new Date(dateMatch[0]);
          if (isNaN(orderDate.getTime())) continue;
          if (orderDate < sinceDate) {
            hasOlder = true;
            continue;
          }
          if (/\b(cancelled|canceled|refunded|returned)\b/i.test(blockText)) continue;
          const totalMatch = blockText.match(/(?:order total|grand total)[:\s$]+([\d,]+\.?\d*)/i) ?? blockText.match(/\$([\d,]+\.\d{2})/);
          const cost = totalMatch ? parseMoney(totalMatch[1]) : 0;
          const titleEl = block.querySelector(
            '[class*="product-title"], [class*="item-title"], .yohtmlc-product-title, a[href*="/dp/"]'
          );
          const itemDescription = (titleEl?.textContent ?? "").trim().slice(0, 120);
          const trackingNumbers = [];
          const trackMatches = blockText.match(/\b(1Z[A-Z0-9]{16}|[0-9]{20,22}|[A-Z]{2}[0-9]{9}[A-Z]{2})\b/g);
          if (trackMatches) trackingNumbers.push(...trackMatches);
          orders.push({
            platform: "Amazon",
            orderNumber,
            orderDate: orderDate.toISOString().split("T")[0],
            itemDescription,
            cost,
            shippingCost: 0,
            shippingAddress: "",
            trackingNumbers: [...new Set(trackingNumbers)],
            sourceUrl: `https://www.amazon.com/gp/your-account/order-details?orderID=${orderNumber}`
          });
        }
        return { orders, hasOlder };
      }
      async function scrapeOrders(sinceDate, onProgress) {
        const allOrders = [];
        const seen = /* @__PURE__ */ new Set();
        let startIndex = 0;
        let page = 1;
        while (true) {
          onProgress(`Fetching orders page ${page}\u2026`);
          const doc = await fetchOrderPage(startIndex);
          if (!doc) break;
          const { orders, hasOlder } = parseOrdersFromDoc(doc, sinceDate);
          for (const o of orders) {
            if (!seen.has(o.orderNumber)) {
              seen.add(o.orderNumber);
              allOrders.push(o);
            }
          }
          if (hasOlder) break;
          const nextLink = doc.querySelector(".a-pagination .a-last:not(.a-disabled) a");
          if (!nextLink) break;
          const m = nextLink.href.match(/startIndex=(\d+)/);
          if (!m) break;
          startIndex = parseInt(m[1]);
          page++;
          await new Promise((r) => setTimeout(r, 500));
        }
        return allOrders;
      }
      async function enrichWithDetails(orders, onProgress) {
        for (let i = 0; i < orders.length; i++) {
          const o = orders[i];
          if ((i + 1) % 3 === 0 || i === 0) {
            onProgress(`Fetching details ${i + 1}/${orders.length}\u2026`);
          }
          const doc = await fetchOrderDetailPage(o.sourceUrl);
          if (!doc) continue;
          const addrBlock = doc.querySelector('.displayAddressDiv, [class*="ship-to"], #shippingAddress');
          if (addrBlock) {
            o.shippingAddress = (addrBlock.textContent ?? "").replace(/\s+/g, " ").trim();
          }
          const html = doc.documentElement.innerHTML;
          const trackMatches = html.match(/trackingId[="]([A-Z0-9]{10,30})/g) ?? [];
          const fromPage = trackMatches.map((m) => m.replace(/trackingId[="]/g, "").trim());
          if (fromPage.length > 0) {
            o.trackingNumbers = [.../* @__PURE__ */ new Set([...o.trackingNumbers, ...fromPage])];
          }
          await new Promise((r) => setTimeout(r, 300));
        }
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
        const orders = await scrapeOrders(
          sinceDate,
          (msg) => sendMessage({ type: "SYNC_PROGRESS", platform: "Amazon", scraped: 0, message: msg })
        );
        if (orders.length === 0) {
          setBadge("\u2014");
          sendMessage({ type: "SYNC_DONE", result: { platform: "Amazon", scraped: 0, imported: 0, updated: 0 } });
          syncing = false;
          return;
        }
        sendMessage({ type: "SYNC_PROGRESS", platform: "Amazon", scraped: orders.length, message: `Found ${orders.length} orders, fetching details\u2026` });
        await enrichWithDetails(
          orders,
          (msg) => sendMessage({ type: "SYNC_PROGRESS", platform: "Amazon", scraped: orders.length, message: msg })
        );
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
