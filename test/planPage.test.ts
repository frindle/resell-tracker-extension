// The plan page functions against synthetic portal pages (made-up values), with linkedom.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { planProbe, planClick, planFill, planRead } from '../src/lib/planPage.ts';
import { BUNDLED_PLANS, CLICK_DENY_SOURCE } from '../src/lib/stepPlan.ts';

const page0 = BUNDLED_PLANS!.plans.costcoEgift.page;
const EMAIL_SEL = '#p2, input[type="email"]';

function page(html: string) {
  const w = parseHTML(`<!doctype html><html><body>${html}</body></html>`);
  const g = globalThis as Record<string, unknown>;
  for (const k of ['document', 'HTMLInputElement', 'HTMLFormElement', 'HTMLElement', 'Event']) g[k] = (w as Record<string, unknown>)[k];
  const proto = (w.HTMLElement as unknown as { prototype: object }).prototype;
  if (!Object.getOwnPropertyDescriptor(proto, 'innerText')) {
    Object.defineProperty(proto, 'innerText', { get(this: { textContent: string }) { return this.textContent; }, configurable: true });
  }
  return w.document as unknown as Document;
}

const FORM = `<form><input type="text" id="p2"><button id="go" type="submit">View Digital Code</button><div class="ui-message" role="alert"></div></form>`;
const LIST = `<section class="order-item"><div class="order-item-title">Fakemart eGift $25.00</div><input type="button" value="Access eGift"></section>`;
const CARD = `<div id="print-content-section"><div class="row"><label>Code:</label><span>FAKE-CODE-1</span></div>
<div class="row"><label>PIN:</label><span>FAKE1</span></div> <span id="wdt-page-counter">1 of 3</span><input id="x-wdt-nav-next" type="button" value="Next"></div>`;

test('probe: exists, clickable, label (with value), text, alert and bot flags', () => {
  page(FORM);
  const f = planProbe({ page: page0, conds: [{ exists: EMAIL_SEL }, { clickable: 'access egift' }, { label: 'Code:' }, { text: 'view digital' }, { alert: true }] });
  assert.deepEqual(f.hits, [true, false, false, true, false]);
  assert.equal(f.alert, false);
  assert.equal(f.botCheck, false);
  page(LIST);
  assert.deepEqual(planProbe({ page: page0, conds: [{ clickable: 'Access eGift' }] }).hits, [true]);
  page(CARD);
  const c = planProbe({ page: page0, conds: [{ label: 'Code:' }, { label: 'PIN:' }, { label: 'Nope:' }] });
  assert.deepEqual(c.hits, [true, true, false]);
  assert.deepEqual(c.labels, ['FAKE-CODE-1', 'FAKE1', null]);
});

test('probe: alert text and a bot check', () => {
  page(`<div role="alert">The e-mail does not match</div>`);
  const a = planProbe({ page: page0, conds: [{ alert: true }] });
  assert.equal(a.alert, true);
  assert.deepEqual(a.hits, [true]);
  page(`<div>Additional security check is required</div>`);
  assert.equal(planProbe({ page: page0, conds: [] }).botCheck, true);
  page(`<iframe src="/x/_Incapsula_Resource?a=1"></iframe>`);
  assert.equal(planProbe({ page: page0, conds: [] }).botCheck, true);
});

test('probe: a bad selector or regex is skipped, not thrown', () => {
  page(FORM);
  const r = planProbe({ page: page0, conds: [{ exists: '((' }, { text: '(' }] });
  assert.deepEqual(r.hits, [false, false]);
});

test('click: by clickable label, selector, orText; denylisted text is refused and not clicked', () => {
  const d = page(`${LIST}<button id="cancel">Cancel order</button><button id="n">Next page</button><button id="pay">Pay now</button>`);
  const seen: string[] = [];
  for (const id of ['cancel', 'n', 'pay']) d.getElementById(id)!.addEventListener('click', () => seen.push(id));
  d.querySelector('input[type=button]')!.addEventListener('click', () => seen.push('access'));
  assert.equal(planClick({ page: page0, clickable: 'Access eGift' }, CLICK_DENY_SOURCE), 'ok');
  assert.equal(planClick({ page: page0, clickable: 'cancel' }, CLICK_DENY_SOURCE), 'denied');
  assert.equal(planClick({ page: page0, selector: '#pay' }, CLICK_DENY_SOURCE), 'denied');
  assert.equal(planClick({ page: page0, selector: '#nothing', orText: '^next\\b' }, CLICK_DENY_SOURCE), 'ok');
  assert.equal(planClick({ page: page0, clickable: 'missing' }, CLICK_DENY_SOURCE), 'none');
  assert.equal(planClick({ page: page0, orText: '(' }, CLICK_DENY_SOURCE), 'none');
  assert.deepEqual(seen, ['access', 'n']);
  assert.equal(planClick({ page: page0, clickable: 'Access eGift' }, '('), 'denied');
});

test('click: a disabled button is not clicked', () => {
  const d = page(`<input id="x-wdt-nav-next" type="button" value="Next" disabled>`);
  let n = 0;
  d.getElementById('x-wdt-nav-next')!.addEventListener('click', () => n++);
  assert.equal(planClick({ page: page0, selector: 'input[id$="wdt-nav-next"]' }, CLICK_DENY_SOURCE), 'none');
  assert.equal(n, 0);
});

test('fill: types the value and clicks the submit button', () => {
  const d = page(FORM);
  let clicked = '';
  d.getElementById('go')!.addEventListener('click', e => { clicked = (e.target as HTMLElement).id; e.preventDefault(); });
  const spec = { selector: EMAIL_SEL, submit: true, submitButton: '#go, button[type="submit"]', buttons: 'button', submitText: 'submit|view' };
  assert.equal(planFill(spec, 'fake-buyer@example.com', CLICK_DENY_SOURCE), true);
  assert.equal((d.getElementById('p2') as HTMLInputElement).value, 'fake-buyer@example.com');
  assert.equal(clicked, 'go');
  assert.equal(planFill({ ...spec, selector: '#missing' }, 'x', CLICK_DENY_SOURCE), false);
});

test('fill: a denylisted submit button is not clicked', () => {
  const d = page(`<form><input id="p2"><button id="go" type="submit">Place order</button></form>`);
  let n = 0;
  d.getElementById('go')!.addEventListener('click', () => n++);
  assert.equal(planFill({ selector: '#p2', submit: true, submitButton: '#go', buttons: 'button', submitText: 'order' }, 'x', CLICK_DENY_SOURCE), false);
  assert.equal(n, 0);
});

test('read: fields by label, selector and regex; all matches of a selector', () => {
  page(`${LIST}${CARD}`);
  const r = planRead({
    page: page0, all: '.order-item-title',
    fields: { code: { label: 'Code:' }, pin: { label: 'PIN:' }, counter: { selector: '#wdt-page-counter' }, seq: { regex: '(\\d+) of \\d+' }, none: { selector: '#none' } },
  });
  assert.deepEqual(r.fields, { code: 'FAKE-CODE-1', pin: 'FAKE1', counter: '1 of 3', seq: '1', none: null });
  assert.deepEqual(r.all, ['Fakemart eGift $25.00']);
});
