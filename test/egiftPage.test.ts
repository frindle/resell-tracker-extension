// The page scripts against synthetic copies of the Costco eGift portal's pages (structure mapped
// 2026-10-05; every value here is made up), with the bundled scrape config.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { pageText, enterEmail, clickOpen, clickNext, cardRect, settings } from '../src/lib/egiftPage.ts';
import { readCard, titleFor } from '../src/lib/egiftCommand.ts';

const cfg = settings();

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

const FIND_ORDER = `
<form id="find-order-form">
  <label>E-mail</label><input type="text" id="p2" name="p2" placeholder="E-mail used at Costco">
  <button id="submitBtn" type="submit">View Digital Code</button>
  <div class="ui-message" role="alert"></div>
</form>`;

test('find-order page: the text email field (#p2) is found, filled and View Digital Code clicked', () => {
  const d = page(FIND_ORDER);
  const s = pageText(cfg.page);
  assert.equal(s.hasEmail, true);
  assert.equal(s.hasOpen, false);
  assert.equal(s.alert, false);
  assert.equal(s.botCheck, false);
  let clicked = '';
  d.getElementById('submitBtn')!.addEventListener('click', e => { clicked = (e.target as HTMLElement).id; e.preventDefault(); });
  assert.equal(enterEmail('buyer@example.com', cfg.submit), true);
  assert.equal((d.getElementById('p2') as HTMLInputElement).value, 'buyer@example.com');
  assert.equal(clicked, 'submitBtn');
});

test('the 1.4.1 email selector would not have matched the portal (the page-timeout cause)', () => {
  const d = page(FIND_ORDER);
  assert.equal(d.querySelector('input[type="email"], input[name*="email" i], input[id*="email" i]'), null);
});

test('a rejected address shows as an alert', () => {
  page(FIND_ORDER.replace('<div class="ui-message" role="alert"></div>', '<div class="ui-message" role="alert">Invalid e-mail address</div>'));
  assert.equal(pageText(cfg.page).alert, true);
});

const REDEMPTION = `
<form id="j_idt52">
  <section class="order-item"><div class="order-item-title">Brand $25</div><span>1 of 2</span>
    <div class="order-item-actions"><button type="button" id="send1">Send Gift</button><button type="button" id="open1">Access eGift</button></div></section>
  <section class="order-item"><div class="order-item-title">Brand $25</div><span>2 of 2</span>
    <div class="order-item-actions"><button type="button" id="send2">Send Gift</button><button type="button" id="open2">Access eGift</button></div></section>
</form>`;

test('redemption page: Access eGift is found and clicked, Send Gift never', () => {
  const d = page(REDEMPTION);
  const s = pageText(cfg.page);
  assert.equal(s.hasOpen, true);
  assert.equal(readCard(s, cfg.pats), null);
  const clicks: string[] = [];
  for (const b of Array.from(d.querySelectorAll('button'))) b.addEventListener('click', e => clicks.push((e.target as HTMLElement).id));
  assert.equal(clickOpen(cfg.page), true);
  assert.deepEqual(clicks, ['open1']);
});

const PRINT = (n: number, code: string) => `
<div class="wdt-pager"><span id="wdt-page-counter">${n} of 2</span>
  <input type="button" id="j_idt9:wdt-nav-prev" value="<"><input type="button" id="j_idt9:wdt-nav-next" value=">"></div>
<div id="print-content-section"><table id="body-canvas"><tr><td>Promo Code: SAVE10NOW</td></tr>
  <tr><td>Brand eGift $25.00</td></tr><tr><td>Code: <span>${code}</span></td></tr></table></div>
<button class="wdt-kebab-btn">...</button>`;

test('print page: the code comes from the "Code:" cell, the position from the pager counter', () => {
  page(PRINT(2, '1111 2222 3333 4444'));
  const s = pageText(cfg.page);
  assert.equal(s.counter, '2 of 2');
  assert.equal(s.hasNext, true);
  const c = readCard(s, cfg.pats);
  assert.deepEqual(c, { index: 2, total: 2, code: '1111 2222 3333 4444', pin: null, value: 25 });
});

test('print page: Next is the wdt-nav-next input', () => {
  const d = page(PRINT(1, 'ABCD-EFGH-1234'));
  let clicked = '';
  for (const el of Array.from(d.querySelectorAll('input'))) el.addEventListener('click', e => { clicked = (e.target as HTMLElement).id; });
  assert.equal(clickNext(cfg.page), true);
  assert.equal(clicked, 'j_idt9:wdt-nav-next');
});

test('a bot check page is recognised, so a timeout there reports bot-check', () => {
  page('<p>Request unsuccessful. Incapsula incident ID: 0-000000000</p>');
  assert.equal(pageText(cfg.page).botCheck, true);
  page('<iframe src="/_Incapsula_Resource?x=1"></iframe>');
  assert.equal(pageText(cfg.page).botCheck, true);
});

test('the bundled config carries every costcoEgift entry the run reads', () => {
  for (const k of ['emailInput', 'submitButton', 'nextButton', 'counter', 'labelCells', 'botCheck', 'alert', 'clickables']) {
    assert.ok((cfg.page as Record<string, string>)[k] || (cfg.submit as Record<string, string>)[k], k);
  }
  assert.ok(cfg.submit.emailInput.includes('#p2'));
  assert.ok(cfg.submit.submitButton.startsWith('#submitBtn'));
  assert.equal(cfg.newTabWaitMs, 10_000);
});

test('redemption page: one title per card, read for brand and value', () => {
  page(REDEMPTION);
  const s = pageText(cfg.page);
  assert.deepEqual(s.titles, ['Brand $25', 'Brand $25']);
  assert.deepEqual(titleFor(s.titles, 2, 2, cfg.pats.amount), { merchant: 'Brand', value: 25 });
  page(PRINT(1, '1111 2222 3333 4444'));
  assert.deepEqual(pageText(cfg.page).titles, []);
});

test('card photo: no card element, no clip (the photo falls back to the visible page)', () => {
  page('<div>nothing here</div>');
  assert.equal(cardRect(cfg.page.cardImage), null);
  assert.equal(cardRect('::bad selector'), null);
  assert.ok(cfg.page.cardImage.includes('#print-content-section'));
  assert.ok(cfg.page.itemTitle.includes('.order-item-title'));
});
