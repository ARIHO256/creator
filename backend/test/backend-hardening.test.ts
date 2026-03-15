import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import appConfig from '../src/config/app.config.js';
import { buildSecurityHeaders } from '../src/platform/security-headers.js';

test('appConfig exposes rate-limit and upload hardening defaults', () => {
  const config = appConfig();

  assert.equal(config.database.writeUrl, process.env.DATABASE_URL ?? '');
  assert.equal(config.database.readUrl, process.env.DATABASE_READ_URL ?? process.env.DATABASE_URL ?? '');
  assert.equal(config.database.queryBudgetMs, 75);
  assert.equal(config.rateLimit.disabled, false);
  assert.equal(config.rateLimit.defaultLimit, 120);
  assert.equal(config.rateLimit.defaultWindowMs, 60_000);
  assert.equal(config.rateLimit.authLimit, 12);
  assert.equal(config.upload.defaultProvider, 'LOCAL');
  assert.equal(config.upload.sessionTtlMinutes, 20);
  assert.equal(config.app.requestTimeoutMs, 15_000);
  assert.equal(config.app.keepAliveTimeoutMs, 72_000);
  assert.equal(config.app.maxRequestsPerSocket, 1000);
  assert.equal(config.jobs.defaultMaxAttempts, 5);
  assert.equal(config.security.enableHeaders, true);
  assert.equal(config.jobs.workerEnabled, true);
  assert.equal(config.jobs.workerPollMs, 2000);
  assert.equal(config.realtime.streamServerEnabled, true);
  assert.equal(config.realtime.subscriberEnabled, true);
  assert.equal(config.platform.trustProxy, true);
  assert.equal(config.cache.httpEnabled, true);
  assert.equal(config.cache.publicReadTtlMs, 60_000);
  assert.equal(config.cache.storefrontTtlMs, 120_000);
  assert.equal(config.cache.taxonomyTtlMs, 300_000);
  assert.equal(config.cache.redisTimeoutMs, 150);
  assert.equal(config.auth.registerQueueEnabled, true);
  assert.equal(config.auth.registrationPollAfterMs, 1000);
  assert.equal(config.telemetry.enabled, false);
});

test('world-class hardening migration creates upload session table', async () => {
  const sql = await readFile(
    new URL('../prisma/migrations/202603080004_world_class_backend_hardening/migration.sql', import.meta.url),
    'utf8'
  );

  assert.match(sql, /CREATE TABLE `UploadSession`/);
  assert.match(sql, /FOREIGN KEY \(`userId`\) REFERENCES `User`/);
});

test('operational hardening migration creates background job table', async () => {
  const sql = await readFile(
    new URL('../prisma/migrations/202603080005_operational_hardening_jobs/migration.sql', import.meta.url),
    'utf8'
  );

  assert.match(sql, /CREATE TABLE `BackgroundJob`/);
  assert.match(sql, /ENUM\('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD_LETTER', 'CANCELLED'\)/);
  assert.match(sql, /FOREIGN KEY \(`userId`\) REFERENCES `User`/);
});

test('security headers helper returns hardened defaults', () => {
  const headers = buildSecurityHeaders(true);

  assert.equal(headers['x-content-type-options'], 'nosniff');
  assert.equal(headers['x-frame-options'], 'DENY');
  assert.equal(headers['cross-origin-opener-policy'], 'same-origin');
  assert.equal(buildSecurityHeaders(false)['x-frame-options'], undefined);
});
