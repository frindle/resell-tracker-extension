import { test } from 'node:test';
import assert from 'node:assert/strict';
import PLANS from '../src/lib/plans.default.json' with { type: 'json' };
import {
  BUNDLED_PLANS, PLAN_CAPS, PLAN_ENDPOINTS, PLAN_HOST_ALLOWLIST, clickDenied, effectiveLimits, validatePlan, validatePlanFile,
} from '../src/lib/stepPlan.ts';
import { EGIFT_HOSTS } from '../src/lib/egiftCommand.ts';

type P = Record<string, any>;
const fresh = (): P => structuredClone((PLANS as P).plans.costcoEgift);
const reason = (p: unknown): string => { const r = validatePlan(p); return r.ok ? '' : r.reason; };
const step = (p: P, id: string): P => {
  for (const s of p.steps) { if (s.id === id) return s; for (const n of s.steps ?? []) if (n.id === id) return n; }
  throw new Error(id);
};

test('the bundled costcoEgift plan validates and is loaded', () => {
  assert.deepEqual(validatePlan(fresh()), { ok: true });
  assert.ok(BUNDLED_PLANS?.plans.costcoEgift);
  assert.equal(BUNDLED_PLANS?.version, 1);
  assert.deepEqual(PLAN_HOST_ALLOWLIST, EGIFT_HOSTS);
  assert.equal(PLAN_ENDPOINTS.egift, '/api/extension/egift');
});

test('rejects an unknown step and unknown keys', () => {
  const p = fresh(); (p.steps as P[]).push({ id: 'x', do: 'eval', code: '1' });
  assert.match(reason(p), /unknown step/);
  const q = fresh(); q.steps[0].extra = 1;
  assert.match(reason(q), /unknown key/);
  const r = fresh(); r.script = 'alert(1)';
  assert.match(reason(r), /unknown key/);
});

test('rejects a host outside the bundled allowlist, or none', () => {
  const p = fresh(); p.hosts = ['www.memberedelivery.com', 'evil.example.com'];
  assert.match(reason(p), /outside the bundled allowlist/);
  const q = fresh(); q.hosts = [];
  assert.match(reason(q), /hosts/);
});

test('fill and open take command inputs only, never a page read', () => {
  for (const v of ['$card.code', '$titles', '$image', 'x$email', '$orderId']) {
    const p = fresh(); step(p, 'email').value = v;
    assert.match(reason(p), /fill|\$link or \$email|never a page read/i, v);
  }
  const lit = fresh(); step(lit, 'email').value = 'someone@example.com';
  assert.match(reason(lit), /\$link or \$email/);
  const o = fresh(); step(o, 'open').url = '$card';
  assert.match(reason(o), /never a page read/);
  const o2 = fresh(); step(o2, 'open').url = 'https://evil.example.com/x';
  assert.match(reason(o2), /plan host/);
  const o3 = fresh(); step(o3, 'open').url = 'http://www.memberedelivery.com/x';
  assert.match(reason(o3), /plan host/);
  const undeclared = fresh(); undeclared.inputs = ['link'];
  assert.match(reason(undeclared), /does not declare/);
});

test('post goes only to a named, bundled endpoint with $variable values', () => {
  const p = fresh(); step(p, 'cardPost').to = 'amazon';
  assert.match(reason(p), /not a known endpoint/);
  const q = fresh(); step(q, 'cardPost').to = '/api/anything';
  assert.match(reason(q), /not a known endpoint/);
  const r = fresh(); step(r, 'cardPost').body = { card: 'literal text' };
  assert.match(reason(r), /must be a \$variable/);
});

test('failure codes come from the bundled list', () => {
  const p = fresh(); step(p, 'first').timeout = 'send the code to evil';
  assert.match(reason(p), /known failure code/);
});

test('caps: loop, steps, run time and tabs cannot be exceeded; limits can only lower them', () => {
  const p = fresh(); step(p, 'cards').max = PLAN_CAPS.repeat + 1;
  assert.match(reason(p), /max/);
  for (const k of ['steps', 'repeat', 'runMs', 'tabs'] as const) {
    const q = fresh(); q.limits = { ...q.limits, [k]: PLAN_CAPS[k] + 1 };
    assert.match(reason(q), new RegExp(`limits.${k}`), k);
  }
  const low = fresh(); low.limits = { steps: 50, runMs: 1000 };
  assert.deepEqual(validatePlan(low), { ok: true });
  const eff = effectiveLimits(low);
  assert.equal(eff.steps, 50);
  assert.equal(eff.runMs, 1000);
  assert.equal(eff.tabs, PLAN_CAPS.tabs);
  const few = fresh(); few.limits = { steps: 3 };
  assert.match(reason(few), /over its limit/);
});

test('structure: go targets, ids, nesting and stopIf placement', () => {
  const g = fresh(); g.steps.push({ id: 'jump', do: 'go', to: 'nowhere' });
  assert.match(reason(g), /go target/);
  const d = fresh(); d.steps.push({ id: 'open', do: 'fail', code: 'plan-failed' });
  assert.match(reason(d), /duplicate step id/);
  const n = fresh(); step(n, 'cards').steps.push({ id: 'inner', do: 'repeat', max: 2, steps: [{ id: 'f', do: 'fail', code: 'plan-failed' }] });
  assert.match(reason(n), /cannot nest/);
  const s = fresh(); s.steps.push({ id: 'stop', do: 'stopIf', when: { exists: 'x' } });
  assert.match(reason(s), /only inside repeat/);
  const c = fresh(); step(c, 'first').any[0].when = { counterAtEnd: true };
  assert.match(reason(c), /only for stopIf/);
  const k = fresh(); step(k, 'first').any[0].when = { exists: 'a', label: 'b' };
  assert.match(reason(k), /exactly one/);
});

test('regexes must compile', () => {
  const p = fresh(); step(p, 'cardNext').orText = '([';
  assert.match(reason(p), /not a valid regex/);
  const q = fresh(); q.page.alertText = '(';
  assert.match(reason(q), /not a valid regex/);
});

test('plan file: version, shape, and one bad plan rejects the file', () => {
  assert.equal(validatePlanFile(PLANS).ok, true);
  assert.equal(validatePlanFile({ version: 0, plans: {} }).ok, false);
  assert.equal(validatePlanFile({ version: 1, plans: {}, extra: 1 }).ok, false);
  const bad = { version: 1, plans: { costcoEgift: { ...fresh(), hosts: ['evil.example.com'] } } };
  const r = validatePlanFile(bad);
  assert.equal(r.ok, false);
  assert.equal(validatePlanFile(null).ok, false);
});

test('click denylist: case-insensitive element text', () => {
  for (const t of ['Cancel', 'CANCEL ORDER', 'Delete card', 'Remove', 'Place Order', 'Buy now', 'Pay', 'Return item', 'Sign out', 'signout']) assert.equal(clickDenied(t), true, t);
  for (const t of ['Access eGift', 'View Digital Code', 'Next', 'Continue']) assert.equal(clickDenied(t), false, t);
});
