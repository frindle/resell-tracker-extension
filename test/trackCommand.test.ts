import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trackCommandPlan } from '../src/lib/trackCommand.ts';

const A = '111-0000000-0000001';
const B = '112-0000000-0000002';

test('runs the payload orders for this extension user', () => {
  assert.deepEqual(trackCommandPlan(JSON.stringify({ orderNumbers: [A, B, A], userId: 1 }), '1', false), { action: 'run', orders: [A, B] });
});

test('waits while another Amazon run is going', () => {
  assert.deepEqual(trackCommandPlan(JSON.stringify({ orderNumbers: [A], userId: 1 }), '1', true), { action: 'wait' });
});

test("refuses another user's orders, bad payloads and non-Amazon numbers", () => {
  assert.equal(trackCommandPlan(JSON.stringify({ orderNumbers: [A], userId: 2 }), '1', false).action, 'fail');
  assert.equal(trackCommandPlan('{', '1', false).action, 'fail');
  assert.equal(trackCommandPlan(null, '1', false).action, 'fail');
  assert.equal(trackCommandPlan(JSON.stringify({ orderNumbers: ['12345', 'x'], userId: 1 }), '1', false).action, 'fail');
});
