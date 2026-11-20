import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extensionBrowser } from '../src/lib/browserTarget.ts';

test('Chromium extensions (Chrome, Brave, Edge) report chrome', () => {
  assert.equal(extensionBrowser('chrome-extension://nddnclgkigjiennpndnpjckmhcpflpcd/'), 'chrome');
});

test('Firefox reports firefox', () => {
  assert.equal(extensionBrowser('moz-extension://0b6f3c1e-1111-4222-8333-944455556666/'), 'firefox');
});

test('a global browser object does not decide it (Brave defines one)', () => {
  const g = globalThis as Record<string, unknown>;
  g.browser = { runtime: {} };
  try {
    assert.equal(extensionBrowser('chrome-extension://abc/'), 'chrome');
  } finally {
    delete g.browser;
  }
});
