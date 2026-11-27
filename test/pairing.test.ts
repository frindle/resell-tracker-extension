import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  approvalUrl, beginPairing, checkSecret, stepPairing, PAIRING_TTL_MS,
  type FetchLike, type Paired, type PairingStore, type PendingPairing,
} from '../src/lib/pairing.ts';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function memStore(initial: PendingPairing | null = null) {
  let p = initial;
  const store: PairingStore = {
    get: async () => p,
    set: async v => { p = v; },
    clear: async code => { if (p?.code === code) p = null; },
  };
  return { store, current: () => p };
}

function recorder(reply: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const calls: Array<{ url: string; body: unknown; headers: Record<string, string> }> = [];
  const f: FetchLike = async (url, init) => {
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined, headers: (init?.headers ?? {}) as Record<string, string> });
    return reply(url, init);
  };
  return { f, calls };
}

const pending: PendingPairing = { trackerUrl: 'http://tracker.test:3000', code: 'c0de', claim: 'cl41m', expiresAt: 1_000_000 };

test('beginPairing starts on the tracker and keeps the claim', async () => {
  const { f, calls } = recorder(() => json({ code: 'c0de', claim: 'cl41m', approveUrl: '/elsewhere' }));
  const p = await beginPairing('http://tracker.test:3000/', 'firefox', f, 5);
  assert.deepEqual(p, { trackerUrl: 'http://tracker.test:3000', code: 'c0de', claim: 'cl41m', expiresAt: 5 + PAIRING_TTL_MS });
  assert.equal(calls[0].url, 'http://tracker.test:3000/api/extension/pair');
  assert.deepEqual(calls[0].body, { browser: 'firefox' });
});

test('the approval tab is built from the code on the tracker, not taken from the reply', () => {
  assert.equal(approvalUrl('http://tracker.test:3000/', 'a b'), 'http://tracker.test:3000/extension/pair?code=a%20b');
});

test('beginPairing explains a full queue, an old tracker and a bad reply', async () => {
  await assert.rejects(beginPairing('http://t', 'chrome', recorder(() => json({}, 429)).f, 0), /Too many pairings/);
  await assert.rejects(beginPairing('http://t', 'chrome', recorder(() => json({}, 404)).f, 0), /HTTP 404/);
  await assert.rejects(beginPairing('http://t', 'chrome', recorder(() => json({ code: 'x' })).f, 0), /unexpected/);
});

test('stepPairing sends code and claim, waits while pending, then saves the secret once', async () => {
  const { store, current } = memStore({ ...pending });
  const saved: Paired[] = [];
  const save = async (p: Paired) => { saved.push(p); };

  const waiting = recorder(() => json({ status: 'pending' }));
  assert.deepEqual(await stepPairing(store, save, waiting.f, 10), { state: 'pending', expiresAt: pending.expiresAt });
  assert.equal(waiting.calls[0].url, 'http://tracker.test:3000/api/extension/pair/claim');
  assert.deepEqual(waiting.calls[0].body, { code: 'c0de', claim: 'cl41m' });
  assert.ok(current(), 'still pending');

  const approved = recorder(() => json({ status: 'approved', userId: 1, userName: 'Penn', secret: 's3cret' }));
  assert.deepEqual(await stepPairing(store, save, approved.f, 20), { state: 'paired', userName: 'Penn' });
  assert.deepEqual(saved, [{ secret: 's3cret', userId: '1', userName: 'Penn' }]);
  assert.equal(current(), null, 'pending pairing removed');
  assert.deepEqual(await stepPairing(store, save, approved.f, 30), { state: 'none' });
  assert.equal(saved.length, 1);
});

test('stepPairing drops an expired or forgotten pairing without calling save', async () => {
  const save = async () => { throw new Error('must not save'); };
  const expired = memStore({ ...pending });
  const never = recorder(() => { throw new Error('must not fetch'); });
  assert.deepEqual(await stepPairing(expired.store, save, never.f, pending.expiresAt), { state: 'expired' });
  assert.equal(expired.current(), null);

  const forgotten = memStore({ ...pending });
  assert.deepEqual(await stepPairing(forgotten.store, save, recorder(() => json({ status: 'unknown' }, 404)).f, 0), { state: 'unknown' });
  assert.equal(forgotten.current(), null);
});

test('stepPairing keeps the pairing on a network error, a server error or a malformed approval', async () => {
  const save = async () => { throw new Error('must not save'); };
  const { store, current } = memStore({ ...pending });
  assert.equal((await stepPairing(store, save, async () => { throw new TypeError('offline'); }, 0)).state, 'error');
  assert.equal((await stepPairing(store, save, recorder(() => json({}, 500)).f, 0)).state, 'error');
  assert.equal((await stepPairing(store, save, recorder(() => json({ status: 'approved', userId: 1 })).f, 0)).state, 'error');
  assert.ok(current());
});

test('a tracker with no secret configured pairs with an empty secret', async () => {
  const { store } = memStore({ ...pending });
  const saved: Paired[] = [];
  const r = await stepPairing(store, async p => { saved.push(p); }, recorder(() => json({ status: 'approved', userId: 2, userName: 'B', secret: '' })).f, 0);
  assert.equal(r.state, 'paired');
  assert.equal(saved[0].secret, '');
});

test('clear only removes the pairing it was asked about', async () => {
  const { store, current } = memStore({ ...pending });
  await store.clear('other');
  assert.ok(current());
});

test('checkSecret: 401 means pair again; ok or 304 means it works; anything else is unreachable', async () => {
  const ok = recorder(() => json({}));
  assert.equal(await checkSecret('http://t/', '', 'sek', ok.f), 'ok');
  assert.equal(ok.calls[0].url, 'http://t/api/extension/scrape-config');
  assert.deepEqual(ok.calls[0].headers, { 'X-Extension-User-Id': '0', 'X-Extension-Secret': 'sek' });
  assert.equal(await checkSecret('http://t', '1', 'x', recorder(() => new Response(null, { status: 304 })).f), 'ok');
  assert.equal(await checkSecret('http://t', '1', 'x', recorder(() => json({}, 401)).f), 'rejected');
  assert.equal(await checkSecret('http://t', '1', 'x', recorder(() => json({}, 502)).f), 'unreachable');
  assert.equal(await checkSecret('http://t', '1', 'x', async () => { throw new TypeError('down'); }), 'unreachable');
});
