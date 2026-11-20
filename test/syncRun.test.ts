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
  assert.equal(log.navs[0], L2);
  assert.deepEqual(log.navs.slice(1).sort(), [D('A'), T('A'), D('B')].sort()); // orders are visited in a random order
  assert.ok(log.navs.indexOf(D('A')) < log.navs.indexOf(T('A')));
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

test('tracking run: each order detail page, then the track links the tracker returned (max 3), no list pages', async () => {
  const dA = 'https://www.amazon.com/gp/your-account/order-details?orderID=111-0000000-0000001';
  const dB = 'https://www.amazon.com/gp/your-account/order-details?orderID=112-0000000-0000002';
  const t = (i: number) => `https://www.amazon.com/progress-tracker/package?orderId=111-0000000-0000001&i=${i}`;
  const detail = (trackUrls: string[]): PageOutcome => ({ kind: 'result', result: { updated: 0, detail: { trackUrls } } as never });
  const { deps, log } = fake({
    [dA]: detail([t(1), t(2), t(3), t(4)]), [t(1)]: res({}, { updated: 1 }), [t(2)]: res({}), [t(3)]: res({}),
    [dB]: detail([]),
  });
  const s = await createSyncRunner(deps).run({ orders: ['111-0000000-0000001', '112-0000000-0000002'], paceMs: 1 }) as any;
  assert.equal(s.status, 'done');
  assert.deepEqual(log.opened, [dA]);
  assert.deepEqual(log.navs, [t(1), t(2), t(3), dB]);
  assert.equal(s.updated, 1);
  assert.deepEqual(log.closed, [7]);
});

test('tracking run stops on a block page and leaves the tab', async () => {
  const dA = 'https://www.amazon.com/gp/your-account/order-details?orderID=111-0000000-0000001';
  const { deps, log } = fake({ [dA]: { kind: 'blocked' } });
  const s = await createSyncRunner(deps).run({ orders: ['111-0000000-0000001', '112-0000000-0000002'], paceMs: 1 }) as any;
  assert.equal(s.status, 'blocked');
  assert.equal(log.navs.length, 0);
  assert.deepEqual(log.closed, []);
});

import { formatRunSummary } from '../src/lib/syncRun.ts';
test('summary counts ignored pages and says compare-only', async () => {
  const { deps } = fake({ [L1]: { kind: 'result', result: { blocked: true, mode: 'compare' } as never } });
  const s = await createSyncRunner(deps).run({ paceMs: 1 }) as any;
  assert.equal(s.ignored, 1);
  assert.match(formatRunSummary(s), /1 page ignored as sign-in\/block/);
  assert.match(formatRunSummary(s), /compare only/);
  assert.match(formatRunSummary({ ...s, ignored: 0, created: 2 }), /2 would create/);
});

test('paceDelay varies and stays in range', async () => {
  const { paceDelay, shuffled } = await import('../src/lib/syncRun.ts');
  const seen = new Set<number>();
  for (let i = 0; i < 300; i++) {
    const d = paceDelay(4000);
    assert.ok(d >= 3000 && d <= 20000, String(d));
    seen.add(d);
  }
  assert.ok(seen.size > 50);
  assert.equal(paceDelay(4000, () => 0.5), 6000);
  assert.equal(paceDelay(4000, () => 0), 12000);
  assert.deepEqual(shuffled([1, 2, 3, 4]).sort(), [1, 2, 3, 4]);
});

// ---- tracker-driven runs ----------------------------------------------------
const N1 = '111-0000000-0000001', N2 = '111-0000000-0000002', N3 = '111-0000000-0000003';
const withPlan = (deps: RunDeps, plan: any): RunDeps => ({ ...deps, fetchVisits: async () => plan });

test('clicked run: goes straight to the tracker\'s orders, no order list when it is not due', async () => {
  const { deps, log } = fake({ [D(N1)]: res({}), [D(N2)]: res({}) });
  const s = await createSyncRunner(withPlan(deps, { listDue: false, visits: [{ orderNumber: N1, stages: ['detail'] }, { orderNumber: N2, stages: ['detail'] }] })).run({ paceMs: 1 }) as any;
  assert.equal(s.status, 'done');
  assert.equal(s.pages, 2);
  assert.deepEqual([log.opened[0], ...log.navs].sort(), [D(N1), D(N2)].sort());
  assert.ok(!log.opened.concat(log.navs).includes(L1));
});

test('clicked run: nothing pending and list not due opens no tab', async () => {
  const { deps, log } = fake({});
  const s = await createSyncRunner(withPlan(deps, { listDue: false, visits: [] })).run({ paceMs: 1 }) as any;
  assert.equal(s.pages, 0);
  assert.deepEqual(log.opened, []);
});

test('clicked run: a stored link is used only when it is a safe order-details page', async () => {
  const stored = `https://www.amazon.com/your-orders/order-details?orderID=${N1}`;
  const { deps, log } = fake({ [stored]: res({}), [D(N2)]: res({}) });
  await createSyncRunner(withPlan(deps, { listDue: false, visits: [{ orderNumber: N1, url: stored, stages: ['detail'] }, { orderNumber: N2, url: 'https://evil.example/x', stages: ['detail'] }] })).run({ paceMs: 1 });
  const all = [log.opened[0], ...log.navs];
  assert.ok(all.includes(stored));
  assert.ok(all.includes(D(N2)));
  assert.ok(!all.some(u => u.includes('evil')));
});

test('clicked run: page 1 when due; stops paging once an order on it is known', async () => {
  const { deps, log } = fake({ [L1]: res({ nextUrl: L2, anyKnown: true, needs: [] }), [L2]: res({}) });
  await createSyncRunner(withPlan(deps, { listDue: true, visits: [] })).run({ paceMs: 1 });
  assert.deepEqual(log.opened, [L1]);
  assert.deepEqual(log.navs, []);
});

test('clicked run: keeps paging while nothing on the page is known', async () => {
  const { deps, log } = fake({ [L1]: res({ nextUrl: L2, anyKnown: false }), [L2]: res({ reachedWindow: true }) });
  await createSyncRunner(withPlan(deps, { listDue: true, visits: [] })).run({ paceMs: 1 });
  assert.deepEqual(log.navs, [L2]);
});

test('clicked run: at most 10 orders; a track stage follows the Track package link once', async () => {
  const visits = Array.from({ length: 14 }, (_, i) => ({ orderNumber: `111-0000000-${String(i + 10).padStart(7, '0')}`, stages: ['detail'] }));
  const pages: Record<string, PageOutcome> = {};
  for (const v of visits) pages[D(v.orderNumber)] = res({});
  const a = fake(pages);
  const s = await createSyncRunner(withPlan(a.deps, { listDue: false, visits })).run({ paceMs: 1 }) as any;
  assert.equal(s.pages, 10);

  const b = fake({ [D(N3)]: { kind: 'result', result: { unchanged: 1, detail: { trackUrls: [T(N3), T('x')] } } as never }, [T(N3)]: res({}) });
  const s2 = await createSyncRunner(withPlan(b.deps, { listDue: false, visits: [{ orderNumber: N3, stages: ['detail', 'track'] }] })).run({ paceMs: 1 }) as any;
  assert.equal(s2.pages, 3); // detail + both Track links (max 3 per order)
});

test('tracker unreachable: falls back to reading the order list as before', async () => {
  const { deps, log } = fake({ [L1]: res({ allComplete: true }) });
  await createSyncRunner(withPlan(deps, null)).run({ paceMs: 1 });
  assert.deepEqual(log.opened, [L1]);
});

test('visits run (email-triggered): each order once, detail then track, blocked stops and leaves the tab', async () => {
  const { deps, log } = fake({
    [D(N1)]: { kind: 'result', result: { unchanged: 1, detail: { trackUrls: [T(N1)] } } as never }, [T(N1)]: res({}),
    [D(N2)]: { kind: 'blocked' }, [D(N3)]: res({}),
  });
  const s = await createSyncRunner(deps).run({ paceMs: 1, visits: [
    { orderNumber: N1, stages: ['detail', 'track'] }, { orderNumber: N1, stages: ['detail'] },
    { orderNumber: N2, stages: ['detail'] }, { orderNumber: N3, stages: ['detail'] },
  ] }) as any;
  assert.equal(s.status, 'blocked');
  assert.deepEqual([log.opened[0], ...log.navs], [D(N1), T(N1), D(N2)]);
  assert.deepEqual(log.closed, []);
});
