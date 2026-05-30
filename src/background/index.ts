// Background service worker — relays messages between content scripts and popup

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Forward sync messages to any open popup
  chrome.runtime.sendMessage(message).catch(() => {});
  sendResponse({ ok: true });
  return true;
});
