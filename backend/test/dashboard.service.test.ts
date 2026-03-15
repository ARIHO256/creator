import assert from 'node:assert/strict';
import test from 'node:test';
import { DashboardService } from '../src/modules/dashboard/dashboard.service.js';

test('DashboardService.feed returns a fresh materialized read model without live fan-in queries', async () => {
  let queriedUser = false;
  const prismaRead = {
    appRecord: {
      async findFirst() {
        return {
          payload: {
            role: 'SELLER',
            hero: {
              title: 'Seller workspace',
              subtitle: 'cached'
            },
            quickStats: [{ label: 'Active listings', value: 12 }]
          },
          updatedAt: new Date()
        };
      }
    },
    user: {
      async findUnique() {
        queriedUser = true;
        return null;
      }
    }
  };
  const cache = {
    async getOrSet(_key: string, _ttlMs: number, loader: () => Promise<unknown>) {
      return loader();
    }
  };
  const configService = {
    get(key: string) {
      if (key === 'dashboard.readModelTtlMs') return 60_000;
      return undefined;
    }
  };

  const service = new DashboardService(
    {} as any,
    prismaRead as any,
    configService as any,
    {} as any,
    { getStatus() { return { running: true, errors: 0 }; } } as any,
    cache as any
  );
  const feed = await service.feed('user-1');

  assert.equal(feed.role, 'SELLER');
  assert.equal(feed.hero.subtitle, 'cached');
  assert.equal(queriedUser, false);
});
