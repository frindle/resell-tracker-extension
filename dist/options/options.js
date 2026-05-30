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
  async function saveSettings(settings) {
    await chrome.storage.sync.set(settings);
  }
  var DEFAULTS;
  var init_storage = __esm({
    "src/lib/storage.ts"() {
      "use strict";
      DEFAULTS = {
        trackerUrl: "",
        apiKey: "",
        amazonLastSync: "",
        walmartLastSync: ""
      };
    }
  });

  // src/lib/api.ts
  async function testConnection(trackerUrl, apiKey) {
    const url = `${trackerUrl.replace(/\/$/, "")}/api/auth/me`;
    const res = await fetch(url, {
      headers: apiKey ? { "X-API-Key": apiKey } : {},
      credentials: "include"
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text().catch(() => res.statusText)}`);
  }
  var init_api = __esm({
    "src/lib/api.ts"() {
      "use strict";
    }
  });

  // src/options/options.ts
  var require_options = __commonJS({
    "src/options/options.ts"() {
      init_storage();
      init_api();
      async function init() {
        const settings = await getSettings();
        document.getElementById("trackerUrl").value = settings.trackerUrl;
        document.getElementById("apiKey").value = settings.apiKey;
        document.getElementById("amazonLastSync").value = settings.amazonLastSync;
        document.getElementById("walmartLastSync").value = settings.walmartLastSync;
        document.getElementById("save").addEventListener("click", async () => {
          const trackerUrl = document.getElementById("trackerUrl").value.trim();
          const apiKey = document.getElementById("apiKey").value.trim();
          await saveSettings({ trackerUrl, apiKey });
          const status = document.getElementById("status");
          status.textContent = "Saved!";
          status.className = "status ok";
          setTimeout(() => {
            status.textContent = "";
          }, 2e3);
        });
        document.getElementById("test").addEventListener("click", async () => {
          const trackerUrl = document.getElementById("trackerUrl").value.trim();
          const apiKey = document.getElementById("apiKey").value.trim();
          const status = document.getElementById("status");
          status.textContent = "Testing\u2026";
          status.className = "status";
          try {
            await testConnection(trackerUrl, apiKey);
            status.textContent = "Connected!";
            status.className = "status ok";
          } catch (err) {
            status.textContent = `Failed: ${err instanceof Error ? err.message : String(err)}`;
            status.className = "status fail";
          }
        });
        document.getElementById("saveDates").addEventListener("click", async () => {
          const amazonLastSync = document.getElementById("amazonLastSync").value;
          const walmartLastSync = document.getElementById("walmartLastSync").value;
          await saveSettings({ amazonLastSync, walmartLastSync });
          const saved = document.getElementById("datesSaved");
          saved.style.display = "inline";
          setTimeout(() => {
            saved.style.display = "none";
          }, 2e3);
        });
      }
      init();
    }
  });
  require_options();
})();
