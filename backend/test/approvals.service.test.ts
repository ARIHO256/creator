import assert from 'node:assert/strict';
import test from 'node:test';
import { ApprovalsService } from '../src/modules/approvals/approvals.service.js';

test('ApprovalsService.create schedules SLA check', async () => {
  let createdPayload: any = null;
  const enqueuedJobs: any[] = [];
  const prisma = {
    marketApprovalRequest: {
      async create({ data }: any) {
        createdPayload = data;
        return { id: 'approval-1', ...data };
      }
    }
  };
  const configService = {
    get(key: string) {
      if (key === 'approvals.slaHours') return 1;
      if (key === 'approvals.reminderHours') return 0.5;
      return undefined;
    }
  };
  const jobsService = {
    async enqueue(input: any) {
      enqueuedJobs.push(input);
      return { id: 'job-1' };
    }
  };
  const service = new ApprovalsService(prisma as any, configService as any, jobsService as any);

  const result = await service.create('user-1', { entityType: 'listing', entityId: 'l-1' } as any);

  assert.ok(createdPayload.slaDueAt instanceof Date);
  assert.equal(createdPayload.slaStatus, 'ON_TIME');
  assert.equal(result.id, 'approval-1');
  const types = enqueuedJobs.map((job) => job.type);
  assert.ok(types.includes('MARKET_APPROVAL_SLA_CHECK'));
  assert.ok(types.includes('MARKET_APPROVAL_REMINDER'));
});
