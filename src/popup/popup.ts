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

async function init() {
  const settings = await getSettings();

  if (!settings.trackerUrl) {
    document.getElementById('notConfigured')!.style.display = 'block';
  }

  if (settings.amazonLastSync) setMeta('Amazon', `Last sync: ${settings.amazonLastSync}`);
  if (settings.walmartLastSync) setMeta('Walmart', `Last sync: ${settings.walmartLastSync}`);

  document.getElementById('openSettings')!.addEventListener('click', e => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  chrome.runtime.onMessage.addListener((message: SyncMessage) => {
    if (message.type === 'SYNC_STARTED') {
      setStatus(message.platform, 'syncing…', 'syncing');
    } else if (message.type === 'SYNC_PROGRESS') {
      setStatus(message.platform, message.message, 'syncing');
    } else if (message.type === 'SYNC_DONE') {
      const { result } = message;
      const text = result.scraped === 0
        ? 'no new orders'
        : `+${result.imported} new, ${result.updated} updated`;
      setStatus(result.platform, text, 'ok');
      setMeta(result.platform, `Last sync: ${new Date().toISOString().split('T')[0]}`);
    } else if (message.type === 'SYNC_ERROR') {
      setStatus(message.platform, `Error: ${message.error}`, 'fail');
    }
  });
}

init();
