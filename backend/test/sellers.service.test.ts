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

  const service = new SellersService(prisma as any);
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

  const service = new SellersService(prisma as any);
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

  const service = new SellersService(prisma as any);
  await assert.rejects(
    () => service.ensureSellerProfile('user-2'),
    /Provider workspace is not enabled/
  );
});
