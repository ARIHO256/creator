import assert from 'node:assert/strict';
import test from 'node:test';
import { TaxonomyService } from '../src/modules/taxonomy/taxonomy.service.js';

test('TaxonomyService.assertNodesExist throws for missing nodes', async () => {
  const prisma = {
    taxonomyTree: {
      async findUnique({ where }: any) {
        if (where.slug === 'sellerfront-catalog-taxonomy') {
          return { id: 'seller-tree', slug: 'sellerfront-catalog-taxonomy', status: 'ACTIVE' };
        }
        if (where.slug === 'provider-service-taxonomy') {
          return { id: 'provider-tree', slug: 'provider-service-taxonomy', status: 'ACTIVE' };
        }
        return null;
      },
      async update({ where, data }: any) {
        return { id: where.id, ...data };
      }
    },
    taxonomyNode: {
      async findUnique({ where }: any) {
        if (where?.treeId_path || where?.id) {
          return null;
        }
        return null;
      },
      async update({ where, data }: any) {
        return { id: where.id, ...data };
      },
      async create({ data }: any) {
        return data;
      },
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

test('TaxonomyService.assertNodesInActiveTree rejects nodes outside active tree', async () => {
  const prisma = {
    taxonomyTree: {
      async findUnique({ where }: any) {
        if (where.slug === 'sellerfront-catalog-taxonomy') {
          return { id: 'seller-tree', slug: 'sellerfront-catalog-taxonomy', status: 'ACTIVE' };
        }
        if (where.slug === 'provider-service-taxonomy') {
          return { id: 'provider-tree', slug: 'provider-service-taxonomy', status: 'ACTIVE' };
        }
        if (where.id === 'tree-active') {
          return { id: 'tree-active', slug: 'sellerfront-catalog-taxonomy', status: 'ACTIVE' };
        }
        return null;
      },
      async update({ where, data }: any) {
        return { id: where.id, ...data };
      },
      async findFirst() {
        return { id: 'tree-active', status: 'ACTIVE' };
      }
    },
    taxonomyNode: {
      async findUnique({ where }: any) {
        if (where?.treeId_path || where?.id) {
          return null;
        }
        return null;
      },
      async update({ where, data }: any) {
        return { id: where.id, ...data };
      },
      async create({ data }: any) {
        return data;
      },
      async findMany() {
        return [{ id: 'node-1', isActive: true, treeId: 'tree-other' }];
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
    () => service.assertNodesInActiveTree(['node-1']),
    /active taxonomy tree/
  );
});

test('TaxonomyService.listTrees reuses an existing taxonomy tree with the same slug', async () => {
  const treeWrites: Array<{ op: string; where?: Record<string, unknown>; data?: Record<string, unknown> }> = [];
  const nodeWrites: Array<{ op: string; id?: string; treeId?: string; path?: string }> = [];

  const prisma = {
    taxonomyTree: {
      async findUnique({ where }: any) {
        if (where.slug === 'sellerfront-catalog-taxonomy') {
          return { id: 'legacy-tree-id', slug: 'sellerfront-catalog-taxonomy', status: 'ACTIVE' };
        }
        if (where.id === 'taxonomy_tree_seller_catalog') {
          return null;
        }
        if (where.slug === 'provider-service-taxonomy') {
          return { id: 'provider-tree-id', slug: 'provider-service-taxonomy', status: 'ACTIVE' };
        }
        if (where.id === 'taxonomy_tree_provider_service') {
          return null;
        }
        return null;
      },
      async update({ where, data }: any) {
        treeWrites.push({ op: 'update', where, data });
        return { id: where.id, ...data };
      },
      async create({ data }: any) {
        treeWrites.push({ op: 'create', data });
        return data;
      },
      async findMany() {
        return [];
      }
    },
    taxonomyNode: {
      async findUnique({ where }: any) {
        if (where?.treeId_path?.path === '/marketplace-evmart') {
          return { id: 'legacy-node-id', treeId: 'legacy-tree-id', path: '/marketplace-evmart' };
        }
        return null;
      },
      async update({ where, data }: any) {
        nodeWrites.push({ op: 'update', id: where.id, treeId: data.treeId, path: data.path });
        return { id: where.id, ...data };
      },
      async create({ data }: any) {
        nodeWrites.push({ op: 'create', id: data.id, treeId: data.treeId, path: data.path });
        return data;
      }
    }
  };

  const sellersService = {
    async ensureSellerProfile() {
      return { id: 'seller-1' };
    }
  };

  const service = new TaxonomyService(prisma as any, sellersService as any);
  await service.listTrees();

  assert.equal(treeWrites[0]?.op, 'update');
  assert.deepEqual(treeWrites[0]?.where, { id: 'legacy-tree-id' });
  assert.equal(nodeWrites[0]?.op, 'update');
  assert.equal(nodeWrites[0]?.id, 'legacy-node-id');
});
