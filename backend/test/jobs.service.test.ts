import assert from 'node:assert/strict';
import test from 'node:test';
import { JobsService } from '../src/modules/jobs/jobs.service.js';

test('JobsService.fetchAndLockNext atomically claims the next pending job', async () => {
  const updates: any[] = [];
  const rawResponses = [[{ id: 'job-1', attempts: 2 }]];
  const prisma = {
    async $transaction(callback: (tx: any) => Promise<any>) {
      const tx = {
        async $queryRaw() {
          return rawResponses.shift() ?? [];
        },
        backgroundJob: {
          async update(args: any) {
            updates.push(args);
            return { id: args.where.id, ...args.data };
          }
        }
      };
      return callback(tx);
    }
  };
  const configService = { get() { return undefined; } };

  const service = new JobsService(prisma as any, configService as any);
  const job = await service.fetchAndLockNext('worker-a', 60_000);

  assert.equal(job.id, 'job-1');
  assert.equal(updates.length, 1);
  assert.equal(updates[0].data.status, 'PROCESSING');
  assert.equal(updates[0].data.attempts, 3);
  assert.equal(updates[0].data.lockedBy, 'worker-a');
  assert.ok(updates[0].data.lockedAt instanceof Date);
});

test('JobsService.fetchAndLockNext reclaims stale processing jobs under the same lock flow', async () => {
  const updates: any[] = [];
  const rawResponses = [[], [{ id: 'job-stale', attempts: 1 }]];
  const prisma = {
    async $transaction(callback: (tx: any) => Promise<any>) {
      const tx = {
        async $queryRaw() {
          return rawResponses.shift() ?? [];
        },
        backgroundJob: {
          async update(args: any) {
            updates.push(args);
            return { id: args.where.id, ...args.data };
          }
        }
      };
      return callback(tx);
    }
  };
  const configService = { get() { return undefined; } };

  const service = new JobsService(prisma as any, configService as any);
  const job = await service.fetchAndLockNext('worker-b', 60_000);

  assert.equal(job.id, 'job-stale');
  assert.equal(updates.length, 1);
  assert.equal(updates[0].data.status, 'PROCESSING');
  assert.equal(updates[0].data.attempts, 2);
  assert.equal(updates[0].data.lockedBy, 'worker-b');
  assert.ok(updates[0].data.lockedAt instanceof Date);
  assert.ok(updates[0].data.runAfter instanceof Date);
});

test('JobsService.fetchAndLockNext returns null when no pending or stale jobs are available', async () => {
  const prisma = {
    async $transaction(callback: (tx: any) => Promise<any>) {
      const tx = {
        async $queryRaw() {
          return [];
        },
        backgroundJob: {
          async update() {
            throw new Error('update should not be called');
          }
        }
      };
      return callback(tx);
    }
  };
  const configService = { get() { return undefined; } };

  const service = new JobsService(prisma as any, configService as any);
  const job = await service.fetchAndLockNext('worker-c', 60_000);

  assert.equal(job, null);
});

test('JobsService.markFailed requeues pending retries', async () => {
  let updated: any = null;
  const prisma = {
    backgroundJob: {
      async findUnique() {
        return { id: 'job-1', attempts: 1, maxAttempts: 3, runAfter: new Date() };
      },
      async update({ data }: any) {
        updated = data;
        return { id: 'job-1', ...data };
      }
    }
  };
  const configService = {
    get(key: string) {
      if (key === 'jobs.retryDelayMs') return 1000;
      return undefined;
    }
  };

  const service = new JobsService(prisma as any, configService as any);
  await service.markFailed('job-1', 'boom');

  assert.equal(updated.status, 'PENDING');
  assert.ok(updated.runAfter);
});
