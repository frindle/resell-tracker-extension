import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import {
  classifyAmazonUrl, cleanDocumentHtml, isBlockedPage, hashString, isDuplicate, markSeen,
  enqueue, summarizeResult, type QueueItem,
} from '../src/lib/amazonCapture.ts';

const doc = (html: string) => parseHTML(html).document as unknown as Document;

test('classifyAmazonUrl accepts order, detail and tracking pages only', () => {
  assert.equal(classifyAmazonUrl('https://www.amazon.com/your-orders/orders?timeFilter=year-2026'), 'orders');
  assert.equal(classifyAmazonUrl('https://www.amazon.com/gp/css/order-history'), 'orders');
  assert.equal(classifyAmazonUrl('https://www.amazon.com/gp/your-account/order-details?orderID=111-0000000-0000000'), 'detail');
  assert.equal(classifyAmazonUrl('https://www.amazon.com/your-orders/order-details?orderID=x'), 'detail');
  assert.equal(classifyAmazonUrl('https://www.amazon.com/progress-tracker/package?orderId=x'), 'tracking');
  assert.equal(classifyAmazonUrl('https://www.amazon.com/gp/your-account/ship-track?orderId=x'), 'tracking');
  assert.equal(classifyAmazonUrl('https://www.amazon.com/gp/your-account/order-details/ref=ppx_yo_dt_b_order_details?orderID=x'), 'detail');
  assert.equal(classifyAmazonUrl('https://www.amazon.com/gp/css/order-details?orderID=x'), 'detail');
  assert.equal(classifyAmazonUrl('https://www.amazon.com/your-orders/orders/ref=nav_orders_first'), 'orders');
  assert.equal(classifyAmazonUrl('https://www.amazon.com/progress-tracker/package/ref=ppx_yo_dt_b_track_package?orderId=x'), 'tracking');
  assert.equal(classifyAmazonUrl('https://www.amazon.com/ref=nav_logo'), null);
  assert.equal(classifyAmazonUrl('https://www.amazon.com/ap/signin'), null);
  assert.equal(classifyAmazonUrl('https://www.amazon.com/dp/B000000000'), null);
  assert.equal(classifyAmazonUrl('https://evil.example/your-orders/orders'), null);
  assert.equal(classifyAmazonUrl('http://www.amazon.com/your-orders/orders'), null);
  assert.equal(classifyAmazonUrl('not a url'), null);
});

test('cleaner drops scripts, styles, svg, noscript, event attrs and data URIs', () => {
  const d = doc(`<html><head><style>a{}</style><script>var x=1</script></head><body>
    <div onclick="evil()" id="keep" data-x="data:text/plain;base64,AAAA">Order <b>placed</b></div>
    <img src="data:image/png;base64,AAAA" alt="pic"><img src="https://m.media-amazon.com/x.jpg" alt="ok">
    <svg><path d="M0"/></svg><noscript>no js</noscript>
    <input type="hidden" name="csrf" value="secret"><div id="shipToData-1">hidden blob</div>
    <span class="pt-delivery-card-trackingId">Tracking ID: TBA000000000000</span></body></html>`);
  const out = cleanDocumentHtml(d);
  assert.ok(!/<script|<style|<svg|<noscript/i.test(out));
  assert.ok(!/onclick/i.test(out));
  assert.ok(!/data:image|data:text/i.test(out));
  assert.ok(!/csrf|secret|hidden blob/.test(out));
  assert.ok(out.includes('pt-delivery-card-trackingId') && out.includes('TBA000000000000'));
  assert.ok(out.includes('https://m.media-amazon.com/x.jpg'));
  // the live document is untouched
  assert.ok(d.querySelector('script'));
});

test('isBlockedPage detects sign-in, captcha and agent block; passes normal pages', () => {
  assert.equal(isBlockedPage(doc('<body><form name="signIn"><input id="ap_email"></form></body>')), true);
  assert.equal(isBlockedPage(doc('<body><form action="/errors/validateCaptcha"></form></body>')), true);
  assert.equal(isBlockedPage(doc('<body><p>This activity violates Amazon\'s Conditions of Use: unauthorized AI agent</p></body>')), true);
  assert.equal(isBlockedPage(doc('<body><div class="order-card">Order placed</div></body>')), false);
  // The nav's hidden account-flyout form is on every signed-in page.
  const nav = '<header id="navbar"><form id="ap_navbar_form" name="signIn" style="display:none"></form></header>';
  assert.equal(isBlockedPage(doc(`<body>${nav}<div class="order-card">Order placed</div></body>`)), false);
  assert.equal(isBlockedPage(doc(`<body>${nav}<form name="signIn"><input id="ap_email"></form></body>`)), true);
  assert.equal(isBlockedPage(doc(`<body>${nav}<input type="password" name="password"></body>`)), true);
});

test('dedupe within 10 minutes, expires after', () => {
  const h = hashString('<p>page</p>');
  assert.equal(h, hashString('<p>page</p>'));
  assert.notEqual(h, hashString('<p>page2</p>'));
  let seen = markSeen({}, h, 1000);
  assert.equal(isDuplicate(seen, h, 1000 + 9 * 60 * 1000), true);
  assert.equal(isDuplicate(seen, h, 1000 + 10 * 60 * 1000), false);
  seen = markSeen(seen, 'other', 1000 + 11 * 60 * 1000);
  assert.ok(!(h in seen), 'expired entries are pruned');
});

test('retry queue is bounded by entries and bytes and replaces same hash', () => {
  const mk = (n: number, size = 10): QueueItem => ({ url: 'u', kind: 'orders', html: 'x'.repeat(size), hash: 'h' + n, capturedAt: n, attempts: 0 });
  let q: QueueItem[] = [];
  for (let i = 0; i < 30; i++) q = enqueue(q, mk(i));
  assert.equal(q.length, 20);
  assert.equal(q[0].hash, 'h10');
  q = enqueue(q, mk(25));
  assert.equal(q.length, 20);
  assert.equal(q[q.length - 1].hash, 'h25');
  let big: QueueItem[] = [];
  for (let i = 0; i < 5; i++) big = enqueue(big, mk(i, 2_000_000), 20, 6_000_000);
  assert.equal(big.length, 3);
});

test('summarizeResult', () => {
  assert.equal(summarizeResult({ created: 2, updated: 1, unchanged: 0, discrepancies: 1, mode: 'apply' }), '2 new, 1 updated, 1 needs review');
  assert.match(summarizeResult({ created: 1, mode: 'compare' }), /would create.*compare only/);
  assert.match(summarizeResult({ blocked: true }), /ignored/);
});

import { unwrapPageResponse as _unwrap } from '../src/lib/amazonCapture.ts';
test('unwrapPageResponse reads counts and list from the tracker { ok, result } envelope', () => {
  const r = _unwrap({ ok: true, result: { created: 2, mode: 'compare', list: { nextUrl: null, needs: [{ orderNumber: 'A' }] } } }) as any;
  assert.equal(r.created, 2);
  assert.equal(r.list.needs.length, 1);
  assert.deepEqual(_unwrap(null), {});
});
