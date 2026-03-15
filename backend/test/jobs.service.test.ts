import assert from 'node:assert/strict';
import test from 'node:test';
import { JobsService } from '../src/modules/jobs/jobs.service.js';

test('JobsService.fetchAndLockNext atomically claims the next pending job', async () => {
  const rawResponses = [[{ id: 'job-1', attempts: 2 }]];
  const executeCalls: any[] = [];
  const prisma = {
    async $transaction(callback: (tx: any) => Promise<any>) {
      const tx = {
        async $queryRaw() {
          return rawResponses.shift() ?? [];
        },
        async $executeRaw(query: any) {
          executeCalls.push(query);
          return 1;
        },
        backgroundJob: {
          async findMany() {
            return [{
              id: 'job-1',
              status: 'PROCESSING',
              attempts: 3,
              lockedBy: 'worker-a',
              lockedAt: new Date(),
              runAfter: new Date()
            }];
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
  assert.equal(executeCalls.length, 1);
  assert.equal(job.status, 'PROCESSING');
  assert.equal(job.attempts, 3);
  assert.equal(job.lockedBy, 'worker-a');
  assert.ok(job.lockedAt instanceof Date);
});

test('JobsService.fetchAndLockNext reclaims stale processing jobs under the same lock flow', async () => {
  const rawResponses = [[], [{ id: 'job-stale', attempts: 1 }]];
  const executeCalls: any[] = [];
  const prisma = {
    async $transaction(callback: (tx: any) => Promise<any>) {
      const tx = {
        async $queryRaw() {
          return rawResponses.shift() ?? [];
        },
        async $executeRaw(query: any) {
          executeCalls.push(query);
          return 1;
        },
        backgroundJob: {
          async findMany() {
            return [{
              id: 'job-stale',
              status: 'PROCESSING',
              attempts: 2,
              lockedBy: 'worker-b',
              lockedAt: new Date(),
              runAfter: new Date()
            }];
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
  assert.equal(executeCalls.length, 1);
  assert.equal(job.status, 'PROCESSING');
  assert.equal(job.attempts, 2);
  assert.equal(job.lockedBy, 'worker-b');
  assert.ok(job.lockedAt instanceof Date);
  assert.ok(job.runAfter instanceof Date);
});

test('JobsService.fetchAndLockNext returns null when no pending or stale jobs are available', async () => {
  const prisma = {
    async $transaction(callback: (tx: any) => Promise<any>) {
      const tx = {
        async $queryRaw() {
          return [];
        },
        async $executeRaw() {
          throw new Error('execute should not be called');
        },
        backgroundJob: {
          async findMany() {
            throw new Error('findMany should not be called');
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

test('JobsService.fetchAndLockBatch honors queue filters and preserves order', async () => {
  const rawResponses = [[
    { id: 'job-2', attempts: 0 },
    { id: 'job-3', attempts: 4 }
  ]];
  let findManyWhere: any = null;
  const prisma = {
    async $transaction(callback: (tx: any) => Promise<any>) {
      const tx = {
        async $queryRaw() {
          return rawResponses.shift() ?? [];
        },
        async $executeRaw() {
          return 2;
        },
        backgroundJob: {
          async findMany(args: any) {
            findManyWhere = args.where;
            return [
              { id: 'job-3', queue: 'moderation' },
              { id: 'job-2', queue: 'realtime' }
            ];
          }
        }
      };
      return callback(tx);
    }
  };

  const service = new JobsService(prisma as any, { get() { return undefined; } } as any);
  const jobs = await service.fetchAndLockBatch('worker-d', 60_000, 2, ['moderation', 'realtime']);

  assert.deepEqual(findManyWhere, { id: { in: ['job-2', 'job-3'] } });
  assert.deepEqual(jobs.map((job) => job.id), ['job-2', 'job-3']);
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
