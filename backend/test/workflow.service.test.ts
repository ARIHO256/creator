import assert from 'node:assert/strict';
import test from 'node:test';
import { WorkflowService } from '../src/modules/workflow/workflow.service.js';

function createWorkflowService(initialRecords?: Map<string, Record<string, unknown>>) {
  const workflowRecords = initialRecords ?? new Map<string, Record<string, unknown>>();
  const accountApprovals = new Map<string, Record<string, unknown>>();
  const screenStates = new Map<string, Record<string, unknown>>();
  const contentApprovals = new Map<string, Record<string, unknown>>();
  const makeKey = (userId: string, recordType: string, recordKey: string) => `${userId}:${recordType}:${recordKey}`;
  const prisma = {
    accountApproval: {
      async findUnique({ where }: any) {
        const payload = accountApprovals.get(where.userId);
        return payload ? { userId: where.userId, payload } : null;
      },
      async upsert({ where, update, create }: any) {
        const payload = accountApprovals.has(where.userId) ? update.payload : create.payload;
        accountApprovals.set(where.userId, payload);
        return { userId: where.userId, payload };
      }
    },
    workflowScreenState: {
      async findUnique({ where }: any) {
        const key = `${where.userId_key.userId}:${where.userId_key.key}`;
        const payload = screenStates.get(key);
        return payload ? { id: key, userId: where.userId_key.userId, key: where.userId_key.key, payload } : null;
      },
      async upsert({ where, update, create }: any) {
        const key = `${where.userId_key.userId}:${where.userId_key.key}`;
        const payload = screenStates.has(key) ? update.payload : create.payload;
        screenStates.set(key, payload);
        return { id: key, userId: where.userId_key.userId, key: where.userId_key.key, payload };
      }
    },
    contentApproval: {
      async findMany({ where }: any) {
        return Array.from(contentApprovals.entries())
          .filter(([key]) => key.startsWith(`${where.userId}:`))
          .map(([key, payload]) => ({
            id: key.split(':', 2)[1],
            userId: where.userId,
            payload
          }));
      },
      async findUnique({ where }: any) {
        const entry = Array.from(contentApprovals.entries()).find(([key]) => key.endsWith(`:${where.id}`));
        if (!entry) {
          return null;
        }
        const [key, payload] = entry;
        const [userId] = key.split(':');
        return { id: where.id, userId, payload };
      },
      async upsert({ where, update, create }: any) {
        const key = `${create.userId ?? update.userId}:` + where.id;
        const payload = contentApprovals.has(key) ? update.payload : create.payload;
        contentApprovals.set(key, payload);
        return { id: where.id, userId: create.userId ?? update.userId, payload };
      }
    },
    workflowRecord: {
      async findUnique({ where }: any) {
        const key = makeKey(where.userId_recordType_recordKey.userId, where.userId_recordType_recordKey.recordType, where.userId_recordType_recordKey.recordKey);
        const payload = workflowRecords.get(key);
        if (!payload) {
          return null;
        }
        return { id: key, payload };
      },
      async create({ data }: any) {
        const key = makeKey(data.userId, data.recordType, data.recordKey);
        workflowRecords.set(key, data.payload);
        return { id: key, payload: data.payload };
      },
      async update({ where, data }: any) {
        workflowRecords.set(where.id, data.payload);
        return { id: where.id, payload: data.payload };
      },
      async upsert({ where, update, create }: any) {
        const key = makeKey(where.userId_recordType_recordKey.userId, where.userId_recordType_recordKey.recordType, where.userId_recordType_recordKey.recordKey);
        const payload = workflowRecords.has(key) ? update.payload : create.payload;
        workflowRecords.set(key, payload);
        return { id: key, payload };
      },
      async findMany() {
        return [];
      }
    },
    user: {
      async findUnique() {
        return { role: 'SELLER' };
      }
    },
    systemContent: {
      async findUnique() {
        return null;
      }
    }
  };

  const config = { get() { return undefined; } };
  const jobs = {};
  const taxonomy = {};
  return {
    service: new WorkflowService(config as any, prisma as any, jobs as any, taxonomy as any),
    workflowRecords,
    accountApprovals,
    contentApprovals
  };
}

test('WorkflowService.patchContentApproval preserves existing payload fields', async () => {
  const key = 'user-1:content_approval:approval-1';
  const { service, contentApprovals } = createWorkflowService(
    new Map([
      [
        key,
        {
          status: 'pending',
          title: 'Initial review',
          reviewer: { id: 'rev-1', note: 'keep' }
        }
      ]
    ])
  );

  const updated = await service.patchContentApproval('user-1', 'approval-1', {
    reviewer: { note: 'updated' }
  });

  assert.equal(updated.status, 'pending');
  assert.equal(updated.title, 'Initial review');
  assert.deepEqual(updated.reviewer, { id: 'rev-1', note: 'updated' });
  assert.deepEqual(contentApprovals.get('user-1:approval-1'), {
    status: 'pending',
    title: 'Initial review',
    reviewer: { id: 'rev-1', note: 'updated' }
  });
});

test('WorkflowService.patchAccountApproval preserves existing fields while applying updates', async () => {
  const key = 'user-1:account_approval:main';
  const { service, accountApprovals } = createWorkflowService(
    new Map([
      [
        key,
        {
          status: 'pending',
          documents: [{ id: 'doc-1', status: 'uploaded' }],
          checks: { kyc: 'pending', tax: 'approved' }
        }
      ]
    ])
  );

  const updated = await service.patchAccountApproval('user-1', {
    checks: { kyc: 'approved' }
  } as any);

  assert.equal(updated.status, 'pending');
  assert.deepEqual(updated.documents, [{ id: 'doc-1', status: 'uploaded' }]);
  assert.deepEqual(updated.checks, { kyc: 'approved', tax: 'approved' });
  assert.ok(typeof updated.updatedAt === 'string');
  assert.deepEqual(accountApprovals.get('user-1')?.documents, [{ id: 'doc-1', status: 'uploaded' }]);
});
