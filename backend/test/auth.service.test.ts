import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthService } from '../src/modules/auth/auth.service.js';

function createConfigService(overrides: Record<string, unknown> = {}) {
  return {
    get(key: string) {
      return overrides[key];
    }
  };
}

test('AuthService.register queues registrations when queue mode is enabled', async () => {
  let enqueued: any = null;
  const prisma = {
    user: {
      async findFirst() {
        return null;
      }
    },
    backgroundJob: {
      async findUnique() {
        return null;
      }
    }
  };
  const jobsService = {
    async enqueue(input: any) {
      enqueued = input;
      return {
        id: 'job-reg-1',
        queue: 'auth',
        type: 'AUTH_REGISTER',
        status: 'PENDING'
      };
    }
  };

  const service = new AuthService(
    prisma as any,
    {} as any,
    createConfigService({
      'auth.registerQueueEnabled': true,
      'jobs.workerEnabled': true,
      'auth.registrationQueueSecret': 'queue-secret',
      'auth.registrationPollAfterMs': 750
    }) as any,
    jobsService as any
  );

  const result = await service.register({
    name: 'Seller One',
    email: 'Seller@One.test',
    password: 'Password123!',
    role: 'SELLER',
    roles: ['SELLER'],
    sellerKind: 'SELLER'
  });

  assert.equal(enqueued.queue, 'auth');
  assert.equal(enqueued.type, 'AUTH_REGISTER');
  assert.equal(enqueued.dedupeKey, 'auth:register:seller@one.test');
  assert.equal(typeof enqueued.payload.encryptedPassword, 'string');
  assert.equal(enqueued.payload.password, undefined);
  assert.equal(result.registrationQueued, true);
  assert.equal(result.requestId, 'job-reg-1');
  assert.equal(result.status, 'PENDING');
  assert.equal(result.pollAfterMs, 750);
});

test('AuthService.registrationStatus maps completed auth jobs to ready-to-login state', async () => {
  const jobsService = {
    async get() {
      return {
        id: 'job-reg-2',
        queue: 'auth',
        type: 'AUTH_REGISTER',
        status: 'COMPLETED',
        lastError: null
      };
    }
  };

  const service = new AuthService(
    {} as any,
    {} as any,
    createConfigService({
      'auth.registrationPollAfterMs': 1200
    }) as any,
    jobsService as any
  );

  const result = await service.registrationStatus('job-reg-2');

  assert.equal(result.registrationQueued, true);
  assert.equal(result.status, 'READY');
  assert.equal(result.readyToLogin, true);
  assert.equal(result.failed, false);
  assert.equal(result.pollAfterMs, 1200);
});
