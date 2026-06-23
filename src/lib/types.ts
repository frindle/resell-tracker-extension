export type Platform = 'Amazon' | 'Walmart' | 'Costco' | 'BigSkyBuyers';

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
  paymentLast4?: string;   // last 4 digits scraped from payment method — enables card auto-assign on import
}

export interface SyncSettings {
  trackerUrl: string;       // e.g. http://10.0.12.39:3000
  apiKey: string;
  userId: string;           // selected tracker user id
  userName: string;         // display name
  amazonLastSync: string;   // ISO date
  walmartLastSync: string;  // ISO date
  costcoLastSync: string;   // ISO date
  bigskyLastSync: string;   // ISO date
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
  eventId?: number | null;
  error?: string;
}

export interface ApiLogEntry {
  id: number;
  ts: number;
  method: string;
  url: string;
  status?: number;
  reqBody?: string;
  resBody?: string;
  error?: string;
  duration?: number;
}

export type SyncMessage =
  | { type: 'SYNC_STARTED'; platform: Platform }
  | { type: 'SYNC_PROGRESS'; platform: Platform; scraped: number; message: string }
  | { type: 'SYNC_DONE'; result: SyncResult }
  | { type: 'SYNC_ERROR'; platform: Platform; error: string };
