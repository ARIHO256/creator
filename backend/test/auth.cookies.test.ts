import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCookieHeader } from '../src/modules/auth/auth.cookies.js';

test('parseCookieHeader decodes valid cookie values', () => {
  assert.deepEqual(parseCookieHeader('name=hello%20world; token=abc123'), {
    name: 'hello world',
    token: 'abc123'
  });
});

test('parseCookieHeader preserves malformed cookie values instead of throwing', () => {
  assert.deepEqual(parseCookieHeader('broken=%; token=abc123'), {
    broken: '%',
    token: 'abc123'
  });
});
