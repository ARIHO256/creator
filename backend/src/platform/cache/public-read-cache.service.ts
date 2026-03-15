import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service.js';

@Injectable()
export class PublicReadCacheService {
  constructor(
    private readonly configService: ConfigService,
    private readonly cache: CacheService
  ) {}

  landingContentKey() {
    return 'landing:content';
  }

  marketplaceFeedKey(limit: number) {
    return `marketplace:feed:take:${limit}`;
  }

  marketplaceSellersKey(skip: number, take: number) {
    return `marketplace:sellers:skip:${skip}:take:${take}`;
  }

  marketplaceListingsKey(skip: number, take: number) {
    return `marketplace:listings:skip:${skip}:take:${take}`;
  }

  marketplaceOpportunitiesKey(skip: number, take: number) {
    return `marketplace:opportunities:skip:${skip}:take:${take}`;
  }

  discoverySellersKey(skip: number, take: number) {
    return `discovery:sellers:skip:${skip}:take:${take}`;
  }

  storefrontKey(handle: string) {
    return `storefront:public:${this.normalizeHandle(handle)}`;
  }

  storefrontListingsKey(handle: string, skip: number, take: number) {
    return `storefront:listings:${this.normalizeHandle(handle)}:skip:${skip}:take:${take}`;
  }

  taxonomyTreesKey() {
    return 'taxonomy:trees';
  }

  taxonomyTreeNodesKey(identifier: string, maxDepth?: number, includeInactive?: boolean) {
    return `taxonomy:tree:${identifier}:depth:${maxDepth ?? 'all'}:inactive:${includeInactive ? '1' : '0'}`;
  }

  taxonomyNodeChildrenKey(id: string) {
    return `taxonomy:children:${id}`;
  }

  publicReadTtlMs() {
    return Number(this.configService.get('cache.publicReadTtlMs') ?? 60_000);
  }

  publicFeedTtlMs() {
    return Number(this.configService.get('cache.publicFeedTtlMs') ?? 30_000);
  }

  storefrontTtlMs() {
    return Number(this.configService.get('cache.storefrontTtlMs') ?? 120_000);
  }

  taxonomyTtlMs() {
    return Number(this.configService.get('cache.taxonomyTtlMs') ?? 300_000);
  }

  warmListingsLimit() {
    return Number(this.configService.get('cache.warmListingsLimit') ?? 24);
  }

  async invalidateLandingContent() {
    await this.cache.invalidate(this.landingContentKey());
  }

  async invalidateMarketplacePublic() {
    await Promise.all([
      this.cache.invalidatePrefix('marketplace:feed:'),
      this.cache.invalidatePrefix('marketplace:sellers:'),
      this.cache.invalidatePrefix('marketplace:listings:'),
      this.cache.invalidatePrefix('marketplace:opportunities:')
    ]);
  }

  async invalidateDiscoveryPublic() {
    await this.cache.invalidatePrefix('discovery:sellers:');
  }

  async invalidateStorefront(handle: string) {
    const normalized = this.normalizeHandle(handle);
    await Promise.all([
      this.cache.invalidate(this.storefrontKey(normalized)),
      this.cache.invalidatePrefix(`storefront:listings:${normalized}:`)
    ]);
  }

  async invalidateTaxonomy() {
    await Promise.all([
      this.cache.invalidate(this.taxonomyTreesKey()),
      this.cache.invalidatePrefix('taxonomy:tree:'),
      this.cache.invalidatePrefix('taxonomy:children:')
    ]);
  }

  private normalizeHandle(handle: string) {
    return String(handle ?? '')
      .trim()
      .toLowerCase();
  }
}
