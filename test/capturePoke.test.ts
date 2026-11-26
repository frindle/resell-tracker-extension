import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPokeJudge, parsePokeReply, shouldForce, shouldForceAny, mayReadNow, isStaleOutcome, POKE_FORCE_MS, POKE_FORCE_ANY_MS, UNRECOGNISED_REPLIES } from '../src/lib/capturePoke.ts';

const r = (state: string, pageId = 'p1', path = '/gp/your-account/order-details') => ({ state, pageId, path });

test('parsePokeReply accepts only well-formed answers', () => {
  assert.deepEqual(parsePokeReply(r('busy')), { state: 'busy', pageId: 'p1', path: '/gp/your-account/order-details' });
  assert.equal(parsePokeReply(null), null);
  assert.equal(parsePokeReply(undefined), null);
  assert.equal(parsePokeReply({ state: 'weird', pageId: 'p1' }), null);
  assert.equal(parsePokeReply({ state: 'sent' }), null);
  assert.equal(parsePokeReply({ state: 'sent', pageId: '' }), null);
  assert.equal(parsePokeReply(r('sent', 'p1', '/x'.repeat(100)))!.path!.length, 80);
});

test('busy, sent and no answer keep the wait going, and say why', () => {
  const j = createPokeJudge();
  assert.equal(j.reply(undefined), null);
  assert.match(j.note(), /never answered/);
  assert.equal(j.reply(r('busy')), null);
  assert.match(j.note(), /still loading/);
  assert.equal(j.reply(r('sent')), null);
  assert.match(j.note(), /tracker did not answer/);
  assert.equal(j.pageId(), 'p1');
});

test('a page that is not an order page ends the wait only on its second answer', () => {
  const j = createPokeJudge();
  assert.equal(UNRECOGNISED_REPLIES, 2);
  assert.equal(j.reply(r('unrecognised', 'p1', '/ap/signin')), null);
  assert.deepEqual(j.reply(r('unrecognised', 'p1', '/ap/signin')), { kind: 'error', message: 'not an order page: /ap/signin' });
});

test('a redirect in between starts the count again', () => {
  const j = createPokeJudge();
  assert.equal(j.reply(r('unrecognised', 'p1', '/redirect')), null);
  assert.equal(j.reply(r('busy', 'p2')), null);
  assert.equal(j.reply(r('unrecognised', 'p3', '/other')), null);
  assert.equal(j.reply(r('busy', 'p3')), null);
  assert.equal(j.reply(r('unrecognised', 'p3', '/other')), null);
  assert.ok(j.reply(r('unrecognised', 'p3', '/other')));
});

test('answers from the page before this one are ignored', () => {
  const j = createPokeJudge('old');
  assert.equal(j.reply(r('unrecognised', 'old', '/x')), null);
  assert.equal(j.reply(r('unrecognised', 'old', '/x')), null);
  assert.equal(j.reply(r('unrecognised', 'old', '/x')), null);
  assert.equal(j.pageId(), null);
  assert.match(j.note(), /previous page/);
  assert.equal(j.reply(r('busy', 'new')), null);
  assert.equal(j.pageId(), 'new');
});

test('the page is told to send what it has only after the force time', () => {
  assert.equal(shouldForce(0), false);
  assert.equal(shouldForce(POKE_FORCE_MS - 1), false);
  assert.equal(shouldForce(POKE_FORCE_MS), true);
});

test('a page is read when settled, when loaded and told to, and half-loaded only as a last resort', () => {
  const at = (readyState: string, quietForMs: number, force = false, forceAny = false) => mayReadNow({ readyState, quietForMs, quietMs: 1500, force, forceAny });
  assert.equal(at('complete', 1500), true);
  assert.equal(at('complete', 200), false);
  assert.equal(at('complete', 200, true), true);
  // Still loading its parts: a forced ask is not enough, so a half-built page is not taken for the whole order.
  assert.equal(at('interactive', 5000), false);
  assert.equal(at('interactive', 5000, true), false);
  assert.equal(at('interactive', 0, true, true), true);
  assert.equal(at('loading', 5000, true, true), false);
  assert.equal(shouldForceAny(POKE_FORCE_ANY_MS - 1), false);
  assert.equal(shouldForceAny(POKE_FORCE_ANY_MS), true);
  assert.ok(POKE_FORCE_ANY_MS > POKE_FORCE_MS);
});

test('an outcome from the page before this one is stale; one with no page id is not', () => {
  assert.equal(isStaleOutcome('p1', 'p1'), true);
  assert.equal(isStaleOutcome('p2', 'p1'), false);
  assert.equal(isStaleOutcome(undefined, 'p1'), false);
  assert.equal(isStaleOutcome('', 'p1'), false);
  assert.equal(isStaleOutcome('p1', null), false);
});
