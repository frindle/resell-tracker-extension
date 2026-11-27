// Remote scrape config: DATA only (CSS selectors, label strings, regex sources,
// URL patterns, timeouts). MV3 forbids remote code, so the logic stays in the
// extension and a selector or page-pattern fix ships as a tracker deploy.
//
// The bundled defaults, ./scrapeConfig.default.json, MUST be an exact copy of the
// tracker's config/scrape-config.json, and validateScrapeConfig below is the same
// rule set as the tracker's lib/scrapeConfig.ts: change them together.
//
// Order of preference: the tracker's config (fetched), then the copy cached in
// chrome.storage.local, then the bundled defaults. An invalid config, or one with
// a lower version than the one in effect, is never applied. Regex sources are
// compiled with `new RegExp` inside try/catch; a source that fails falls back to
// the default entry. No eval, no Function, no remote script.
//
// Reading: call (and await) initScrapeConfig() once in a content script or the
// background, then getScrape(site) is synchronous. Before init it answers from
// the bundled defaults. Fetching (loadScrapeConfig) is for the background only;
// content scripts follow the cache through chrome.storage.onChanged.
import DEFAULTS_JSON from './scrapeConfig.default.json' with { type: 'json' };

export const SCRAPE_CATEGORIES = ['selectors', 'labels', 'patterns', 'urls', 'timeoutsMs'] as const;

export interface ScrapeSite {
  selectors: Record<string, string>;
  labels: Record<string, string>;
  patterns: Record<string, string>;
  urls: Record<string, string>;
  timeoutsMs: Record<string, number>;
}
export interface ScrapeConfig {
  version: number;
  sites: Record<string, ScrapeSite>;
}
export type ValidationResult = { ok: true; config: ScrapeConfig } | { ok: false; error: string };

const NAME_RE = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const SITE_RE = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const MAX_STRING = 20_000;
const MAX_MS = 86_400_000;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

/** Returns a clean copy (known keys only), or why the value is not a valid config. */
export function validateScrapeConfig(raw: unknown): ValidationResult {
  const fail = (error: string): ValidationResult => ({ ok: false, error });
  if (!isPlainObject(raw)) return fail('config must be an object');
  for (const k of Object.keys(raw)) {
    if (k !== 'version' && k !== 'sites') return fail(`unknown top-level key "${k}"`);
  }
  const version = raw.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) return fail('version must be a positive integer');
  if (!isPlainObject(raw.sites)) return fail('sites must be an object');
  const sites: Record<string, ScrapeSite> = {};
  for (const [siteKey, siteRaw] of Object.entries(raw.sites)) {
    if (!SITE_RE.test(siteKey)) return fail(`bad site key "${siteKey}"`);
    if (!isPlainObject(siteRaw)) return fail(`site "${siteKey}" must be an object`);
    for (const k of Object.keys(siteRaw)) {
      if (!(SCRAPE_CATEGORIES as readonly string[]).includes(k)) return fail(`site "${siteKey}": unknown key "${k}"`);
    }
    const site: ScrapeSite = { selectors: {}, labels: {}, patterns: {}, urls: {}, timeoutsMs: {} };
    for (const cat of SCRAPE_CATEGORIES) {
      const group = siteRaw[cat];
      if (!isPlainObject(group)) return fail(`site "${siteKey}": ${cat} must be an object`);
      for (const [name, value] of Object.entries(group)) {
        const where = `${siteKey}.${cat}.${name}`;
        if (!NAME_RE.test(name)) return fail(`bad entry name "${where}"`);
        if (cat === 'timeoutsMs') {
          if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > MAX_MS) return fail(`${where} must be an integer 0..${MAX_MS}`);
          site.timeoutsMs[name] = value;
          continue;
        }
        if (typeof value !== 'string') return fail(`${where} must be a string`);
        if (value.length > MAX_STRING) return fail(`${where} is too long`);
        if (cat === 'patterns') {
          try { new RegExp(value); } catch { return fail(`${where} is not a valid regex`); }
        }
        site[cat][name] = value;
      }
    }
    sites[siteKey] = site;
  }
  return { ok: true, config: { version, sites } };
}

// ---- state ----

export type ScrapeSource = 'remote' | 'cache' | 'bundled';
export interface StoredScrape { config: ScrapeConfig; etag: string | null; fetchedAt: number }
export interface ScrapeStatus { version: number; source: ScrapeSource; ts: number }

const bundledCheck = validateScrapeConfig(DEFAULTS_JSON);
/** The defaults shipped in the extension (validated; the raw file if it somehow is not). */
export const BUNDLED_SCRAPE_CONFIG: ScrapeConfig = bundledCheck.ok ? bundledCheck.config : (DEFAULTS_JSON as unknown as ScrapeConfig);

let active: ScrapeConfig = BUNDLED_SCRAPE_CONFIG;
let activeSource: ScrapeSource = 'bundled';
/** ETag of the cached copy that is in effect (sent as If-None-Match); null when the bundled defaults are. */
let activeEtag: string | null = null;
let resolved = new Map<string, ResolvedScrape>();
let initPromise: Promise<void> | null = null;

function adopt(config: ScrapeConfig, source: ScrapeSource, etag: string | null) {
  active = config;
  activeSource = source;
  activeEtag = etag;
  resolved = new Map();
}

export function getScrapeInfo(): { version: number; source: ScrapeSource } {
  return { version: active.version, source: activeSource };
}

/** One small line for the popup and options pages. */
export function describeScrapeStatus(s: { version: number; source: ScrapeSource } | null | undefined): string {
  const x = s ?? { version: BUNDLED_SCRAPE_CONFIG.version, source: 'bundled' as const };
  return `Scrape config v${x.version} (${x.source})`;
}

// ---- storage ----

export interface ScrapeStore {
  get(): Promise<unknown>;
  put(v: StoredScrape): Promise<void>;
  putStatus(s: ScrapeStatus): Promise<void>;
}

export const SCRAPE_STORAGE_KEY = 'scrapeConfig';
export const SCRAPE_STATUS_KEY = 'scrapeConfigStatus';

function chromeStore(): ScrapeStore {
  return {
    async get() { return (await chrome.storage.local.get(SCRAPE_STORAGE_KEY))[SCRAPE_STORAGE_KEY]; },
    async put(v) { await chrome.storage.local.set({ [SCRAPE_STORAGE_KEY]: v }); },
    async putStatus(s) { await chrome.storage.local.set({ [SCRAPE_STATUS_KEY]: s }); },
  };
}

/** A stored record, kept only when its config still validates. */
function readStored(raw: unknown): StoredScrape | null {
  if (!isPlainObject(raw)) return null;
  const v = validateScrapeConfig(raw.config);
  if (!v.ok) return null;
  return { config: v.config, etag: typeof raw.etag === 'string' ? raw.etag : null, fetchedAt: typeof raw.fetchedAt === 'number' ? raw.fetchedAt : 0 };
}

/** The cache is used only when it is not older than the bundled defaults (a newer extension may ship newer ones). */
function adoptStored(stored: StoredScrape | null): boolean {
  if (stored && stored.config.version >= BUNDLED_SCRAPE_CONFIG.version) {
    adopt(stored.config, 'cache', stored.etag);
    return true;
  }
  return false;
}

/**
 * Loads the cached config into memory (valid and not older than the defaults),
 * once per context. Await it before the first getScrape in a content script or
 * the background. Never throws. In an extension page it also follows later
 * changes to the cache (the background fetches; other contexts just read).
 */
export function initScrapeConfig(store?: ScrapeStore): Promise<void> {
  if (!initPromise) {
    const s = store ?? chromeStore();
    initPromise = (async () => {
      try { adoptStored(readStored(await s.get())); } catch { /* no storage here: bundled defaults */ }
      if (!store && typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
          const ch = changes[SCRAPE_STORAGE_KEY];
          if (area !== 'local' || !ch) return;
          const next = readStored(ch.newValue);
          if (next && next.config.version >= active.version) adopt(next.config, 'cache', next.etag);
        });
      }
    })();
  }
  return initPromise;
}

/** For tests: back to the bundled defaults and a fresh init. */
export function resetScrapeConfigForTests(): void {
  adopt(BUNDLED_SCRAPE_CONFIG, 'bundled', null);
  initPromise = null;
}

// ---- fetching (background only) ----

export interface ScrapeDeps {
  fetch?: typeof fetch;
  store?: ScrapeStore;
  now?: () => number;
}
export interface ScrapeLoadResult {
  source: ScrapeSource;
  version: number;
  /** A config was fetched and applied. */
  updated: boolean;
  /** Why nothing was applied, when the tracker's answer was not used. */
  note?: string;
}

/**
 * Asks the tracker for its config (If-None-Match when a cached copy is in
 * effect) and applies it when valid and not older than the one in effect.
 * `tracker` is the base address and the usual extension auth headers; null
 * skips the fetch. Always leaves the in-effect config (remote, else cache,
 * else bundled) and publishes its version and source for the popup. Never throws.
 */
export async function loadScrapeConfig(tracker: { base: string; headers: Record<string, string> } | null, deps: ScrapeDeps = {}): Promise<ScrapeLoadResult> {
  const store = deps.store ?? chromeStore();
  await initScrapeConfig(deps.store);
  const now = deps.now ?? Date.now;
  let updated = false;
  let note: string | undefined;
  let confirmed = false;
  if (tracker) {
    try {
      const headers: Record<string, string> = { ...tracker.headers };
      if (activeEtag) headers['If-None-Match'] = activeEtag;
      const res = await (deps.fetch ?? fetch)(`${tracker.base.replace(/\/$/, '')}/api/extension/scrape-config`, { headers, cache: 'no-store' });
      if (res.status === 304 && activeEtag) {
        confirmed = true;
      } else if (!res.ok) {
        note = `tracker answered ${res.status}`;
      } else {
        let body: unknown = null;
        try { body = JSON.parse(await res.text()); } catch { /* checked below */ }
        const v = validateScrapeConfig(body);
        if (!v.ok) note = `ignored invalid config: ${v.error}`;
        else if (v.config.version < active.version) note = `ignored older config v${v.config.version} (in effect: v${active.version})`;
        else {
          const etag = res.headers.get('ETag');
          adopt(v.config, 'remote', etag);
          confirmed = true;
          updated = true;
          await store.put({ config: v.config, etag, fetchedAt: now() });
        }
      }
    } catch (e) {
      note = `fetch failed: ${String(e).slice(0, 120)}`;
    }
  }
  // A 304 or fresh answer means what is in effect is the tracker's current config.
  if (confirmed) activeSource = 'remote';
  try { await store.putStatus({ version: active.version, source: activeSource, ts: now() }); } catch { /* best-effort */ }
  return { source: activeSource, version: active.version, updated, ...(note ? { note } : {}) };
}

/** True when the tracker's advertised version (X-Scrape-Config-Version) is newer than the one in effect. */
export function scrapeConfigIsStale(advertised: string | null | undefined): boolean {
  const n = Number(advertised);
  return Number.isInteger(n) && n > active.version;
}

// ---- reading ----

export interface ResolvedScrape extends ScrapeSite {
  /** `new RegExp(source, flags)` for a pattern; the default entry when the config's one does not compile; never throws. */
  regex(name: string, flags?: string): RegExp;
}

function compile(src: string | undefined, flags: string | undefined): RegExp | null {
  if (src === undefined) return null;
  try { return new RegExp(src, flags); } catch { return null; }
}

/**
 * One site's selectors, labels, patterns (sources), urls and timeouts. Entries
 * the config lacks come from the bundled defaults; a site the config lacks is
 * the default site. An unknown site is empty. Synchronous.
 */
export function getScrape(siteKey: string): ResolvedScrape {
  const hit = resolved.get(siteKey);
  if (hit) return hit;
  const def = Object.prototype.hasOwnProperty.call(BUNDLED_SCRAPE_CONFIG.sites, siteKey) ? BUNDLED_SCRAPE_CONFIG.sites[siteKey] : undefined;
  const cur = Object.prototype.hasOwnProperty.call(active.sites, siteKey) ? active.sites[siteKey] : undefined;
  const out: ResolvedScrape = {
    selectors: { ...def?.selectors, ...cur?.selectors },
    labels: { ...def?.labels, ...cur?.labels },
    patterns: { ...def?.patterns, ...cur?.patterns },
    urls: { ...def?.urls, ...cur?.urls },
    timeoutsMs: { ...def?.timeoutsMs, ...cur?.timeoutsMs },
    regex(name, flags) {
      return compile(out.patterns[name], flags) ?? compile(def?.patterns[name], flags) ?? new RegExp('(?!)', flags && flags.replace(/[uv]/g, ''));
    },
  };
  resolved.set(siteKey, out);
  return out;
}
