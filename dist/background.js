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

  // src/lib/access.ts
  var init_access = __esm({
    "src/lib/access.ts"() {
      "use strict";
    }
  });

  // src/lib/tracker-script.ts
  function hostPatternFor(trackerUrl) {
    try {
      const u = new URL(trackerUrl.startsWith("http") ? trackerUrl : `http://${trackerUrl}`);
      return `*://${u.hostname}/*`;
    } catch {
      return null;
    }
  }
  async function registerTrackerScript(pattern) {
    try {
      await chrome.scripting.unregisterContentScripts({ ids: [TRACKER_SCRIPT_ID] });
    } catch {
    }
    await chrome.scripting.registerContentScripts([{
      id: TRACKER_SCRIPT_ID,
      matches: [pattern],
      js: ["content/tracker-status.js"],
      runAt: "document_idle"
    }]);
  }
  async function ensureTrackerScriptRegistered(trackerUrl) {
    const pattern = hostPatternFor(trackerUrl);
    if (!pattern) return;
    const has = await chrome.permissions.contains({ origins: [pattern] }).catch(() => false);
    if (!has) return;
    await registerTrackerScript(pattern);
  }
  var TRACKER_SCRIPT_ID;
  var init_tracker_script = __esm({
    "src/lib/tracker-script.ts"() {
      "use strict";
      init_access();
      TRACKER_SCRIPT_ID = "tracker-status";
    }
  });

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

  // src/lib/amazonCapture.ts
  function classifyAmazonUrl(rawUrl) {
    let u;
    try {
      u = new URL(rawUrl);
    } catch {
      return null;
    }
    if (u.protocol !== "https:" || u.hostname !== "www.amazon.com") return null;
    const p = u.pathname.replace(/\/+$/, "");
    if (p === "/your-orders/orders" || p === "/gp/css/order-history" || p === "/gp/your-account/order-history") return "orders";
    if (p === "/gp/your-account/order-details" || p === "/your-orders/order-details" || p === "/gp/css/summary/edit.html") return "detail";
    if (p === "/progress-tracker/package" || p.startsWith("/progress-tracker/package/") || p === "/gp/your-account/ship-track" || p === "/gp/css/shiptrack/view.html") return "tracking";
    return null;
  }
  function isDuplicate(seen, hash, now, windowMs = DEDUPE_WINDOW_MS) {
    const t = seen[hash];
    return typeof t === "number" && now - t < windowMs;
  }
  function markSeen(seen, hash, now, windowMs = DEDUPE_WINDOW_MS) {
    const out = {};
    for (const [h, t] of Object.entries(seen)) if (now - t < windowMs) out[h] = t;
    out[hash] = now;
    return out;
  }
  function enqueue(queue, item, maxEntries = QUEUE_MAX_ENTRIES, maxBytes = QUEUE_MAX_BYTES) {
    const q = queue.filter((i) => i.hash !== item.hash);
    q.push(item);
    while (q.length > maxEntries) q.shift();
    let total = q.reduce((n, i) => n + i.html.length, 0);
    while (q.length > 1 && total > maxBytes) {
      total -= q[0].html.length;
      q.shift();
    }
    return q;
  }
  function unwrapPageResponse(body) {
    const b = body ?? {};
    return b.result && typeof b.result === "object" ? b.result : {};
  }
  function summarizeResult(r) {
    if (r.blocked) return "ignored (sign-in or block page)";
    if (r.parseFailed) return "could not parse page";
    const parts = [];
    const verb = r.mode === "compare" ? ["would create", "would update"] : ["new", "updated"];
    if (r.created) parts.push(`${r.created} ${verb[0]}`);
    if (r.updated) parts.push(`${r.updated} ${verb[1]}`);
    if (r.unchanged) parts.push(`${r.unchanged} unchanged`);
    if (r.discrepancies) parts.push(`${r.discrepancies} needs review`);
    const text = parts.length ? parts.join(", ") : "nothing found";
    return r.mode === "compare" ? `${text} (compare only)` : text;
  }
  var DEDUPE_WINDOW_MS, QUEUE_MAX_ENTRIES, QUEUE_MAX_BYTES;
  var init_amazonCapture = __esm({
    "src/lib/amazonCapture.ts"() {
      "use strict";
      DEDUPE_WINDOW_MS = 10 * 60 * 1e3;
      QUEUE_MAX_ENTRIES = 20;
      QUEUE_MAX_BYTES = 6e6;
    }
  });

  // src/background/amazonCapture.ts
  function today() {
    const d = /* @__PURE__ */ new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function upgradeUrl(trackerUrl) {
    const stripped = trackerUrl.replace(/\/$/, "");
    if (/^http:\/\/(localhost|\d)/i.test(stripped)) return stripped;
    return stripped.replace(/^http:\/\//i, "https://");
  }
  async function getStats() {
    const r = await chrome.storage.local.get(K_STATS);
    const s = r[K_STATS];
    if (!s || s.day !== today()) return { day: today(), sentToday: 0, lastAt: s?.lastAt ?? 0, lastOk: s?.lastOk ?? true, lastText: s?.lastText ?? "" };
    return s;
  }
  async function setStats(s) {
    await chrome.storage.local.set({ [K_STATS]: s });
    try {
      const queued = (await chrome.storage.local.get(K_QUEUE))[K_QUEUE]?.length ?? 0;
      const text = queued > 0 ? `!${queued}` : s.sentToday > 0 ? String(s.sentToday) : "";
      await chrome.action.setBadgeText({ text });
      await chrome.action.setBadgeBackgroundColor({ color: queued > 0 ? "#d97706" : "#16a34a" });
    } catch {
    }
  }
  async function postPage(item) {
    const { trackerUrl, apiKey, extensionSecret, userId } = await getSettings();
    if (!trackerUrl) throw new Error("tracker URL not set");
    const res = await fetch(`${upgradeUrl(trackerUrl)}/api/extension/amazon-page`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...apiKey ? { "X-API-Key": apiKey } : {},
        ...extensionSecret ? { "X-Extension-Secret": extensionSecret } : {},
        ...userId ? { "X-Extension-User-Id": userId } : {}
      },
      body: JSON.stringify({ url: item.url, kind: item.kind, html: item.html, hash: item.hash, capturedAt: item.capturedAt, ...item.trackRun ? { trackRun: true } : {} })
    });
    if (!res.ok) {
      const err = new Error(`tracker responded ${res.status}`);
      err.permanent = res.status >= 400 && res.status < 500 && ![401, 403, 408, 429].includes(res.status);
      throw err;
    }
    return unwrapPageResponse(await res.json().catch(() => null));
  }
  async function recordResult(r) {
    const s = await getStats();
    s.sentToday += 1;
    s.lastAt = Date.now();
    s.lastOk = true;
    s.lastText = summarizeResult(r);
    await setStats(s);
  }
  async function recordFailure(msg) {
    const s = await getStats();
    s.lastAt = Date.now();
    s.lastOk = false;
    s.lastText = `send failed: ${msg}; queued for retry`;
    await setStats(s);
  }
  async function handleCapture(msg, force = false, trackRun = false) {
    const kind = classifyAmazonUrl(msg.url);
    if (!kind || typeof msg.html !== "string" || !msg.hash) return { ok: false, reason: "rejected" };
    const now = Date.now();
    const seen = (await chrome.storage.local.get(K_SEEN))[K_SEEN] ?? {};
    if (!force && isDuplicate(seen, msg.hash, now)) return { ok: true, duplicate: true };
    await chrome.storage.local.set({ [K_SEEN]: markSeen(seen, msg.hash, now) });
    const item = { url: msg.url, kind, html: msg.html, hash: msg.hash, capturedAt: now, attempts: 0, ...trackRun ? { trackRun: true } : {} };
    try {
      const result = await postPage(item);
      await recordResult(result);
      return { ok: true, result };
    } catch (e) {
      const permanent = e.permanent === true;
      if (!permanent) {
        const q = (await chrome.storage.local.get(K_QUEUE))[K_QUEUE] ?? [];
        await chrome.storage.local.set({ [K_QUEUE]: enqueue(q, item) });
      }
      await recordFailure(String(e.message || e));
      return { ok: false, queued: !permanent };
    }
  }
  async function flushQueue() {
    const q = (await chrome.storage.local.get(K_QUEUE))[K_QUEUE] ?? [];
    if (!q.length) return;
    const remaining = [];
    for (let i = 0; i < q.length; i++) {
      const item = q[i];
      try {
        const result = await postPage(item);
        await recordResult(result);
      } catch (e) {
        const permanent = e.permanent === true;
        item.attempts += 1;
        if (!permanent && item.attempts < 20) remaining.push(item);
        if (!permanent) {
          remaining.push(...q.slice(i + 1));
          break;
        }
      }
    }
    await chrome.storage.local.set({ [K_QUEUE]: remaining });
    await setStats(await getStats());
  }
  async function getCaptureStatus() {
    const q = (await chrome.storage.local.get(K_QUEUE))[K_QUEUE] ?? [];
    return { ...await getStats(), queued: q.length };
  }
  async function saveRun(text, status) {
    await chrome.storage.local.set({ amazonLastRun: { at: Date.now(), text, status } });
  }
  async function getLastRun() {
    return (await chrome.storage.local.get("amazonLastRun")).amazonLastRun ?? null;
  }
  async function reportRun(summary) {
    try {
      const { trackerUrl, apiKey, extensionSecret, userId } = await getSettings();
      if (!trackerUrl) return;
      await fetch(`${upgradeUrl(trackerUrl)}/api/extension/amazon-run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...apiKey ? { "X-API-Key": apiKey } : {},
          ...extensionSecret ? { "X-Extension-Secret": extensionSecret } : {},
          ...userId ? { "X-Extension-User-Id": userId } : {}
        },
        body: JSON.stringify(summary)
      });
    } catch {
    }
  }
  var K_QUEUE, K_SEEN, K_STATS;
  var init_amazonCapture2 = __esm({
    "src/background/amazonCapture.ts"() {
      "use strict";
      init_storage();
      init_amazonCapture();
      K_QUEUE = "amazonCaptureQueue";
      K_SEEN = "amazonCaptureSeen";
      K_STATS = "amazonCaptureStats";
    }
  });

  // src/lib/syncRun.ts
  function paceDelay(baseMs, rnd = Math.random) {
    if (rnd() < 1 / 6) return Math.round(baseMs * (3 + 2 * rnd()));
    return Math.round(baseMs * (0.75 + 1.5 * rnd()));
  }
  function shuffled(items, rnd = Math.random) {
    const a = items.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function formatRunSummary(s) {
    if (s.status === "blocked") return `blocked after ${s.pages} page(s); tab left open for you`;
    const compare = s.mode === "compare";
    let base = `${s.pages} page(s): ${s.created} ${compare ? "would create" : "new"}, ${s.updated} ${compare ? "would update" : "updated"}, ${s.unchanged} unchanged, ${s.discrepancies} needs review`;
    if (s.ignored) base += ` (${s.ignored} page ignored as sign-in/block)`;
    if (s.unparsed) base += ` (${s.unparsed} page could not be parsed)`;
    if (compare) base += " (compare only)";
    return s.status === "capped" ? `${base} (page cap reached)` : s.status === "error" ? `${base} (${s.message})` : base;
  }
  function createSyncRunner(deps2) {
    let running = false;
    async function run(opts = {}) {
      if (running) return { started: false, reason: "a sync is already running" };
      running = true;
      const maxPages = opts.maxPages ?? DEFAULT_MAX_PAGES;
      const paceMs = opts.paceMs ?? DEFAULT_PACE_MS;
      const sum = { status: "done", pages: 0, created: 0, updated: 0, unchanged: 0, discrepancies: 0, message: "" };
      let tabId = null;
      let consecutiveTimeouts = 0;
      const needs = /* @__PURE__ */ new Map();
      const visit = async (url) => {
        if (!classifyAmazonUrl(url)) return { kind: "error", message: "skipped non-order url" };
        if (sum.pages >= maxPages) {
          sum.status = "capped";
          return null;
        }
        if (tabId === null) {
          tabId = await deps2.openTab(url);
        } else {
          await deps2.sleep(paceDelay(paceMs));
          await deps2.navigate(tabId, url);
        }
        sum.pages += 1;
        const out = await deps2.waitForOutcome(tabId);
        if (out.kind === "blocked") {
          sum.status = "blocked";
          sum.blockedUrl = void 0;
          sum.message = "sign-in, CAPTCHA or block page";
          return null;
        }
        if (out.kind === "timeout") {
          consecutiveTimeouts += 1;
          if (consecutiveTimeouts >= 3) {
            sum.status = "error";
            sum.message = "pages did not load";
            return null;
          }
        } else {
          consecutiveTimeouts = 0;
        }
        if (out.kind === "result") {
          sum.created += out.result.created ?? 0;
          sum.updated += out.result.updated ?? 0;
          sum.unchanged += out.result.unchanged ?? 0;
          sum.discrepancies += out.result.discrepancies ?? 0;
          if (out.result.blocked) sum.ignored = (sum.ignored ?? 0) + 1;
          if (out.result.parseFailed) sum.unparsed = (sum.unparsed ?? 0) + 1;
          if (out.result.mode) sum.mode = out.result.mode;
        }
        return out;
      };
      try {
        if (opts.orders) {
          outer: for (const o of opts.orders) {
            const out = await visit(detailUrlFor(o));
            if (!out) break;
            const trackUrls = out.kind === "result" ? (out.result.detail?.trackUrls ?? []).slice(0, MAX_TRACK_PAGES_PER_ORDER) : [];
            for (const u of trackUrls) {
              if (!await visit(u)) break outer;
            }
          }
          return sum;
        }
        let listUrl = opts.startUrl ?? START_URL;
        const seenLists = /* @__PURE__ */ new Set();
        while (listUrl && !seenLists.has(listUrl)) {
          seenLists.add(listUrl);
          const out = await visit(listUrl);
          if (!out) break;
          const list = out.kind === "result" ? out.result.list : void 0;
          for (const n of list?.needs ?? []) if (!needs.has(n.orderNumber)) needs.set(n.orderNumber, n);
          if (!list || list.reachedWindow || list.allComplete || !list.nextUrl) break;
          listUrl = list.nextUrl;
        }
        if (sum.status === "done") {
          outer: for (const n of shuffled([...needs.values()])) {
            const urls = [n.detailUrl, n.trackUrls?.[0]].filter((u) => !!u);
            for (const u of urls) {
              const out = await visit(u);
              if (!out) break outer;
            }
          }
        }
      } catch (e) {
        sum.status = "error";
        sum.message = String(e.message || e);
      } finally {
        if (tabId !== null && sum.status !== "blocked") {
          try {
            await deps2.closeTab(tabId);
          } catch {
          }
        }
        running = false;
      }
      return sum;
    }
    return { run, isRunning: () => running };
  }
  var START_URL, DEFAULT_MAX_PAGES, DEFAULT_PACE_MS, MAX_TRACK_PAGES_PER_ORDER, detailUrlFor;
  var init_syncRun = __esm({
    "src/lib/syncRun.ts"() {
      "use strict";
      init_amazonCapture();
      START_URL = "https://www.amazon.com/your-orders/orders?timeFilter=last30";
      DEFAULT_MAX_PAGES = 40;
      DEFAULT_PACE_MS = 4e3;
      MAX_TRACK_PAGES_PER_ORDER = 3;
      detailUrlFor = (orderNumber) => `https://www.amazon.com/gp/your-account/order-details?orderID=${encodeURIComponent(orderNumber)}`;
    }
  });

  // src/background/amazonRun.ts
  async function rememberRunTab(tabId, windowId) {
    try {
      await store().set({ [RUN_TAB_KEY]: { tabId, windowId } });
    } catch {
    }
  }
  async function forgetRunTab() {
    try {
      await store().remove(RUN_TAB_KEY);
    } catch {
    }
  }
  async function keepAwake(work) {
    const t = setInterval(() => {
      chrome.runtime.getPlatformInfo().catch(() => {
      });
    }, KEEPALIVE_MS);
    try {
      return await work();
    } finally {
      clearInterval(t);
      await forgetRunTab();
    }
  }
  async function closeOrphanRunTab() {
    if (runner.isRunning()) return;
    try {
      const got = await store().get(RUN_TAB_KEY);
      const rec = got[RUN_TAB_KEY];
      if (!rec) return;
      await forgetRunTab();
      if (typeof rec.windowId === "number") await chrome.windows.remove(rec.windowId).catch(() => {
      });
      else if (typeof rec.tabId === "number") await chrome.tabs.remove(rec.tabId).catch(() => {
      });
      await saveRun("stopped early; tab closed", "error");
    } catch {
    }
  }
  function expect(tabId) {
    return new Promise((resolve) => {
      const done = (o) => {
        clearTimeout(t);
        pending.delete(tabId);
        resolve(o);
      };
      const t = setTimeout(() => done({ kind: "timeout" }), WAIT_MS);
      pending.set(tabId, done);
      const e = early.get(tabId);
      if (e) {
        early.delete(tabId);
        done(e);
      }
    });
  }
  function isRunTab(tabId) {
    return tabId !== void 0 && tabId === runTabId;
  }
  function notifyOutcome(tabId, outcome) {
    if (!isRunTab(tabId)) return;
    const p = pending.get(tabId);
    if (p) p(outcome);
    else early.set(tabId, outcome);
  }
  async function startAmazonRun() {
    await saveRun("running...", "running");
    const out = await keepAwake(() => runner.run());
    runTabId = null;
    if ("started" in out) return { started: false, reason: out.reason };
    const text = formatRunSummary(out);
    await saveRun(text, out.status);
    await reportRun({ ...out, text });
    return { ...out, text };
  }
  async function startTrackingRun(orders) {
    if (runner.isRunning()) return { started: false, reason: "a sync is already running" };
    background = true;
    runWindowId = null;
    try {
      const out = await keepAwake(() => runner.run({ orders, maxPages: orders.length * 4 }));
      if ("started" in out) return { started: false, reason: out.reason };
      const text = `tracking: ${formatRunSummary(out)}`;
      await saveRun(text, out.status);
      return { ...out, text };
    } finally {
      background = false;
      runWindowId = null;
      runTabId = null;
    }
  }
  function isTrackRunTab(tabId) {
    return background && isRunTab(tabId);
  }
  function amazonRunActive() {
    return runner.isRunning();
  }
  var WAIT_MS, pending, early, runTabId, background, runWindowId, RUN_TAB_KEY, KEEPALIVE_MS, store, waiter, deps, runner;
  var init_amazonRun = __esm({
    "src/background/amazonRun.ts"() {
      "use strict";
      init_syncRun();
      init_amazonCapture2();
      WAIT_MS = 3e4;
      pending = /* @__PURE__ */ new Map();
      early = /* @__PURE__ */ new Map();
      runTabId = null;
      background = false;
      runWindowId = null;
      RUN_TAB_KEY = "amazonRunTab";
      KEEPALIVE_MS = 2e4;
      store = () => chrome.storage.session ?? chrome.storage.local;
      waiter = null;
      deps = {
        async openTab(url) {
          let tab;
          if (background) {
            try {
              const win = await chrome.windows.create({ url, state: "minimized", focused: false });
              runWindowId = win?.id ?? null;
              tab = win?.tabs?.[0];
            } catch {
              tab = await chrome.tabs.create({ url, active: false });
            }
          } else {
            tab = await chrome.tabs.create({ url, active: true });
          }
          if (!tab?.id) throw new Error("could not open a tab");
          runTabId = tab.id;
          early.delete(tab.id);
          waiter = expect(tab.id);
          await rememberRunTab(tab.id, runWindowId);
          return tab.id;
        },
        async navigate(tabId, url) {
          early.delete(tabId);
          waiter = expect(tabId);
          await chrome.tabs.update(tabId, background ? { url } : { url, active: true });
        },
        async waitForOutcome() {
          return waiter ?? { kind: "timeout" };
        },
        async closeTab(tabId) {
          if (runWindowId !== null) await chrome.windows.remove(runWindowId);
          else await chrome.tabs.remove(tabId);
        },
        sleep: (ms) => new Promise((r) => setTimeout(r, ms))
      };
      chrome.tabs.onRemoved.addListener((tabId) => {
        if (tabId === runTabId) {
          notifyOutcome(tabId, { kind: "error", message: "tab closed" });
        }
      });
      runner = createSyncRunner(deps);
    }
  });

  // src/lib/trackCommand.ts
  function trackCommandPlan(payloadJson, settingsUserId, runActive) {
    if (runActive) return { action: "wait" };
    let p = null;
    try {
      p = payloadJson ? JSON.parse(payloadJson) : null;
    } catch {
      p = null;
    }
    if (!p || !Array.isArray(p.orderNumbers)) return { action: "fail", error: "bad payload" };
    if (p.userId != null && String(p.userId) !== String(settingsUserId ?? "")) {
      return { action: "fail", error: `orders belong to user ${String(p.userId)}, this extension is user ${String(settingsUserId ?? "unset")}` };
    }
    const orders = [...new Set(p.orderNumbers.map((o) => String(o).trim()).filter((o) => AMAZON_ORDER.test(o)))];
    if (!orders.length) return { action: "fail", error: "no Amazon order numbers" };
    return { action: "run", orders };
  }
  var AMAZON_ORDER;
  var init_trackCommand = __esm({
    "src/lib/trackCommand.ts"() {
      "use strict";
      AMAZON_ORDER = /^\d{3}-\d{7}-\d{7}$/;
    }
  });

  // src/lib/browserTarget.ts
  function extensionBrowser(extensionBaseUrl) {
    return extensionBaseUrl.startsWith("moz-extension://") ? "firefox" : "chrome";
  }
  var init_browserTarget = __esm({
    "src/lib/browserTarget.ts"() {
      "use strict";
    }
  });

  // src/background/index.ts
  var require_background = __commonJS({
    "src/background/index.ts"() {
      init_tracker_script();
      init_amazonCapture2();
      init_amazonRun();
      init_trackCommand();
      init_browserTarget();
      var ICON_PATHS_CHROME = { 16: "icons/icon16.png", 32: "icons/icon32.png", 48: "icons/icon48.png", 128: "icons/icon128.png" };
      var ICON_PATH_FIREFOX = "icons/icon.svg";
      var _browser = globalThis.browser;
      var extAction = (_browser ?? chrome).action;
      var isFirefox = extensionBrowser((_browser ?? chrome).runtime.getURL("")) === "firefox";
      function setToolbarIcon() {
        if (isFirefox) {
          extAction?.setIcon({ path: ICON_PATH_FIREFOX });
        } else {
          extAction?.setIcon({ path: ICON_PATHS_CHROME });
        }
      }
      setToolbarIcon();
      function reregisterTrackerScript() {
        Promise.resolve().then(() => (init_storage(), storage_exports)).then((m) => m.getSettings()).then(({ trackerUrl }) => {
          if (trackerUrl) ensureTrackerScriptRegistered(trackerUrl).catch(() => {
          });
        }).catch(() => {
        });
      }
      flushQueue().catch(() => {
      });
      chrome.runtime.onInstalled.addListener(() => {
        console.log("[Reselling Tracker] Extension installed.");
        setToolbarIcon();
        chrome.alarms.create("pollCommands", { when: Date.now() + 2e3, periodInMinutes: 1 });
        pollAndExecuteCommands().catch(console.error);
        reregisterTrackerScript();
      });
      chrome.runtime.onStartup.addListener(() => {
        setToolbarIcon();
        chrome.alarms.create("pollCommands", { when: Date.now() + 2e3, periodInMinutes: 1 });
        pollAndExecuteCommands().catch(console.error);
        reregisterTrackerScript();
      });
      chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === "pollCommands") {
          pollAndExecuteCommands().catch(console.error);
          flushQueue().catch(console.error);
        }
      });
      var PLATFORM_CONFIG = {
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
        if (message.type === "SCRAPE_LOG") {
          const fn = message.level === "warn" ? console.warn : console.log;
          fn(...message.args ?? []);
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
        if (message.type === "FETCH_HTML" || message.type === "FETCH_IMAGE_BYTES") {
          if (/(^|\.)amazon\.com$/i.test((() => {
            try {
              return new URL(String(message.url)).hostname;
            } catch {
              return "";
            }
          })())) {
            sendResponse({ error: "Amazon is passive-only; the extension does not fetch Amazon URLs" });
            return true;
          }
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
        if (message.type === "AMAZON_PAGE_CAPTURE") {
          const tabId = sender.tab?.id;
          handleCapture(message, isRunTab(tabId), isTrackRunTab(tabId)).then((r) => {
            if ("result" in r && r.result) notifyOutcome(tabId, { kind: "result", result: r.result });
            else if (!r.ok) notifyOutcome(tabId, { kind: "error", message: "send failed" });
            else notifyOutcome(tabId, { kind: "result", result: {} });
            sendResponse(r);
          }).catch((e) => {
            notifyOutcome(tabId, { kind: "error", message: String(e) });
            sendResponse({ ok: false, error: String(e) });
          });
          return true;
        }
        if (message.type === "AMAZON_PAGE_SKIPPED") {
          notifyOutcome(sender.tab?.id, { kind: "error", message: "page skipped" });
          return false;
        }
        if (message.type === "AMAZON_PAGE_BLOCKED") {
          notifyOutcome(sender.tab?.id, { kind: "blocked" });
          return false;
        }
        if (message.type === "AMAZON_SYNC_NOW") {
          if (amazonRunActive()) {
            sendResponse({ started: false, reason: "a sync is already running" });
            return false;
          }
          startAmazonRun().catch(console.error);
          sendResponse({ started: true });
          return false;
        }
        if (message.type === "AMAZON_CAPTURE_STATUS") {
          Promise.all([getCaptureStatus(), getLastRun()]).then(([st, run]) => sendResponse({ ...st, run, running: amazonRunActive() })).catch(() => sendResponse(null));
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
          handlePushBigskyOrders(message.trackerUrl, message.apiKey, message.userId, message.groups, message.notCheckedInTracking).then(sendResponse).catch((e) => sendResponse({ error: String(e) }));
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
        return _apiLogQueue;
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
        const base = upgradeUrl2(trackerUrl);
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
          if (cmd.type === "TRACK_AMAZON") {
            const plan = trackCommandPlan(cmd.payload, userId, amazonRunActive());
            if (plan.action === "wait") continue;
            await patchCommand(base, cmd.id, "running", headers);
            if (plan.action === "fail") {
              await patchCommand(base, cmd.id, "failed", headers, { error: plan.error });
              continue;
            }
            try {
              const out = await startTrackingRun(plan.orders);
              const status = out.status;
              if (out.started === false) await patchCommand(base, cmd.id, "failed", headers, { error: String(out.reason) });
              else if (status === "blocked") await patchCommand(base, cmd.id, "failed", headers, { blocked: true, error: "sign-in, CAPTCHA or block page", text: out.text });
              else if (status === "error") await patchCommand(base, cmd.id, "failed", headers, { error: String(out.message || "run failed"), text: out.text });
              else await patchCommand(base, cmd.id, "done", headers, out);
            } catch (e) {
              await patchCommand(base, cmd.id, "failed", headers, { error: String(e) });
            }
            continue;
          }
          await patchCommand(base, cmd.id, "running", headers);
          try {
            let result;
            if (cmd.type === "SYNC_AMAZON" || cmd.type === "SYNC_AMAZON_ORDER") {
              throw new Error("Amazon sync is disabled; use Sync Amazon (visible tab) or just browse your orders.");
            } else if (cmd.type === "SYNC_AMAZON_PAGES") {
              result = await startAmazonRun();
            } else if (cmd.type === "SYNC_WALMART") result = await runSyncCommand("Walmart");
            else if (cmd.type === "SYNC_COSTCO") result = await runSyncCommand("Costco");
            else if (cmd.type === "SYNC_BIGSKY") result = await runSyncCommand("BigSkyBuyers");
            else if (cmd.type === "SCRAPE_CBM") result = await runScrapeCbm(base, headers, cmd.payload);
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
      async function handlePushBigskyOrders(trackerUrl, apiKey, userId, groups, notCheckedInTracking) {
        const url = `${upgradeUrl2(trackerUrl)}/api/bigsky/sync-orders`;
        const { extensionSecret } = await Promise.resolve().then(() => (init_storage(), storage_exports)).then((m) => m.getSettings());
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...userId ? { "X-Extension-User-Id": userId } : {},
            ...apiKey ? { "X-API-Key": apiKey } : {},
            ...extensionSecret ? { "X-Extension-Secret": extensionSecret } : {}
          },
          body: JSON.stringify({ groups, notCheckedInTracking: notCheckedInTracking ?? [] })
        });
        if (!res.ok) {
          const text = await res.text().catch(() => res.statusText);
          throw new Error(`Tracker API error ${res.status} (${url}): ${text}`);
        }
        return res.json();
      }
      function upgradeUrl2(trackerUrl) {
        const stripped = trackerUrl.replace(/\/$/, "");
        if (/^http:\/\/(localhost|\d)/i.test(stripped)) return stripped;
        return stripped.replace(/^http:\/\//i, "https://");
      }
      async function handleFetchUsers(trackerUrl) {
        const url = `${upgradeUrl2(trackerUrl)}/api/users`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
        return res.json();
      }
      async function handlePushCostcoReceipts(trackerUrl, apiKey, userId, receipts, receiptHtml) {
        const url = `${upgradeUrl2(trackerUrl)}/api/costco/receipts`;
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
        const url = `${upgradeUrl2(trackerUrl)}/api/import`;
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
            // Scraped total "Earns X% back[, extra Y%]" rate — disambiguates
            // last4 matches against multiple saved cards sharing one physical
            // card at different bonus-rate tiers (e.g. Amazon Store Card).
            ...o.paymentRatePercent != null ? { paymentRatePercent: o.paymentRatePercent } : {},
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
      closeOrphanRunTab();
    }
  });
  require_background();
})();
