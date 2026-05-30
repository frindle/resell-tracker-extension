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

  // src/content/walmart.ts
  var require_walmart = __commonJS({
    "src/content/walmart.ts"() {
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
      async function fetchOrderPage(page = 1) {
        try {
          const url = `https://www.walmart.com/orders?page=${page}`;
          const res = await fetch(url, { credentials: "include" });
          if (!res.ok) return null;
          const html = await res.text();
          return new DOMParser().parseFromString(html, "text/html");
        } catch {
          return null;
        }
      }
      async function fetchOrderDetail(orderNumber) {
        try {
          const url = `https://www.walmart.com/orders/${orderNumber}`;
          const res = await fetch(url, { credentials: "include" });
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
        const nextDataEl = doc.getElementById("__NEXT_DATA__");
        if (nextDataEl?.textContent) {
          try {
            const json = JSON.parse(nextDataEl.textContent);
            const pageProps = json?.props?.pageProps ?? json?.props ?? {};
            const orderList = pageProps?.initialData?.data?.customer?.orderHistoryData?.orderHistory?.orders ?? pageProps?.orders ?? pageProps?.data?.orders ?? [];
            for (const raw of orderList) {
              const item = raw;
              const orderNumber = String(item.orderNo ?? item.orderId ?? item.id ?? "").replace(/\D/g, "");
              if (!orderNumber) continue;
              const rawDate = String(item.orderDate ?? item.placedDate ?? item.createdDate ?? "");
              if (!rawDate) continue;
              const orderDate = new Date(rawDate);
              if (isNaN(orderDate.getTime())) continue;
              if (orderDate < sinceDate) {
                hasOlder = true;
                continue;
              }
              const statusRaw = String(item.status ?? item.orderStatus ?? "").toLowerCase();
              if (/cancel|return|refund/.test(statusRaw)) continue;
              const costRaw = item.orderTotal ?? item.total ?? item.grandTotal ?? 0;
              const cost = typeof costRaw === "number" ? costRaw : parseMoney(String(costRaw));
              const lineItems = item.lineItems ?? item.items ?? [];
              const firstItem = lineItems[0];
              const itemDescription = String(firstItem?.name ?? firstItem?.title ?? firstItem?.productName ?? "").slice(0, 120);
              orders.push({
                platform: "Walmart",
                orderNumber,
                orderDate: orderDate.toISOString().split("T")[0],
                itemDescription,
                cost,
                shippingCost: 0,
                shippingAddress: "",
                trackingNumbers: [],
                sourceUrl: `https://www.walmart.com/orders/${orderNumber}`
              });
            }
            return { orders, hasOlder };
          } catch {
          }
        }
        const blocks = Array.from(doc.querySelectorAll(
          '[data-automation-id*="order-card"], [data-testid*="order"], .order-card, article[class*="order"]'
        ));
        for (const block of blocks) {
          const orderNumEl = block.querySelector('[data-automation-id*="order-number"], [class*="order-number"], [class*="orderNumber"]');
          const orderNumber = (orderNumEl?.textContent ?? "").replace(/\D/g, "");
          if (!orderNumber) continue;
          const dateEl = block.querySelector('[data-automation-id*="order-date"], [class*="order-date"], time');
          const rawDate = dateEl?.getAttribute("datetime") ?? dateEl?.textContent ?? "";
          const orderDate = new Date(rawDate);
          if (isNaN(orderDate.getTime())) continue;
          if (orderDate < sinceDate) {
            hasOlder = true;
            continue;
          }
          const statusEl = block.querySelector('[data-automation-id*="delivery-status"], [class*="status"]');
          const statusText = (statusEl?.textContent ?? "").toLowerCase();
          if (/cancel|return|refund/.test(statusText)) continue;
          const totalEl = block.querySelector('[data-automation-id*="order-total"], [class*="total"]');
          const cost = parseMoney(totalEl?.textContent ?? "0");
          const itemEl = block.querySelector('[data-automation-id*="product-name"], [class*="product-name"]');
          const itemDescription = (itemEl?.textContent ?? "").trim().slice(0, 120);
          orders.push({
            platform: "Walmart",
            orderNumber,
            orderDate: orderDate.toISOString().split("T")[0],
            itemDescription,
            cost,
            shippingCost: 0,
            shippingAddress: "",
            trackingNumbers: [],
            sourceUrl: `https://www.walmart.com/orders/${orderNumber}`
          });
        }
        return { orders, hasOlder };
      }
      async function enrichWithDetails(orders, onProgress) {
        for (let i = 0; i < orders.length; i++) {
          const o = orders[i];
          if ((i + 1) % 3 === 0 || i === 0) {
            onProgress(`Fetching details ${i + 1}/${orders.length}\u2026`);
          }
          const doc = await fetchOrderDetail(o.orderNumber);
          if (!doc) continue;
          const html = doc.documentElement.innerHTML;
          const addrEl = doc.querySelector('[data-automation-id*="shipping-address"], [class*="shipping-address"]');
          if (addrEl) {
            o.shippingAddress = (addrEl.textContent ?? "").replace(/\s+/g, " ").trim();
          }
          const numbers = [];
          const trackPatterns = [
            /trackingNumber["\s:]+["']?([A-Z0-9]{10,25})/g,
            /\b(1Z[A-Z0-9]{16})\b/g,
            /\b([0-9]{20,22})\b/g
          ];
          for (const pat of trackPatterns) {
            let m;
            while ((m = pat.exec(html)) !== null) {
              numbers.push(m[1]);
            }
          }
          o.trackingNumbers = [...new Set(numbers)];
          await new Promise((r) => setTimeout(r, 400));
        }
      }
      var syncing = false;
      async function sync() {
        if (syncing) return;
        syncing = true;
        const settings = await getSettings();
        if (!settings.trackerUrl || !settings.userId) {
          sendMessage({ type: "SYNC_ERROR", platform: "Walmart", error: "Tracker URL or user not configured \u2014 open Settings." });
          setBadge("!", "#ef4444");
          syncing = false;
          return;
        }
        const sinceDate = settings.walmartLastSync ? new Date(settings.walmartLastSync) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
        setBadge("\u2026");
        sendMessage({ type: "SYNC_STARTED", platform: "Walmart" });
        const allOrders = [];
        const seen = /* @__PURE__ */ new Set();
        let page = 1;
        while (true) {
          sendMessage({ type: "SYNC_PROGRESS", platform: "Walmart", scraped: 0, message: `Fetching orders page ${page}\u2026` });
          const doc = await fetchOrderPage(page);
          if (!doc) break;
          const { orders, hasOlder } = parseOrdersFromDoc(doc, sinceDate);
          for (const o of orders) {
            if (!seen.has(o.orderNumber)) {
              seen.add(o.orderNumber);
              allOrders.push(o);
            }
          }
          if (hasOlder) break;
          if (orders.length === 0) break;
          if (page >= 15) break;
          const nextLink = doc.querySelector('[aria-label="Next page"], [data-automation-id*="next-page"]:not([disabled])');
          if (!nextLink) break;
          page++;
          await new Promise((r) => setTimeout(r, 500));
        }
        if (allOrders.length === 0) {
          setBadge("\u2014");
          sendMessage({ type: "SYNC_DONE", result: { platform: "Walmart", scraped: 0, imported: 0, updated: 0 } });
          syncing = false;
          return;
        }
        sendMessage({ type: "SYNC_PROGRESS", platform: "Walmart", scraped: allOrders.length, message: `Found ${allOrders.length} orders, fetching details\u2026` });
        await enrichWithDetails(
          allOrders,
          (msg) => sendMessage({ type: "SYNC_PROGRESS", platform: "Walmart", scraped: allOrders.length, message: msg })
        );
        try {
          const result = await pushOrders(settings.trackerUrl, settings.apiKey, settings.userId, allOrders);
          await setLastSync("walmart", (/* @__PURE__ */ new Date()).toISOString().split("T")[0]);
          setBadge(`+${result.imported}`, "#22c55e");
          sendMessage({ type: "SYNC_DONE", result: { platform: "Walmart", scraped: allOrders.length, ...result } });
        } catch (err) {
          setBadge("!", "#ef4444");
          sendMessage({ type: "SYNC_ERROR", platform: "Walmart", error: err instanceof Error ? err.message : String(err) });
        }
        syncing = false;
      }
      chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === "START_SYNC" && msg.platform === "Walmart") sync();
      });
    }
  });
  require_walmart();
})();
