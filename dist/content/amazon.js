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
      async function fetchPage(url) {
        try {
          const res = await fetch(url, { credentials: "include" });
          if (!res.ok) return null;
          const html = await res.text();
          return { html, doc: new DOMParser().parseFromString(html, "text/html") };
        } catch {
          return null;
        }
      }
      function parseOrdersFromPage(doc, html, sinceDate) {
        const orders = [];
        let hasOlder = false;
        const nextDataEl = doc.getElementById("__NEXT_DATA__");
        if (nextDataEl?.textContent) {
          try {
            const json = JSON.parse(nextDataEl.textContent);
            const orderList = findOrdersInObject(json);
            if (orderList.length > 0) {
              for (const raw of orderList) {
                const item = raw;
                const result = extractOrderFromJson(item, sinceDate);
                if (result === "older") {
                  hasOlder = true;
                  continue;
                }
                if (result === "skip") continue;
                orders.push(result);
              }
              const nextUrl2 = findNextPageUrl(doc, html);
              return { orders, hasOlder, nextUrl: nextUrl2 };
            }
          } catch {
          }
        }
        const orderIdPattern = /\b(\d{3}-\d{7}-\d{7})\b/g;
        const found = /* @__PURE__ */ new Set();
        let m;
        while ((m = orderIdPattern.exec(html)) !== null) {
          const orderId = m[1];
          if (found.has(orderId)) continue;
          found.add(orderId);
          const start = Math.max(0, m.index - 1e3);
          const end = Math.min(html.length, m.index + 1e3);
          const ctx = html.slice(start, end);
          const dateMatch = ctx.match(
            /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i
          ) ?? ctx.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
          let orderDate = "";
          if (dateMatch) {
            const d = new Date(dateMatch[0]);
            if (!isNaN(d.getTime())) {
              if (d < sinceDate) {
                hasOlder = true;
                continue;
              }
              orderDate = d.toISOString().split("T")[0];
            }
          }
          if (/\b(cancelled|canceled|refunded|returned)\b/i.test(ctx)) continue;
          const totalMatch = ctx.match(/(?:order total|grand total)[^$]*\$([\d,]+\.?\d*)/i) ?? ctx.match(/\$([\d,]+\.\d{2})/);
          const cost = totalMatch ? parseMoney(totalMatch[1]) : 0;
          const titleMatch = ctx.match(/"title":"([^"]{5,120})"/i) ?? ctx.match(/class="[^"]*product-title[^"]*"[^>]*>([^<]{5,120})</i);
          const itemDescription = titleMatch ? titleMatch[1].trim() : "";
          orders.push({
            platform: "Amazon",
            orderNumber: orderId,
            orderDate,
            itemDescription,
            cost,
            shippingCost: 0,
            shippingAddress: "",
            trackingNumbers: [],
            sourceUrl: `https://www.amazon.com/gp/your-account/order-details?orderID=${orderId}`
          });
        }
        const nextUrl = findNextPageUrl(doc, html);
        return { orders, hasOlder, nextUrl };
      }
      function findOrdersInObject(obj, depth = 0) {
        if (depth > 8 || obj == null || typeof obj !== "object") return [];
        if (Array.isArray(obj)) {
          if (obj.length > 0 && typeof obj[0] === "object" && obj[0] !== null) {
            const first = obj[0];
            if ("orderId" in first || "orderNo" in first || "id" in first) {
              return obj;
            }
          }
          for (const item of obj) {
            const result = findOrdersInObject(item, depth + 1);
            if (result.length > 0) return result;
          }
        } else {
          const rec = obj;
          for (const key of ["orders", "orderHistory", "orderList", "orderItems"]) {
            if (Array.isArray(rec[key]) && rec[key].length > 0) return rec[key];
          }
          for (const val of Object.values(rec)) {
            const result = findOrdersInObject(val, depth + 1);
            if (result.length > 0) return result;
          }
        }
        return [];
      }
      function extractOrderFromJson(item, sinceDate) {
        const orderId = String(item.orderId ?? item.orderNo ?? item.id ?? "");
        if (!orderId || !/\d{3}-\d{7}-\d{7}/.test(orderId)) return "skip";
        const rawDate = String(item.orderPlacedDate ?? item.orderDate ?? item.placedDate ?? "");
        const d = rawDate ? new Date(rawDate) : null;
        if (!d || isNaN(d.getTime())) return "skip";
        if (d < sinceDate) return "older";
        const statusRaw = String(item.status ?? item.orderStatus ?? "").toLowerCase();
        if (/cancel|return|refund/.test(statusRaw)) return "skip";
        const totalObj = item.grandTotal ?? item.orderTotal ?? {};
        const cost = typeof totalObj === "number" ? totalObj : parseMoney(String(totalObj.amount ?? totalObj.value ?? 0));
        const lineItems = item.items ?? item.lineItems ?? [];
        const firstItem = lineItems[0] ?? {};
        const itemDescription = String(firstItem.title ?? firstItem.name ?? "").slice(0, 120);
        return {
          platform: "Amazon",
          orderNumber: orderId,
          orderDate: d.toISOString().split("T")[0],
          itemDescription,
          cost,
          shippingCost: 0,
          shippingAddress: "",
          trackingNumbers: [],
          sourceUrl: `https://www.amazon.com/gp/your-account/order-details?orderID=${orderId}`
        };
      }
      function findNextPageUrl(doc, html) {
        const nextEl = doc.querySelector(
          '.a-pagination .a-last:not(.a-disabled) a, [aria-label="Go to next page"], a[href*="startIndex"]'
        );
        if (nextEl?.href && nextEl.href.includes("startIndex")) return nextEl.href;
        const m = html.match(/startIndex=(\d+)[^"]*"[^>]*>(?:Next|›)/i);
        if (m) return `https://www.amazon.com/your-orders/orders?startIndex=${m[1]}`;
        return null;
      }
      async function enrichWithDetails(orders, onProgress) {
        for (let i = 0; i < orders.length; i++) {
          const o = orders[i];
          if (i % 3 === 0) onProgress(`Fetching details ${i + 1}/${orders.length}\u2026`);
          const result = await fetchPage(o.sourceUrl);
          if (!result) continue;
          const { doc, html } = result;
          const addrEl = doc.querySelector('.displayAddressDiv, [class*="ship-to"], #shipToData');
          if (addrEl) o.shippingAddress = (addrEl.textContent ?? "").replace(/\s+/g, " ").trim();
          const trackNums = /* @__PURE__ */ new Set();
          const patterns = [
            /trackingId[=\s"':]+([A-Z0-9]{10,30})/g,
            /\b(1Z[A-Z0-9]{16})\b/g,
            /\b([0-9]{20,22})\b/g
          ];
          for (const pat of patterns) {
            let m;
            while ((m = pat.exec(html)) !== null) trackNums.add(m[1]);
          }
          if (trackNums.size > 0) o.trackingNumbers = [...trackNums];
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
        const sinceDate = settings.amazonLastSync ? new Date(settings.amazonLastSync) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1e3);
        setBadge("\u2026");
        sendMessage({ type: "SYNC_STARTED", platform: "Amazon" });
        const allOrders = [];
        const seen = /* @__PURE__ */ new Set();
        let url = "https://www.amazon.com/your-orders/orders";
        let page = 1;
        while (url) {
          sendMessage({ type: "SYNC_PROGRESS", platform: "Amazon", scraped: allOrders.length, message: `Fetching page ${page}\u2026` });
          const result = await fetchPage(url);
          if (!result) break;
          const pageTitle = result.doc.title;
          const firstId = result.html.match(/\b(\d{3}-\d{7}-\d{7})\b/)?.[1] ?? "none";
          console.log(`[Amazon sync] page ${page} title="${pageTitle}" firstOrderId=${firstId} htmlLen=${result.html.length}`);
          const { orders, hasOlder, nextUrl } = parseOrdersFromPage(result.doc, result.html, sinceDate);
          console.log(`[Amazon sync] page ${page}: found ${orders.length} orders, hasOlder=${hasOlder}, nextUrl=${nextUrl}`);
          for (const o of orders) {
            if (!seen.has(o.orderNumber)) {
              seen.add(o.orderNumber);
              allOrders.push(o);
            }
          }
          if (hasOlder) break;
          if (orders.length === 0) break;
          if (page >= 20) break;
          url = nextUrl;
          page++;
          await new Promise((r) => setTimeout(r, 500));
        }
        sendMessage({ type: "SYNC_PROGRESS", platform: "Amazon", scraped: allOrders.length, message: `Found ${allOrders.length} orders` });
        if (allOrders.length === 0) {
          setBadge("\u2014");
          sendMessage({ type: "SYNC_DONE", result: { platform: "Amazon", scraped: 0, imported: 0, updated: 0 } });
          syncing = false;
          return;
        }
        sendMessage({ type: "SYNC_PROGRESS", platform: "Amazon", scraped: allOrders.length, message: `Fetching tracking & addresses for ${allOrders.length} orders\u2026` });
        await enrichWithDetails(
          allOrders,
          (msg) => sendMessage({ type: "SYNC_PROGRESS", platform: "Amazon", scraped: allOrders.length, message: msg })
        );
        try {
          const result = await pushOrders(settings.trackerUrl, settings.apiKey, settings.userId, allOrders);
          await setLastSync("amazon", (/* @__PURE__ */ new Date()).toISOString().split("T")[0]);
          setBadge(`+${result.imported}`, "#22c55e");
          sendMessage({ type: "SYNC_DONE", result: { platform: "Amazon", scraped: allOrders.length, ...result } });
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
