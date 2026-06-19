// Runs in ISOLATED world — bridges postMessage from MAIN world spy to background.

// Inject __apiSpyConfig into MAIN world from storage so the spy picks up user-set limits.
chrome.storage.local.get(['spyReqLimit', 'spyResLimit']).then((stored) => {
  const reqLimit = (stored.spyReqLimit as number | undefined) ?? 500;
  const resLimit = (stored.spyResLimit as number | undefined) ?? 2500;
  const script = document.createElement('script');
  script.textContent = `window.__apiSpyConfig = { reqLimit: ${reqLimit}, resLimit: ${resLimit} };`;
  document.documentElement.appendChild(script);
  script.remove();
});

window.addEventListener('message', (e) => {
  if (e.source !== window || !(e.data as Record<string, unknown>)?.__apiSpyEntry) return;
  chrome.runtime.sendMessage({ type: 'API_LOG', entry: e.data }).catch(() => {});
});
