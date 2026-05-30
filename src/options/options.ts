import { getSettings, saveSettings } from '../lib/storage';
import { fetchUsers } from '../lib/api';
import type { TrackerUser } from '../lib/types';

let users: TrackerUser[] = [];

async function loadUsers(trackerUrl: string) {
  const select = document.getElementById('userSelect') as HTMLSelectElement;
  const userSection = document.getElementById('userSection') as HTMLElement;
  const userStatus = document.getElementById('userStatus') as HTMLElement;

  userStatus.textContent = 'Fetching users…';
  userStatus.className = 'status';
  try {
    users = await fetchUsers(trackerUrl);
    select.innerHTML = '<option value="">— select user —</option>' +
      users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    userSection.style.display = 'block';
    userStatus.textContent = '';
  } catch (err) {
    userStatus.textContent = `Could not load users: ${err instanceof Error ? err.message : String(err)}`;
    userStatus.className = 'status fail';
  }
}

async function init() {
  const settings = await getSettings();

  (document.getElementById('trackerUrl') as HTMLInputElement).value = settings.trackerUrl;
  (document.getElementById('amazonLastSync') as HTMLInputElement).value = settings.amazonLastSync;
  (document.getElementById('walmartLastSync') as HTMLInputElement).value = settings.walmartLastSync;

  const userSection = document.getElementById('userSection') as HTMLElement;
  const select = document.getElementById('userSelect') as HTMLSelectElement;

  if (settings.trackerUrl) {
    await loadUsers(settings.trackerUrl);
    if (settings.userId) select.value = settings.userId;
  }

  document.getElementById('connect')!.addEventListener('click', async () => {
    const trackerUrl = (document.getElementById('trackerUrl') as HTMLInputElement).value.trim();
    if (!trackerUrl) return;
    await saveSettings({ trackerUrl });
    await loadUsers(trackerUrl);
  });

  document.getElementById('saveUser')!.addEventListener('click', async () => {
    const userId = select.value;
    const user = users.find(u => String(u.id) === userId);
    await saveSettings({ userId, userName: user?.name ?? '' });
    const saved = document.getElementById('userSaved')!;
    saved.style.display = 'inline';
    setTimeout(() => { saved.style.display = 'none'; }, 2000);
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
