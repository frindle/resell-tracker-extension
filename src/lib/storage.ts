import type { SyncSettings } from './types';

const DEFAULTS: SyncSettings = {
  trackerUrl: '',
  apiKey: '',
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

export async function setLastSync(platform: 'amazon' | 'walmart' | 'costco' | 'bigsky', date: string): Promise<void> {
  const key = platform === 'amazon' ? 'amazonLastSync' : platform === 'walmart' ? 'walmartLastSync' : platform === 'costco' ? 'costcoLastSync' : 'bigskyLastSync';
  await chrome.storage.sync.set({ [key]: date });
}
