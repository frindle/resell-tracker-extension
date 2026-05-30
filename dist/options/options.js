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
        userId: "",
        userName: "",
        amazonLastSync: "",
        walmartLastSync: ""
      };
    }
  });

  // src/lib/api.ts
  async function fetchUsers(trackerUrl) {
    const url = `${trackerUrl.replace(/\/$/, "")}/api/users`;
    const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text().catch(() => res.statusText)}`);
    const data = await res.json();
    return data.map((u) => ({ id: u.id, name: u.name }));
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
      var users = [];
      async function loadUsers(trackerUrl) {
        const select = document.getElementById("userSelect");
        const userSection = document.getElementById("userSection");
        const userStatus = document.getElementById("userStatus");
        userStatus.textContent = "Fetching users\u2026";
        userStatus.className = "status";
        try {
          users = await fetchUsers(trackerUrl);
          select.innerHTML = '<option value="">\u2014 select user \u2014</option>' + users.map((u) => `<option value="${u.id}">${u.name}</option>`).join("");
          userSection.style.display = "block";
          userStatus.textContent = "";
        } catch (err) {
          userStatus.textContent = `Could not load users: ${err instanceof Error ? err.message : String(err)}`;
          userStatus.className = "status fail";
        }
      }
      async function init() {
        const settings = await getSettings();
        document.getElementById("trackerUrl").value = settings.trackerUrl;
        document.getElementById("amazonLastSync").value = settings.amazonLastSync;
        document.getElementById("walmartLastSync").value = settings.walmartLastSync;
        const userSection = document.getElementById("userSection");
        const select = document.getElementById("userSelect");
        if (settings.trackerUrl) {
          await loadUsers(settings.trackerUrl);
          if (settings.userId) select.value = settings.userId;
        }
        document.getElementById("connect").addEventListener("click", async () => {
          const trackerUrl = document.getElementById("trackerUrl").value.trim();
          if (!trackerUrl) return;
          await saveSettings({ trackerUrl });
          await loadUsers(trackerUrl);
        });
        document.getElementById("saveUser").addEventListener("click", async () => {
          const userId = select.value;
          const user = users.find((u) => String(u.id) === userId);
          await saveSettings({ userId, userName: user?.name ?? "" });
          const saved = document.getElementById("userSaved");
          saved.style.display = "inline";
          setTimeout(() => {
            saved.style.display = "none";
          }, 2e3);
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
