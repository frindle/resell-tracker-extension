import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNewerVersion } from '../src/lib/version.ts';

test('a newer tag is an update', () => {
  assert.equal(isNewerVersion('1.3.3', '1.3.2'), true);
  assert.equal(isNewerVersion('v1.4.0', '1.3.9'), true);
  assert.equal(isNewerVersion('1.10.0', '1.9.0'), true);
});

test('an older or equal tag is not', () => {
  assert.equal(isNewerVersion('1.3.1', '1.3.2'), false);
  assert.equal(isNewerVersion('1.3.2', '1.3.2'), false);
  assert.equal(isNewerVersion('1.3', '1.3.0'), false);
});
