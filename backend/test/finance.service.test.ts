import assert from 'node:assert/strict';
import test from 'node:test';
import { FinanceService } from '../src/modules/finance/finance.service.js';

test('FinanceService.requestPayout blocks insufficient balance', async () => {
  const prisma = {
    user: { async findUnique() { return { role: 'CREATOR' }; } },
    transaction: {
      async aggregate() { return { _sum: { amount: 50 } }; },
      async create() { return { id: 'tx-1' }; }
    }
  };
  const sellersService = { async ensureSellerProfile() { return { id: 'seller-1' }; } };
  const audit = { async log() {} };
  const jobsService = { async enqueue() {} };
  const configService = { get() { return undefined; } };
  const service = new FinanceService(prisma as any, sellersService as any, audit as any, jobsService as any, configService as any);

  await assert.rejects(
    () => service.requestPayout('user-1', { amount: 100 } as any),
    /Insufficient available balance/
  );
});

test('FinanceService approves payout with valid transition', async () => {
  const prisma = {
    user: { async findUnique() { return { role: 'CREATOR' }; } },
    transaction: {
      async findUnique() {
        return { id: 'payout-1', type: 'PAYOUT', status: 'PENDING', note: null };
      },
      async update({ data }: any) {
        return { id: 'payout-1', status: data.status, paidAt: data.paidAt };
      }
    }
  };
  const sellersService = { async ensureSellerProfile() { return { id: 'seller-1' }; } };
  const audit = { async log() {} };
  const jobsService = { async enqueue() {} };
  const configService = { get() { return undefined; } };
  const service = new FinanceService(prisma as any, sellersService as any, audit as any, jobsService as any, configService as any);

  const updated = await service.approvePayout('admin-1', 'payout-1', { note: 'ok' } as any);
  assert.equal(updated.status, 'PAID');
});
