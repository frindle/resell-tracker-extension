// Runs in ISOLATED world — bridges postMessage from MAIN world spy to background.
window.addEventListener('message', (e) => {
  if (e.source !== window || !(e.data as Record<string, unknown>)?.__apiSpyEntry) return;
  chrome.runtime.sendMessage({ type: 'API_LOG', entry: e.data }).catch(() => {});
});
