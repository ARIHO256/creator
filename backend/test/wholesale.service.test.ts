import assert from 'node:assert/strict';
import test from 'node:test';
import { WholesaleService } from '../src/modules/wholesale/wholesale.service.js';

test('WholesaleService blocks invalid quote status transitions', async () => {
  const now = new Date().toISOString();
  const existingData = {
    id: 'quote-1',
    buyer: 'Buyer',
    currency: 'USD',
    status: 'sent',
    createdAt: now,
    updatedAt: now,
    lines: [{ name: 'Item', quantity: 1, unitPrice: 100, unitCost: 70 }]
  };

  const prisma = {
    wholesaleQuote: {
      async findFirst() {
        return { id: 'quote-1', userId: 'user-1', status: 'sent', data: existingData };
      },
      async update() {
        return {};
      }
    }
  };
  const jobsService = { async enqueue() {} };

  const service = new WholesaleService(prisma as any, jobsService as any);
  await assert.rejects(
    () => service.updateQuote('user-1', 'quote-1', { status: 'draft' } as any),
    /Invalid quote status transition/
  );
});

test('WholesaleService.createQuote rejects RFQ ids from another account', async () => {
  const prisma = {
    wholesaleRfq: {
      async findFirst() {
        return null;
      }
    }
  };
  const jobsService = { async enqueue() {} };

  const service = new WholesaleService(prisma as any, jobsService as any);

  await assert.rejects(
    () =>
      service.createQuote('user-1', {
        rfqId: 'rfq-other-user',
        buyer: 'Buyer',
        lines: [{ name: 'Item', quantity: 1, unitPrice: 100 }]
      } as any),
    /RFQ not found/
  );
});

test('WholesaleService.createQuote rejects quote id collisions across accounts', async () => {
  const prisma = {
    wholesaleRfq: {
      async findFirst() {
        return null;
      }
    },
    wholesaleQuote: {
      async findUnique() {
        return { id: 'quote-1', userId: 'user-2' };
      }
    }
  };
  const jobsService = { async enqueue() {} };

  const service = new WholesaleService(prisma as any, jobsService as any);

  await assert.rejects(
    () =>
      service.createQuote('user-1', {
        id: 'quote-1',
        buyer: 'Buyer',
        lines: [{ name: 'Item', quantity: 1, unitPrice: 100 }]
      } as any),
    /Quote does not belong to this account/
  );
});
