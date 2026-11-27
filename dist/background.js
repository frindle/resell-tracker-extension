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
  async function saveSettings(settings2) {
    await chrome.storage.sync.set(settings2);
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

  // src/lib/scrapeConfig.default.json
  var scrapeConfig_default_default;
  var init_scrapeConfig_default = __esm({
    "src/lib/scrapeConfig.default.json"() {
      scrapeConfig_default_default = {
        version: 4,
        sites: {
          amazon: {
            selectors: {
              blockedSignIn: 'form[name="signIn"]:not(#ap_navbar_form), #ap_email, #ap_password, input[name="password"][type="password"]',
              blockedCaptcha: 'form[action*="validateCaptcha"], #captchacharacters, img[src*="captcha"]',
              stripElements: 'script, noscript, style, link, meta, iframe, svg, template, input[type="hidden"], [id^="shipToData-"]'
            },
            labels: {},
            patterns: {
              agentBlock: "unauthorized AI agent|violates Amazon'?s Conditions of Use|automated access",
              refSuffix: "\\/ref=[^/]*\\/?$",
              ordersPath: "^(?:/your-orders/orders|/gp/css/order-history|/gp/your-account/order-history)$",
              detailPath: "^(?:/gp/your-account/order-details|/your-orders/order-details|/gp/css/order-details|/gp/css/summary/edit\\.html)$",
              trackingPath: "^(?:/progress-tracker/package(?:/.*)?|/gp/your-account/ship-track|/gp/css/shiptrack/view\\.html)$"
            },
            urls: {
              host: "www.amazon.com"
            },
            timeoutsMs: {
              quietMs: 1500,
              maxWaitMs: 15e3,
              urlPollMs: 2e3,
              runWaitMs: 3e4
            }
          },
          costco: {
            selectors: {},
            labels: {
              refreshTokenKey: "refreshtoken",
              accessTokenKey: "accesstoken",
              msalKeyMarker: "a3a5186b",
              msalClientId: "a3a5186b-7c89-4b4c-93a8-dd604e930757",
              msalScope: "openid profile offline_access"
            },
            patterns: {
              warehouseKey: "store|warehouse|wh",
              warehouseValue: "^\\d{3,4}$",
              appIdHash: "^#\\/app\\/([^/]+)\\/"
            },
            urls: {
              tokenRefresh: "https://signin.costco.com/e0714dd4-784d-46d6-a278-3e29553483eb/B2C_1A_SSO_WCS_signup_signin_209/oauth2/v2.0/token",
              orderDetail: "https://www.costco.com/myaccount/#/app/4900eb1f-0c10-4bd9-99c3-c59e6c1ecebf/orderdetails/{orderNumber}",
              orders: "https://www.costco.com/myaccount/",
              orderDetailHash: "#/app/{appId}/orderdetails/{orderNumber}",
              apiHost: "ecom-api.costco.com",
              graphqlPath: "order/v1/orders/graphql"
            },
            timeoutsMs: {
              authWaitMs: 2e4,
              authPollMs: 1e3,
              pageDelayMs: 600,
              readyWaitMs: 45e3,
              syncTimeoutMs: 24e4,
              detailWaitMs: 2e4,
              ordersTimeoutMs: 3e5,
              detailDelayMs: 500,
              pollMs: 500
            }
          },
          walmart: {
            selectors: {
              orderBlocks: '[data-testid*="orderGroup"], [data-testid*="order-card"], [data-testid*="orderCard"]',
              orderCaption: '[id^="caption-"]',
              itemFallback: 'a[href*="/ip/"], [data-testid*="product"], [data-testid*="item"]',
              productName: '[data-testid="productName"]',
              nextPageLink: '[aria-label="Next page"]:not([disabled]) a, [data-automation-id*="next-page"]:not([disabled]) a, [aria-label="Next page"]:not([disabled])',
              nextPageButton: '[aria-label="Next page"]:not([disabled]), [data-automation-id*="next-page"]:not([disabled])',
              nextClick: '[aria-label="Next page"]:not([disabled]), [data-automation-id*="next-page"]:not([disabled]), button[aria-label*="next" i]:not([disabled])',
              nextData: "#__NEXT_DATA__",
              detailAddress: '[data-automation-id*="shipping-address"], [class*="shipping-address"], [class*="shippingAddress"]',
              detailTotal: '[data-automation-id*="order-total"], [class*="orderTotal"], [class*="order-total"]',
              detailItem: '[data-automation-id*="product-title"], [class*="product-title"], h2[class*="item"]',
              deliveryPhoto: 'img[alt="Proof of delivery location"], img[src*="/delivery-photo/"]'
            },
            labels: {
              groupsKeyPrefix: "groups_"
            },
            patterns: {
              cancelledOrReturned: "(?:\\b(?:cancell?ed|cancellation|returned|refunded)\\b|we had to cancel|we['\u2019]ve canceled|cancel these items|won['\u2019]t be charged|released the temporary hold)",
              captionOrderNumber: "caption-(\\d+)",
              orderNumberLabeled: "Order\\s*#?\\s*(\\d{10,})",
              orderNumberBare: "\\b(\\d{13,20})\\b",
              dateLabeledFull: "(?:Placed|Ordered|Delivered|on)\\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+\\d{1,2},?\\s+\\d{4})",
              dateFull: "\\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+\\d{1,2},?\\s+\\d{4})",
              dateLabeledNoYear: "(?:Placed|Ordered|Delivered|on)\\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+\\d{1,2})(?!\\d)",
              storePickup: "\\b(?:Free\\s+store\\s+pickup|Curbside\\s+pickup|Pickup\\s+at|Ready\\s+for\\s+pickup|Store\\s+Pickup|Pickup\\s+order)\\b",
              orderTotal: "Total\\s+\\$?([\\d,]+\\.?\\d*)",
              genericTitle: "^(Walmart\\.com|Walmart|Loading|\u2014|\u2014\\s*\u2014)$",
              genericTitleJson: "^(Walmart\\.com|Walmart|Loading)$",
              cardLast4: "(?:ending\\s+(?:in)?|\\*{2,}|\\.{2,})\\s*(\\d{4})\\b",
              trackingField: `trackingNumber["\\s:]+["']?([A-Z0-9]{10,25})`,
              trackingUps: "\\b(1Z[A-Z0-9]{16})\\b",
              trackingDigits: "\\b([0-9]{20,22})\\b",
              internalTracking: "^555\\d{15,}$",
              scriptBlock: "<script[^>]*>([\\s\\S]*?)<\\/script>",
              jsonOrderDate: '"orderDate":"([^"]+)"',
              jsonPlacedDate: '"placedDate":"([^"]+)"',
              jsonOrderPlacedDate: '"orderPlacedDate":"([^"]+)"',
              jsonCreatedDate: '"createdDate":"([^"]+)"',
              jsonCost: '"(?:totalAmount|financeTotal|orderTotal|grandTotal|chargeTotal|estimatedTotal|totalCharges|orderTotalAmount|total)"\\s*:\\s*([\\d.]+)',
              jsonProductName: '"(?:productName|itemDescription)"\\s*:\\s*"([^"]{5,120})"',
              htmlTotal: "(?:order\\s+)?total[^$\\d]{0,30}\\$\\s*([\\d,]+\\.?\\d*)",
              htmlPlaced: "[Pp]laced[^<]{0,80}?(\\d{4}-\\d{2}-\\d{2})",
              jsonLastFour: '"lastFour"\\s*:\\s*"?(\\d{4})"?',
              jsonLastFourDigits: '"lastFourDigits"\\s*:\\s*"?(\\d{4})"?',
              jsonCardLast4: '"cardLast4"\\s*:\\s*"?(\\d{4})"?',
              jsonLast4: '"last4"\\s*:\\s*"?(\\d{4})"?',
              jsonCardNumberLast4: '"cardNumberLast4"\\s*:\\s*"?(\\d{4})"?',
              jsonAccountNumberLast4: '"accountNumberLast4"\\s*:\\s*"?(\\d{4})"?',
              textEndingIn: "\\bending\\s+in\\s+(\\d{4})\\b",
              textEnding: "\\bending\\s+(\\d{4})\\b",
              textAsterisks: "\\*{2,}\\s*(\\d{4})\\b",
              textXs: "\\bx{4,}\\s*(\\d{4})\\b",
              textBullets: "[\u2022\xB7\u2024\u22C5\u25CF]{2,}\\s*(\\d{4})\\b",
              textHtmlBullet: "(?:&bull;|&middot;|&#x2022;|&#8226;){2,}\\s*(\\d{4})\\b",
              httpUrl: "^https?:\\/\\/"
            },
            urls: {
              orders: "https://www.walmart.com/orders",
              orderDetail: "https://www.walmart.com/orders/{orderNumber}",
              ordersPath: "/orders",
              purchasesPath: "/account/mypurchases"
            },
            timeoutsMs: {
              detailFetchMs: 5e3,
              firstLoadMs: 15e3,
              pageLoadMs: 12e3,
              loadPollMs: 400,
              resumeDelayMs: 2e3
            }
          },
          costcoEgift: {
            selectors: {
              clickables: 'button, a, [role="button"], input[type="button"], input[type="submit"]',
              emailInput: '#p2, input[type="email"], input[placeholder*="mail" i], input[name*="email" i], input[id*="email" i]',
              alert: 'div.ui-message[role="alert"], [role="alert"], .ui-messages-error, .ui-message-error, .ui-growl-message-error',
              submitButton: '#submitBtn, button[type="submit"], input[type="submit"]',
              buttons: "button",
              nextButton: 'input[id$="wdt-nav-next"], button[id$="wdt-nav-next"]',
              counter: "#wdt-page-counter",
              labelCells: "td, th, div, p, li, span, label",
              botCheck: 'iframe[src*="_Incapsula_Resource"], iframe[src*="captcha" i], iframe[title*="challenge" i]',
              itemTitle: "section.order-item .order-item-title",
              cardImage: "#print-content-section, #body-canvas"
            },
            labels: {
              openLabel: "Access eGift",
              nextLabel: "next",
              codeLabel: "Code:",
              pinLabel: "PIN:"
            },
            patterns: {
              nextButton: "^next\\b",
              alertText: "\\b(invalid|not match|incorrect|error|not found|unable|could ?n[o']t|not recogni[sz]ed|try again|not valid|no (?:order|record)s?)\\b",
              submitText: "submit|continue|next|view|access",
              code: "\\bCode:\\s*([A-Za-z0-9-]{4,64})",
              codeValue: "^[A-Za-z0-9][A-Za-z0-9 -]{2,62}[A-Za-z0-9]$",
              pin: "\\bPIN:\\s*([A-Za-z0-9]{2,32})",
              pinValue: "^[A-Za-z0-9]{2,32}$",
              sequence: "\\b(\\d{1,3})\\s+of\\s+(\\d{1,3})\\b",
              amount: "\\$\\s?(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})?|\\d+(?:\\.\\d{2})?)",
              botCheckText: "incapsula|incident id|additional security check|verify (?:that )?you are (?:a )?human|are you a robot|press (?:&|and) hold"
            },
            urls: {
              host: "www.memberedelivery.com"
            },
            timeoutsMs: {
              pollMs: 1500,
              waitMs: 4e4,
              stepDelayMs: 3e3,
              newTabWaitMs: 1e4
            }
          },
          bestbuyEgift: {
            selectors: {},
            labels: {},
            patterns: {},
            urls: {},
            timeoutsMs: {}
          }
        }
      };
    }
  });

  // src/lib/scrapeConfig.ts
  function isPlainObject(v) {
    if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
    const proto = Object.getPrototypeOf(v);
    return proto === Object.prototype || proto === null;
  }
  function validateScrapeConfig(raw) {
    const fail = (error) => ({ ok: false, error });
    if (!isPlainObject(raw)) return fail("config must be an object");
    for (const k of Object.keys(raw)) {
      if (k !== "version" && k !== "sites") return fail(`unknown top-level key "${k}"`);
    }
    const version = raw.version;
    if (typeof version !== "number" || !Number.isInteger(version) || version < 1) return fail("version must be a positive integer");
    if (!isPlainObject(raw.sites)) return fail("sites must be an object");
    const sites = {};
    for (const [siteKey, siteRaw] of Object.entries(raw.sites)) {
      if (!SITE_RE.test(siteKey)) return fail(`bad site key "${siteKey}"`);
      if (!isPlainObject(siteRaw)) return fail(`site "${siteKey}" must be an object`);
      for (const k of Object.keys(siteRaw)) {
        if (!SCRAPE_CATEGORIES.includes(k)) return fail(`site "${siteKey}": unknown key "${k}"`);
      }
      const site = { selectors: {}, labels: {}, patterns: {}, urls: {}, timeoutsMs: {} };
      for (const cat of SCRAPE_CATEGORIES) {
        const group = siteRaw[cat];
        if (!isPlainObject(group)) return fail(`site "${siteKey}": ${cat} must be an object`);
        for (const [name, value] of Object.entries(group)) {
          const where = `${siteKey}.${cat}.${name}`;
          if (!NAME_RE.test(name)) return fail(`bad entry name "${where}"`);
          if (cat === "timeoutsMs") {
            if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > MAX_MS) return fail(`${where} must be an integer 0..${MAX_MS}`);
            site.timeoutsMs[name] = value;
            continue;
          }
          if (typeof value !== "string") return fail(`${where} must be a string`);
          if (value.length > MAX_STRING) return fail(`${where} is too long`);
          if (cat === "patterns") {
            try {
              new RegExp(value);
            } catch {
              return fail(`${where} is not a valid regex`);
            }
          }
          site[cat][name] = value;
        }
      }
      sites[siteKey] = site;
    }
    return { ok: true, config: { version, sites } };
  }
  function adopt(config, source, etag) {
    active = config;
    activeSource = source;
    activeEtag = etag;
    resolved = /* @__PURE__ */ new Map();
  }
  function chromeStore() {
    return {
      async get() {
        return (await chrome.storage.local.get(SCRAPE_STORAGE_KEY))[SCRAPE_STORAGE_KEY];
      },
      async put(v) {
        await chrome.storage.local.set({ [SCRAPE_STORAGE_KEY]: v });
      },
      async putStatus(s) {
        await chrome.storage.local.set({ [SCRAPE_STATUS_KEY]: s });
      }
    };
  }
  function readStored(raw) {
    if (!isPlainObject(raw)) return null;
    const v = validateScrapeConfig(raw.config);
    if (!v.ok) return null;
    return { config: v.config, etag: typeof raw.etag === "string" ? raw.etag : null, fetchedAt: typeof raw.fetchedAt === "number" ? raw.fetchedAt : 0 };
  }
  function adoptStored(stored) {
    if (stored && stored.config.version >= BUNDLED_SCRAPE_CONFIG.version) {
      adopt(stored.config, "cache", stored.etag);
      return true;
    }
    return false;
  }
  function initScrapeConfig(store3) {
    if (!initPromise) {
      const s = store3 ?? chromeStore();
      initPromise = (async () => {
        try {
          adoptStored(readStored(await s.get()));
        } catch {
        }
        if (!store3 && typeof chrome !== "undefined" && chrome.storage?.onChanged) {
          chrome.storage.onChanged.addListener((changes, area) => {
            const ch = changes[SCRAPE_STORAGE_KEY];
            if (area !== "local" || !ch) return;
            const next = readStored(ch.newValue);
            if (next && next.config.version >= active.version) adopt(next.config, "cache", next.etag);
          });
        }
      })();
    }
    return initPromise;
  }
  async function loadScrapeConfig(tracker, deps2 = {}) {
    const store3 = deps2.store ?? chromeStore();
    await initScrapeConfig(deps2.store);
    const now = deps2.now ?? Date.now;
    let updated = false;
    let note;
    let confirmed = false;
    if (tracker) {
      try {
        const headers = { ...tracker.headers };
        if (activeEtag) headers["If-None-Match"] = activeEtag;
        const res = await (deps2.fetch ?? fetch)(`${tracker.base.replace(/\/$/, "")}/api/extension/scrape-config`, { headers, cache: "no-store" });
        if (res.status === 304 && activeEtag) {
          confirmed = true;
        } else if (!res.ok) {
          note = `tracker answered ${res.status}`;
        } else {
          let body = null;
          try {
            body = JSON.parse(await res.text());
          } catch {
          }
          const v = validateScrapeConfig(body);
          if (!v.ok) note = `ignored invalid config: ${v.error}`;
          else if (v.config.version < active.version) note = `ignored older config v${v.config.version} (in effect: v${active.version})`;
          else {
            const etag = res.headers.get("ETag");
            adopt(v.config, "remote", etag);
            confirmed = true;
            updated = true;
            await store3.put({ config: v.config, etag, fetchedAt: now() });
          }
        }
      } catch (e) {
        note = `fetch failed: ${String(e).slice(0, 120)}`;
      }
    }
    if (confirmed) activeSource = "remote";
    try {
      await store3.putStatus({ version: active.version, source: activeSource, ts: now() });
    } catch {
    }
    return { source: activeSource, version: active.version, updated, ...note ? { note } : {} };
  }
  function scrapeConfigIsStale(advertised) {
    const n = Number(advertised);
    return Number.isInteger(n) && n > active.version;
  }
  function compile(src, flags) {
    if (src === void 0) return null;
    try {
      return new RegExp(src, flags);
    } catch {
      return null;
    }
  }
  function getScrape(siteKey) {
    const hit = resolved.get(siteKey);
    if (hit) return hit;
    const def = Object.prototype.hasOwnProperty.call(BUNDLED_SCRAPE_CONFIG.sites, siteKey) ? BUNDLED_SCRAPE_CONFIG.sites[siteKey] : void 0;
    const cur = Object.prototype.hasOwnProperty.call(active.sites, siteKey) ? active.sites[siteKey] : void 0;
    const out = {
      selectors: { ...def?.selectors, ...cur?.selectors },
      labels: { ...def?.labels, ...cur?.labels },
      patterns: { ...def?.patterns, ...cur?.patterns },
      urls: { ...def?.urls, ...cur?.urls },
      timeoutsMs: { ...def?.timeoutsMs, ...cur?.timeoutsMs },
      regex(name, flags) {
        return compile(out.patterns[name], flags) ?? compile(def?.patterns[name], flags) ?? new RegExp("(?!)", flags && flags.replace(/[uv]/g, ""));
      }
    };
    resolved.set(siteKey, out);
    return out;
  }
  var SCRAPE_CATEGORIES, NAME_RE, SITE_RE, MAX_STRING, MAX_MS, bundledCheck, BUNDLED_SCRAPE_CONFIG, active, activeSource, activeEtag, resolved, initPromise, SCRAPE_STORAGE_KEY, SCRAPE_STATUS_KEY;
  var init_scrapeConfig = __esm({
    "src/lib/scrapeConfig.ts"() {
      "use strict";
      init_scrapeConfig_default();
      SCRAPE_CATEGORIES = ["selectors", "labels", "patterns", "urls", "timeoutsMs"];
      NAME_RE = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
      SITE_RE = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
      MAX_STRING = 2e4;
      MAX_MS = 864e5;
      bundledCheck = validateScrapeConfig(scrapeConfig_default_default);
      BUNDLED_SCRAPE_CONFIG = bundledCheck.ok ? bundledCheck.config : scrapeConfig_default_default;
      active = BUNDLED_SCRAPE_CONFIG;
      activeSource = "bundled";
      activeEtag = null;
      resolved = /* @__PURE__ */ new Map();
      initPromise = null;
      SCRAPE_STORAGE_KEY = "scrapeConfig";
      SCRAPE_STATUS_KEY = "scrapeConfigStatus";
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
    const S2 = getScrape("amazon");
    if (u.protocol !== "https:" || u.hostname !== S2.urls.host) return null;
    const p = u.pathname.replace(S2.regex("refSuffix"), "").replace(/\/+$/, "");
    if (S2.regex("ordersPath").test(p)) return "orders";
    if (S2.regex("detailPath").test(p)) return "detail";
    if (S2.regex("trackingPath").test(p)) return "tracking";
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
      init_scrapeConfig();
      DEDUPE_WINDOW_MS = 10 * 60 * 1e3;
      QUEUE_MAX_ENTRIES = 20;
      QUEUE_MAX_BYTES = 6e6;
    }
  });

  // src/lib/visitCommand.ts
  function cleanVisits(raw, max) {
    if (!Array.isArray(raw)) return [];
    const seen = /* @__PURE__ */ new Set();
    const out = [];
    for (const r of raw) {
      const v = r ?? {};
      const orderNumber = String(v.orderNumber ?? "").trim();
      if (!AMAZON_ORDER.test(orderNumber) || seen.has(orderNumber)) continue;
      seen.add(orderNumber);
      const stages = (Array.isArray(v.stages) ? v.stages : []).filter((s) => s === "detail" || s === "track");
      const url = typeof v.url === "string" && classifyAmazonUrl(v.url) === "detail" ? v.url : null;
      out.push({ orderNumber, url, stages: [...new Set(stages)] });
      if (out.length >= max) break;
    }
    return out;
  }
  function visitCommandPlan(payloadJson, settingsUserId, runActive) {
    if (runActive) return { action: "wait" };
    let p = null;
    try {
      p = payloadJson ? JSON.parse(payloadJson) : null;
    } catch {
      p = null;
    }
    if (!p || !Array.isArray(p.visits)) return { action: "fail", error: "bad payload" };
    if (p.userId != null && String(p.userId) !== String(settingsUserId ?? "")) {
      return { action: "fail", error: `orders belong to user ${String(p.userId)}, this extension is user ${String(settingsUserId ?? "unset")}` };
    }
    const visits = cleanVisits(p.visits, MAX_COMMAND_VISITS);
    if (!visits.length) return { action: "fail", error: "no Amazon order numbers" };
    return { action: "run", visits };
  }
  function parseVisitPlan(body) {
    const b = body;
    if (!b || b.ok !== true || !Array.isArray(b.visits)) return null;
    return { visits: cleanVisits(b.visits, MAX_PLAN_VISITS), listDue: b.listDue !== false };
  }
  var AMAZON_ORDER, MAX_COMMAND_VISITS, MAX_PLAN_VISITS;
  var init_visitCommand = __esm({
    "src/lib/visitCommand.ts"() {
      "use strict";
      init_amazonCapture();
      AMAZON_ORDER = /^\d{3}-\d{7}-\d{7}$/;
      MAX_COMMAND_VISITS = 5;
      MAX_PLAN_VISITS = 10;
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
  async function fetchVisitPlan() {
    try {
      const { trackerUrl, apiKey, extensionSecret, userId } = await getSettings();
      if (!trackerUrl) return null;
      const res = await fetch(`${upgradeUrl(trackerUrl)}/api/extension/amazon-visits`, {
        method: "POST",
        headers: {
          ...apiKey ? { "X-API-Key": apiKey } : {},
          ...extensionSecret ? { "X-Extension-Secret": extensionSecret } : {},
          ...userId ? { "X-Extension-User-Id": userId } : {}
        }
      });
      if (!res.ok) return null;
      return parseVisitPlan(await res.json().catch(() => null));
    } catch {
      return null;
    }
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
      init_visitCommand();
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
  function visitUrlFor(v) {
    return v.url && classifyAmazonUrl(v.url) === "detail" ? v.url : detailUrlFor(v.orderNumber);
  }
  function formatRunSummary(s) {
    if (s.status === "blocked") return `blocked after ${s.pages} page(s); tab left open for you`;
    if (s.status === "done" && s.pages === 0) return "nothing needed a visit";
    const compare = s.mode === "compare";
    let base = `${s.pages} page(s): ${s.created} ${compare ? "would create" : "new"}, ${s.updated} ${compare ? "would update" : "updated"}, ${s.unchanged} unchanged, ${s.discrepancies} needs review`;
    if (s.ignored) base += ` (${s.ignored} page ignored as sign-in/block)`;
    if (s.unparsed) base += ` (${s.unparsed} page could not be parsed)`;
    if (s.unread) base += ` (${s.unread} page(s) not read)`;
    if (compare) base += " (compare only)";
    return s.status === "capped" ? `${base} (page cap reached)` : s.status === "error" ? `${base} (${s.message})` : base;
  }
  function createSyncRunner(deps2) {
    let running3 = false;
    async function run(opts = {}) {
      if (running3) return { started: false, reason: "a sync is already running" };
      running3 = true;
      const maxPages = opts.maxPages ?? DEFAULT_MAX_PAGES;
      const paceMs = opts.paceMs ?? DEFAULT_PACE_MS;
      const sum = { status: "done", pages: 0, created: 0, updated: 0, unchanged: 0, discrepancies: 0, message: "" };
      let tabId = null;
      let consecutiveTimeouts = 0;
      let unread = 0;
      let lastNote = "";
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
        if (out.kind === "timeout" || out.kind === "error") {
          unread += 1;
          sum.unread = unread;
          lastNote = out.kind === "timeout" ? out.note ?? "the page did not answer in time" : out.message;
        }
        if (out.kind === "timeout") {
          consecutiveTimeouts += 1;
          if (consecutiveTimeouts >= 3) {
            sum.status = "error";
            sum.message = `pages could not be read: ${lastNote}`;
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
        if (opts.visits) {
          const seen = /* @__PURE__ */ new Set();
          outer: for (const v of opts.visits) {
            const key = digitsOf(v.orderNumber);
            if (seen.has(key)) continue;
            seen.add(key);
            const out = await visit(visitUrlFor(v));
            if (!out) break;
            if (!v.stages.includes("track")) continue;
            const trackUrls = out.kind === "result" ? (out.result.detail?.trackUrls ?? []).slice(0, MAX_TRACK_PAGES_PER_ORDER) : [];
            for (const u of trackUrls) if (!await visit(u)) break outer;
          }
          return sum;
        }
        const plan = deps2.fetchVisits ? await deps2.fetchVisits().catch(() => null) : null;
        const targets = /* @__PURE__ */ new Map();
        for (const v of plan?.visits ?? []) targets.set(digitsOf(v.orderNumber), v);
        if (!plan || plan.listDue) {
          let listUrl = opts.startUrl ?? START_URL;
          const seenLists = /* @__PURE__ */ new Set();
          while (listUrl && !seenLists.has(listUrl)) {
            seenLists.add(listUrl);
            const out = await visit(listUrl);
            if (!out) break;
            const list = out.kind === "result" ? out.result.list : void 0;
            for (const n of list?.needs ?? []) {
              const key = digitsOf(n.orderNumber);
              if (!needs.has(n.orderNumber)) needs.set(n.orderNumber, n);
              if (n.detailUrl && classifyAmazonUrl(n.detailUrl) !== "detail") continue;
              if (!targets.has(key)) targets.set(key, { orderNumber: n.orderNumber, url: n.detailUrl, stages: [] });
            }
            if (!list || list.reachedWindow || list.allComplete || !list.nextUrl) break;
            if (plan && list.anyKnown) break;
            listUrl = list.nextUrl;
          }
        }
        if (sum.status === "done") {
          outer: for (const v of shuffled([...targets.values()]).slice(0, CLICK_MAX_ORDERS)) {
            const out = await visit(visitUrlFor(v));
            if (!out) break;
            const fromList = needs.get(v.orderNumber);
            const trackUrls = v.stages.includes("track") ? out.kind === "result" ? (out.result.detail?.trackUrls ?? []).slice(0, MAX_TRACK_PAGES_PER_ORDER) : [] : fromList?.trackUrls?.slice(0, 1) ?? [];
            for (const u of trackUrls) if (!await visit(u)) break outer;
          }
        }
      } catch (e) {
        sum.status = "error";
        sum.message = String(e.message || e);
      } finally {
        if (sum.status === "done" && sum.pages > 0 && unread >= sum.pages) {
          sum.status = "error";
          sum.message = `no page could be read: ${lastNote}`;
        }
        if (tabId !== null && sum.status !== "blocked") {
          try {
            await deps2.closeTab(tabId);
          } catch {
          }
        }
        running3 = false;
      }
      return sum;
    }
    return { run, isRunning: () => running3 };
  }
  var START_URL, DEFAULT_MAX_PAGES, DEFAULT_PACE_MS, CLICK_MAX_ORDERS, MAX_TRACK_PAGES_PER_ORDER, digitsOf, detailUrlFor;
  var init_syncRun = __esm({
    "src/lib/syncRun.ts"() {
      "use strict";
      init_amazonCapture();
      START_URL = "https://www.amazon.com/your-orders/orders?timeFilter=last30";
      DEFAULT_MAX_PAGES = 40;
      DEFAULT_PACE_MS = 4e3;
      CLICK_MAX_ORDERS = 10;
      MAX_TRACK_PAGES_PER_ORDER = 3;
      digitsOf = (s) => String(s ?? "").replace(/\D/g, "") || String(s ?? "");
      detailUrlFor = (orderNumber) => `https://www.amazon.com/gp/your-account/order-details?orderID=${encodeURIComponent(orderNumber)}`;
    }
  });

  // src/lib/capturePoke.ts
  function parsePokeReply(raw) {
    const r = raw;
    if (!r || typeof r !== "object" || typeof r.state !== "string" || !STATES.has(r.state)) return null;
    if (typeof r.pageId !== "string" || !r.pageId) return null;
    return { state: r.state, pageId: r.pageId, ...typeof r.path === "string" ? { path: r.path.slice(0, 80) } : {} };
  }
  function createPokeJudge(stalePageId = null) {
    let pageId = null;
    let unrecognised = 0;
    let note = "the page never answered";
    return {
      /** One answer (anything else when the page did not answer). An outcome ends the wait. */
      reply(raw) {
        const r = parsePokeReply(raw);
        if (!r) return null;
        if (stalePageId && r.pageId === stalePageId) {
          note = "the tab stayed on the previous page";
          return null;
        }
        if (r.pageId !== pageId) {
          pageId = r.pageId;
          unrecognised = 0;
        }
        if (r.state === "unrecognised") {
          unrecognised += 1;
          note = `not an order page: ${r.path ?? "unknown"}`;
          return unrecognised >= UNRECOGNISED_REPLIES ? { kind: "error", message: note } : null;
        }
        unrecognised = 0;
        note = r.state === "busy" ? "the page was still loading" : r.state === "sent" ? "the page was sent but the tracker did not answer in time" : r.state === "blocked" ? "sign-in or block page" : "page too large";
        return null;
      },
      /** The page that answered last, to pass as the next page's stalePageId. */
      pageId: () => pageId,
      /** Why the page was not read, for the run summary. */
      note: () => note
    };
  }
  function isStaleOutcome(pageId, stalePageId) {
    return typeof pageId === "string" && !!pageId && pageId === stalePageId;
  }
  var POKE_FIRST_MS, POKE_EVERY_MS, POKE_FORCE_MS, POKE_FORCE_ANY_MS, UNRECOGNISED_REPLIES, STATES, shouldForce, shouldForceAny;
  var init_capturePoke = __esm({
    "src/lib/capturePoke.ts"() {
      "use strict";
      POKE_FIRST_MS = 3e3;
      POKE_EVERY_MS = 2e3;
      POKE_FORCE_MS = 12e3;
      POKE_FORCE_ANY_MS = 22e3;
      UNRECOGNISED_REPLIES = 2;
      STATES = /* @__PURE__ */ new Set(["sent", "blocked", "too_large", "unrecognised", "busy"]);
      shouldForce = (elapsedMs) => elapsedMs >= POKE_FORCE_MS;
      shouldForceAny = (elapsedMs) => elapsedMs >= POKE_FORCE_ANY_MS;
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
      const started = Date.now();
      const judge = createPokeJudge(lastPageId);
      seenPageId = null;
      let settled = false;
      let poke = null;
      const done = (o, pageId) => {
        if (settled) return;
        settled = true;
        clearTimeout(t);
        if (poke) clearTimeout(poke);
        if (pending.get(tabId) === done) pending.delete(tabId);
        lastPageId = pageId ?? judge.pageId() ?? seenPageId ?? lastPageId;
        resolve(o);
      };
      const t = setTimeout(() => {
        chrome.tabs.get(tabId).then((tab) => done({ kind: "timeout", note: tab.status === "loading" ? "the tab was still loading" : judge.note() })).catch(() => done({ kind: "timeout", note: judge.note() }));
      }, waitMs());
      const ask = async () => {
        poke = null;
        let answer = null;
        const elapsed = Date.now() - started;
        try {
          answer = await chrome.tabs.sendMessage(tabId, { type: "AMAZON_CAPTURE_NOW", force: shouldForce(elapsed), forceAny: shouldForceAny(elapsed) });
        } catch {
        }
        if (settled) return;
        const outcome = judge.reply(answer);
        if (outcome) {
          done(outcome);
          return;
        }
        poke = setTimeout(ask, POKE_EVERY_MS);
      };
      poke = setTimeout(ask, POKE_FIRST_MS);
      pending.set(tabId, done);
      const e = early.get(tabId);
      if (e) {
        early.delete(tabId);
        done(e.outcome, e.pageId);
      }
    });
  }
  function isRunTab(tabId) {
    return tabId !== void 0 && tabId === runTabId;
  }
  function notePage(tabId, pageId) {
    if (isRunTab(tabId) && typeof pageId === "string" && pageId && !isStaleOutcome(pageId, lastPageId)) seenPageId = pageId;
  }
  function notifyOutcome(tabId, outcome, pageId) {
    if (!isRunTab(tabId)) return;
    if (isStaleOutcome(pageId, lastPageId)) return;
    const id = typeof pageId === "string" && pageId ? pageId : void 0;
    const p = pending.get(tabId);
    if (p) p(outcome, id);
    else early.set(tabId, { outcome, pageId: id });
  }
  async function startAmazonRun() {
    await saveRun("running...", "running");
    fillsTracking = true;
    let out;
    try {
      out = await keepAwake(() => runner.run());
    } finally {
      fillsTracking = false;
    }
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
  async function startVisitRun(visits) {
    if (runner.isRunning()) return { started: false, reason: "a sync is already running" };
    background = true;
    fillsTracking = true;
    runWindowId = null;
    try {
      const out = await keepAwake(() => runner.run({ visits, maxPages: visits.length * 4 }));
      if ("started" in out) return { started: false, reason: out.reason };
      const text = `email visits: ${formatRunSummary(out)}`;
      await saveRun(text, out.status);
      return { ...out, text };
    } finally {
      background = false;
      fillsTracking = false;
      runWindowId = null;
      runTabId = null;
    }
  }
  function isTrackRunTab(tabId) {
    return (background || fillsTracking) && isRunTab(tabId);
  }
  function amazonRunActive() {
    return runner.isRunning();
  }
  var waitMs, pending, early, runTabId, background, fillsTracking, runWindowId, lastPageId, seenPageId, RUN_TAB_KEY, KEEPALIVE_MS, store, waiter, deps, runner;
  var init_amazonRun = __esm({
    "src/background/amazonRun.ts"() {
      "use strict";
      init_syncRun();
      init_amazonCapture2();
      init_capturePoke();
      init_scrapeConfig();
      waitMs = () => getScrape("amazon").timeoutsMs.runWaitMs;
      pending = /* @__PURE__ */ new Map();
      early = /* @__PURE__ */ new Map();
      runTabId = null;
      background = false;
      fillsTracking = false;
      runWindowId = null;
      lastPageId = null;
      seenPageId = null;
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
          lastPageId = null;
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
        sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
        fetchVisits: fetchVisitPlan
      };
      chrome.tabs.onRemoved.addListener((tabId) => {
        if (tabId === runTabId) {
          notifyOutcome(tabId, { kind: "error", message: "tab closed" });
        }
      });
      runner = createSyncRunner(deps);
    }
  });

  // src/background/carrierRun.ts
  function statusRegex(words) {
    const esc = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return new RegExp(`\\b(${esc.join("|")})\\b`, "i");
  }
  function carrierRunActive() {
    return running;
  }
  function pageUrl(item) {
    const n = encodeURIComponent(item.trackingNumber);
    return item.carrier === "fedex" ? `https://www.fedex.com/fedextrack/?trknbr=${n}` : `https://www.ups.com/track?tracknum=${n}`;
  }
  function parseCarrierPayload(raw, userId) {
    let p;
    try {
      p = JSON.parse(raw ?? "null");
    } catch {
      return { error: "bad payload" };
    }
    if (!p || !Array.isArray(p.items)) return { error: "bad payload" };
    if (userId && p.userId != null && String(p.userId) !== String(userId)) return { error: "command is for another user" };
    const items = [];
    for (const it of p.items.slice(0, MAX_ITEMS)) {
      const c = it?.carrier;
      const n = String(it?.trackingNumber ?? "").replace(/\s+/g, "").toUpperCase();
      if ((c === "fedex" || c === "ups") && /^[A-Z0-9]{8,40}$/.test(n)) items.push({ carrier: c, trackingNumber: n });
    }
    const sent = Array.isArray(p.statusWords) ? p.statusWords.filter((w) => typeof w === "string" && w.length > 0 && w.length <= 40).slice(0, 40) : [];
    const statusWords = sent.length ? sent : [...DEFAULT_STATUS_WORDS];
    return items.length ? { items, statusWords } : { error: "no usable items" };
  }
  function readPage(max) {
    return { text: (document.body?.innerText ?? "").slice(0, max) };
  }
  async function readWhenReady(tabId, ready) {
    const deadline = Date.now() + WAIT_MS;
    while (Date.now() < deadline) {
      await sleep(POLL_MS);
      try {
        const res = await chrome.scripting.executeScript({ target: { tabId }, func: readPage, args: [MAX_TEXT] });
        const text = res[0]?.result?.text ?? "";
        if (ready.test(text)) return text;
      } catch {
      }
    }
    return null;
  }
  async function readOne(item, ready, post) {
    const url = pageUrl(item);
    let tabId;
    try {
      const tab = await chrome.tabs.create({ url, active: false });
      tabId = tab.id;
      if (tabId == null) return false;
      const text = await readWhenReady(tabId, ready);
      if (!text) return false;
      return await post({ carrier: item.carrier, trackingNumber: item.trackingNumber, url, text });
    } catch {
      return false;
    } finally {
      if (tabId != null) await chrome.tabs.remove(tabId).catch(() => {
      });
    }
  }
  async function runCarrierItems(items, post, statusWords = DEFAULT_STATUS_WORDS) {
    const ready = statusRegex(statusWords.length ? statusWords : DEFAULT_STATUS_WORDS);
    if (running) return { ok: false, done: 0, failed: items.length };
    running = true;
    const keep = setInterval(() => {
      chrome.runtime.getPlatformInfo().catch(() => {
      });
    }, KEEPALIVE_MS2);
    let done = 0;
    let failed = 0;
    try {
      for (let i = 0; i < items.length; i++) {
        if (i > 0) await sleep(GAP_MIN_MS + Math.random() * (GAP_MAX_MS - GAP_MIN_MS));
        if (await readOne(items[i], ready, post)) done++;
        else failed++;
      }
    } finally {
      clearInterval(keep);
      running = false;
    }
    return { ok: done > 0, done, failed };
  }
  var MAX_ITEMS, MAX_TEXT, POLL_MS, WAIT_MS, GAP_MIN_MS, GAP_MAX_MS, KEEPALIVE_MS2, DEFAULT_STATUS_WORDS, running, sleep;
  var init_carrierRun = __esm({
    "src/background/carrierRun.ts"() {
      "use strict";
      MAX_ITEMS = 5;
      MAX_TEXT = 2e5;
      POLL_MS = 2e3;
      WAIT_MS = 4e4;
      GAP_MIN_MS = 5e3;
      GAP_MAX_MS = 15e3;
      KEEPALIVE_MS2 = 2e4;
      DEFAULT_STATUS_WORDS = ["delivered", "in transit", "out for delivery", "on the way", "exception", "delivery exception", "label created", "shipment created", "pending", "delayed", "picked up", "arriving"];
      running = false;
      sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    }
  });

  // src/lib/egiftCommand.ts
  function egiftErrorCode(step, err) {
    const m = err instanceof Error ? err.message : typeof err === "string" ? err : "";
    const kind = /chrome-error:|error page/i.test(m) ? "error-page" : /cannot access|permission/i.test(m) ? "permission" : /no tab with id|tab was closed|tabs cannot be edited/i.test(m) ? "tab-gone" : /frame with id|frame was removed|navigat/i.test(m) ? "navigated" : /failed to fetch|networkerror|load failed/i.test(m) ? "network" : null;
    return kind ? `error-${step}-${kind}` : `error-${step}`;
  }
  function parseEgiftPayload(raw, userId) {
    let p;
    try {
      p = JSON.parse(raw ?? "null");
    } catch {
      return { error: "bad payload" };
    }
    if (!p || typeof p !== "object") return { error: "bad payload" };
    if (userId && p.userId != null && String(p.userId) !== String(userId)) return { error: "command is for another user" };
    const orderId = Number(p.orderId);
    if (typeof p.orderId === "boolean" || p.orderId === null || !Number.isInteger(orderId) || orderId <= 0) return { error: "bad payload" };
    return { orderId };
  }
  function isAllowedEgiftLink(raw) {
    if (typeof raw !== "string") return false;
    let u;
    try {
      u = new URL(raw);
    } catch {
      return false;
    }
    return u.protocol === "https:" && EGIFT_HOSTS.includes(u.hostname.toLowerCase()) && !u.username && !u.password && !!u.searchParams.get("login");
  }
  function parseEgiftInfo(body) {
    const b = body;
    if (!b || typeof b.link !== "string" || typeof b.email !== "string") return null;
    const email = b.email.trim();
    return b.link && email ? { link: b.link, email } : null;
  }
  function amountOf(text, re) {
    const amt = re.exec(text)?.[1];
    const value = amt ? Number(amt.replace(/,/g, "")) : NaN;
    return Number.isFinite(value) && value > 0 && value <= 1e4 ? value : null;
  }
  function readCard(page, pats = {}) {
    const p = { ...DEFAULT_PATTERNS, ...pats };
    const text = page.text ?? "";
    const cell = (v, ok) => {
      const t = (v ?? "").trim().replace(/\s+/g, " ");
      return t && ok.test(t) ? t : null;
    };
    const code = cell(page.code, p.codeValue) ?? p.code.exec(text)?.[1] ?? null;
    if (!code) return null;
    const pin = cell(page.pin, p.pinValue) ?? p.pin.exec(text)?.[1] ?? null;
    const seq = p.sequence.exec(page.counter ?? "") ?? p.sequence.exec(text);
    return {
      index: seq ? Number(seq[1]) : 1,
      total: seq ? Number(seq[2]) : 1,
      code,
      pin,
      value: amountOf(text, p.amount)
    };
  }
  function titleMerchant(part) {
    let s = part.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").replace(TITLE_EDGE, "");
    for (let i = 0; i < 4 && TITLE_SUFFIX.test(s); i++) s = s.replace(TITLE_SUFFIX, "").replace(TITLE_EDGE, "");
    s = s.replace(TITLE_PREFIX, "").replace(TITLE_EDGE, "");
    return /[A-Za-z]/.test(s) ? s.slice(0, 80) : "";
  }
  function parseCardTitle(title, amount = DEFAULT_PATTERNS.amount) {
    const t = (title ?? "").replace(/\s+/g, " ").trim();
    const re = new RegExp(amount.source, amount.flags.replace("g", ""));
    const m = re.exec(t);
    if (!m) return null;
    const value = amountOf(m[0], re);
    if (value == null) return null;
    const merchant = titleMerchant(t.slice(0, m.index)) || titleMerchant(t.slice(m.index + m[0].length));
    return merchant ? { merchant, value } : null;
  }
  function titleFor(titles, index, total, amount) {
    const parsed = titles.map((t) => parseCardTitle(t, amount));
    if (parsed.length === total) return parsed[index - 1] ?? null;
    const first = parsed[0];
    if (!first) return null;
    return parsed.every((p) => p && p.merchant.toLowerCase() === first.merchant.toLowerCase() && p.value === first.value) ? first : null;
  }
  function egiftPostBody(orderId, card, extra = {}) {
    const body = { orderId, cardNumber: card.code };
    if (card.pin) body.pin = card.pin;
    if (extra.title) {
      body.merchant = extra.title.merchant;
      body.value = extra.title.value;
    } else if (card.value != null) body.value = card.value;
    if (extra.image) body.image = extra.image;
    return body;
  }
  function egiftReport(cards, saved, failure, opened, counts = {}) {
    const via = { ...opened ? { opened } : {}, ...counts };
    if (!failure && cards > 0 && saved === cards) return { status: "done", result: { cards, saved, ...via } };
    return { status: "failed", result: { cards, saved, error: failure ?? "no-cards", ...via } };
  }
  var EGIFT_HOSTS, MAX_CARDS, DEFAULT_PATTERNS, TITLE_EDGE, TITLE_SUFFIX, TITLE_PREFIX;
  var init_egiftCommand = __esm({
    "src/lib/egiftCommand.ts"() {
      "use strict";
      EGIFT_HOSTS = ["www.memberedelivery.com"];
      MAX_CARDS = 50;
      DEFAULT_PATTERNS = {
        code: /\bCode:\s*([A-Za-z0-9-]{4,64})/,
        pin: /\bPIN:\s*([A-Za-z0-9]{2,32})/i,
        sequence: /\b(\d{1,3})\s+of\s+(\d{1,3})\b/i,
        amount: /\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)/,
        codeValue: /^[A-Za-z0-9][A-Za-z0-9 -]{2,62}[A-Za-z0-9]$/,
        pinValue: /^[A-Za-z0-9]{2,32}$/
      };
      TITLE_EDGE = /^[\s\-–—:|,.]+|[\s\-–—:|,.]+$/g;
      TITLE_SUFFIX = /(?:^|\s)(?:e-?gifts?|gifts?|cards?|digital|codes?)$/i;
      TITLE_PREFIX = /^(?:e-?gifts?|digital)(?:\s+(?:gift\s+)?cards?)?\b/i;
    }
  });

  // src/lib/egiftPage.ts
  function settings() {
    const s = getScrape("costcoEgift");
    const ms = (k, d) => {
      const v = s.timeoutsMs[k];
      return typeof v === "number" && v > 0 ? v : d;
    };
    const clickables = s.selectors.clickables || 'button, a, [role="button"], input[type="button"], input[type="submit"]';
    const emailInput = s.selectors.emailInput || '#p2, input[type="email"]';
    return {
      page: {
        clickables,
        emailInput,
        alert: s.selectors.alert || '[role="alert"]',
        alertText: s.patterns.alertText || "\\b(invalid|not match|incorrect|error)\\b",
        openLabel: s.labels.openLabel || "Access eGift",
        nextButton: s.selectors.nextButton || "",
        nextText: s.patterns.nextButton || "^next\\b",
        counter: s.selectors.counter || "",
        labelCells: s.selectors.labelCells || "td, th, div, p, li, span, label",
        codeLabel: s.labels.codeLabel || "Code:",
        pinLabel: s.labels.pinLabel || "PIN:",
        botCheck: s.selectors.botCheck || "",
        botCheckText: s.patterns.botCheckText || "",
        itemTitle: s.selectors.itemTitle || "section.order-item .order-item-title",
        cardImage: s.selectors.cardImage || "#print-content-section, #body-canvas"
      },
      submit: {
        emailInput,
        submitButton: s.selectors.submitButton || 'button[type="submit"], input[type="submit"]',
        buttons: s.selectors.buttons || "button",
        submitText: s.patterns.submitText || "submit|continue|next|view|access"
      },
      pats: {
        code: s.regex("code"),
        pin: s.regex("pin", "i"),
        sequence: s.regex("sequence", "i"),
        amount: s.regex("amount"),
        codeValue: s.regex("codeValue"),
        pinValue: s.regex("pinValue")
      },
      pollMs: ms("pollMs", 1500),
      waitMs: ms("waitMs", 4e4),
      stepDelayMs: ms("stepDelayMs", 3e3),
      newTabWaitMs: ms("newTabWaitMs", 1e4)
    };
  }
  function pageText(c) {
    const rx = (src, flags) => {
      try {
        return src ? new RegExp(src, flags) : null;
      } catch {
        return null;
      }
    };
    const qa = (sel) => {
      try {
        return sel ? Array.from(document.querySelectorAll(sel)) : [];
      } catch {
        return [];
      }
    };
    const q = (sel) => qa(sel)[0] ?? null;
    const text = document.body?.innerText ?? "";
    const label = (e) => (e.value || e.textContent || "").trim();
    const clickables = qa(c.clickables);
    const open = c.openLabel.toLowerCase();
    const nextRe = rx(c.nextText, "i");
    const alertRe = rx(c.alertText, "i");
    const botRe = rx(c.botCheckText, "i");
    const labelled = (want) => {
      const w = want.trim().toLowerCase();
      if (!w) return null;
      let best = null;
      for (const el of qa(c.labelCells)) {
        const t = (el.textContent ?? "").trim();
        if (t.length <= w.length || t.length > w.length + 100 || !t.toLowerCase().startsWith(w)) continue;
        if (!best || best.contains(el)) best = el;
      }
      if (!best) return null;
      const span = Array.from(best.querySelectorAll("span")).map((s) => (s.textContent ?? "").trim()).find((t) => t && !t.toLowerCase().startsWith(w));
      if (span) return span;
      const rest = (best.textContent ?? "").trim().slice(w.length).trim();
      return rest || null;
    };
    const nextEl = q(c.nextButton);
    return {
      text: text.slice(0, 1e5),
      hasEmail: !!q(c.emailInput),
      hasOpen: clickables.some((e) => label(e).toLowerCase().includes(open)),
      hasNext: !!nextEl && !nextEl.disabled || !!nextRe && clickables.some((e) => nextRe.test(label(e))),
      alert: !!alertRe && qa(c.alert).some((el) => alertRe.test(el.textContent ?? "")),
      botCheck: !!q(c.botCheck) || !!botRe && botRe.test(text.slice(0, 5e3)),
      code: labelled(c.codeLabel),
      pin: labelled(c.pinLabel),
      counter: (q(c.counter)?.textContent ?? "").trim() || null,
      // The redemption page's one title per card ("Brand $25"): brand and value, not secrets.
      titles: qa(c.itemTitle).map((e) => (e.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 200)).filter(Boolean).slice(0, 60)
    };
  }
  function cardRect(selector) {
    let el = null;
    try {
      el = selector ? document.querySelector(selector) : null;
    } catch {
      el = null;
    }
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 20 || r.height < 20) return null;
    const ready = Array.from(el.querySelectorAll("img")).every((i) => i.complete);
    return { x: Math.max(0, r.left + window.scrollX), y: Math.max(0, r.top + window.scrollY), width: Math.min(r.width, 4e3), height: Math.min(r.height, 8e3), ready };
  }
  function enterEmail(email, c) {
    const pick = (root, sel) => {
      try {
        return root.querySelector(sel);
      } catch {
        return null;
      }
    };
    const input = pick(document, c.emailInput);
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    input.focus();
    setter?.call(input, email);
    for (const type of ["input", "keyup", "change"]) input.dispatchEvent(new Event(type, { bubbles: true }));
    input.blur();
    const form = input.closest("form");
    let re = null;
    try {
      re = new RegExp(c.submitText, "i");
    } catch {
    }
    const byText = (root) => {
      try {
        return Array.from(root.querySelectorAll(c.buttons)).find((b) => !!re && re.test(b.textContent ?? "")) ?? null;
      } catch {
        return null;
      }
    };
    const btn = (form && pick(form, c.submitButton)) ?? pick(document, c.submitButton) ?? (form && byText(form)) ?? byText(document);
    if (btn) btn.click();
    else form?.requestSubmit();
    return true;
  }
  function clickOpen(c) {
    const want = c.openLabel.toLowerCase();
    let els = [];
    try {
      els = Array.from(document.querySelectorAll(c.clickables));
    } catch {
      return false;
    }
    const el = els.find((e) => ((e.value || e.textContent) ?? "").trim().toLowerCase().includes(want));
    if (!el) return false;
    el.click();
    return true;
  }
  function clickNext(c) {
    let el = null;
    try {
      el = c.nextButton ? document.querySelector(c.nextButton) : null;
    } catch {
      el = null;
    }
    if (!el) {
      let re = null;
      try {
        re = new RegExp(c.nextText, "i");
      } catch {
        return false;
      }
      let els = [];
      try {
        els = Array.from(document.querySelectorAll(c.clickables));
      } catch {
        return false;
      }
      el = els.find((e) => re.test(((e.value || e.textContent) ?? "").trim())) ?? null;
    }
    if (!el || el.disabled) return false;
    el.click();
    return true;
  }
  function keepInTab() {
    const w = window;
    if (w.__rtKeepInTab) return;
    w.__rtKeepInTab = true;
    window.open = function(url) {
      if (url) location.assign(String(url));
      return window;
    };
    const submit = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function() {
      this.target = "_self";
      return submit.call(this);
    };
    document.addEventListener("submit", (e) => {
      const f = e.target;
      if (f) f.target = "_self";
    }, true);
    document.addEventListener("click", (e) => {
      const el = e.target?.closest?.("a[target], button[formtarget], input[formtarget]");
      if (el) {
        el.removeAttribute("target");
        el.removeAttribute("formtarget");
      }
      const f = e.target?.closest?.("form");
      if (f) f.target = "_self";
    }, true);
  }
  var init_egiftPage = __esm({
    "src/lib/egiftPage.ts"() {
      "use strict";
      init_scrapeConfig();
    }
  });

  // src/background/egiftShot.ts
  function within(p, ms) {
    return Promise.race([p, sleep2(ms).then(() => "timeout")]);
  }
  function cardCamera(tabId) {
    const target = { tabId };
    let attached = false;
    let off = typeof chrome.debugger?.attach !== "function";
    let bringForward = false;
    const onDetach = (src, reason) => {
      if (src.tabId !== tabId) return;
      attached = false;
      if (reason === "canceled_by_user") off = true;
    };
    async function capture(rect) {
      const params = rect ? { format: "jpeg", quality: 85, captureBeyondViewport: true, clip: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, scale: 1 } } : { format: "jpeg", quality: 85 };
      const r = await within(chrome.debugger.sendCommand(target, "Page.captureScreenshot", params), SHOT_TIMEOUT_MS);
      if (r === "timeout") return "timeout";
      const data = r?.data;
      return typeof data === "string" && data.length > 100 && data.length <= MAX_B64 ? data : null;
    }
    async function locate(selector) {
      let rect = null;
      for (let i = 0; i < READY_TRIES; i++) {
        rect = (await chrome.scripting.executeScript({ target: { tabId }, func: cardRect, args: [selector] }))[0]?.result ?? null;
        if (!rect || rect.ready) break;
        await sleep2(1e3);
      }
      return rect;
    }
    async function forward(fn) {
      const tab = await chrome.tabs.get(tabId);
      const [prev] = await chrome.tabs.query({ active: true, windowId: tab.windowId });
      await chrome.tabs.update(tabId, { active: true });
      try {
        await sleep2(400);
        return await fn();
      } finally {
        if (prev?.id != null && prev.id !== tabId) await chrome.tabs.update(prev.id, { active: true }).catch(() => {
        });
      }
    }
    return {
      /** Base64 JPEG of the card (the element `selector` names, else the visible page), or null. */
      async shoot(selector) {
        if (off) return null;
        try {
          if (!attached) {
            await chrome.debugger.attach(target, "1.3");
            attached = true;
            chrome.debugger.onDetach.addListener(onDetach);
          }
          const rect = await locate(selector);
          if (!bringForward) {
            const shot2 = await capture(rect);
            if (shot2 !== "timeout") return shot2;
            bringForward = true;
          }
          const shot = await forward(() => capture(rect));
          if (shot === "timeout") {
            off = true;
            return null;
          }
          return shot;
        } catch {
          return null;
        }
      },
      async close() {
        chrome.debugger?.onDetach?.removeListener(onDetach);
        if (attached) await chrome.debugger.detach(target).catch(() => {
        });
        attached = false;
      }
    };
  }
  var SHOT_TIMEOUT_MS, MAX_B64, READY_TRIES, sleep2;
  var init_egiftShot = __esm({
    "src/background/egiftShot.ts"() {
      "use strict";
      init_egiftPage();
      SHOT_TIMEOUT_MS = 12e3;
      MAX_B64 = 54e5;
      READY_TRIES = 5;
      sleep2 = (ms) => new Promise((r) => setTimeout(r, ms));
    }
  });

  // src/background/egiftRun.ts
  function egiftRunActive() {
    return running2;
  }
  async function read(tabId, c) {
    const res = await chrome.scripting.executeScript({ target: { tabId }, func: pageText, args: [c] });
    return res[0]?.result ?? null;
  }
  async function waitFor(tabId, cfg, ok, waitMs2 = cfg.waitMs) {
    const deadline = Date.now() + waitMs2;
    let last = null;
    while (Date.now() < deadline) {
      await sleep3(cfg.pollMs);
      try {
        const s = await read(tabId, cfg.page);
        if (s) {
          last = s;
          if (ok(s)) return { hit: s, last };
        }
      } catch {
      }
    }
    return { hit: null, last };
  }
  function hostOf(url) {
    try {
      return url ? new URL(url).hostname.toLowerCase() : "";
    } catch {
      return "";
    }
  }
  function watchNewTabs(openerId) {
    const seen = /* @__PURE__ */ new Set();
    const onCreated = (t) => {
      if (t.id != null && t.id !== openerId) seen.add(t.id);
    };
    chrome.tabs.onCreated.addListener(onCreated);
    return {
      stop: () => chrome.tabs.onCreated.removeListener(onCreated),
      async portal() {
        const out = [];
        for (const id of [...seen]) {
          try {
            const t = await chrome.tabs.get(id);
            if (t.openerTabId === openerId || EGIFT_HOSTS.includes(hostOf(t.pendingUrl || t.url))) out.push(id);
          } catch {
            seen.delete(id);
          }
        }
        return out;
      }
    };
  }
  async function runEgiftOrder(base, headers, orderId, doFetch = fetch) {
    if (running2) return egiftReport(0, 0, "run-busy");
    running2 = true;
    const keep = setInterval(() => {
      chrome.runtime.getPlatformInfo().catch(() => {
      });
    }, KEEPALIVE_MS3);
    const cfg = settings();
    let tabId;
    let tabs = null;
    let cards = 0;
    let saved = 0;
    let failure = null;
    let opened;
    let camera = null;
    const counts = { images: 0, named: 0, mismatched: 0 };
    let step = "info";
    const card = (s) => readCard(s, cfg.pats);
    try {
      const res = await doFetch(`${base}/api/extension/egift?orderId=${orderId}`, { headers, cache: "no-store" });
      if (!res.ok) return egiftReport(0, 0, `info-http-${res.status}`);
      const info = parseEgiftInfo(await res.json().catch(() => null));
      if (!info) return egiftReport(0, 0, "no-link");
      if (!isAllowedEgiftLink(info.link)) return egiftReport(0, 0, "link-rejected");
      step = "tab";
      const tab = await chrome.tabs.create({ url: info.link, active: false });
      tabId = tab.id;
      if (tabId == null) return egiftReport(0, 0, "error-tab");
      step = "page";
      const first = await waitFor(tabId, cfg, (s) => s.hasEmail || s.hasOpen || s.alert || !!card(s));
      if (!first.hit) return egiftReport(0, 0, timedOut(first.last, "page-timeout"));
      if (first.hit.hasEmail && !first.hit.hasOpen && !card(first.hit)) {
        step = "email";
        await chrome.scripting.executeScript({ target: { tabId }, func: enterEmail, args: [info.email, cfg.submit] });
        await sleep3(cfg.stepDelayMs);
      }
      step = "page";
      const list = await waitFor(tabId, cfg, (s) => s.hasOpen || s.alert || !!card(s));
      if (!list.hit) return egiftReport(0, 0, timedOut(list.last, list.last?.hasEmail ? "email-no-response" : "page-timeout"));
      if (list.hit.alert && !list.hit.hasOpen && !card(list.hit)) return egiftReport(0, 0, "email-rejected");
      const titles = list.hit.titles ?? [];
      let cardTab = tabId;
      if (!card(list.hit)) {
        step = "open";
        tabs = watchNewTabs(tabId);
        for (const attempt of ["new-tab", "kept-in-tab"]) {
          await sleep3(cfg.stepDelayMs);
          if (attempt === "kept-in-tab") await chrome.scripting.executeScript({ target: { tabId }, world: "MAIN", func: keepInTab });
          const clicked = await chrome.scripting.executeScript({ target: { tabId }, func: clickOpen, args: [cfg.page] });
          if (!clicked[0]?.result) return egiftReport(0, 0, "no-open-button");
          step = "card-tab";
          const deadline = Date.now() + cfg.newTabWaitMs;
          while (Date.now() < deadline) {
            await sleep3(cfg.pollMs);
            const child = (await tabs.portal())[0];
            if (child != null) {
              cardTab = child;
              opened = "new-tab";
              break;
            }
            try {
              const s = await read(tabId, cfg.page);
              if (s && card(s)) {
                opened = attempt === "new-tab" ? "same-tab" : "kept-in-tab";
                break;
              }
            } catch {
            }
          }
          if (opened) break;
          step = "open";
        }
        if (!opened) {
          const late = (await tabs.portal())[0];
          if (late != null) {
            cardTab = late;
            opened = "new-tab";
          }
        }
      } else {
        opened = "same-tab";
      }
      let expected = 1;
      let total = 0;
      let lastCode = "";
      while (cards < MAX_CARDS) {
        step = "page";
        const got = await waitFor(cardTab, cfg, (st) => {
          const c2 = card(st);
          return !!c2 && c2.code !== lastCode;
        });
        if (!got.hit) {
          failure = cards ? "ended-early" : timedOut(got.last, "page-timeout");
          break;
        }
        const c = card(got.hit);
        if (cards === 0) total = c.total;
        if (c.index !== expected) {
          failure = "out-of-sequence";
          break;
        }
        if (c.total !== total) {
          failure = "total-mismatch";
          break;
        }
        cards++;
        lastCode = c.code;
        const title = titleFor(titles, c.index, total, cfg.pats.amount);
        if (title && c.value != null && c.value !== title.value) counts.mismatched++;
        camera ?? (camera = cardCamera(cardTab));
        const image = await camera.shoot(cfg.page.cardImage);
        let ok = false;
        try {
          const r = await doFetch(`${base}/api/extension/egift`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...headers },
            body: JSON.stringify(egiftPostBody(orderId, c, { title, image }))
          });
          ok = r.ok;
        } catch {
          ok = false;
        }
        if (!ok) {
          failure = "save-failed";
          break;
        }
        saved++;
        if (image) counts.images++;
        if (title) counts.named++;
        if (c.index >= total) {
          if (c.index !== total) failure = "ended-early";
          break;
        }
        step = "next";
        await sleep3(cfg.stepDelayMs);
        const next = await chrome.scripting.executeScript({ target: { tabId: cardTab }, func: clickNext, args: [cfg.page] });
        if (!next[0]?.result) {
          failure = "ended-early";
          break;
        }
        expected++;
      }
      if (!failure && cards >= MAX_CARDS && saved < total) failure = "ended-early";
      return egiftReport(cards, saved, failure, opened, counts);
    } catch (e) {
      return egiftReport(cards, saved, egiftErrorCode(step, e), opened, counts);
    } finally {
      clearInterval(keep);
      if (camera) await camera.close().catch(() => {
      });
      if (tabs) {
        tabs.stop();
        for (const id of await tabs.portal().catch(() => [])) await chrome.tabs.remove(id).catch(() => {
        });
      }
      if (tabId != null) await chrome.tabs.remove(tabId).catch(() => {
      });
      running2 = false;
    }
  }
  var KEEPALIVE_MS3, running2, sleep3, timedOut;
  var init_egiftRun = __esm({
    "src/background/egiftRun.ts"() {
      "use strict";
      init_egiftCommand();
      init_egiftPage();
      init_egiftShot();
      KEEPALIVE_MS3 = 2e4;
      running2 = false;
      sleep3 = (ms) => new Promise((r) => setTimeout(r, ms));
      timedOut = (last, otherwise) => last?.botCheck ? "bot-check" : otherwise;
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
    const orders = [...new Set(p.orderNumbers.map((o) => String(o).trim()).filter((o) => AMAZON_ORDER2.test(o)))];
    if (!orders.length) return { action: "fail", error: "no Amazon order numbers" };
    return { action: "run", orders };
  }
  var AMAZON_ORDER2;
  var init_trackCommand = __esm({
    "src/lib/trackCommand.ts"() {
      "use strict";
      AMAZON_ORDER2 = /^\d{3}-\d{7}-\d{7}$/;
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

  // src/lib/costcoCommand.ts
  function isSignInUrl(url) {
    return /signin\.costco\.com|\/logon|LogonForm|\/login/i.test(String(url ?? ""));
  }
  function isCostcoUrl(url) {
    return /^https:\/\/([a-z0-9-]+\.)*costco\.com(\/|$)/i.test(String(url ?? ""));
  }
  function orderCommandPlan(payloadJson, settingsUserId) {
    let p = null;
    try {
      p = payloadJson ? JSON.parse(payloadJson) : null;
    } catch {
      p = null;
    }
    if (!p || !Array.isArray(p.orderNumbers)) return { action: "fail", error: "bad payload" };
    const mine = String(settingsUserId ?? "").trim();
    if (mine && p.userId != null && String(p.userId) !== mine) {
      return { action: "fail", error: `orders belong to user ${String(p.userId)}, this extension is user ${mine}` };
    }
    const orderNumbers = [...new Set(p.orderNumbers.map((o) => String(o ?? "").replace(/\D/g, "")).filter(Boolean))].slice(0, MAX_DETAIL_ORDERS);
    if (!orderNumbers.length) return { action: "fail", error: "no order numbers" };
    return { action: "run", orderNumbers };
  }
  function costcoCardLast4(payments) {
    const cards = (payments ?? []).filter((p) => p && !p.isGOMPayment && !NOT_A_CARD.test(String(p.paymentType ?? ""))).map((p) => ({ raw: String(p.cardNumber ?? ""), charged: Number(p.totalCharged) || 0 })).filter((c) => /^\d{4}$/.test(c.raw) || /^[*xX•\s-]+\d{4}$/.test(c.raw)).map((c) => ({ last4: c.raw.slice(-4), charged: c.charged }));
    if (!cards.length) return void 0;
    cards.sort((a, b) => b.charged - a.charged);
    return cards[0].last4;
  }
  function costcoShipAddress(shipTos) {
    const s = (shipTos ?? []).find((x) => x && !x.isShipToWarehouse && String(x.line1 ?? "").trim());
    if (!s) return "";
    const t = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
    const name = [t(s.firstName), t(s.lastName)].filter(Boolean).join(" ");
    const cityLine = [t(s.city) && `${t(s.city)},`, t(s.state), t(s.postalCode)].filter(Boolean).join(" ").replace(/,$/, "");
    return [name, t(s.line1), t(s.line2), t(s.line3), cityLine].filter(Boolean).join(", ");
  }
  function costcoMerchandiseSubtotal(o) {
    if (!o || o.merchandiseTotal == null || o.merchandiseTotal === "") return null;
    const mt = Number(o.merchandiseTotal);
    if (!Number.isFinite(mt)) return null;
    const disc = Math.abs(Number(o.discountAmount) || 0);
    return Math.round(Math.max(0, mt - disc) * 100) / 100;
  }
  function mapOrderDetails(o) {
    if (!o || !o.orderNumber) return null;
    if (SKIP_STATUSES.has(String(o.status ?? "").toLowerCase())) return null;
    const lines = (o.shipToAddress ?? []).flatMap((s) => s && s.orderLineItems || []).filter((li) => !SKIP_STATUSES.has(String(li.orderStatus ?? "").toLowerCase()));
    const descriptions = [...new Set(lines.map((li) => String(li.itemDescription ?? "").trim()).filter(Boolean))];
    const tracking = [...new Set(
      lines.flatMap((li) => li.shipment ?? []).filter((s) => s && s.trackingNumber && !DIGITAL_CARRIERS.has(String(s.carrierName ?? "").toLowerCase())).map((s) => String(s.trackingNumber))
    )];
    const row = {
      platform: "Costco",
      orderNumber: String(o.orderNumber),
      orderDate: String(o.orderPlacedDate ?? "").split("T")[0],
      itemDescription: descriptions.join(", ").slice(0, 200),
      cost: Number(o.orderTotal) || 0,
      shippingCost: 0,
      shippingAddress: costcoShipAddress(o.shipToAddress),
      trackingNumbers: tracking,
      sourceUrl: `https://www.costco.com/myaccount/#/app/${COSTCO_APP_ID}/orderdetails/${o.orderNumber}`
    };
    const last4 = costcoCardLast4(o.orderPayment);
    if (last4) row.paymentLast4 = last4;
    const sub = costcoMerchandiseSubtotal(o);
    if (sub != null) row.merchandiseSubtotal = sub;
    return row;
  }
  function costcoReport(o) {
    if (o.kind === "done") return { status: "done", result: o.result };
    if (o.kind === "timeout") return { status: "failed", result: { error: String(o.message || COSTCO_TIMEOUT_MESSAGE).slice(0, 300) } };
    const error = String(o.message || "run failed").slice(0, 300);
    return error === COSTCO_SIGN_IN_MESSAGE ? { status: "failed", result: { error, signInNeeded: true } } : { status: "failed", result: { error } };
  }
  function judgeTab(look2) {
    if (isSignInUrl(look2.url)) return "signed-out";
    if (look2.listSeen || look2.orderPages > 0) return "ready";
    return "wait";
  }
  function judgeDeadline(look2) {
    return isSignInUrl(look2.url) ? "signed-out" : "timeout";
  }
  function noDetailsMessage(timedOut2, skipped, deferred = 0) {
    const base = `Costco order details: none of ${timedOut2} page(s) loaded`;
    const notes = [
      skipped > 0 ? `${skipped} other order(s) skipped` : "",
      deferred > 0 ? `${deferred} not tried, out of time` : ""
    ].filter(Boolean);
    return notes.length ? `${base} (${notes.join(", ")})` : base;
  }
  var COSTCO_SIGN_IN_MESSAGE, MAX_DETAIL_ORDERS, COSTCO_APP_ID, SKIP_STATUSES, DIGITAL_CARRIERS, NOT_A_CARD, COSTCO_TIMEOUT_MESSAGE;
  var init_costcoCommand = __esm({
    "src/lib/costcoCommand.ts"() {
      "use strict";
      COSTCO_SIGN_IN_MESSAGE = "Costco sign-in needed - sign in to costco.com in this browser";
      MAX_DETAIL_ORDERS = 25;
      COSTCO_APP_ID = "4900eb1f-0c10-4bd9-99c3-c59e6c1ecebf";
      SKIP_STATUSES = /* @__PURE__ */ new Set(["cancelled", "canceled"]);
      DIGITAL_CARRIERS = /* @__PURE__ */ new Set(["electronic delivery service", "email delivery", "email"]);
      NOT_A_CARD = /coupon|shop\s*card|gift|cash|stored\s*value|membership/i;
      COSTCO_TIMEOUT_MESSAGE = "Costco page did not load in time";
    }
  });

  // src/background/costcoRun.ts
  function claimCostcoRun(commandId) {
    if (active2 || sweeping) return false;
    active2 = true;
    currentCommandId = commandId;
    return true;
  }
  function releaseCostcoRun() {
    active2 = false;
    currentCommandId = null;
  }
  async function rememberRunTab2(tabId) {
    const rec = { commandId: currentCommandId, tabId, startedAt: Date.now() };
    try {
      await store2().set({ [RUN_TAB_KEY2]: rec });
    } catch {
    }
  }
  async function forgetRunTab2() {
    try {
      await store2().remove(RUN_TAB_KEY2);
    } catch {
    }
  }
  async function keepAwake2(work) {
    const t = setInterval(() => {
      chrome.runtime.getPlatformInfo().catch(() => {
      });
    }, KEEPALIVE_MS4);
    try {
      return await work();
    } finally {
      clearInterval(t);
      await forgetRunTab2();
    }
  }
  async function closeOrphanCostcoTab() {
    try {
      const got = await store2().get(RUN_TAB_KEY2);
      const rec = got[RUN_TAB_KEY2];
      if (!rec) return null;
      await store2().remove(RUN_TAB_KEY2);
      if (typeof rec.tabId === "number") {
        const tab = await chrome.tabs.get(rec.tabId).catch(() => null);
        if (tab && isCostcoUrl(tab.url)) await chrome.tabs.remove(rec.tabId).catch(() => {
        });
      }
      return typeof rec.commandId === "number" ? rec.commandId : null;
    } catch {
      return null;
    } finally {
      sweeping = false;
    }
  }
  async function openTab() {
    const tab = await chrome.tabs.create({ url: ordersUrl(), active: false });
    if (tab.id == null) throw new Error("could not open a tab");
    await rememberRunTab2(tab.id);
    return tab.id;
  }
  function closeTab(tabId) {
    if (tabId != null) chrome.tabs.remove(tabId).catch(() => {
    });
  }
  async function inPage(tabId, func, args = []) {
    try {
      const r = await chrome.scripting.executeScript({ target: { tabId }, world: MAIN, func, args });
      return r[0]?.result ?? null;
    } catch {
      return null;
    }
  }
  async function look(tabId) {
    let url = "";
    try {
      url = (await chrome.tabs.get(tabId)).url ?? "";
    } catch {
    }
    const state = await inPage(tabId, () => {
      const w = window;
      return {
        hasAuth: !!w.__costcoAuth,
        orderPages: (w.__costcoAllOrders ?? []).length,
        listSeen: !!w.__costcoListSeen
      };
    });
    return { url, hasAuth: !!state?.hasAuth, orderPages: state?.orderPages ?? 0, listSeen: !!state?.listSeen };
  }
  async function waitReady(tabId, timeoutMs = readyWaitMs()) {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      const verdict = judgeTab(await look(tabId));
      if (verdict !== "wait") return verdict;
      await sleep4(pollMs());
    }
    const last = await look(tabId);
    return judgeTab(last) === "ready" ? "ready" : judgeDeadline(last);
  }
  function noteCostcoMessage(tabId, message) {
    if (tabId == null) return;
    const settle = waiting.get(tabId);
    if (!settle) return;
    if (message.type === "SYNC_DONE") settle({ kind: "done", result: message.result ?? {} });
    else if (message.type === "SYNC_ERROR") settle({ kind: "error", message: String(message.error ?? "run failed") });
  }
  function expectReport(tabId, timeoutMs) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => finish({ kind: "error", message: "Costco sync timed out" }), timeoutMs);
      function finish(o) {
        clearTimeout(timer);
        waiting.delete(tabId);
        resolve(o);
      }
      waiting.set(tabId, finish);
    });
  }
  function runCostcoSync() {
    return keepAwake2(syncOnce);
  }
  async function syncOnce() {
    let tabId;
    try {
      tabId = await openTab();
      const ready = await waitReady(tabId);
      if (ready === "timeout") return { kind: "timeout", message: COSTCO_TIMEOUT_MESSAGE };
      if (ready !== "ready") return { kind: "error", message: COSTCO_SIGN_IN_MESSAGE };
      const report = expectReport(tabId, syncTimeoutMs());
      const alive = await chrome.tabs.sendMessage(tabId, { type: "PING" }).catch(() => null);
      if (!alive) await chrome.scripting.executeScript({ target: { tabId }, files: ["content/costco.js"] });
      await chrome.tabs.sendMessage(tabId, { type: "START_SYNC", platform: "Costco" });
      return await report;
    } catch (e) {
      return { kind: "error", message: String(e).slice(0, 200) };
    } finally {
      if (tabId != null) waiting.delete(tabId);
      closeTab(tabId);
    }
  }
  function readCostcoOrders(orderNumbers) {
    return keepAwake2(() => readOnce(orderNumbers));
  }
  async function readOnce(orderNumbers) {
    let tabId;
    try {
      tabId = await openTab();
      const ready = await waitReady(tabId);
      if (ready === "timeout") return { kind: "error", message: COSTCO_TIMEOUT_MESSAGE };
      if (ready !== "ready") return { kind: "error", message: COSTCO_SIGN_IN_MESSAGE };
      const appId = await inPage(tabId, ((src) => {
        const m = new RegExp(src).exec(location.hash || "");
        return m ? m[1] : null;
      }), [S().patterns.appIdHash]) || COSTCO_APP_ID;
      const deadline = Date.now() + ordersTimeoutMs();
      const rows = [];
      let timedOut2 = 0;
      let skipped = 0;
      let deferred = 0;
      for (let i = 0; i < orderNumbers.length; i++) {
        if (Date.now() >= deadline) {
          deferred = orderNumbers.length - i;
          break;
        }
        if (i > 0) await sleep4(detailDelayMs());
        const n = orderNumbers[i];
        await inPage(tabId, ((h) => {
          location.hash = h;
        }), [S().urls.orderDetailHash.replace("{appId}", () => String(appId)).replace("{orderNumber}", () => n)]);
        const found = await waitForDetails(tabId, n);
        if (found === "signed-out") return { kind: "error", message: COSTCO_SIGN_IN_MESSAGE };
        if (!found) {
          timedOut2++;
          continue;
        }
        const row = mapOrderDetails(found);
        if (row) rows.push(row);
        else skipped++;
      }
      if (!rows.length && timedOut2) return { kind: "error", message: noDetailsMessage(timedOut2, skipped, deferred) };
      return { kind: "rows", rows, timedOut: timedOut2, skipped, deferred };
    } catch (e) {
      return { kind: "error", message: String(e).slice(0, 200) };
    } finally {
      closeTab(tabId);
    }
  }
  async function waitForDetails(tabId, orderNumber) {
    const end = Date.now() + detailWaitMs();
    while (Date.now() < end) {
      const o = await inPage(tabId, ((k) => (window.__costcoOrderDetails ?? {})[k] ?? null), [orderNumber]);
      if (o) return o;
      if (judgeTab(await look(tabId)) === "signed-out") return "signed-out";
      await sleep4(pollMs());
    }
    return null;
  }
  var S, ordersUrl, readyWaitMs, syncTimeoutMs, detailWaitMs, ordersTimeoutMs, detailDelayMs, pollMs, sleep4, MAIN, active2, sweeping, currentCommandId, RUN_TAB_KEY2, KEEPALIVE_MS4, store2, waiting;
  var init_costcoRun = __esm({
    "src/background/costcoRun.ts"() {
      "use strict";
      init_costcoCommand();
      init_scrapeConfig();
      S = () => getScrape("costco");
      ordersUrl = () => S().urls.orders;
      readyWaitMs = () => S().timeoutsMs.readyWaitMs;
      syncTimeoutMs = () => S().timeoutsMs.syncTimeoutMs;
      detailWaitMs = () => S().timeoutsMs.detailWaitMs;
      ordersTimeoutMs = () => S().timeoutsMs.ordersTimeoutMs;
      detailDelayMs = () => S().timeoutsMs.detailDelayMs;
      pollMs = () => S().timeoutsMs.pollMs;
      sleep4 = (ms) => new Promise((r) => setTimeout(r, ms));
      MAIN = "MAIN";
      active2 = false;
      sweeping = true;
      currentCommandId = null;
      RUN_TAB_KEY2 = "costcoRunTab";
      KEEPALIVE_MS4 = 2e4;
      store2 = () => chrome.storage.local;
      waiting = /* @__PURE__ */ new Map();
      chrome.tabs.onRemoved.addListener((tabId) => {
        waiting.get(tabId)?.({ kind: "error", message: "tab closed before scan finished" });
      });
    }
  });

  // src/background/index.ts
  var require_background = __commonJS({
    "src/background/index.ts"() {
      init_tracker_script();
      init_amazonCapture2();
      init_amazonRun();
      init_carrierRun();
      init_egiftRun();
      init_egiftCommand();
      init_trackCommand();
      init_visitCommand();
      init_browserTarget();
      init_costcoCommand();
      init_costcoRun();
      init_scrapeConfig();
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
      async function refreshScrapeConfig() {
        await initScrapeConfig();
        try {
          const { trackerUrl, apiKey, extensionSecret, userId } = await Promise.resolve().then(() => (init_storage(), storage_exports)).then((m) => m.getSettings());
          if (!trackerUrl) {
            await loadScrapeConfig(null);
            return;
          }
          const headers = {};
          if (apiKey) headers["X-API-Key"] = apiKey;
          if (extensionSecret) headers["X-Extension-Secret"] = extensionSecret;
          if (userId) headers["X-Extension-User-Id"] = userId;
          headers["X-Extension-Browser"] = isFirefox ? "firefox" : "chrome";
          await loadScrapeConfig({ base: upgradeUrl2(trackerUrl), headers });
        } catch {
        }
      }
      initScrapeConfig().then(() => refreshScrapeConfig()).catch(() => {
      });
      chrome.runtime.onInstalled.addListener(() => {
        console.log("[Reselling Tracker] Extension installed.");
        setToolbarIcon();
        chrome.alarms.create("scrapeConfig", { delayInMinutes: 1, periodInMinutes: 360 });
        refreshScrapeConfig().catch(() => {
        });
        chrome.alarms.create("pollCommands", { when: Date.now() + 2e3, periodInMinutes: 1 });
        pollAndExecuteCommands().catch(console.error);
        reregisterTrackerScript();
      });
      chrome.runtime.onStartup.addListener(() => {
        setToolbarIcon();
        chrome.alarms.create("scrapeConfig", { delayInMinutes: 1, periodInMinutes: 360 });
        refreshScrapeConfig().catch(() => {
        });
        chrome.alarms.create("pollCommands", { when: Date.now() + 2e3, periodInMinutes: 1 });
        pollAndExecuteCommands().catch(console.error);
        reregisterTrackerScript();
      });
      chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === "scrapeConfig") refreshScrapeConfig().catch(() => {
        });
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
          noteCostcoMessage(tabId, message);
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
          const pageId = message.pageId;
          notePage(tabId, pageId);
          handleCapture(message, isRunTab(tabId), isTrackRunTab(tabId)).then((r) => {
            if ("result" in r && r.result) notifyOutcome(tabId, { kind: "result", result: r.result }, pageId);
            else if (!r.ok) notifyOutcome(tabId, { kind: "error", message: "send failed" }, pageId);
            else notifyOutcome(tabId, { kind: "result", result: {} }, pageId);
            sendResponse(r);
          }).catch((e) => {
            notifyOutcome(tabId, { kind: "error", message: String(e) }, pageId);
            sendResponse({ ok: false, error: String(e) });
          });
          return true;
        }
        if (message.type === "AMAZON_PAGE_SKIPPED") {
          notifyOutcome(sender.tab?.id, { kind: "error", message: "page skipped" }, message.pageId);
          return false;
        }
        if (message.type === "AMAZON_PAGE_BLOCKED") {
          notifyOutcome(sender.tab?.id, { kind: "blocked" }, message.pageId);
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
          if (scrapeConfigIsStale(res.headers.get("X-Scrape-Config-Version"))) refreshScrapeConfig().catch(() => {
          });
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
          if (cmd.type === "VISIT_AMAZON") {
            const plan = visitCommandPlan(cmd.payload, userId, amazonRunActive());
            if (plan.action === "wait") continue;
            await patchCommand(base, cmd.id, "running", headers);
            if (plan.action === "fail") {
              await patchCommand(base, cmd.id, "failed", headers, { error: plan.error });
              continue;
            }
            try {
              const out = await startVisitRun(plan.visits);
              const status = out.status;
              if (out.started === false) await patchCommand(base, cmd.id, "failed", headers, { notStarted: true, error: String(out.reason) });
              else if (status === "blocked") await patchCommand(base, cmd.id, "failed", headers, { blocked: true, error: "sign-in, CAPTCHA or block page", text: out.text, pages: out.pages });
              else if (status === "error") await patchCommand(base, cmd.id, "failed", headers, { error: String(out.message || "run failed"), text: out.text, pages: out.pages });
              else await patchCommand(base, cmd.id, "done", headers, out);
            } catch (e) {
              await patchCommand(base, cmd.id, "failed", headers, { error: String(e) });
            }
            continue;
          }
          if (cmd.type === "SYNC_COSTCO" || cmd.type === "SYNC_COSTCO_ORDER") {
            if (takenCostcoIds.has(cmd.id)) continue;
            if (!claimCostcoRun(cmd.id)) continue;
            takenCostcoIds.add(cmd.id);
            try {
              const orderPlan = cmd.type === "SYNC_COSTCO_ORDER" ? orderCommandPlan(cmd.payload, userId) : null;
              await patchCommand(base, cmd.id, "running", headers);
              if (orderPlan?.action === "fail") {
                await patchCommand(base, cmd.id, "failed", headers, { error: orderPlan.error });
                continue;
              }
              let report;
              try {
                report = orderPlan?.action === "run" ? await runCostcoOrderCommand(trackerUrl, apiKey ?? "", userId ?? "", orderPlan.orderNumbers) : costcoReport(await runCostcoSync());
              } catch (e) {
                report = costcoReport({ kind: "error", message: String(e) });
              }
              await patchCommand(base, cmd.id, report.status, headers, report.result);
            } finally {
              releaseCostcoRun();
            }
            continue;
          }
          if (cmd.type === "TRACK_CARRIER") {
            if (carrierRunActive()) continue;
            await patchCommand(base, cmd.id, "running", headers);
            const plan = parseCarrierPayload(cmd.payload, userId);
            if ("error" in plan) {
              await patchCommand(base, cmd.id, "failed", headers, { error: plan.error });
              continue;
            }
            try {
              const post = async (body) => {
                const r = await fetch(`${base}/api/extension/carrier-page`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
                return r.ok;
              };
              const out = await runCarrierItems(plan.items, post, plan.statusWords);
              await patchCommand(base, cmd.id, out.ok ? "done" : "failed", headers, out.ok ? out : { ...out, error: "no page could be read" });
            } catch (e) {
              await patchCommand(base, cmd.id, "failed", headers, { error: String(e) });
            }
            continue;
          }
          if (cmd.type === "SCRAPE_EGIFT") {
            if (egiftRunActive()) continue;
            await patchCommand(base, cmd.id, "running", headers);
            const plan = parseEgiftPayload(cmd.payload, userId);
            if ("error" in plan) {
              await patchCommand(base, cmd.id, "failed", headers, { error: plan.error });
              continue;
            }
            try {
              const report = await runEgiftOrder(base, headers, plan.orderId);
              await patchCommand(base, cmd.id, report.status, headers, report.result);
            } catch {
              await patchCommand(base, cmd.id, "failed", headers, { error: "error" });
            }
            continue;
          }
          await patchCommand(base, cmd.id, "running", headers);
          try {
            let result;
            if (cmd.type === "SYNC_AMAZON" || cmd.type === "SYNC_AMAZON_ORDER") {
              throw new Error("Amazon sync is disabled; use Sync Amazon (visible tab) or just browse your orders.");
            } else if (cmd.type === "SYNC_AMAZON_PAGES") {
              const out = await startAmazonRun();
              if (out.status === "error") {
                await patchCommand(base, cmd.id, "failed", headers, { error: String(out.message || "run failed"), text: out.text });
                continue;
              }
              if (out.status === "blocked") {
                await patchCommand(base, cmd.id, "failed", headers, { blocked: true, error: "sign-in, CAPTCHA or block page", text: out.text });
                continue;
              }
              result = out;
            } else if (cmd.type === "SYNC_WALMART") result = await runSyncCommand("Walmart");
            else if (cmd.type === "SYNC_BIGSKY") result = await runSyncCommand("BigSkyBuyers");
            else if (cmd.type === "SCRAPE_CBM") result = await runScrapeCbm(base, headers, cmd.payload);
            else {
              await patchCommand(base, cmd.id, "failed", headers, { error: `unknown command ${String(cmd.type).slice(0, 40)}: reload or update the extension` });
              continue;
            }
            await patchCommand(base, cmd.id, "done", headers, result);
          } catch (e) {
            await patchCommand(base, cmd.id, "failed", headers, String(e));
          }
        }
      }
      var takenCostcoIds = /* @__PURE__ */ new Set();
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
      async function runCostcoOrderCommand(trackerUrl, apiKey, userId, orderNumbers) {
        const read2 = await readCostcoOrders(orderNumbers);
        if (read2.kind === "error") return costcoReport(read2);
        const counts = { platform: "Costco", requested: orderNumbers.length, scraped: read2.rows.length, timedOut: read2.timedOut, skipped: read2.skipped, deferred: read2.deferred };
        if (!read2.rows.length) return costcoReport({ kind: "done", result: counts });
        try {
          const res = await handlePushOrders(trackerUrl, apiKey, userId, read2.rows);
          return costcoReport({ kind: "done", result: { ...counts, ...res && typeof res === "object" ? res : {} } });
        } catch (e) {
          return costcoReport({ kind: "error", message: String(e).slice(0, 200) });
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
            ...o.merchandiseSubtotal != null ? { merchandiseSubtotal: o.merchandiseSubtotal } : {},
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
      closeOrphanCostcoTab().then(async (commandId) => {
        if (commandId == null) return;
        const { trackerUrl, apiKey, extensionSecret, userId } = await Promise.resolve().then(() => (init_storage(), storage_exports)).then((m) => m.getSettings());
        if (!trackerUrl) return;
        const headers = {};
        if (apiKey) headers["X-API-Key"] = apiKey;
        if (extensionSecret) headers["X-Extension-Secret"] = extensionSecret;
        if (userId) headers["X-Extension-User-Id"] = userId;
        headers["X-Extension-Browser"] = isFirefox ? "firefox" : "chrome";
        await patchCommand(upgradeUrl2(trackerUrl), commandId, "failed", headers, { error: "browser restarted during the sync" });
      }).catch(() => {
      });
    }
  });
  require_background();
})();
