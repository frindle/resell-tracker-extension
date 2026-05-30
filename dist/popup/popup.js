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

  // src/popup/popup.ts
  var require_popup = __commonJS({
    "src/popup/popup.ts"() {
      init_storage();
      function setStatus(platform, text, cls) {
        const el = document.getElementById(platform === "Amazon" ? "amazonStatus" : "walmartStatus");
        el.textContent = text;
        el.className = `status ${cls}`;
      }
      function setMeta(platform, text) {
        const el = document.getElementById(platform === "Amazon" ? "amazonMeta" : "walmartMeta");
        el.textContent = text;
      }
      function setSyncBtn(platform, disabled) {
        const btn = document.getElementById(platform === "Amazon" ? "syncAmazon" : "syncWalmart");
        btn.disabled = disabled;
      }
      async function triggerSync(platform) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
          setStatus(platform, "No active tab", "fail");
          return;
        }
        setSyncBtn(platform, true);
        setStatus(platform, "syncing\u2026", "syncing");
        chrome.tabs.sendMessage(tab.id, { type: "START_SYNC", platform }).catch(() => {
          setStatus(platform, "Not on orders page", "fail");
          setSyncBtn(platform, false);
        });
      }
      async function init() {
        const settings = await getSettings();
        if (!settings.trackerUrl || !settings.userId) {
          document.getElementById("notConfigured").style.display = "block";
        }
        if (settings.amazonLastSync) setMeta("Amazon", `Last sync: ${settings.amazonLastSync}`);
        if (settings.walmartLastSync) setMeta("Walmart", `Last sync: ${settings.walmartLastSync}`);
        document.getElementById("syncAmazon").addEventListener("click", () => triggerSync("Amazon"));
        document.getElementById("syncWalmart").addEventListener("click", () => triggerSync("Walmart"));
        document.getElementById("openSettings").addEventListener("click", (e) => {
          e.preventDefault();
          chrome.runtime.openOptionsPage();
        });
        chrome.runtime.onMessage.addListener((message) => {
          if (message.type === "SYNC_STARTED") {
            setStatus(message.platform, "syncing\u2026", "syncing");
            setSyncBtn(message.platform, true);
          } else if (message.type === "SYNC_PROGRESS") {
            setStatus(message.platform, message.message, "syncing");
          } else if (message.type === "SYNC_DONE") {
            const { result } = message;
            const text = result.scraped === 0 ? "no new orders" : `+${result.imported} new, ${result.updated} updated`;
            setStatus(result.platform, text, "ok");
            setMeta(result.platform, `Last sync: ${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}`);
            setSyncBtn(result.platform, false);
          } else if (message.type === "SYNC_ERROR") {
            setStatus(message.platform, `Error: ${message.error}`, "fail");
            setSyncBtn(message.platform, false);
          }
        });
      }
      init();
    }
  });
  require_popup();
})();
