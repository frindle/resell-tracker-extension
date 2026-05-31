export type Platform = 'Amazon' | 'Walmart' | 'Costco';

export interface ScrapedOrder {
  platform: Platform;
  orderNumber: string;
  orderDate: string;       // ISO date YYYY-MM-DD
  itemDescription: string;
  cost: number;
  shippingCost: number;
  shippingAddress: string;
  trackingNumbers: string[];
  sourceUrl: string;
}

export interface SyncSettings {
  trackerUrl: string;       // e.g. http://10.0.12.39:3000
  apiKey: string;
  userId: string;           // selected tracker user id
  userName: string;         // display name
  amazonLastSync: string;   // ISO date
  walmartLastSync: string;  // ISO date
  costcoLastSync: string;   // ISO date
}

export interface TrackerUser {
  id: number;
  name: string;
}

export interface SyncResult {
  platform: Platform;
  scraped: number;
  imported: number;
  updated: number;
  error?: string;
}

export type SyncMessage =
  | { type: 'SYNC_STARTED'; platform: Platform }
  | { type: 'SYNC_PROGRESS'; platform: Platform; scraped: number; message: string }
  | { type: 'SYNC_DONE'; result: SyncResult }
  | { type: 'SYNC_ERROR'; platform: Platform; error: string };
