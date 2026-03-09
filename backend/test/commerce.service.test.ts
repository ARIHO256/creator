import assert from 'node:assert/strict';
import test from 'node:test';
import { CommerceService } from '../src/modules/commerce/commerce.service.js';

test('CommerceService.updateOrder enforces order status transitions', async () => {
  const prisma = {
    order: {
      async findFirst() {
        return { id: 'order-1', sellerId: 'seller-1', status: 'NEW' };
      },
      async update() {
        return { id: 'order-1', status: 'CONFIRMED' };
      }
    },
    dashboardSnapshot: {
      async deleteMany() {
        return { count: 1 };
      }
    }
  };
  const sellersService = {
    async ensureSellerProfile() {
      return { id: 'seller-1', userId: 'user-1' };
    }
  };

  const cache = {
    async invalidatePrefix() {
      return;
    },
    async invalidate() {
      return;
    }
  };

  const service = new CommerceService(prisma as any, {} as any, sellersService as any, cache as any, {} as any);

  await assert.rejects(
    () => service.updateOrder('user-1', 'order-1', { status: 'DELIVERED' } as any),
    /Order status cannot transition/
  );

  const updated = await service.updateOrder('user-1', 'order-1', { status: 'CONFIRMED' } as any);
  assert.equal(updated.status, 'CONFIRMED');
});
