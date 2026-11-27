// Signed remote step plans. The tracker serves GET /api/extension/plans as
// { plans: "<exact text of config/plans.json>", sig: "<base64 Ed25519 over the UTF-8 bytes of plans>" | null }.
// A remote plan file is used only when its signature verifies against the bundled public key, it
// validates, and its version is not older than the stored or the bundled one. Anything else keeps what was
// there before and records a status code. The stored copy is re-verified before every use.
// Values (plan text, keys, signatures) are never logged.
import { BUNDLED_PLANS, validatePlanFile, type PlanFile } from './stepPlan.ts';
import { PLAN_PUBLIC_KEY_B64 } from './planKey.ts';

export const PLAN_STORAGE_KEY = 'remotePlans';
export const PLAN_STATUS_KEY = 'remotePlansStatus';

export type PlanStatusCode =
  | 'ok' | 'not-modified' | 'no-key' | 'no-sig' | 'bad-sig' | 'invalid' | 'older' | 'fetch-error' | 'no-webcrypto' | 'no-tracker' | `http-${number}`;
export type PlanSource = 'bundled' | 'remote';
export interface PlanStatus { source: PlanSource; version: number; code: PlanStatusCode; ts: number }
export interface StoredPlans { plans: string; sig: string; etag: string | null; fetchedAt: number }

export interface PlanStore {
  get(): Promise<unknown>;
  put(v: StoredPlans): Promise<void>;
  putStatus(s: PlanStatus): Promise<void>;
}
export interface PlanDeps {
  fetch?: typeof fetch;
  store?: PlanStore;
  now?: () => number;
  /** Base64 raw Ed25519 public key; defaults to the bundled one. */
  publicKeyB64?: string;
  subtle?: SubtleCrypto;
  bundled?: PlanFile | null;
}

function chromeStore(): PlanStore {
  return {
    async get() { return (await chrome.storage.local.get(PLAN_STORAGE_KEY))[PLAN_STORAGE_KEY]; },
    async put(v) { await chrome.storage.local.set({ [PLAN_STORAGE_KEY]: v }); },
    async putStatus(s) { await chrome.storage.local.set({ [PLAN_STATUS_KEY]: s }); },
  };
}

function b64ToBytes(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

type Verified = { ok: true; file: PlanFile } | { ok: false; code: PlanStatusCode };

/** Signature, then JSON, then the plan validator. Never throws. Does not check versions. */
export async function verifyPlans(plans: unknown, sig: unknown, deps: PlanDeps = {}): Promise<Verified> {
  const keyB64 = deps.publicKeyB64 ?? PLAN_PUBLIC_KEY_B64;
  if (!keyB64) return { ok: false, code: 'no-key' };
  if (typeof sig !== 'string' || !sig) return { ok: false, code: 'no-sig' };
  if (typeof plans !== 'string' || !plans) return { ok: false, code: 'invalid' };
  const subtle = deps.subtle ?? (typeof crypto !== 'undefined' ? crypto.subtle : undefined);
  if (!subtle) return { ok: false, code: 'no-webcrypto' };
  let good = false;
  try {
    const key = await subtle.importKey('raw', b64ToBytes(keyB64), { name: 'Ed25519' }, false, ['verify']);
    good = await subtle.verify({ name: 'Ed25519' }, key, b64ToBytes(sig), new TextEncoder().encode(plans));
  } catch (e) {
    // A malformed signature or key is a bad signature; a missing algorithm is a browser without Ed25519.
    const name = (e as { name?: string })?.name;
    return { ok: false, code: name === 'NotSupportedError' ? 'no-webcrypto' : 'bad-sig' };
  }
  if (!good) return { ok: false, code: 'bad-sig' };
  let parsed: unknown;
  try { parsed = JSON.parse(plans); } catch { return { ok: false, code: 'invalid' }; }
  const v = validatePlanFile(parsed);
  return v.ok ? { ok: true, file: v.file } : { ok: false, code: 'invalid' };
}

function readStored(raw: unknown): StoredPlans | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.plans !== 'string' || typeof r.sig !== 'string') return null;
  return { plans: r.plans, sig: r.sig, etag: typeof r.etag === 'string' ? r.etag : null, fetchedAt: typeof r.fetchedAt === 'number' ? r.fetchedAt : 0 };
}

/** The stored copy when it still verifies; null otherwise. */
async function verifiedStored(store: PlanStore, deps: PlanDeps): Promise<{ file: PlanFile; stored: StoredPlans } | null> {
  let raw: unknown;
  try { raw = await store.get(); } catch { return null; }
  const stored = readStored(raw);
  if (!stored) return null;
  const v = await verifyPlans(stored.plans, stored.sig, deps);
  return v.ok ? { file: v.file, stored } : null;
}

export interface SelectedPlans { file: PlanFile | null; source: PlanSource }

/**
 * The plan file to run: the stored remote one when it verifies and its version is >= the bundled
 * one, else the bundled one. Re-verifies on every call. Never throws.
 */
export async function selectPlans(deps: PlanDeps = {}): Promise<SelectedPlans> {
  const bundled = deps.bundled === undefined ? BUNDLED_PLANS : deps.bundled;
  try {
    const hit = await verifiedStored(deps.store ?? chromeStore(), deps);
    if (hit && (!bundled || hit.file.version >= bundled.version)) return { file: hit.file, source: 'remote' };
  } catch { /* bundled */ }
  return { file: bundled, source: 'bundled' };
}

export interface PlanLoadResult { source: PlanSource; version: number; code: PlanStatusCode; updated: boolean }

/** Fetches the tracker's signed plans and keeps them only when they verify and are not older. Never throws. */
export async function loadRemotePlans(tracker: { base: string; headers: Record<string, string> } | null, deps: PlanDeps = {}): Promise<PlanLoadResult> {
  const store = deps.store ?? chromeStore();
  const now = deps.now ?? Date.now;
  const bundled = deps.bundled === undefined ? BUNDLED_PLANS : deps.bundled;
  let code: PlanStatusCode = 'no-tracker';
  let updated = false;
  try {
    const current = await verifiedStored(store, deps);
    const keyB64 = deps.publicKeyB64 ?? PLAN_PUBLIC_KEY_B64;
    if (!keyB64) {
      code = 'no-key';
    } else if (tracker) {
      const headers: Record<string, string> = { ...tracker.headers };
      if (current?.stored.etag) headers['If-None-Match'] = current.stored.etag;
      const res = await (deps.fetch ?? fetch)(`${tracker.base.replace(/\/$/, '')}/api/extension/plans`, { headers, cache: 'no-store' });
      if (res.status === 304 && current) {
        code = 'not-modified';
      } else if (!res.ok) {
        code = `http-${res.status}`;
      } else {
        let body: unknown = null;
        try { body = JSON.parse(await res.text()); } catch { /* checked below */ }
        const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
        const v = await verifyPlans(b.plans, b.sig, deps);
        if (!v.ok) code = v.code;
        else if (v.file.version < Math.max(bundled?.version ?? 0, current?.file.version ?? 0)) code = 'older';
        else {
          await store.put({ plans: b.plans as string, sig: b.sig as string, etag: res.headers.get('ETag'), fetchedAt: now() });
          code = 'ok';
          updated = true;
        }
      }
    }
  } catch {
    code = 'fetch-error';
  }
  const sel = await selectPlans(deps);
  const out: PlanLoadResult = { source: sel.source, version: sel.file?.version ?? 0, code, updated };
  try { await store.putStatus({ source: out.source, version: out.version, code, ts: now() }); } catch { /* best-effort */ }
  return out;
}

export function describePlanStatus(s: { source: PlanSource; version: number; code: PlanStatusCode } | null | undefined): string {
  const x = s ?? { source: 'bundled' as const, version: BUNDLED_PLANS?.version ?? 0, code: 'no-tracker' as const };
  return `Plans v${x.version} (${x.source}, ${x.code})`;
}
