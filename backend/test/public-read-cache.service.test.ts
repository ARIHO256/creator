import assert from 'node:assert/strict';
import test from 'node:test';
import { PublicReadCacheService } from '../src/platform/cache/public-read-cache.service.js';

test('PublicReadCacheService composes stable cache keys and invalidation prefixes', async () => {
  const invalidated: string[] = [];
  const invalidatedPrefixes: string[] = [];
  const config = {
    get: (key: string) =>
      ({
        'cache.publicReadTtlMs': 60_000,
        'cache.publicFeedTtlMs': 30_000,
        'cache.storefrontTtlMs': 120_000,
        'cache.taxonomyTtlMs': 300_000,
        'cache.warmListingsLimit': 24
      })[key]
  };
  const cache = {
    invalidate: async (key: string) => invalidated.push(key),
    invalidatePrefix: async (prefix: string) => invalidatedPrefixes.push(prefix)
  };

  const service = new PublicReadCacheService(config as any, cache as any);

  assert.equal(service.storefrontKey('Demo-Store'), 'storefront:public:demo-store');
  assert.equal(service.storefrontListingsKey('Demo-Store', 0, 24), 'storefront:listings:demo-store:skip:0:take:24');
  assert.equal(service.marketplaceFeedKey(24), 'marketplace:feed:take:24');
  assert.equal(service.publicReadTtlMs(), 60_000);
  assert.equal(service.taxonomyTtlMs(), 300_000);
  assert.equal(service.warmListingsLimit(), 24);

  await service.invalidateStorefront('Demo-Store');
  await service.invalidateMarketplacePublic();
  await service.invalidateTaxonomy();

  assert.deepEqual(invalidated.sort(), ['storefront:public:demo-store', 'taxonomy:trees']);
  assert.deepEqual(invalidatedPrefixes.sort(), [
    'marketplace:feed:',
    'marketplace:listings:',
    'marketplace:opportunities:',
    'marketplace:sellers:',
    'storefront:listings:demo-store:',
    'taxonomy:children:',
    'taxonomy:tree:'
  ].sort());
});
