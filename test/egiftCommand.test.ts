import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseEgiftPayload, isAllowedEgiftLink, parseEgiftInfo, parseCardText, readCard, egiftPostBody, egiftReport, parseCardTitle, titleFor,
} from '../src/lib/egiftCommand.ts';

const LINK = 'https://www.memberedelivery.com/redeem?login=abc123';
const EMAIL = 'buyer@example.com';

test('payload: positive integer order id for this user', () => {
  assert.deepEqual(parseEgiftPayload(JSON.stringify({ orderId: 7 }), '1'), { orderId: 7 });
  assert.deepEqual(parseEgiftPayload(JSON.stringify({ orderId: 7, userId: 1 }), '1'), { orderId: 7 });
  assert.ok('error' in parseEgiftPayload(JSON.stringify({ orderId: 7, userId: 2 }), '1'));
  for (const bad of [{ orderId: 0 }, { orderId: -1 }, { orderId: 1.5 }, { orderId: 'x' }, { orderId: null }, { orderId: true }, {}]) {
    assert.ok('error' in parseEgiftPayload(JSON.stringify(bad), '1'), JSON.stringify(bad));
  }
  assert.ok('error' in parseEgiftPayload('{', '1'));
  assert.ok('error' in parseEgiftPayload(null, '1'));
});

test('link allow-list: https, exact host, no credentials, login token', () => {
  assert.equal(isAllowedEgiftLink(LINK), true);
  assert.equal(isAllowedEgiftLink('http://www.memberedelivery.com/r?login=a'), false);
  assert.equal(isAllowedEgiftLink('https://memberedelivery.com/r?login=a'), false);
  assert.equal(isAllowedEgiftLink('https://www.memberedelivery.com.example.com/r?login=a'), false);
  assert.equal(isAllowedEgiftLink('https://user:pw@www.memberedelivery.com/r?login=a'), false);
  assert.equal(isAllowedEgiftLink('https://www.memberedelivery.com/r'), false);
  assert.equal(isAllowedEgiftLink('https://specialtyegc.bestbuy.com/r?login=a'), false);
  assert.equal(isAllowedEgiftLink(null), false);
  assert.equal(isAllowedEgiftLink('nope'), false);
});

test('GET reply needs both link and email', () => {
  assert.deepEqual(parseEgiftInfo({ link: LINK, email: ` ${EMAIL} ` }), { link: LINK, email: EMAIL });
  assert.equal(parseEgiftInfo({ link: null, email: EMAIL }), null);
  assert.equal(parseEgiftInfo({ link: LINK, email: '' }), null);
  assert.equal(parseEgiftInfo(null), null);
});

test('card text: code, pin, amount, position', () => {
  assert.deepEqual(parseCardText('Costco $50.00 eGift\nCard 2 of 3\nCode: 0000-0000-0000\nPIN: 1234'),
    { index: 2, total: 3, code: '0000-0000-0000', pin: '1234', value: 50 });
  assert.deepEqual(parseCardText('Code: 0000000000'), { index: 1, total: 1, code: '0000000000', pin: null, value: null });
  assert.equal(parseCardText('Access eGift'), null);
});

// Mirrors the server: parseEgiftCard (lib/egiftScrape.ts) and the route's orderId check.
function serverAccepts(body: Record<string, unknown>): boolean {
  const orderId = Number(body.orderId);
  if (!Number.isInteger(orderId) || orderId <= 0) return false;
  const num = typeof body.cardNumber === 'string' ? body.cardNumber.replace(/\s+/g, '').slice(0, 64) : '';
  return num.length >= 4;
}

test('POST body has the shape the server validates', () => {
  const card = parseCardText('Code: 0000-0000-0000\nPIN: 1234\n$25.00')!;
  const body = egiftPostBody(9, card);
  assert.deepEqual(body, { orderId: 9, cardNumber: '0000-0000-0000', pin: '1234', value: 25 });
  assert.equal(serverAccepts(body), true);
  const bare = egiftPostBody(9, parseCardText('Code: 0000000000')!);
  assert.deepEqual(bare, { orderId: 9, cardNumber: '0000000000' });
  assert.equal(typeof (body as { value: unknown }).value, 'number');
});

test('report is counts only, never card data, email or link', () => {
  const ok = egiftReport(2, 2, null);
  assert.deepEqual(ok, { status: 'done', result: { cards: 2, saved: 2 } });
  const bad = [egiftReport(2, 1, 'save-failed'), egiftReport(0, 0, 'link-rejected'), egiftReport(0, 0, null), egiftReport(1, 1, 'ended-early')];
  assert.deepEqual(bad.map(r => r.status), ['failed', 'failed', 'failed', 'failed']);
  const all = JSON.stringify([ok, ...bad]);
  for (const secret of ['0000', EMAIL, 'example.com', 'memberedelivery', 'abc123', '1234']) assert.ok(!all.includes(secret), secret);
});

test('a thrown error becomes a fixed step code, never the error text', async () => {
  const { egiftErrorCode } = await import('../src/lib/egiftCommand.ts');
  const secret = `Cannot access contents of url "${LINK}". Extension manifest must request permission to access this host.`;
  assert.equal(egiftErrorCode('email', new Error(secret)), 'error-email-permission');
  assert.equal(egiftErrorCode('page', new Error('Cannot access contents of url "chrome-error://chromewebdata/".')), 'error-page-error-page');
  assert.equal(egiftErrorCode('open', new Error('No tab with id: 12.')), 'error-open-tab-gone');
  assert.equal(egiftErrorCode('next', new Error('Frame with ID 0 was removed.')), 'error-next-navigated');
  assert.equal(egiftErrorCode('info', new TypeError('Failed to fetch')), 'error-info-network');
  assert.equal(egiftErrorCode('tab', new Error('something else')), 'error-tab');
  assert.equal(egiftErrorCode('tab', undefined), 'error-tab');
  const r = egiftReport(0, 0, egiftErrorCode('email', new Error(secret)));
  assert.ok(!JSON.stringify(r).includes('memberedelivery'));
  assert.deepEqual(egiftReport(0, 0, 'info-http-401').result, { cards: 0, saved: 0, error: 'info-http-401' });
});

test('card from the page: labelled cell and pager win over the text, junk cells fall back', () => {
  const text = 'Card 1 of 9\nCode: 9999999999\n$50.00';
  assert.deepEqual(readCard({ text, code: ' 1111 2222 ', counter: '3 of 4' }),
    { index: 3, total: 4, code: '1111 2222', pin: null, value: 50 });
  assert.equal(readCard({ text, code: 'x' })!.code, '9999999999');
  assert.equal(readCard({ text: 'nothing here', code: null }), null);
  assert.equal(readCard({ text: '', code: 'ABCD-1234', pin: '77' })!.pin, '77');
});

test('report says how the card page opened, still no card data', () => {
  assert.deepEqual(egiftReport(1, 1, null, 'kept-in-tab'), { status: 'done', result: { cards: 1, saved: 1, opened: 'kept-in-tab' } });
  assert.deepEqual(egiftReport(0, 0, 'bot-check'), { status: 'failed', result: { cards: 0, saved: 0, error: 'bot-check' } });
});

test('card titles: brand and value from "Brand $25" and its variants; nothing without both', () => {
  assert.deepEqual(parseCardTitle('StubHub $100'), { merchant: 'StubHub', value: 100 });
  assert.deepEqual(parseCardTitle('Brand eGift $25.00'), { merchant: 'Brand', value: 25 });
  assert.deepEqual(parseCardTitle('Two Word Brand e-Gift Card - $1,000'), { merchant: 'Two Word Brand', value: 1000 });
  assert.deepEqual(parseCardTitle('$50 Brand eGift Card'), { merchant: 'Brand', value: 50 });
  assert.deepEqual(parseCardTitle('Brand $100 (2 x $50)'), { merchant: 'Brand', value: 100 });
  assert.equal(parseCardTitle('eGift $25'), null);
  assert.equal(parseCardTitle('Brand eGift'), null);
  assert.equal(parseCardTitle('Brand $0'), null);
  assert.equal(parseCardTitle(''), null);
  assert.deepEqual(parseCardTitle('Brand $25', /\$\s?(\d+)/g), { merchant: 'Brand', value: 25 });
});

test('titleFor: by position when there is one title per card, else the title they all share', () => {
  assert.deepEqual(titleFor(['A $25', 'B $50'], 2, 2), { merchant: 'B', value: 50 });
  assert.deepEqual(titleFor(['A $25'], 3, 4), { merchant: 'A', value: 25 });
  assert.deepEqual(titleFor(['A $25', 'a $25'], 3, 4), { merchant: 'A', value: 25 });
  assert.equal(titleFor(['A $25', 'B $50'], 1, 3), null);
  assert.equal(titleFor(['A $25', 'no amount'], 1, 3), null);
  assert.equal(titleFor([], 1, 1), null);
  assert.equal(titleFor(['no amount', 'B $50'], 1, 2), null);
});

test('post body: a title supplies merchant and value; the photo rides along', () => {
  const card = parseCardText('Code: 0000000000 PIN: 1234 $10.00')!;
  assert.deepEqual(egiftPostBody(9, card, { title: { merchant: 'Brand', value: 25 }, image: 'QUJD' }),
    { orderId: 9, cardNumber: '0000000000', pin: '1234', merchant: 'Brand', value: 25, image: 'QUJD' });
  assert.deepEqual(egiftPostBody(9, card, { title: null, image: null }), { orderId: 9, cardNumber: '0000000000', pin: '1234', value: 10 });
});

test('report: photo and naming counts ride with the result, never a code', () => {
  const r = egiftReport(2, 2, null, 'new-tab', { images: 2, named: 2, mismatched: 0 });
  assert.deepEqual(r, { status: 'done', result: { cards: 2, saved: 2, opened: 'new-tab', images: 2, named: 2, mismatched: 0 } });
});

test('payload: runner plan and dryRun', () => {
  assert.deepEqual(parseEgiftPayload(JSON.stringify({ orderId: 7, runner: 'plan' }), '1'), { orderId: 7, runner: 'plan' });
  assert.deepEqual(parseEgiftPayload(JSON.stringify({ orderId: 7, runner: 'plan', dryRun: true }), '1'), { orderId: 7, runner: 'plan', dryRun: true });
  assert.deepEqual(parseEgiftPayload(JSON.stringify({ orderId: 7, runner: 'plan', dryRun: false }), '1'), { orderId: 7, runner: 'plan' });
  assert.deepEqual(parseEgiftPayload(JSON.stringify({ orderId: 7, runner: 'builtin' }), '1'), { orderId: 7 });
  assert.ok('error' in parseEgiftPayload(JSON.stringify({ orderId: 7, dryRun: true }), '1'));
  assert.ok('error' in parseEgiftPayload(JSON.stringify({ orderId: 7, runner: 'builtin', dryRun: true }), '1'));
  assert.ok('error' in parseEgiftPayload(JSON.stringify({ orderId: 7, runner: 'other' }), '1'));
  assert.ok('error' in parseEgiftPayload(JSON.stringify({ orderId: 7, runner: 'plan', dryRun: 'yes' }), '1'));
});
