import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCarrierItems, looksBlocked, safeTitle, joinNotes } from '../src/background/carrierRun.ts';

const FAST = { waitMs: 30, pollMs: 5, gapMinMs: 0, gapMaxMs: 0 };
const N = 'ABC1234567890';
const item = { carrier: 'fedex' as const, trackingNumber: N };
const body = (text: string, title = 'FedEx Tracking') => ({ text, title });

function stub(opts: { page?: { text: string; title: string }; tabs?: 'gone' | 'error' | 'ok'; createFails?: boolean; scriptThrows?: boolean }) {
  const removed: number[] = [];
  (globalThis as any).chrome = {
    runtime: { getPlatformInfo: async () => ({}) },
    tabs: {
      create: async () => { if (opts.createFails) throw new TypeError('nope'); return { id: 7 }; },
      get: async () => {
        if (opts.tabs === 'gone') throw new Error('No tab');
        return { id: 7, title: opts.page?.title, url: opts.tabs === 'error' ? 'chrome-error://chromewebdata/' : 'https://www.fedex.com/' };
      },
      remove: async (id: number) => { removed.push(id); },
    },
    scripting: { executeScript: async () => { if (opts.scriptThrows) throw new Error('x'); return [{ result: { text: opts.page?.text ?? '' } }]; } },
  };
  return removed;
}
const ok = async () => ({ ok: true, status: 200 });

test('reads a page and reports no note', async () => {
  const removed = stub({ page: body('Status: Delivered') });
  const out = await runCarrierItems([item], ok, ['delivered'], FAST);
  assert.deepEqual(out, { ok: true, done: 1, failed: 0, lastNote: '' });
  assert.deepEqual(removed, [7]);
});

test('timeout names the carrier and the title, and flags a bot page', async () => {
  stub({ page: body('Access Denied. Reference #123', 'Access Denied') });
  const out = await runCarrierItems([item], ok, ['delivered'], FAST);
  assert.equal(out.ok, false);
  assert.equal(out.lastNote, "fedex timed out, title 'Access Denied' (looks like a bot/consent page)");
  assert.ok(!out.lastNote.includes('Reference'));
});

test('plain timeout has no bot flag; title never carries the tracking number or page text', async () => {
  stub({ page: body('Loading secret body text', `Tracking ${N} | FedEx`) });
  const out = await runCarrierItems([item], ok, ['delivered'], FAST);
  assert.equal(out.lastNote, "fedex timed out, title 'Tracking | FedEx'");
  assert.ok(!out.lastNote.includes(N) && !out.lastNote.includes('secret'));
});

test('closed tab, load error, failed open', async () => {
  stub({ page: body(''), tabs: 'gone' });
  assert.equal((await runCarrierItems([item], ok, ['delivered'], FAST)).lastNote, 'fedex tab closed');
  stub({ page: body(''), tabs: 'error' });
  assert.equal((await runCarrierItems([item], ok, ['delivered'], FAST)).lastNote, 'fedex failed to load');
  stub({ createFails: true });
  assert.equal((await runCarrierItems([item], ok, ['delivered'], FAST)).lastNote, 'fedex error TypeError');
});

test('non-2xx post reports its status; a throwing post reports the error type', async () => {
  stub({ page: body('delivered') });
  let out = await runCarrierItems([item], async () => ({ ok: false, status: 503 }), ['delivered'], FAST);
  assert.equal(out.lastNote, 'fedex tracker answered 503');
  out = await runCarrierItems([item], async () => { throw new RangeError('x'); }, ['delivered'], FAST);
  assert.equal(out.lastNote, 'fedex error RangeError');
});

test('several items give one note each, counted, under 200 chars', async () => {
  stub({ page: body('x', 'Access Denied') });
  const items = [item, { carrier: 'ups' as const, trackingNumber: N }, item];
  const out = await runCarrierItems(items, ok, ['delivered'], FAST);
  assert.equal(out.failed, 3);
  assert.equal(out.lastNote.split('; ').length, 3);
  assert.ok(out.lastNote.length <= 200);
});

test('helpers', () => {
  assert.equal(looksBlocked('Please verify you are human'), true);
  assert.equal(looksBlocked('Tracking results'), false);
  assert.equal(safeTitle(undefined, N), '');
  assert.equal(joinNotes(['a'.repeat(300)]).length, 200);
});
