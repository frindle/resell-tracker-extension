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
      function setBadge(text, color = "#3b82f6") {
        chrome.runtime.sendMessage({ type: "SET_BADGE", text, color }).catch(() => {
        });
      }
      async function fetchTrackingNumbers(orderUrl) {
        try {
          const res = await fetch(orderUrl, { credentials: "include" });
          const html = await res.text();
          const numbers = [];
          const trackMatches = html.match(/trackingId=([A-Z0-9]+)/g);
          if (trackMatches) {
            trackMatches.forEach((m) => {
              const id = m.replace("trackingId=", "");
              if (!numbers.includes(id)) numbers.push(id);
            });
          }
          const doc = new DOMParser().parseFromString(html, "text/html");
          doc.querySelectorAll("[data-a-modal], .a-expander-content").forEach((el) => {
            const matches = (el.textContent ?? "").match(/\b(1Z[A-Z0-9]{16}|[0-9]{12,22})\b/g);
            if (matches) numbers.push(...matches);
          });
          return [...new Set(numbers)];
        } catch {
          return [];
        }
      }
      function scrapeOrdersFromPage(sinceDate) {
        const orders = [];
        const blocks = Array.from(document.querySelectorAll(
          '.order, [data-component="order"], .js-order-card, div[class*="order-card"], div[class*="OrderCard"], [data-testid*="order"]'
        ));
        if (blocks.length === 0) {
          const orderLinks = Array.from(document.querySelectorAll('a[href*="orderID="], a[href*="order-details"]'));
          orderLinks.forEach((link) => {
            const match = link.href.match(/orderID=([A-Z0-9-]+)/);
            if (!match) return;
            const orderNumber = match[1];
            const block = link.closest("div, section, article") ?? link.parentElement;
            if (!block) return;
            if (blocks.includes(block)) return;
            blocks.push(block);
          });
        }
        blocks.forEach((block) => {
          const orderIdEl = block.querySelector(
            '.yohtmlc-order-id span:last-child, [data-a-selector="order-id"] span, bdi, [class*="order-id"]'
          );
          let orderNumber = orderIdEl?.textContent?.trim() ?? "";
          if (!orderNumber) {
            const link = block.querySelector('a[href*="orderID="]');
            const match = link?.href?.match(/orderID=([A-Z0-9-]+)/);
            if (match) orderNumber = match[1];
          }
          if (!orderNumber) return;
          const dateEl = block.querySelector(
            '.order-date-invoice-item, [class*="order-date"], span[class*="date"], .a-color-secondary'
          );
          const rawDate = (dateEl?.textContent ?? "").replace(/order\s+placed/i, "").trim();
          const orderDate = parseDate(rawDate);
          if (!orderDate || orderDate === rawDate) return;
          if (new Date(orderDate) < sinceDate) return;
          const blockText = (block.textContent ?? "").toLowerCase();
          if (/cancelled|canceled|returned|refunded/.test(blockText) && !/items? returned|return window/.test(blockText)) return;
          const totalEl = block.querySelector(
            '.a-color-price, .grand-total-price, [class*="order-total"], [class*="total-price"]'
          );
          const cost = parseMoney(totalEl?.textContent ?? "0");
          const itemEl = block.querySelector(
            '.yohtmlc-product-title, .a-link-normal[href*="/dp/"], [class*="product-title"], [class*="item-title"]'
          );
          const itemDescription = itemEl?.textContent?.trim() ?? "";
          const detailLink = block.querySelector('a[href*="order-details"], a[href*="orderID"]');
          const sourceUrl = detailLink?.href ?? `https://www.amazon.com/gp/your-account/order-details?orderID=${orderNumber}`;
          const addrEl = block.querySelector('.displayAddressDiv, .ship-to-address, [class*="ship-address"]');
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
      var syncing = false;
      async function sync() {
        if (syncing) return;
        syncing = true;
        const settings = await getSettings();
        if (!settings.trackerUrl || !settings.userId) {
          console.log("[Reselling Tracker] Configure tracker URL and user in extension settings.");
          setBadge("!", "#ef4444");
          syncing = false;
          return;
        }
        const sinceDate = settings.amazonLastSync ? new Date(settings.amazonLastSync) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
        setBadge("\u2026");
        sendMessage({ type: "SYNC_STARTED", platform: "Amazon" });
        const orders = scrapeOrdersFromPage(sinceDate);
        if (orders.length === 0) {
          setBadge("0");
          sendMessage({ type: "SYNC_DONE", result: { platform: "Amazon", scraped: 0, imported: 0, updated: 0 } });
          syncing = false;
          return;
        }
        sendMessage({ type: "SYNC_PROGRESS", platform: "Amazon", scraped: orders.length, message: `Found ${orders.length} orders, fetching tracking\u2026` });
        for (let i = 0; i < orders.length; i++) {
          orders[i].trackingNumbers = await fetchTrackingNumbers(orders[i].sourceUrl);
          await new Promise((r) => setTimeout(r, 300));
        }
        try {
          const result = await pushOrders(settings.trackerUrl, settings.apiKey, settings.userId, orders);
          await setLastSync("amazon", (/* @__PURE__ */ new Date()).toISOString().split("T")[0]);
          setBadge(`+${result.imported}`, "#22c55e");
          sendMessage({ type: "SYNC_DONE", result: { platform: "Amazon", scraped: orders.length, ...result } });
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          setBadge("!", "#ef4444");
          sendMessage({ type: "SYNC_ERROR", platform: "Amazon", error });
        }
        syncing = false;
      }
      function isOrdersPage() {
        return location.pathname.includes("order-history") || location.pathname.includes("your-orders") || location.pathname.includes("order-history") || location.search.includes("startIndex") || location.search.includes("orderID") === false && location.pathname.includes("orders");
      }
      if (isOrdersPage()) {
        setTimeout(sync, 2e3);
      }
      var lastUrl = location.href;
      new MutationObserver(() => {
        if (location.href !== lastUrl) {
          lastUrl = location.href;
          if (isOrdersPage()) setTimeout(sync, 2e3);
        }
      }).observe(document.body, { childList: true, subtree: true });
    }
  });
  require_amazon();
})();
