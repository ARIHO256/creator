import assert from 'node:assert/strict';
import test from 'node:test';
import { CatalogService } from '../src/modules/catalog/catalog.service.js';

test('CatalogService.validateTemplates reports validation errors', async () => {
  const prisma = {};
  const sellersService = { async ensureSellerProfile() { return { id: 'seller-1' }; } };
  const jobsService = { async enqueue() { return { id: 'job-1' }; } };
  const service = new CatalogService(prisma as any, sellersService as any, jobsService as any);

  const result = await service.validateTemplates('user-1', {
    templates: [{ name: '', kind: '', attrs: [] }]
  } as any);

  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});
