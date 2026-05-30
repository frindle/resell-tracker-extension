"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/background/index.ts
  var require_background = __commonJS({
    "src/background/index.ts"() {
      chrome.runtime.onInstalled.addListener(() => {
        console.log("[Reselling Tracker] Extension installed.");
      });
      chrome.runtime.onMessage.addListener((message, sender) => {
        if (message.type === "SET_BADGE") {
          const tabId = sender.tab?.id;
          if (tabId) {
            chrome.action.setBadgeText({ text: message.text, tabId });
            chrome.action.setBadgeBackgroundColor({ color: message.color ?? "#3b82f6", tabId });
          }
        }
      });
    }
  });
  require_background();
})();
