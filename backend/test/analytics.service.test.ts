import assert from 'node:assert/strict';
import test from 'node:test';
import { AnalyticsService } from '../src/modules/analytics/analytics.service.js';

test('AnalyticsService returns a fresh materialized snapshot without rebuilding overview', async () => {
  let queriedLiveEvents = false;
  const prismaRead = {
    appRecord: {
      async findFirst() {
        return {
          payload: {
            totalViews: 120,
            totalClicks: 18,
            purchases: 3,
            conversionRate: 16.67,
            eventsCount: 42
          },
          updatedAt: new Date()
        };
      }
    },
    analyticsEvent: {
      async findMany() {
        queriedLiveEvents = true;
        return [];
      }
    }
  };
  const cache = {
    async getOrSet(_key: string, _ttlMs: number, loader: () => Promise<unknown>) {
      return loader();
    },
    async invalidatePrefix() {
      return undefined;
    }
  };
  const configService = {
    get(key: string) {
      if (key === 'analytics.snapshotTtlMs') return 60_000;
      return undefined;
    }
  };

  const service = new AnalyticsService({} as any, prismaRead as any, cache as any, configService as any);
  const overview = await service.getOverview('user-1', 'SELLER');

  assert.equal(overview.totalViews, 120);
  assert.equal(queriedLiveEvents, false);
});
