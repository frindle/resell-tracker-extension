import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { BUNDLED_PLANS } from '../src/lib/stepPlan.ts';
import { PLAN_PUBLIC_KEY_B64 } from '../src/lib/planKey.ts';
import { loadRemotePlans, selectPlans, verifyPlans, type PlanStore, type StoredPlans, type PlanStatus } from '../src/lib/planRemote.ts';

const subtle = webcrypto.subtle as unknown as SubtleCrypto;
const B = BUNDLED_PLANS!.version;
const b64 = (u: Uint8Array) => Buffer.from(u).toString('base64');

async function keypair() {
  const kp = await subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']) as CryptoKeyPair;
  return { priv: kp.privateKey, pub: b64(new Uint8Array(await subtle.exportKey('raw', kp.publicKey))) };
}
async function sign(priv: CryptoKey, text: string) {
  return b64(new Uint8Array(await subtle.sign({ name: 'Ed25519' }, priv, new TextEncoder().encode(text))));
}
function planText(version: number, edit?: (f: any) => void): string {
  const f = JSON.parse(JSON.stringify(BUNDLED_PLANS));
  f.version = version;
  edit?.(f);
  return JSON.stringify(f, null, 2);
}
function fakeStore(initial?: StoredPlans | unknown) {
  const s = { cache: initial as unknown, status: null as PlanStatus | null, puts: 0 };
  const store: PlanStore = {
    async get() { return s.cache; },
    async put(v) { s.cache = v; s.puts++; },
    async putStatus(v) { s.status = v; },
  };
  return { s, store };
}
function respond(body: unknown, status = 200, etag: string | null = 'W/"1"'): typeof fetch {
  return (async () => new Response(status === 304 ? null : JSON.stringify(body), { status, headers: etag ? { ETag: etag } : {} })) as unknown as typeof fetch;
}
const tracker = { base: 'http://t.local', headers: {} };

test('a good signature is accepted and stored', async () => {
  const k = await keypair();
  const text = planText(B + 1);
  const { s, store } = fakeStore();
  const r = await loadRemotePlans(tracker, { store, subtle, publicKeyB64: k.pub, fetch: respond({ plans: text, sig: await sign(k.priv, text) }) });
  assert.equal(r.code, 'ok');
  assert.equal(r.source, 'remote');
  assert.equal(r.version, B + 1);
  assert.equal((s.cache as StoredPlans).plans, text);
  assert.equal(s.status?.code, 'ok');
});

test('one flipped byte in plans is rejected', async () => {
  const k = await keypair();
  const text = planText(B + 1);
  const sig = await sign(k.priv, text);
  const bad = text.replace('"version"', '"versioN"');
  assert.notEqual(bad, text);
  assert.deepEqual(await verifyPlans(bad, sig, { subtle, publicKeyB64: k.pub }), { ok: false, code: 'bad-sig' });
  const { s, store } = fakeStore();
  const r = await loadRemotePlans(tracker, { store, subtle, publicKeyB64: k.pub, fetch: respond({ plans: bad, sig }) });
  assert.equal(r.code, 'bad-sig');
  assert.equal(s.puts, 0);
});

test('a null sig is rejected', async () => {
  const k = await keypair();
  const { s, store } = fakeStore();
  const r = await loadRemotePlans(tracker, { store, subtle, publicKeyB64: k.pub, fetch: respond({ plans: planText(B + 1), sig: null }) });
  assert.equal(r.code, 'no-sig');
  assert.equal(r.source, 'bundled');
  assert.equal(s.puts, 0);
});

test('the wrong key is rejected', async () => {
  const k = await keypair();
  const other = await keypair();
  const text = planText(B + 1);
  const { store } = fakeStore();
  const r = await loadRemotePlans(tracker, { store, subtle, publicKeyB64: other.pub, fetch: respond({ plans: text, sig: await sign(k.priv, text) }) });
  assert.equal(r.code, 'bad-sig');
});

test('an empty key means bundled only and does not fetch', async () => {
  const k = await keypair();
  const text = planText(B + 1);
  let called = false;
  const { s, store } = fakeStore();
  const r = await loadRemotePlans(tracker, { store, subtle, publicKeyB64: '', fetch: (async () => { called = true; return new Response('{}'); }) as unknown as typeof fetch });
  assert.equal(r.code, 'no-key');
  assert.equal(r.source, 'bundled');
  assert.equal(called, false);
  assert.equal(s.puts, 0);
  // A stored copy is not honoured either.
  const held = fakeStore({ plans: text, sig: await sign(k.priv, text), etag: null, fetchedAt: 1 });
  assert.equal((await selectPlans({ store: held.store, subtle, publicKeyB64: '' })).source, 'bundled');
});

test('an older version is rejected (older than bundled, and older than stored)', async () => {
  const k = await keypair();
  const old = planText(B - 1 > 0 ? B - 1 : 0);
  // Bundled is v1 in the repo, so an older-than-bundled plan is checked with a raised bundled version.
  const bundled = { ...BUNDLED_PLANS!, version: B + 5 };
  const a = fakeStore();
  const r1 = await loadRemotePlans(tracker, { store: a.store, subtle, publicKeyB64: k.pub, bundled, fetch: respond({ plans: planText(B + 4), sig: await sign(k.priv, planText(B + 4)) }) });
  assert.equal(r1.code, 'older');
  assert.equal(a.s.puts, 0);
  void old;
  const stored = planText(B + 3);
  const b = fakeStore({ plans: stored, sig: await sign(k.priv, stored), etag: null, fetchedAt: 1 });
  const r2 = await loadRemotePlans(tracker, { store: b.store, subtle, publicKeyB64: k.pub, fetch: respond({ plans: planText(B + 2), sig: await sign(k.priv, planText(B + 2)) }) });
  assert.equal(r2.code, 'older');
  assert.equal((b.s.cache as StoredPlans).plans, stored);
  assert.equal(r2.version, B + 3);
});

test('an invalid plan with a valid sig is rejected', async () => {
  const k = await keypair();
  const text = planText(B + 1, f => { f.plans.bogus = { not: 'a plan' }; });
  const { s, store } = fakeStore();
  const r = await loadRemotePlans(tracker, { store, subtle, publicKeyB64: k.pub, fetch: respond({ plans: text, sig: await sign(k.priv, text) }) });
  assert.equal(r.code, 'invalid');
  assert.equal(s.puts, 0);
});

test('a tampered stored copy falls back to bundled', async () => {
  const k = await keypair();
  const text = planText(B + 1);
  const sig = await sign(k.priv, text);
  const good = fakeStore({ plans: text, sig, etag: null, fetchedAt: 1 });
  assert.equal((await selectPlans({ store: good.store, subtle, publicKeyB64: k.pub })).source, 'remote');
  const bad = fakeStore({ plans: text.replace('"version"', '"versioN"'), sig, etag: null, fetchedAt: 1 });
  const sel = await selectPlans({ store: bad.store, subtle, publicKeyB64: k.pub });
  assert.equal(sel.source, 'bundled');
  assert.equal(sel.file, BUNDLED_PLANS);
});

test('304 keeps the cache', async () => {
  const k = await keypair();
  const text = planText(B + 1);
  const { s, store } = fakeStore({ plans: text, sig: await sign(k.priv, text), etag: 'W/"1"', fetchedAt: 1 });
  let sent: string | undefined;
  const f = (async (_u: string, init: RequestInit) => { sent = (init.headers as Record<string, string>)['If-None-Match']; return new Response(null, { status: 304 }); }) as unknown as typeof fetch;
  const r = await loadRemotePlans(tracker, { store, subtle, publicKeyB64: k.pub, fetch: f });
  assert.equal(sent, 'W/"1"');
  assert.equal(r.code, 'not-modified');
  assert.equal(r.source, 'remote');
  assert.equal(s.puts, 0);
});

test('fetch errors and missing Ed25519 are reported, nothing changes', async () => {
  const k = await keypair();
  const a = fakeStore();
  const r1 = await loadRemotePlans(tracker, { store: a.store, subtle, publicKeyB64: k.pub, fetch: (async () => { throw new Error('down'); }) as unknown as typeof fetch });
  assert.equal(r1.code, 'fetch-error');
  const text = planText(B + 1);
  const broken = { importKey: async () => { throw Object.assign(new Error('x'), { name: 'NotSupportedError' }); } } as unknown as SubtleCrypto;
  const r2 = await loadRemotePlans(tracker, { store: a.store, subtle: broken, publicKeyB64: k.pub, fetch: respond({ plans: text, sig: 'AAAA' }) });
  assert.equal(r2.code, 'no-webcrypto');
  assert.equal(a.s.puts, 0);
});

test('the bundled public key is 32 bytes and imports as Ed25519', async () => {
  const raw = Buffer.from(PLAN_PUBLIC_KEY_B64, 'base64');
  assert.equal(raw.length, 32);
  const key = await subtle.importKey('raw', raw, { name: 'Ed25519' }, false, ['verify']);
  assert.equal(key.type, 'public');
});
