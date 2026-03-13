import assert from 'node:assert/strict';
import test from 'node:test';
import { CommerceService } from '../src/modules/commerce/commerce.service.js';

test('CommerceService.updateOrder enforces order status transitions', async () => {
  const prisma = {
    appRecord: {
      async findMany() {
        return [];
      }
    },
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

  const exportsService = { async createJob() { return {}; } };
  const service = new CommerceService(prisma as any, {} as any, sellersService as any, cache as any, {} as any, exportsService as any);

  await assert.rejects(
    () => service.updateOrder('user-1', 'order-1', { status: 'DELIVERED' } as any),
    /Order status cannot transition/
  );

  const updated = await service.updateOrder('user-1', 'order-1', { status: 'CONFIRMED' } as any);
  assert.equal(updated.status, 'CONFIRMED');
});

test('CommerceService.orders excludes sellerfront compatibility orders', async () => {
  const prisma = {
    appRecord: {
      async findMany() {
        return [{ payload: { orders: [{ id: 'ORD-10512' }] } }];
      },
      async findFirst() {
        return null;
      }
    },
    order: {
      async findMany() {
        return [
          { id: 'real-order-1', sellerId: 'seller-1', status: 'NEW', updatedAt: new Date(), createdAt: new Date() }
        ];
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

  const exportsService = { async createJob() { return {}; } };
  const service = new CommerceService(prisma as any, {} as any, sellersService as any, cache as any, {} as any, exportsService as any);

  const response = await service.orders('user-1', {} as any);
  assert.deepEqual(response.orders.map((entry: { id: string }) => entry.id), ['real-order-1']);
});

test('CommerceService.orderDetail rejects sellerfront compatibility orders', async () => {
  const prisma = {
    appRecord: {
      async findMany() {
        return [{ payload: { orders: [{ id: 'ORD-10512' }] } }];
      }
    },
    order: {
      async findFirst() {
        throw new Error('should not query compatibility order detail');
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

  const exportsService = { async createJob() { return {}; } };
  const service = new CommerceService(prisma as any, {} as any, sellersService as any, cache as any, {} as any, exportsService as any);

  await assert.rejects(() => service.orderDetail('user-1', 'ORD-10512'), /Order not found/);
});
