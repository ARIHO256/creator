import assert from 'node:assert/strict';
import test from 'node:test';
import { TaxonomyService } from '../src/modules/taxonomy/taxonomy.service.js';

test('TaxonomyService.assertNodesExist throws for missing nodes', async () => {
  const prisma = {
    taxonomyNode: {
      async findMany() {
        return [{ id: 'node-1', isActive: true }];
      }
    }
  };
  const sellersService = {
    async ensureSellerProfile() {
      return { id: 'seller-1' };
    }
  };

  const service = new TaxonomyService(prisma as any, sellersService as any);

  await assert.rejects(
    () => service.assertNodesExist(['node-1', 'node-2']),
    /Taxonomy node not found/
  );
});
