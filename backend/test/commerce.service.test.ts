import assert from 'node:assert/strict';
import test from 'node:test';
import { CommerceService } from '../src/modules/commerce/commerce.service.js';

test('CommerceService.updateOrder enforces order status transitions', async () => {
  const prisma = {
    seller: {
      async findFirst() {
        return { id: 'seller-1', userId: 'user-1' };
      }
    },
    order: {
      async findFirst() {
        return { id: 'order-1', sellerId: 'seller-1', status: 'NEW' };
      },
      async update() {
        return { id: 'order-1', status: 'CONFIRMED' };
      }
    }
  };

  const service = new CommerceService(prisma as any, {} as any, {} as any, {} as any);

  await assert.rejects(
    () => service.updateOrder('user-1', 'order-1', { status: 'DELIVERED' } as any),
    /Order status cannot transition/
  );

  const updated = await service.updateOrder('user-1', 'order-1', { status: 'CONFIRMED' } as any);
  assert.equal(updated.status, 'CONFIRMED');
});
