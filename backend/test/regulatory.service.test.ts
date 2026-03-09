import assert from 'node:assert/strict';
import test from 'node:test';
import { RegulatoryService } from '../src/modules/regulatory/regulatory.service.js';

test('RegulatoryService blocks invalid desk status transitions', async () => {
  const prisma = {
    regulatoryDesk: {
      async findFirst() {
        return { id: 'desk-1', userId: 'user-1', status: 'active' };
      },
      async update() {
        return {};
      }
    }
  };

  const service = new RegulatoryService(prisma as any);
  await assert.rejects(
    () => service.updateDesk('user-1', 'desk-1', { status: 'pending' }),
    /Invalid desk status transition/
  );
});

test('RegulatoryService blocks invalid desk item status transitions', async () => {
  const prisma = {
    regulatoryDeskItem: {
      async findFirst() {
        return { id: 'item-1', deskId: 'desk-1', status: 'resolved' };
      },
      async update() {
        return {};
      }
    }
  };

  const service = new RegulatoryService(prisma as any);
  await assert.rejects(
    () => service.updateDeskItem('user-1', 'desk-1', 'item-1', { status: 'open' }),
    /Invalid desk item status transition/
  );
});

test('RegulatoryService blocks invalid compliance status transitions', async () => {
  const prisma = {
    regulatoryComplianceItem: {
      async findFirst() {
        return { id: 'comp-1', userId: 'user-1', status: 'resolved' };
      },
      async update() {
        return {};
      }
    }
  };

  const service = new RegulatoryService(prisma as any);
  await assert.rejects(
    () => service.updateComplianceItem('user-1', 'comp-1', { status: 'active' }),
    /Invalid compliance status transition/
  );
});
