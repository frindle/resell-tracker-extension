chrome.runtime.onInstalled.addListener(() => {
  console.log('[Reselling Tracker] Extension installed.');
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'SET_BADGE') {
    const tabId = sender.tab?.id;
    if (tabId) {
      chrome.action.setBadgeText({ text: message.text, tabId });
      chrome.action.setBadgeBackgroundColor({ color: message.color ?? '#3b82f6', tabId });
    }
  }
});
