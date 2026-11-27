"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/lib/scrapeConfig.default.json
  var scrapeConfig_default_default;
  var init_scrapeConfig_default = __esm({
    "src/lib/scrapeConfig.default.json"() {
      scrapeConfig_default_default = {
        version: 2,
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
              alert: 'div.ui-message[role="alert"], [role="alert"]',
              submitButton: '#submitBtn, button[type="submit"], input[type="submit"]',
              buttons: "button",
              nextButton: 'input[id$="wdt-nav-next"], button[id$="wdt-nav-next"]',
              counter: "#wdt-page-counter",
              labelCells: "td, th, div, p, li, span, label",
              botCheck: 'iframe[src*="_Incapsula_Resource"], iframe[src*="captcha" i], iframe[title*="challenge" i]'
            },
            labels: {
              openLabel: "Access eGift",
              nextLabel: "next",
              codeLabel: "Code:",
              pinLabel: "PIN:"
            },
            patterns: {
              nextButton: "^next\\b",
              alertText: "\\b(invalid|not match|incorrect|error)\\b",
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
  var SCRAPE_CATEGORIES, NAME_RE, SITE_RE, MAX_STRING, MAX_MS, bundledCheck, BUNDLED_SCRAPE_CONFIG, active, resolved;
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
      resolved = /* @__PURE__ */ new Map();
    }
  });

  // src/content/costco-interceptor.ts
  var require_costco_interceptor = __commonJS({
    "src/content/costco-interceptor.ts"() {
      init_scrapeConfig();
      console.log("[CST-INT] interceptor script executing");
      var API_HOST = getScrape("costco").urls.apiHost;
      var GRAPHQL_PATH = getScrape("costco").urls.graphqlPath;
      (function() {
        window.__origFetch = window.fetch.bind(window);
        console.log("[CST-INT] __origFetch saved, interceptor installed");
        function headersToPlain(h) {
          if (!h) return {};
          if (h instanceof Headers) {
            const out2 = {};
            h.forEach((v, k) => {
              out2[k.toLowerCase()] = v;
            });
            return out2;
          }
          if (Array.isArray(h)) {
            const out2 = {};
            for (const [k, v] of h) out2[k.toLowerCase()] = v;
            return out2;
          }
          const out = {};
          for (const [k, v] of Object.entries(h)) out[k.toLowerCase()] = v;
          return out;
        }
        function tryCapture(url, headers) {
          if (!url.includes(API_HOST)) return;
          const auth = headers["costco-x-authorization"] ?? headers["authorization"] ?? "";
          const clientId = headers["costco-x-wcs-clientid"] ?? "";
          console.log("[CST-INT] ecom-api \u2192", url);
          console.log("[CST-INT] all headers:", JSON.stringify(headers));
          if (auth.startsWith("Bearer ") && clientId) {
            console.log("[CST-INT] captured ecom-api auth token");
            window.__costcoAuth = { token: auth.slice(7), clientId, allHeaders: { ...headers } };
          }
        }
        function captureOrderDetails(data) {
          try {
            const od = data?.data?.getOrderDetails;
            if (!od) return;
            const w = window;
            const byNumber = w.__costcoOrderDetails ?? {};
            for (const o of Array.isArray(od) ? od : [od]) {
              const key = String(o?.orderNumber ?? "").replace(/\D/g, "");
              if (key) byNumber[key] = o;
            }
            w.__costcoOrderDetails = byNumber;
          } catch {
          }
        }
        function captureOrderList(data) {
          try {
            const pages = data?.data?.getOnlineOrders;
            if (pages == null) return;
            const w = window;
            w.__costcoListSeen = true;
            if (Array.isArray(pages)) {
              const existing = w.__costcoAllOrders ?? [];
              for (const page of pages) existing.push(page);
              w.__costcoAllOrders = existing;
              console.log("[CST-INT] accumulated orders, total pages:", existing.length);
            }
          } catch {
          }
        }
        const origFetch = window.__origFetch;
        window.fetch = async function(input, init) {
          const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
          tryCapture(url, headersToPlain(init?.headers));
          const res = await origFetch(input, init);
          if (url.includes(API_HOST)) {
            console.log("[CST-INT] response \u2190", url, res.status, res.ok ? "OK" : "FAIL");
            if (res.ok && url.includes(GRAPHQL_PATH)) {
              res.clone().json().then((data) => {
                captureOrderDetails(data);
                captureOrderList(data);
                const w = window;
                const rc = data?.data?.receiptsWithCounts;
                if (rc) {
                  const receipts = rc.receipts ?? [];
                  const list = w.__costcoReceiptList ?? [];
                  const details = w.__costcoReceiptDetails ?? {};
                  if (receipts.length > 1) {
                    for (const r of receipts) {
                      if (r.transactionBarcode && !list.find((x) => x.transactionBarcode === r.transactionBarcode)) {
                        list.push(r);
                      }
                    }
                    console.log("[CST-INT] fetch: accumulated receipts, total:", list.length);
                  } else if (receipts.length === 1 && receipts[0]?.transactionBarcode) {
                    const r = receipts[0];
                    const bc = r.transactionBarcode;
                    const idx = list.findIndex((x) => x.transactionBarcode === bc);
                    if (idx >= 0) list[idx] = r;
                    else list.push(r);
                    details[bc] = r;
                    console.log("[CST-INT] fetch: stored receipt detail for", bc);
                  }
                  w.__costcoReceiptList = list;
                  w.__costcoReceiptDetails = details;
                }
              }).catch(() => {
              });
            }
          }
          return res;
        };
        const origOpen = XMLHttpRequest.prototype.open;
        const origSetHeader = XMLHttpRequest.prototype.setRequestHeader;
        const origSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
          this.__xhrUrl = url;
          this.__xhrHeaders = {};
          return origOpen.call(this, method, url, ...rest);
        };
        XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
          const self = this;
          const h = self.__xhrHeaders;
          h[name.toLowerCase()] = value;
          tryCapture(self.__xhrUrl ?? "", h);
          return origSetHeader.call(this, name, value);
        };
        XMLHttpRequest.prototype.send = function(body) {
          const self = this;
          const url = self.__xhrUrl ?? "";
          if (url.includes(API_HOST)) {
            this.addEventListener("load", function() {
              console.log("[CST-INT] XHR response \u2190", url, this.status, this.status < 400 ? "OK" : "FAIL");
              if (this.status < 400 && url.includes(GRAPHQL_PATH)) {
                try {
                  const data = JSON.parse(this.responseText);
                  const w = window;
                  captureOrderDetails(data);
                  captureOrderList(data);
                  const rc = data?.data?.receiptsWithCounts;
                  if (rc) {
                    const receipts = rc.receipts ?? [];
                    const list = w.__costcoReceiptList ?? [];
                    const details = w.__costcoReceiptDetails ?? {};
                    if (receipts.length > 1) {
                      for (const r of receipts) {
                        if (r.transactionBarcode && !list.find((x) => x.transactionBarcode === r.transactionBarcode)) {
                          list.push(r);
                        }
                      }
                      console.log("[CST-INT] accumulated receipts, total:", list.length);
                    } else if (receipts.length === 1 && receipts[0]?.transactionBarcode) {
                      const r = receipts[0];
                      const bc = r.transactionBarcode;
                      const idx = list.findIndex((x) => x.transactionBarcode === bc);
                      if (idx >= 0) list[idx] = r;
                      else list.push(r);
                      details[bc] = r;
                      console.log("[CST-INT] stored receipt detail for", bc);
                    }
                    w.__costcoReceiptList = list;
                    w.__costcoReceiptDetails = details;
                  }
                } catch {
                }
              }
            });
          }
          return origSend.call(this, body);
        };
      })();
    }
  });
  require_costco_interceptor();
})();
