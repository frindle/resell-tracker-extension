import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  BUNDLED_SCRAPE_CONFIG, validateScrapeConfig, initScrapeConfig, loadScrapeConfig, getScrape, getScrapeInfo,
  describeScrapeStatus, scrapeConfigIsStale, resetScrapeConfigForTests, SCRAPE_CATEGORIES,
  type ScrapeStore, type StoredScrape, type ScrapeStatus, type ScrapeConfig,
} from '../src/lib/scrapeConfig.ts';

// Synthetic data only: nothing here is a real selector from a live site.

function clone<T>(x: T): T { return JSON.parse(JSON.stringify(x)) as T; }

function configV(version: number, edit?: (c: ScrapeConfig) => void): ScrapeConfig {
  const c = clone(BUNDLED_SCRAPE_CONFIG);
  c.version = version;
  edit?.(c);
  return c;
}

function fakeStore(initial?: unknown) {
  const s = { cache: initial as unknown, status: null as ScrapeStatus | null, puts: 0 };
  const store: ScrapeStore = {
    async get() { return s.cache; },
    async put(v: StoredScrape) { s.cache = v; s.puts++; },
    async putStatus(v) { s.status = v; },
  };
  return { s, store };
}

function fakeFetch(reply: { status?: number; body?: unknown; etag?: string; raw?: string } | 'throw') {
  const calls: Array<{ url: string; headers: Record<string, string> }> = [];
  const f = (async (url: string, init?: { headers?: Record<string, string> }) => {
    calls.push({ url, headers: init?.headers ?? {} });
    if (reply === 'throw') throw new Error('offline');
    const status = reply.status ?? 200;
    const text = reply.raw ?? JSON.stringify(reply.body ?? null);
    return {
      status, ok: status >= 200 && status < 300,
      headers: { get: (n: string) => (n.toLowerCase() === 'etag' ? reply.etag ?? null : null) },
      text: async () => text,
    };
  }) as unknown as typeof fetch;
  return { f, calls };
}

const TRACKER = { base: 'https://tracker.example/', headers: { 'X-Extension-Secret': 'synthetic' } };
const MARK = 'synthetic-selector-marker';

beforeEach(() => resetScrapeConfigForTests());

test('the bundled defaults load, validate and match the schema', () => {
  assert.equal(validateScrapeConfig(BUNDLED_SCRAPE_CONFIG).ok, true);
  assert.equal(Number.isInteger(BUNDLED_SCRAPE_CONFIG.version) && BUNDLED_SCRAPE_CONFIG.version >= 1, true);
  const keys = Object.keys(BUNDLED_SCRAPE_CONFIG.sites).sort();
  assert.deepEqual(keys, ['amazon', 'bestbuyEgift', 'costco', 'costcoEgift', 'walmart']);
  for (const [name, site] of Object.entries(BUNDLED_SCRAPE_CONFIG.sites)) {
    assert.deepEqual(Object.keys(site).sort(), [...SCRAPE_CATEGORIES].sort(), name);
    for (const cat of ['selectors', 'labels', 'patterns', 'urls'] as const) {
      for (const [k, v] of Object.entries(site[cat])) assert.equal(typeof v, 'string', `${name}.${cat}.${k}`);
    }
    for (const [k, v] of Object.entries(site.timeoutsMs)) {
      assert.equal(Number.isFinite(v) && v >= 0, true, `${name}.timeoutsMs.${k}`);
    }
    for (const [k, src] of Object.entries(site.patterns)) assert.doesNotThrow(() => new RegExp(src), `${name}.patterns.${k}`);
  }
  assert.equal(Object.keys(BUNDLED_SCRAPE_CONFIG.sites.bestbuyEgift.selectors).length, 0);
});

test('with no cache and no tracker, the bundled defaults are in effect', async () => {
  const { store } = fakeStore();
  await initScrapeConfig(store);
  assert.deepEqual(getScrapeInfo(), { version: BUNDLED_SCRAPE_CONFIG.version, source: 'bundled' });
  assert.equal(getScrape('walmart').selectors.orderBlocks, BUNDLED_SCRAPE_CONFIG.sites.walmart.selectors.orderBlocks);
});

test('fallback order: remote beats cache beats bundled', async () => {
  const cacheCfg = configV(3, c => { c.sites.walmart.selectors.orderBlocks = 'cache-marker'; });
  const { s, store } = fakeStore({ config: cacheCfg, etag: '"3-x"', fetchedAt: 1 });

  // cache beats bundled
  await initScrapeConfig(store);
  assert.deepEqual(getScrapeInfo(), { version: 3, source: 'cache' });
  assert.equal(getScrape('walmart').selectors.orderBlocks, 'cache-marker');

  // tracker unreachable: cache stays
  const down = fakeFetch('throw');
  const r1 = await loadScrapeConfig(TRACKER, { fetch: down.f, store });
  assert.equal(r1.source, 'cache');
  assert.equal(r1.updated, false);
  assert.equal(down.calls[0].headers['If-None-Match'], '"3-x"');
  assert.equal(down.calls[0].url, 'https://tracker.example/api/extension/scrape-config');
  assert.equal(down.calls[0].headers['X-Extension-Secret'], 'synthetic');

  // remote beats cache
  const remoteCfg = configV(4, c => { c.sites.walmart.selectors.orderBlocks = 'remote-marker'; });
  const up = fakeFetch({ body: remoteCfg, etag: '"4-y"' });
  const r2 = await loadScrapeConfig(TRACKER, { fetch: up.f, store, now: () => 99 });
  assert.equal(r2.updated, true);
  assert.deepEqual(getScrapeInfo(), { version: 4, source: 'remote' });
  assert.equal(getScrape('walmart').selectors.orderBlocks, 'remote-marker');
  assert.equal((s.cache as StoredScrape).etag, '"4-y"');
  assert.equal((s.cache as StoredScrape).fetchedAt, 99);
  assert.deepEqual(s.status && { version: s.status.version, source: s.status.source }, { version: 4, source: 'remote' });
});

test('a 304 confirms the cached config as remote and stores nothing new', async () => {
  const cacheCfg = configV(3);
  const { s, store } = fakeStore({ config: cacheCfg, etag: '"3-x"', fetchedAt: 1 });
  const f = fakeFetch({ status: 304 });
  const r = await loadScrapeConfig(TRACKER, { fetch: f.f, store });
  assert.equal(r.source, 'remote');
  assert.equal(r.updated, false);
  assert.equal(s.puts, 0);
});

test('an invalid remote is ignored', async () => {
  const { s, store } = fakeStore();
  const bad: unknown[] = [
    { version: 9 },
    { version: 9, sites: { walmart: { selectors: { a: 5 }, labels: {}, patterns: {}, urls: {}, timeoutsMs: {} } } },
    configV(9, c => { c.sites.walmart.patterns.orderTotal = '(unclosed'; }),
    'not an object',
  ];
  for (const body of bad) {
    const f = fakeFetch({ body });
    const r = await loadScrapeConfig(TRACKER, { fetch: f.f, store });
    assert.equal(r.updated, false);
    assert.equal(r.source, 'bundled');
    assert.match(r.note ?? '', /invalid/);
  }
  const garbage = await loadScrapeConfig(TRACKER, { fetch: fakeFetch({ raw: '<html>oops' }).f, store });
  assert.equal(garbage.updated, false);
  const err = await loadScrapeConfig(TRACKER, { fetch: fakeFetch({ status: 500 }).f, store });
  assert.equal(err.updated, false);
  assert.equal(s.puts, 0);
  assert.equal(getScrapeInfo().version, BUNDLED_SCRAPE_CONFIG.version);
});

test('a lower-version remote is ignored', async () => {
  const cacheCfg = configV(5, c => { c.sites.walmart.selectors.orderBlocks = 'cache-marker'; });
  const { s, store } = fakeStore({ config: cacheCfg, etag: '"5-x"', fetchedAt: 1 });
  const older = configV(4, c => { c.sites.walmart.selectors.orderBlocks = 'older-marker'; });
  const f = fakeFetch({ body: older, etag: '"4-y"' });
  const r = await loadScrapeConfig(TRACKER, { fetch: f.f, store });
  assert.equal(r.updated, false);
  assert.match(r.note ?? '', /older/);
  assert.equal(getScrape('walmart').selectors.orderBlocks, 'cache-marker');
  assert.equal(s.puts, 0);
});

test('a cache older than the bundled defaults is not used', async () => {
  const stale = configV(BUNDLED_SCRAPE_CONFIG.version - 1 || 0);
  stale.version = Math.max(0, BUNDLED_SCRAPE_CONFIG.version - 1);
  const { store } = fakeStore({ config: stale, etag: null, fetchedAt: 1 });
  await initScrapeConfig(store);
  assert.equal(getScrapeInfo().source, 'bundled');
});

test('a corrupt cache falls back to bundled', async () => {
  const { store } = fakeStore({ config: { version: 'x' }, etag: 1 });
  await initScrapeConfig(store);
  assert.equal(getScrapeInfo().source, 'bundled');
});

test('a bad regex falls back per entry, other entries keep the remote value', async () => {
  const remote = configV(2, c => {
    c.sites.walmart.patterns.orderTotal = '\\-'; // valid without flags, throws with the u flag
    c.sites.walmart.patterns.cardLast4 = 'remote-last4-(\\d{4})';
  });
  const { store } = fakeStore();
  await loadScrapeConfig(TRACKER, { fetch: fakeFetch({ body: remote }).f, store });
  const W = getScrape('walmart');
  // 'u' makes the remote source fail: the default entry is used
  const total = W.regex('orderTotal', 'u');
  assert.equal(total.source, BUNDLED_SCRAPE_CONFIG.sites.walmart.patterns.orderTotal);
  assert.equal(total.flags, 'u');
  // untouched entry: the remote source
  assert.equal(W.regex('cardLast4').source, 'remote-last4-(\\d{4})');
  // an unknown pattern never throws and never matches
  assert.equal(W.regex('noSuchPattern', 'i').test('anything'), false);
});

test('regex() returns a fresh object each call, so g-flag state is not shared', () => {
  const W = getScrape('walmart');
  const a = W.regex('trackingUps', 'g');
  const b = W.regex('trackingUps', 'g');
  assert.notEqual(a, b);
  a.lastIndex = 5;
  assert.equal(b.lastIndex, 0);
});

test('getScrape on a missing site returns the default, and an unknown site is empty', async () => {
  const remote = configV(2);
  delete (remote.sites as Record<string, unknown>).costco;
  const { store } = fakeStore();
  await loadScrapeConfig(TRACKER, { fetch: fakeFetch({ body: remote }).f, store });
  assert.deepEqual(getScrape('costco').labels, BUNDLED_SCRAPE_CONFIG.sites.costco.labels);
  assert.deepEqual(getScrape('costco').urls, BUNDLED_SCRAPE_CONFIG.sites.costco.urls);
  const none = getScrape('noSuchSite');
  assert.deepEqual(none.selectors, {});
  assert.deepEqual(none.timeoutsMs, {});
  assert.equal(none.regex('x').test('x'), false);
});

test('a remote missing one entry keeps the default for that entry', async () => {
  const remote = configV(2, c => {
    c.sites.walmart.selectors = { orderBlocks: MARK };
  });
  const { store } = fakeStore();
  await loadScrapeConfig(TRACKER, { fetch: fakeFetch({ body: remote }).f, store });
  const sel = getScrape('walmart').selectors;
  assert.equal(sel.orderBlocks, MARK);
  assert.equal(sel.orderCaption, BUNDLED_SCRAPE_CONFIG.sites.walmart.selectors.orderCaption);
});

test('no tracker: nothing is fetched and the status is still published', async () => {
  const { s, store } = fakeStore();
  const f = fakeFetch('throw');
  const r = await loadScrapeConfig(null, { fetch: f.f, store });
  assert.equal(f.calls.length, 0);
  assert.equal(r.source, 'bundled');
  assert.equal(s.status?.source, 'bundled');
});

test('scrapeConfigIsStale compares the advertised version to the one in effect', () => {
  const v = BUNDLED_SCRAPE_CONFIG.version;
  assert.equal(scrapeConfigIsStale(String(v + 1)), true);
  assert.equal(scrapeConfigIsStale(String(v)), false);
  assert.equal(scrapeConfigIsStale(null), false);
  assert.equal(scrapeConfigIsStale('abc'), false);
});

test('describeScrapeStatus reads as one small line', () => {
  assert.equal(describeScrapeStatus({ version: 7, source: 'remote' }), 'Scrape config v7 (remote)');
  assert.equal(describeScrapeStatus(null), `Scrape config v${BUNDLED_SCRAPE_CONFIG.version} (bundled)`);
});
