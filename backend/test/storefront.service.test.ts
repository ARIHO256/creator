import assert from 'node:assert/strict';
import test from 'node:test';
import { StorefrontService } from '../src/modules/storefront/storefront.service.js';

test('StorefrontService update validates and syncs taxonomy', async () => {
  const now = new Date();
  const existing = {
    id: 'store-1',
    sellerId: 'seller-1',
    slug: 'store-1',
    name: 'Store',
    tagline: null,
    description: null,
    heroTitle: null,
    heroSubtitle: null,
    heroMediaUrl: null,
    logoUrl: null,
    coverUrl: null,
    theme: null,
    isPublished: false,
    taxonomyLinks: [],
    createdAt: now,
    updatedAt: now
  };
  const calls: { assert?: string[]; coverage?: number; sync?: any } = {};

  const prisma = {
    storefront: {
      async findUnique({ where }: any) {
        if (where.sellerId) return existing;
        if (where.id) return { ...existing, taxonomyLinks: [] };
        return null;
      },
      async update({ data }: any) {
        return { ...existing, ...data, taxonomyLinks: [], createdAt: now, updatedAt: now };
      }
    }
  };
  const sellersService = {
    async ensureSellerProfile() {
      return {
        id: 'seller-1',
        handle: 'seller-1',
        storefrontName: 'Store',
        displayName: 'Store',
        name: 'Store',
        category: null,
        description: null
      };
    }
  };
  const taxonomyService = {
    async assertNodesInActiveTree(nodeIds: string[]) {
      calls.assert = nodeIds;
    },
    async ensureCoverageForNodes() {
      calls.coverage = (calls.coverage ?? 0) + 1;
    },
    async syncStorefrontTaxonomy(userId: string, nodeIds: string[], primary: string | null) {
      calls.sync = { userId, nodeIds, primary };
    }
  };

  const searchService = { async enqueueStorefrontIndex() {} };
  const service = new StorefrontService(prisma as any, sellersService as any, taxonomyService as any, searchService as any);
  const response = await service.updateMyStorefront('user-1', {
    name: 'New Store',
    taxonomyNodeIds: ['node-1'],
    primaryTaxonomyNodeId: 'node-1'
  });

  assert.deepEqual(calls.assert, ['node-1']);
  assert.equal(calls.coverage, 1);
  assert.deepEqual(calls.sync?.nodeIds, ['node-1']);
  assert.equal(response.id, 'store-1');
});
