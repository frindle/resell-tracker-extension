import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSyncRunner, type RunDeps, type PageOutcome } from '../src/lib/syncRun.ts';

const L1 = 'https://www.amazon.com/your-orders/orders?timeFilter=last30';
const L2 = 'https://www.amazon.com/your-orders/orders?timeFilter=last30&startIndex=10';
const D = (n: string) => `https://www.amazon.com/gp/your-account/order-details?orderID=${n}`;
const T = (n: string) => `https://www.amazon.com/progress-tracker/package?orderId=${n}`;

function fake(pages: Record<string, PageOutcome>) {
  const log = { opened: [] as string[], navs: [] as string[], closed: [] as number[], sleeps: 0 };
  let current = '';
  let release: (() => void) | null = null;
  const deps: RunDeps = {
    async openTab(url) { log.opened.push(url); current = url; return 7; },
    async navigate(_t, url) { log.navs.push(url); current = url; },
    async waitForOutcome() {
      if (release === null && pages['__gate__']) await new Promise<void>(r => { release = r; pages['__gate__'] = undefined as never; (globalThis as any).__release = r; });
      return pages[current] ?? { kind: 'timeout' };
    },
    async closeTab(t) { log.closed.push(t); },
    async sleep() { log.sleeps++; },
  };
  return { deps, log };
}

const res = (extra: object, r: object = {}): PageOutcome => ({ kind: 'result', result: { created: 0, updated: 0, unchanged: 1, discrepancies: 0, ...r, list: extra as never } });

test('normal run: walks lists, then visits only needed orders, closes tab', async () => {
  const { deps, log } = fake({
    [L1]: res({ nextUrl: L2, needs: [{ orderNumber: 'A', detailUrl: D('A'), trackUrls: [T('A')] }] }, { created: 1 }),
    [L2]: res({ reachedWindow: true, needs: [{ orderNumber: 'B', detailUrl: D('B') }] }),
    [D('A')]: res({}, { updated: 1 }), [T('A')]: res({}), [D('B')]: res({}, { discrepancies: 1 }),
  });
  const s = await createSyncRunner(deps).run({ paceMs: 1 }) as any;
  assert.equal(s.status, 'done');
  assert.equal(s.pages, 5);
  assert.deepEqual([s.created, s.updated, s.discrepancies], [1, 1, 1]);
  assert.deepEqual(log.opened, [L1]);
  assert.deepEqual(log.navs, [L2, D('A'), T('A'), D('B')]);
  assert.deepEqual(log.closed, [7]);
  assert.equal(log.sleeps, 4);
});

test('stops at the page cap', async () => {
  const needs = Array.from({ length: 30 }, (_, i) => ({ orderNumber: 'O' + i, detailUrl: D('O' + i) }));
  const pages: Record<string, PageOutcome> = { [L1]: res({ allComplete: true, needs }) };
  for (const n of needs) pages[n.detailUrl] = res({});
  const { deps, log } = fake(pages);
  const s = await createSyncRunner(deps).run({ maxPages: 10, paceMs: 1 }) as any;
  assert.equal(s.status, 'capped');
  assert.equal(s.pages, 10);
  assert.equal(log.navs.length, 9);
  assert.deepEqual(log.closed, [7]);
});

test('blocked page stops immediately, leaves the tab open, never retries', async () => {
  const { deps, log } = fake({
    [L1]: res({ nextUrl: L2, needs: [{ orderNumber: 'A', detailUrl: D('A') }] }),
    [L2]: { kind: 'blocked' },
  });
  const s = await createSyncRunner(deps).run({ paceMs: 1 }) as any;
  assert.equal(s.status, 'blocked');
  assert.equal(s.pages, 2);
  assert.deepEqual(log.navs, [L2]);
  assert.deepEqual(log.closed, []);
});

test('only one run at a time', async () => {
  const { deps } = fake({ __gate__: { kind: 'timeout' }, [L1]: res({ allComplete: true }) });
  const runner = createSyncRunner(deps);
  const first = runner.run({ paceMs: 1 });
  await new Promise(r => setTimeout(r, 5));
  assert.equal(runner.isRunning(), true);
  const second = await runner.run({ paceMs: 1 }) as any;
  assert.equal(second.started, false);
  (globalThis as any).__release();
  const s = await first as any;
  assert.equal(s.status, 'done');
  assert.equal(runner.isRunning(), false);
});

test('refuses non-order URLs from the tracker', async () => {
  const { deps, log } = fake({
    [L1]: res({ allComplete: true, needs: [{ orderNumber: 'X', detailUrl: 'https://evil.example/gp/your-account/order-details?orderID=X' }] }),
  });
  const s = await createSyncRunner(deps).run({ paceMs: 1 }) as any;
  assert.equal(s.pages, 1);
  assert.deepEqual(log.navs, []);
});
