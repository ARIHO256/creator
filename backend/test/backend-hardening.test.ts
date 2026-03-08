import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import appConfig from '../src/config/app.config.js';

test('appConfig exposes rate-limit and upload hardening defaults', () => {
  const config = appConfig();

  assert.equal(config.rateLimit.defaultLimit, 120);
  assert.equal(config.rateLimit.defaultWindowMs, 60_000);
  assert.equal(config.rateLimit.authLimit, 12);
  assert.equal(config.upload.defaultProvider, 'LOCAL');
  assert.equal(config.upload.sessionTtlMinutes, 20);
});

test('world-class hardening migration creates upload session table', async () => {
  const sql = await readFile(
    new URL('../prisma/migrations/202603080004_world_class_backend_hardening/migration.sql', import.meta.url),
    'utf8'
  );

  assert.match(sql, /CREATE TABLE `UploadSession`/);
  assert.match(sql, /FOREIGN KEY \(`userId`\) REFERENCES `User`/);
});
