import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { JobsService } from '../jobs/jobs.service.js';
import { normalizeListQuery } from '../../common/dto/list-query.dto.js';
import { SearchListingsQueryDto } from './dto/search-listings-query.dto.js';
import { SearchStorefrontQueryDto } from './dto/search-storefront-query.dto.js';

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobsService: JobsService,
    private readonly configService: ConfigService
  ) {}

  async enqueueListingIndex(listingId: string) {
    if (!this.enabled()) return;
    await this.jobsService.enqueue({
      queue: 'search',
      type: 'SEARCH_INDEX_LISTING',
      payload: { listingId },
      dedupeKey: `search:listing:${listingId}`
    });
  }

  async enqueueStorefrontIndex(storefrontId: string) {
    if (!this.enabled()) return;
    await this.jobsService.enqueue({
      queue: 'search',
      type: 'SEARCH_INDEX_STOREFRONT',
      payload: { storefrontId },
      dedupeKey: `search:storefront:${storefrontId}`
    });
  }

  async indexListing(listingId: string) {
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { id: listingId },
      include: { seller: true, taxonomyLinks: { include: { taxonomyNode: true } } }
    });
    if (!listing) return null;
    const taxonomyNames = listing.taxonomyLinks.map((link) => link.taxonomyNode?.name).filter(Boolean);
    const content = [
      listing.title,
      listing.description,
      listing.sku,
      listing.category,
      listing.kind,
      listing.marketplace,
      listing.seller?.displayName,
      ...taxonomyNames
    ]
      .filter(Boolean)
      .join(' ');

    const payload = {
      listing: {
        id: listing.id,
        title: listing.title,
        status: listing.status,
        marketplace: listing.marketplace,
        price: listing.price,
        currency: listing.currency,
        sellerId: listing.sellerId,
        taxonomyNodeIds: listing.taxonomyLinks.map((link) => link.taxonomyNodeId)
      }
    };

    return this.prisma.searchDocument.upsert({
      where: { entityType_entityId: { entityType: 'LISTING', entityId: listing.id } },
      create: {
        entityType: 'LISTING',
        entityId: listing.id,
        title: listing.title ?? undefined,
        content,
        payload: payload as Prisma.InputJsonValue,
        updatedAt: new Date()
      },
      update: {
        title: listing.title ?? undefined,
        content,
        payload: payload as Prisma.InputJsonValue,
        updatedAt: new Date()
      }
    });
  }

  async indexStorefront(storefrontId: string) {
    const storefront = await this.prisma.storefront.findUnique({
      where: { id: storefrontId },
      include: { seller: true, taxonomyLinks: { include: { taxonomyNode: true } } }
    });
    if (!storefront) return null;
    const taxonomyNames = storefront.taxonomyLinks.map((link) => link.taxonomyNode?.name).filter(Boolean);
    const content = [
      storefront.name,
      storefront.tagline,
      storefront.description,
      storefront.slug,
      storefront.seller?.displayName,
      ...taxonomyNames
    ]
      .filter(Boolean)
      .join(' ');

    const payload = {
      storefront: {
        id: storefront.id,
        sellerId: storefront.sellerId,
        name: storefront.name,
        slug: storefront.slug,
        isPublished: storefront.isPublished,
        taxonomyNodeIds: storefront.taxonomyLinks.map((link) => link.taxonomyNodeId)
      }
    };

    return this.prisma.searchDocument.upsert({
      where: { entityType_entityId: { entityType: 'STOREFRONT', entityId: storefront.id } },
      create: {
        entityType: 'STOREFRONT',
        entityId: storefront.id,
        title: storefront.name ?? undefined,
        content,
        payload: payload as Prisma.InputJsonValue,
        updatedAt: new Date()
      },
      update: {
        title: storefront.name ?? undefined,
        content,
        payload: payload as Prisma.InputJsonValue,
        updatedAt: new Date()
      }
    });
  }

  async searchListings(query?: SearchListingsQueryDto) {
    const { take, skip } = normalizeListQuery(query, { maxLimit: this.limit(query?.limit) });
    const q = String(query?.q ?? '').trim();
    const docs = await this.findDocuments('LISTING', q, skip, take);
    const results = docs
      .map((doc) => (doc.payload as any)?.listing)
      .filter(Boolean)
      .filter((listing) => (query?.marketplace ? listing.marketplace === query.marketplace : true))
      .filter((listing) => (query?.sellerId ? listing.sellerId === query.sellerId : true))
      .filter((listing) => (query?.taxonomyNodeId ? listing.taxonomyNodeIds?.includes(query.taxonomyNodeId) : true));
    return { results };
  }

  async searchStorefronts(query?: SearchStorefrontQueryDto) {
    const { take, skip } = normalizeListQuery(query, { maxLimit: this.limit(query?.limit) });
    const q = String(query?.q ?? '').trim();
    const docs = await this.findDocuments('STOREFRONT', q, skip, take);
    const results = docs
      .map((doc) => (doc.payload as any)?.storefront)
      .filter(Boolean)
      .filter((storefront) => storefront.isPublished !== false)
      .filter((storefront) =>
        query?.taxonomyNodeId ? storefront.taxonomyNodeIds?.includes(query.taxonomyNodeId) : true
      );
    return { results };
  }

  async reindexAll() {
    const batch = Number(this.configService.get('search.indexBatch') ?? 250);
    const [listingIds, storefrontIds] = await Promise.all([
      this.prisma.marketplaceListing.findMany({ select: { id: true }, take: batch }),
      this.prisma.storefront.findMany({ select: { id: true }, take: batch })
    ]);
    for (const entry of listingIds) {
      await this.indexListing(entry.id);
    }
    for (const entry of storefrontIds) {
      await this.indexStorefront(entry.id);
    }
    await this.prisma.searchIndexState.upsert({
      where: { entityType: 'ALL' },
      create: { entityType: 'ALL', status: 'COMPLETED', lastIndexedAt: new Date() },
      update: { status: 'COMPLETED', lastIndexedAt: new Date() }
    });
    return { listings: listingIds.length, storefronts: storefrontIds.length };
  }

  private async findDocuments(entityType: string, q: string, skip: number, take: number) {
    const where: Prisma.SearchDocumentWhereInput = {
      entityType,
      ...(q ? { content: { contains: q } } : {})
    };
    return this.prisma.searchDocument.findMany({
      where,
      skip,
      take,
      orderBy: { updatedAt: 'desc' }
    });
  }

  private enabled() {
    return !['0', 'false', 'no', 'off'].includes(
      String(this.configService.get('search.enabled') ?? 'true').toLowerCase()
    );
  }

  private limit(take?: number | null) {
    const max = Number(this.configService.get('search.queryLimit') ?? 50);
    return Math.max(1, Math.min(take ?? max, max));
  }
}
