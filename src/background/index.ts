// Minimal service worker — keeps the extension alive.
// Content scripts communicate directly with the popup via chrome.runtime.sendMessage.
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Resell Tracker] Extension installed.');
});
