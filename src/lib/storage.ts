import type { SyncSettings } from './types';

const DEFAULTS: SyncSettings = {
  trackerUrl: '',
  apiKey: '',
  amazonLastSync: '',
  walmartLastSync: '',
};

export async function getSettings(): Promise<SyncSettings> {
  const result = await chrome.storage.sync.get(Object.keys(DEFAULTS));
  return { ...DEFAULTS, ...result } as SyncSettings;
}

export async function saveSettings(settings: Partial<SyncSettings>): Promise<void> {
  await chrome.storage.sync.set(settings);
}

export async function setLastSync(platform: 'amazon' | 'walmart', date: string): Promise<void> {
  const key = platform === 'amazon' ? 'amazonLastSync' : 'walmartLastSync';
  await chrome.storage.sync.set({ [key]: date });
}
