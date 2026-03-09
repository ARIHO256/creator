import assert from 'node:assert/strict';
import test from 'node:test';
import { JobsService } from '../src/modules/jobs/jobs.service.js';

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
