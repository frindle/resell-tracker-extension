import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scrubUrl } from '../src/lib/scrubLink.ts';
import { GROUP_SITES, buildGoUrl, destinationFor, isOutboundDealLink, siteForHost, isGroupEnabled } from '../src/lib/groupLinks.ts';

const bfmr = GROUP_SITES[0];

test('scrubUrl strips tracking params and canonicalises retailers', () => {
  assert.equal(scrubUrl('https://www.amazon.com/Some-Thing/dp/B012345678?tag=x-20&ref=abc'), 'https://www.amazon.com/dp/B012345678');
  assert.equal(scrubUrl('https://walmart.com/ip/123?wmlspartner=1'), 'https://www.walmart.com/ip/123');
  assert.equal(scrubUrl('https://shop.example.com/p?id=7&utm_source=a&clickid=9'), 'https://shop.example.com/p?id=7');
});

test('scrubUrl unwraps redirector destination params', () => {
  assert.equal(scrubUrl('https://ftc.cash/go?url=' + encodeURIComponent('https://www.bestbuy.com/site/x/1.p?ranMID=1')), 'https://www.bestbuy.com/site/x/1.p');
  assert.equal(scrubUrl('https://redir.example/x?dest=' + encodeURIComponent('https://shop.example.com/a?utm_id=1&k=2')), 'https://shop.example.com/a?k=2');
});

test('scrubUrl rejects non-http', () => {
  assert.equal(scrubUrl('javascript:alert(1)'), null);
  assert.equal(scrubUrl('not a url'), null);
});

test('isOutboundDealLink', () => {
  assert.equal(isOutboundDealLink('https://www.amazon.com/dp/B012345678?tag=z', bfmr), true);
  assert.equal(isOutboundDealLink('https://ftc.cash/go?url=x', bfmr), true);
  assert.equal(isOutboundDealLink('https://www.bfmr.com/deals/1', bfmr), false);
  assert.equal(isOutboundDealLink('https://api.bfmr.com/x', bfmr), false);
  assert.equal(isOutboundDealLink('https://notbfmr.com/x', bfmr), true);
  assert.equal(isOutboundDealLink('https://www.buyinggroup.com/x', bfmr), false);
  assert.equal(isOutboundDealLink('https://discord.gg/abc', bfmr), false);
  assert.equal(isOutboundDealLink('mailto:a@b.com', bfmr), false);
  assert.equal(isOutboundDealLink('https://tracker.lan/go', bfmr, 'tracker.lan'), false);
});

test('apple and google store product links are intercepted', () => {
  assert.equal(isOutboundDealLink('https://www.apple.com/shop/buy-iphone/iphone-16', bfmr), true);
  assert.equal(isOutboundDealLink('https://store.google.com/product/pixel_9', bfmr), true);
});

test('same-site redirect wrapping a retailer URL is intercepted, original href kept', () => {
  const wrapped = 'https://www.bfmr.com/out?url=' + encodeURIComponent('https://www.bestbuy.com/site/x/1.p');
  assert.equal(isOutboundDealLink(wrapped, bfmr), true);
  assert.equal(destinationFor(wrapped, 'bfmr', { trackerUrl: 'http://t.lan', extensionSecret: 's' }),
    'http://t.lan/go?url=' + encodeURIComponent(wrapped) + '&src=bfmr');
});

test('same-site links with no dest, a same-site dest, or a non-http dest are left alone', () => {
  assert.equal(isOutboundDealLink('https://www.bfmr.com/deals?page=2', bfmr), false);
  assert.equal(isOutboundDealLink('https://www.bfmr.com/out?url=' + encodeURIComponent('https://www.bfmr.com/deals/1'), bfmr), false);
  assert.equal(isOutboundDealLink('https://www.bfmr.com/out?url=' + encodeURIComponent('https://discord.gg/x'), bfmr), false);
  assert.equal(isOutboundDealLink('https://www.bfmr.com/out?url=javascript:alert(1)', bfmr), false);
});

test('siteForHost', () => {
  assert.equal(siteForHost('www.bigskybuyers.com')?.key, 'bigsky');
  assert.equal(siteForHost('thecashoutkings.com')?.key, 'cok');
  assert.equal(siteForHost('evilbfmr.com'), null);
});

test('buildGoUrl encodes the original href and source', () => {
  assert.equal(buildGoUrl('http://t.lan:3000/', 'https://a.com/p?x=1&y=2', 'bg'),
    'http://t.lan:3000/go?url=https%3A%2F%2Fa.com%2Fp%3Fx%3D1%26y%3D2&src=bg');
});

test('destinationFor uses /go when paired, a scrubbed link otherwise', () => {
  const href = 'https://shop.example.com/p?utm_source=q&id=1';
  assert.match(destinationFor(href, 'bfmr', { trackerUrl: 'http://t.lan', extensionSecret: 's' }), /^http:\/\/t\.lan\/go\?url=/);
  assert.equal(destinationFor(href, 'bfmr', { trackerUrl: 'http://t.lan', extensionSecret: '' }), 'https://shop.example.com/p?id=1');
  assert.equal(destinationFor(href, 'bfmr', {}), 'https://shop.example.com/p?id=1');
});

test('sites default off', () => {
  assert.equal(isGroupEnabled(undefined, 'cok'), false);
  assert.equal(isGroupEnabled({ bfmr: true }, 'bfmr'), true);
});
