import { getSettings } from '../lib/storage';
import type { SyncMessage } from '../lib/types';

function setStatus(platform: 'Amazon' | 'Walmart', text: string, cls: string) {
  const el = document.getElementById(platform === 'Amazon' ? 'amazonStatus' : 'walmartStatus')!;
  el.textContent = text;
  el.className = `status ${cls}`;
}

function setMeta(platform: 'Amazon' | 'Walmart', text: string) {
  const el = document.getElementById(platform === 'Amazon' ? 'amazonMeta' : 'walmartMeta')!;
  el.textContent = text;
}

function setSyncBtn(platform: 'Amazon' | 'Walmart', disabled: boolean) {
  const btn = document.getElementById(platform === 'Amazon' ? 'syncAmazon' : 'syncWalmart') as HTMLButtonElement;
  btn.disabled = disabled;
}

async function triggerSync(platform: 'Amazon' | 'Walmart') {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    setStatus(platform, 'No active tab', 'fail');
    return;
  }
  setSyncBtn(platform, true);
  setStatus(platform, 'syncing…', 'syncing');
  chrome.tabs.sendMessage(tab.id, { type: 'START_SYNC', platform }).catch(() => {
    setStatus(platform, 'Not on orders page', 'fail');
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

  document.getElementById('syncAmazon')!.addEventListener('click', () => triggerSync('Amazon'));
  document.getElementById('syncWalmart')!.addEventListener('click', () => triggerSync('Walmart'));

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
