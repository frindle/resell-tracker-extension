import { getSettings } from '../lib/storage';
import type { SyncMessage, Platform } from '../lib/types';

function setStatus(platform: Platform, text: string, cls: string) {
  const id = platform === 'Amazon' ? 'amazonStatus' : platform === 'Walmart' ? 'walmartStatus' : 'costcoStatus';
  const el = document.getElementById(id)!;
  el.textContent = text;
  el.className = `status ${cls}`;
}

function setMeta(platform: Platform, text: string) {
  const id = platform === 'Amazon' ? 'amazonMeta' : platform === 'Walmart' ? 'walmartMeta' : 'costcoMeta';
  const el = document.getElementById(id)!;
  el.textContent = text;
}

function setSyncBtn(platform: Platform, disabled: boolean) {
  const id = platform === 'Amazon' ? 'syncAmazon' : platform === 'Walmart' ? 'syncWalmart' : 'syncCostco';
  const btn = document.getElementById(id) as HTMLButtonElement;
  btn.disabled = disabled;
}

async function triggerSync(platform: Platform) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) {
    setStatus(platform, 'No active tab', 'fail');
    return;
  }

  const expectedHost = platform === 'Amazon' ? 'www.amazon.com' : platform === 'Walmart' ? 'www.walmart.com' : 'www.costco.com';
  const ordersUrl = platform === 'Amazon'
    ? 'https://www.amazon.com/your-orders/orders'
    : platform === 'Walmart'
    ? 'https://www.walmart.com/orders'
    : 'https://www.costco.com/myaccount/';
  const scriptFile = platform === 'Amazon' ? 'content/amazon.js' : platform === 'Walmart' ? 'content/walmart.js' : 'content/costco.js';

  setSyncBtn(platform, true);
  setStatus(platform, 'syncing…', 'syncing');

  let targetTabId = tab.id;
  let isCorrectHost = false;
  try { isCorrectHost = new URL(tab.url ?? '').hostname === expectedHost; } catch { /* ignore */ }

  if (!isCorrectHost) {
    // Open orders page in a new tab and inject after it loads
    const newTab = await chrome.tabs.create({ url: ordersUrl });
    if (!newTab.id) { setStatus(platform, 'Could not open tab', 'fail'); setSyncBtn(platform, false); return; }
    targetTabId = newTab.id;
    await new Promise<void>(resolve => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === targetTabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      });
    });
  }

  // Ping to check if content script is already loaded; inject only if not
  const alive = await chrome.tabs.sendMessage(targetTabId!, { type: 'PING' }).catch(() => null);
  if (!alive) {
    try {
      await chrome.scripting.executeScript({ target: { tabId: targetTabId! }, files: [scriptFile] });
    } catch {
      setStatus(platform, 'Injection failed — refresh the tab', 'fail');
      setSyncBtn(platform, false);
      return;
    }
  }

  chrome.tabs.sendMessage(targetTabId!, { type: 'START_SYNC', platform }).catch(() => {
    setStatus(platform, 'Injection failed — refresh the tab', 'fail');
    setSyncBtn(platform, false);
  });
}

async function init() {
  const settings = await getSettings();

  if (!settings.trackerUrl || !settings.userId) {
    document.getElementById('notConfigured')!.style.display = 'block';
  }

  if (settings.amazonLastSync) setMeta('Amazon', `Last sync: ${settings.amazonLastSync}`);
  if (settings.walmartLastSync) setMeta('Walmart', `Last sync: ${settings.walmartLastSync}`);
  if (settings.costcoLastSync) setMeta('Costco', `Last sync: ${settings.costcoLastSync}`);

  // Restore in-progress or recent sync status if popup was closed during sync
  const stored = await chrome.storage.local.get('amazonSyncStatus');
  const s = stored.amazonSyncStatus as { type: string; message?: string; result?: { scraped: number; imported: number; updated: number; platform: string }; error?: string; ts: number } | undefined;
  if (s && Date.now() - s.ts < 5 * 60 * 1000) {
    if (s.type === 'SYNC_STARTED' || s.type === 'SYNC_PROGRESS') {
      setStatus('Amazon', s.message ?? 'syncing…', 'syncing');
      setSyncBtn('Amazon', true);
    } else if (s.type === 'SYNC_DONE' && s.result) {
      const text = s.result.scraped === 0 ? 'no new orders' : `+${s.result.imported} new, ${s.result.updated} updated`;
      setStatus('Amazon', text, 'ok');
    } else if (s.type === 'SYNC_ERROR') {
      setStatus('Amazon', `Error: ${s.error}`, 'fail');
    }
  }

  // Update last sync display live when storage changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.amazonLastSync?.newValue) setMeta('Amazon', `Last sync: ${changes.amazonLastSync.newValue}`);
    if (changes.walmartLastSync?.newValue) setMeta('Walmart', `Last sync: ${changes.walmartLastSync.newValue}`);
    if (changes.costcoLastSync?.newValue) setMeta('Costco', `Last sync: ${changes.costcoLastSync.newValue}`);
    const cs = changes.costcoSyncStatus?.newValue as { type: string; message?: string; result?: { scraped: number; imported: number; updated: number; platform: string }; error?: string } | undefined;
    if (cs) {
      if (cs.type === 'SYNC_STARTED' || cs.type === 'SYNC_PROGRESS') {
        setStatus('Costco', cs.message ?? 'syncing…', 'syncing');
        setSyncBtn('Costco', true);
      } else if (cs.type === 'SYNC_DONE' && cs.result) {
        const text = cs.result.scraped === 0 ? 'no new orders' : `+${cs.result.imported} new, ${cs.result.updated} updated`;
        setStatus('Costco', text, 'ok');
        setSyncBtn('Costco', false);
      } else if (cs.type === 'SYNC_ERROR') {
        setStatus('Costco', `Error: ${cs.error}`, 'fail');
        setSyncBtn('Costco', false);
      }
    }
    // Live sync status updates for popups opened mid-sync
    const s = changes.amazonSyncStatus?.newValue as { type: string; message?: string; result?: { scraped: number; imported: number; updated: number; platform: string }; error?: string; ts: number } | undefined;
    if (s) {
      if (s.type === 'SYNC_STARTED' || s.type === 'SYNC_PROGRESS') {
        setStatus('Amazon', s.message ?? 'syncing…', 'syncing');
        setSyncBtn('Amazon', true);
      } else if (s.type === 'SYNC_DONE' && s.result) {
        const text = s.result.scraped === 0 ? 'no new orders' : `+${s.result.imported} new, ${s.result.updated} updated`;
        setStatus('Amazon', text, 'ok');
        setSyncBtn('Amazon', false);
      } else if (s.type === 'SYNC_ERROR') {
        setStatus('Amazon', `Error: ${s.error}`, 'fail');
        setSyncBtn('Amazon', false);
      }
    }
  });

  document.getElementById('syncAmazon')!.addEventListener('click', () => triggerSync('Amazon'));
  document.getElementById('syncWalmart')!.addEventListener('click', () => triggerSync('Walmart'));
  document.getElementById('syncCostco')!.addEventListener('click', () => triggerSync('Costco'));

  document.getElementById('openSettings')!.addEventListener('click', e => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  chrome.runtime.onMessage.addListener((message: SyncMessage) => {
    if (message.type === 'SYNC_STARTED') {
      setStatus(message.platform, 'syncing…', 'syncing');
      setSyncBtn(message.platform, true);
    } else if (message.type === 'SYNC_PROGRESS') {
      setStatus(message.platform, message.message, 'syncing');
    } else if (message.type === 'SYNC_DONE') {
      const { result } = message;
      const text = result.scraped === 0
        ? 'no new orders'
        : `+${result.imported} new, ${result.updated} updated`;
      setStatus(result.platform, text, 'ok');
      setMeta(result.platform, `Last sync: ${new Date().toISOString().split('T')[0]}`);
      setSyncBtn(result.platform, false);
    } else if (message.type === 'SYNC_ERROR') {
      setStatus(message.platform, `Error: ${message.error}`, 'fail');
      setSyncBtn(message.platform, false);
    }
  });
}

init();
