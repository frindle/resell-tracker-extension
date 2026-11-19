import { test } from 'node:test';
import assert from 'node:assert/strict';
import { originsFor, requestGrant, missingOrigins, type PermsApi } from '../src/lib/access.ts';

function fakePerms(granted: Set<string>, grantOnRequest: boolean, log: string[]): PermsApi {
  return {
    contains: async ({ origins }) => { log.push('contains'); return origins.every(o => granted.has(o)); },
    request: ({ origins }) => { log.push('request'); if (grantOnRequest) origins.forEach(o => granted.add(o)); return Promise.resolve(grantOnRequest); },
  };
}

test('originsFor uses explicit http and https patterns, not a wildcard scheme', () => {
  assert.deepEqual(originsFor('tracker.example.test:3000'), ['https://www.amazon.com/*', 'http://tracker.example.test/*', 'https://tracker.example.test/*']);
  assert.deepEqual(originsFor(undefined), ['https://www.amazon.com/*']);
});

test('request is called synchronously, before any await or contains check', () => {
  const log: string[] = [];
  const perms = fakePerms(new Set(), true, log);
  void requestGrant(perms, ['https://www.amazon.com/*'], ['https://www.amazon.com/*']);
  assert.deepEqual(log, ['request']); // nothing else ran before request returned control
});

test('success is decided by contains(), even if request resolves false', async () => {
  const granted = new Set<string>();
  const perms: PermsApi = {
    contains: async ({ origins }) => origins.every(o => granted.has(o)),
    request: async ({ origins }) => { origins.forEach(o => granted.add(o)); return false; },
  };
  const r = await requestGrant(perms, ['https://a.test/*'], ['https://a.test/*']);
  assert.equal(r.ok, true);
});

test('denied grant reports Brave instructions; a throwing request is handled', async () => {
  const perms: PermsApi = { contains: async () => false, request: () => { throw new Error('no gesture'); } };
  const r = await requestGrant(perms, ['https://a.test/*'], ['https://a.test/*']);
  assert.equal(r.ok, false);
  assert.match(r.message, /Access was not granted/);
  assert.match(r.message, /brave:\/\/extensions/);
});

test('missingOrigins lists only origins not yet held', async () => {
  const perms = fakePerms(new Set(['https://www.amazon.com/*']), false, []);
  assert.deepEqual(await missingOrigins(perms, ['https://www.amazon.com/*', 'http://t.test/*']), ['http://t.test/*']);
});
