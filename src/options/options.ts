import { getSettings, saveSettings } from '../lib/storage';
import { testConnection } from '../lib/api';

async function init() {
  const settings = await getSettings();

  (document.getElementById('trackerUrl') as HTMLInputElement).value = settings.trackerUrl;
  (document.getElementById('apiKey') as HTMLInputElement).value = settings.apiKey;
  (document.getElementById('amazonLastSync') as HTMLInputElement).value = settings.amazonLastSync;
  (document.getElementById('walmartLastSync') as HTMLInputElement).value = settings.walmartLastSync;

  document.getElementById('save')!.addEventListener('click', async () => {
    const trackerUrl = (document.getElementById('trackerUrl') as HTMLInputElement).value.trim();
    const apiKey = (document.getElementById('apiKey') as HTMLInputElement).value.trim();
    await saveSettings({ trackerUrl, apiKey });
    const status = document.getElementById('status')!;
    status.textContent = 'Saved!';
    status.className = 'status ok';
    setTimeout(() => { status.textContent = ''; }, 2000);
  });

  document.getElementById('test')!.addEventListener('click', async () => {
    const trackerUrl = (document.getElementById('trackerUrl') as HTMLInputElement).value.trim();
    const apiKey = (document.getElementById('apiKey') as HTMLInputElement).value.trim();
    const status = document.getElementById('status')!;
    status.textContent = 'Testing…';
    status.className = 'status';
    try {
      await testConnection(trackerUrl, apiKey);
      status.textContent = 'Connected!';
      status.className = 'status ok';
    } catch (err) {
      status.textContent = `Failed: ${err instanceof Error ? err.message : String(err)}`;
      status.className = 'status fail';
    }
  });

  document.getElementById('saveDates')!.addEventListener('click', async () => {
    const amazonLastSync = (document.getElementById('amazonLastSync') as HTMLInputElement).value;
    const walmartLastSync = (document.getElementById('walmartLastSync') as HTMLInputElement).value;
    await saveSettings({ amazonLastSync, walmartLastSync });
    const saved = document.getElementById('datesSaved')!;
    saved.style.display = 'inline';
    setTimeout(() => { saved.style.display = 'none'; }, 2000);
  });
}

init();
