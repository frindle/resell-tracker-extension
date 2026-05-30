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
      function parseDate(text) {
        const d = new Date(text.trim());
        if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
        return text.trim();
      }
      function sendMessage(msg) {
        chrome.runtime.sendMessage(msg).catch(() => {
        });
      }
      async function fetchTrackingNumbers(orderUrl) {
        try {
          const res = await fetch(orderUrl, { credentials: "include" });
          const html = await res.text();
          const doc = new DOMParser().parseFromString(html, "text/html");
          const numbers = [];
          doc.querySelectorAll("[data-a-modal], .a-expander-content, .ship-track-info").forEach((el) => {
            const text = el.textContent ?? "";
            const matches = text.match(/\b(1Z[A-Z0-9]{16}|[0-9]{12,22}|[A-Z]{2}[0-9]{9}[A-Z]{2})\b/g);
            if (matches) numbers.push(...matches);
          });
          const trackMatches = html.match(/trackingId=([A-Z0-9]+)/g);
          if (trackMatches) {
            trackMatches.forEach((m) => {
              const id = m.replace("trackingId=", "");
              if (!numbers.includes(id)) numbers.push(id);
            });
          }
          return [...new Set(numbers)];
        } catch {
          return [];
        }
      }
      function scrapeOrdersFromPage(sinceDate) {
        const orders = [];
        const orderBlocks = document.querySelectorAll('.order, [data-component="order"]');
        orderBlocks.forEach((block) => {
          const orderIdEl = block.querySelector('.yohtmlc-order-id span:last-child, [data-a-selector="order-id"] span');
          const orderNumber = orderIdEl?.textContent?.trim() ?? "";
          if (!orderNumber) return;
          const dateEl = block.querySelector(".order-date-invoice-item, .a-color-secondary");
          const rawDate = dateEl?.textContent?.replace(/order placed/i, "").trim() ?? "";
          const orderDate = parseDate(rawDate);
          if (!orderDate) return;
          if (new Date(orderDate) < sinceDate) return;
          const totalEl = block.querySelector(".a-color-price, .grand-total-price");
          const cost = parseMoney(totalEl?.textContent ?? "0");
          const itemEl = block.querySelector('.yohtmlc-product-title, .a-link-normal[href*="/dp/"]');
          const itemDescription = itemEl?.textContent?.trim() ?? "";
          const detailLink = block.querySelector('a[href*="order-details"], a[href*="orderID"]');
          const sourceUrl = detailLink?.href ?? `https://www.amazon.com/gp/your-account/order-details?orderID=${orderNumber}`;
          const addrEl = block.querySelector(".displayAddressDiv, .ship-to-address");
          const shippingAddress = addrEl?.textContent?.trim().replace(/\s+/g, " ") ?? "";
          orders.push({
            platform: "Amazon",
            orderNumber,
            orderDate,
            itemDescription,
            cost,
            shippingCost: 0,
            shippingAddress,
            trackingNumbers: [],
            sourceUrl
          });
        });
        return orders;
      }
      async function sync() {
        const settings = await getSettings();
        if (!settings.trackerUrl) {
          console.log("[Resell Tracker] No tracker URL configured \u2014 open extension options to set it up.");
          return;
        }
        const sinceDate = settings.amazonLastSync ? new Date(settings.amazonLastSync) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
        sendMessage({ type: "SYNC_STARTED", platform: "Amazon" });
        const orders = scrapeOrdersFromPage(sinceDate);
        if (orders.length === 0) {
          sendMessage({ type: "SYNC_DONE", result: { platform: "Amazon", scraped: 0, imported: 0, updated: 0 } });
          return;
        }
        sendMessage({ type: "SYNC_PROGRESS", platform: "Amazon", scraped: orders.length, message: `Found ${orders.length} orders, fetching tracking\u2026` });
        for (let i = 0; i < orders.length; i++) {
          const order = orders[i];
          order.trackingNumbers = await fetchTrackingNumbers(order.sourceUrl);
          await new Promise((r) => setTimeout(r, 400));
          if (i % 5 === 0) {
            sendMessage({ type: "SYNC_PROGRESS", platform: "Amazon", scraped: orders.length, message: `Fetching tracking\u2026 ${i + 1}/${orders.length}` });
          }
        }
        try {
          const result = await pushOrders(settings.trackerUrl, settings.apiKey, settings.userId, orders);
          await setLastSync("amazon", (/* @__PURE__ */ new Date()).toISOString().split("T")[0]);
          sendMessage({ type: "SYNC_DONE", result: { platform: "Amazon", scraped: orders.length, ...result } });
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          sendMessage({ type: "SYNC_ERROR", platform: "Amazon", error });
        }
      }
      if (location.pathname.includes("order-history") || location.pathname.includes("your-orders") || location.search.includes("startIndex")) {
        setTimeout(sync, 1500);
      }
    }
  });
  require_amazon();
})();
