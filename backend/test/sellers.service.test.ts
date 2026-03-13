import assert from 'node:assert/strict';
import test from 'node:test';
import { SellersService } from '../src/modules/sellers/sellers.service.js';

test('SellersService.ensureSellerProfile rejects users without seller role assignments', async () => {
  const prisma = {
    user: {
      async findUnique() {
        return {
          id: 'user-1',
          role: 'CREATOR',
          roleAssignments: [],
          sellerProfile: null
        };
      }
    },
    seller: {
      async create() {
        return { id: 'seller-1' };
      }
    }
  };

  const searchService = { async enqueueListingIndex() {} };
  const service = new SellersService(prisma as any, searchService as any);
  await assert.rejects(
    () => service.ensureSellerProfile('user-1'),
    /Seller workspace is not enabled/
  );
});

test('SellersService.ensureSellerProfile returns existing seller profile for allowed users', async () => {
  const prisma = {
    user: {
      async findUnique() {
        return {
          id: 'user-1',
          role: 'SELLER',
          roleAssignments: [{ role: 'SELLER' }],
          sellerProfile: { id: 'seller-1', userId: 'user-1' }
        };
      }
    }
  };

  const searchService = { async enqueueListingIndex() {} };
  const service = new SellersService(prisma as any, searchService as any);
  const profile = await service.ensureSellerProfile('user-1');
  assert.equal(profile.id, 'seller-1');
});

test('SellersService.ensureSellerProfile rejects provider role with seller-kind profile', async () => {
  const prisma = {
    user: {
      async findUnique() {
        return {
          id: 'user-2',
          role: 'PROVIDER',
          roleAssignments: [{ role: 'PROVIDER' }],
          sellerProfile: { id: 'seller-2', userId: 'user-2', kind: 'SELLER' }
        };
      }
    }
  };

  const searchService = { async enqueueListingIndex() {} };
  const service = new SellersService(prisma as any, searchService as any);
  await assert.rejects(
    () => service.ensureSellerProfile('user-2'),
    /Provider workspace is not enabled/
  );
});

test('SellersService.listOrders excludes sellerfront compatibility orders', async () => {
  const prisma = {
    user: {
      async findUnique() {
        return {
          id: 'user-1',
          role: 'SELLER',
          roleAssignments: [{ role: 'SELLER' }],
          sellerProfile: { id: 'seller-1', userId: 'user-1' }
        };
      }
    },
    appRecord: {
      async findMany() {
        return [{ payload: { orders: [{ id: 'ORD-10512' }] } }];
      }
    },
    order: {
      async findMany() {
        return [{ id: 'real-order-1' }];
      }
    }
  };

  const searchService = { async enqueueListingIndex() {} };
  const service = new SellersService(prisma as any, searchService as any);
  const orders = await service.listOrders('user-1');
  assert.deepEqual(orders, [{ id: 'real-order-1' }]);
});

test('SellersService.getOrder rejects sellerfront compatibility order ids', async () => {
  const prisma = {
    user: {
      async findUnique() {
        return {
          id: 'user-1',
          role: 'SELLER',
          roleAssignments: [{ role: 'SELLER' }],
          sellerProfile: { id: 'seller-1', userId: 'user-1' }
        };
      }
    },
    appRecord: {
      async findMany() {
        return [{ payload: { orders: [{ id: 'ORD-10512' }] } }];
      }
    },
    order: {
      async findFirst() {
        throw new Error('should not fetch compatibility order');
      }
    }
  };

  const searchService = { async enqueueListingIndex() {} };
  const service = new SellersService(prisma as any, searchService as any);
  await assert.rejects(() => service.getOrder('user-1', 'ORD-10512'), /Order not found/);
});
