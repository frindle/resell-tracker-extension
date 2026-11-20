import { test } from 'node:test';
import assert from 'node:assert/strict';
import { visitCommandPlan, parseVisitPlan, cleanVisits, MAX_COMMAND_VISITS } from '../src/lib/visitCommand.ts';

const N = (i: number) => `111-0000000-${String(i).padStart(7, '0')}`;
const payload = (visits: unknown[], userId: unknown = 1) => JSON.stringify({ userId, visits });

test('runs valid visits, drops bad numbers and unsafe links, dedupes', () => {
  const p = visitCommandPlan(payload([
    { orderNumber: N(1), url: `https://www.amazon.com/gp/your-account/order-details?orderID=${N(1)}`, stages: ['detail'] },
    { orderNumber: N(2), url: 'https://evil.example/order-details', stages: ['detail', 'track', 'bogus'] },
    { orderNumber: N(2), stages: ['detail'] }, { orderNumber: 'abc', stages: ['detail'] },
    { orderNumber: N(3), url: `http://www.amazon.com/gp/your-account/order-details?orderID=${N(3)}`, stages: ['track'] },
  ]), 1, false);
  assert.equal(p.action, 'run');
  if (p.action !== 'run') return;
  assert.deepEqual(p.visits.map(v => v.orderNumber), [N(1), N(2), N(3)]);
  assert.ok(p.visits[0].url);
  assert.equal(p.visits[1].url, null);
  assert.deepEqual(p.visits[1].stages, ['detail', 'track']);
  assert.equal(p.visits[2].url, null);
});
test('waits while another Amazon run is active', () => {
  assert.deepEqual(visitCommandPlan(payload([{ orderNumber: N(1), stages: ['detail'] }]), 1, true), { action: 'wait' });
});
test('fails on a bad payload, another user, or no valid orders', () => {
  assert.equal(visitCommandPlan(null, 1, false).action, 'fail');
  assert.equal(visitCommandPlan('{', 1, false).action, 'fail');
  assert.equal(visitCommandPlan(payload([{ orderNumber: N(1), stages: [] }], 2), 1, false).action, 'fail');
  assert.equal(visitCommandPlan(payload([{ orderNumber: 'x' }]), 1, false).action, 'fail');
});
test('a command is capped', () => {
  const p = visitCommandPlan(payload(Array.from({ length: 20 }, (_, i) => ({ orderNumber: N(i + 1), stages: ['detail'] }))), 1, false);
  assert.equal(p.action === 'run' && p.visits.length, MAX_COMMAND_VISITS);
});
test('parseVisitPlan reads the tracker envelope only', () => {
  assert.deepEqual(parseVisitPlan({ ok: true, visits: [{ orderNumber: N(1), stages: ['detail'] }], listDue: false })?.listDue, false);
  assert.equal(parseVisitPlan({ ok: true, visits: [] })?.listDue, true);
  assert.equal(parseVisitPlan({ error: 'x' }), null);
  assert.equal(parseVisitPlan(null), null);
  assert.deepEqual(cleanVisits('nope', 5), []);
});
