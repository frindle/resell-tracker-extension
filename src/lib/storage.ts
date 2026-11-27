import type { SyncSettings } from './types';

const DEFAULTS: SyncSettings = {
  trackerUrl: '',
  apiKey: '',
  extensionSecret: '',
  userId: '',
  userName: '',
  amazonLastSync: '',
  walmartLastSync: '',
  costcoLastSync: '',
  bigskyLastSync: '',
};

export async function getSettings(): Promise<SyncSettings> {
  const result = await chrome.storage.sync.get(Object.keys(DEFAULTS));
  return { ...DEFAULTS, ...result } as SyncSettings;
}

export async function saveSettings(settings: Partial<SyncSettings>): Promise<void> {
  await chrome.storage.sync.set(settings);
}

/** Saves what pairing returned: the tracker's shared secret and the user who approved it. */
export async function savePaired(p: { secret: string; userId: string; userName: string }): Promise<void> {
  await saveSettings({ extensionSecret: p.secret, userId: p.userId, userName: p.userName });
}

export async function setLastSync(platform: 'amazon' | 'walmart' | 'costco' | 'bigsky', date: string): Promise<void> {
  const key = platform === 'amazon' ? 'amazonLastSync' : platform === 'walmart' ? 'walmartLastSync' : platform === 'costco' ? 'costcoLastSync' : 'bigskyLastSync';
  await chrome.storage.sync.set({ [key]: date });
}
