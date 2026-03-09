import assert from 'node:assert/strict';
import test from 'node:test';
import { CommunicationsService } from '../src/modules/communications/communications.service.js';

test('CommunicationsService blocks invalid support ticket transitions', async () => {
  const prisma = {
    supportTicket: {
      async findUnique() {
        return { id: 'ticket-1', status: 'CLOSED', closedAt: new Date() };
      }
    }
  };
  const audit = { async log() {} };
  const realtime = { async publishUserEvent() {} };
  const service = new CommunicationsService(prisma as any, audit as any, realtime as any);

  await assert.rejects(
    () => service.updateSupportTicket('staff-1', 'ticket-1', { status: 'OPEN' } as any),
    /Invalid support ticket status transition/
  );
});

test('CommunicationsService requires support/admin assignee', async () => {
  const prisma = {
    supportTicket: {
      async findUnique() {
        return { id: 'ticket-1', status: 'OPEN' };
      },
      async update() {
        return { id: 'ticket-1', assignedToUserId: null };
      }
    },
    user: {
      async findUnique() {
        return { id: 'user-2', role: 'SELLER', roleAssignments: [] };
      }
    }
  };
  const audit = { async log() {} };
  const realtime = { async publishUserEvent() {} };
  const service = new CommunicationsService(prisma as any, audit as any, realtime as any);

  await assert.rejects(
    () => service.assignSupportTicket('staff-1', 'ticket-1', { assigneeUserId: 'user-2' } as any),
    /Assignee must be a support or admin user/
  );
});
