import { Injectable, NotFoundException } from '@nestjs/common';
import { serializeListingPublic } from '../../common/serializers/listing.serializer.js';
import { serializePublicSeller } from '../../common/serializers/seller.serializer.js';
import { CacheService } from '../../platform/cache/cache.service.js';
import { PublicReadCacheService } from '../../platform/cache/public-read-cache.service.js';
import { PrismaService, ReadPrismaService } from '../../platform/prisma/prisma.service.js';
import { ListQueryDto, normalizeListQuery } from '../../common/dto/list-query.dto.js';
import { JobsService } from '../jobs/jobs.service.js';
import { SearchService } from '../search/search.service.js';
import { CreateMarketplaceListingDto } from './dto/create-marketplace-listing.dto.js';

@Injectable()
export class MarketplaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prismaRead: ReadPrismaService,
    private readonly searchService: SearchService,
    private readonly cache: CacheService,
    private readonly publicReadCache: PublicReadCacheService,
    private readonly jobsService: JobsService
  ) {}

  async getMarketplaceFeed(query?: ListQueryDto) {
    const { take } = normalizeListQuery(query, { limit: 24 });
    return this.cache.getOrSet(
      this.publicReadCache.marketplaceFeedKey(take),
      this.publicReadCache.publicFeedTtlMs(),
      async () => {
        const [listings, sellers, opportunities] = await Promise.all([
          this.prismaRead.marketplaceListing.findMany({
            where: { status: 'ACTIVE' },
            include: { deal: true, seller: true, taxonomyLinks: true },
            orderBy: { createdAt: 'desc' },
            take
          }),
          this.prismaRead.seller.findMany({
            orderBy: [{ isVerified: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }],
            take
          }),
          this.prismaRead.opportunity.findMany({
            where: { status: { in: ['OPEN', 'INVITE_ONLY'] } },
            include: { seller: true },
            orderBy: { createdAt: 'desc' },
            take
          })
        ]);

        return {
          listings: listings.map((listing) => serializeListingPublic(listing as any)),
          sellers: sellers.map((seller) => serializePublicSeller(seller)),
          opportunities
        };
      }
    );
  }

  async listSellers(query?: ListQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    return this.cache.getOrSet(
      this.publicReadCache.marketplaceSellersKey(skip, take),
      this.publicReadCache.publicReadTtlMs(),
      async () => {
        const sellers = await this.prismaRead.seller.findMany({
          skip,
          take,
          orderBy: [{ isVerified: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }]
        });
        return sellers.map((seller) => serializePublicSeller(seller));
      }
    );
  }

  async listOpportunities(query?: ListQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    return this.cache.getOrSet(
      this.publicReadCache.marketplaceOpportunitiesKey(skip, take),
      this.publicReadCache.publicReadTtlMs(),
      async () => {
        const opportunities = await this.prismaRead.opportunity.findMany({
          skip,
          take,
          include: { seller: true },
          orderBy: { createdAt: 'desc' }
        });
        return opportunities.map((opportunity) => ({
          ...opportunity,
          seller: opportunity.seller ? serializePublicSeller(opportunity.seller as any) : null
        }));
      }
    );
  }

  async listListings(query?: ListQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    return this.cache.getOrSet(
      this.publicReadCache.marketplaceListingsKey(skip, take),
      this.publicReadCache.publicReadTtlMs(),
      async () => {
        const listings = await this.prismaRead.marketplaceListing.findMany({
          where: { status: 'ACTIVE' },
          skip,
          take,
          include: { deal: true, seller: true, taxonomyLinks: true },
          orderBy: { createdAt: 'desc' }
        });
        return listings.map((listing) => serializeListingPublic(listing as any));
      }
    );
  }

  async createListing(userId: string, payload: CreateMarketplaceListingDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { sellerProfile: true }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const listing = await this.prisma.marketplaceListing.create({
      data: {
        userId,
        sellerId: user.sellerProfile?.id,
        title: payload.title,
        description: payload.description,
        dealId: payload.dealId,
        price: payload.price,
        currency: payload.currency ?? 'USD',
        status: 'ACTIVE'
      }
    });
    await this.searchService.enqueueListingIndex(listing.id);
    await this.publicReadCache.invalidateMarketplacePublic();
    await this.enqueueMarketplaceWarm();
    const storefront = user.sellerProfile?.id
      ? await this.prisma.storefront.findUnique({
          where: { sellerId: user.sellerProfile.id },
          select: { slug: true, isPublished: true }
        })
      : null;
    if (storefront?.slug) {
      await this.publicReadCache.invalidateStorefront(storefront.slug);
      if (storefront.isPublished) {
        await this.jobsService.enqueue({
          queue: 'cache',
          type: 'CACHE_WARM_PUBLIC_READ',
          payload: {
            target: 'storefront',
            handle: storefront.slug
          },
          dedupeKey: `cache-warm:storefront:${storefront.slug}`
        });
      }
    }
    return listing;
  }

  async warmPublicMarketplaceCache() {
    await Promise.all([
      this.getMarketplaceFeed({ limit: this.publicReadCache.warmListingsLimit() } as ListQueryDto),
      this.listSellers({ limit: this.publicReadCache.warmListingsLimit() } as ListQueryDto),
      this.listListings({ limit: this.publicReadCache.warmListingsLimit() } as ListQueryDto),
      this.listOpportunities({ limit: this.publicReadCache.warmListingsLimit() } as ListQueryDto)
    ]);
  }

  private async enqueueMarketplaceWarm() {
    await this.jobsService.enqueue({
      queue: 'cache',
      type: 'CACHE_WARM_PUBLIC_READ',
      payload: {
        target: 'marketplace'
      },
      dedupeKey: 'cache-warm:marketplace'
    });
  }
}
