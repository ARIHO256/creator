import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ListQueryDto, normalizeListQuery } from '../../common/dto/list-query.dto.js';
import { serializeListingPublic } from '../../common/serializers/listing.serializer.js';
import { CacheService } from '../../platform/cache/cache.service.js';
import { PublicReadCacheService } from '../../platform/cache/public-read-cache.service.js';
import { PrismaService, ReadPrismaService } from '../../platform/prisma/prisma.service.js';
import { JobsService } from '../jobs/jobs.service.js';
import { SellersService } from '../sellers/sellers.service.js';
import { TaxonomyService } from '../taxonomy/taxonomy.service.js';
import { SearchService } from '../search/search.service.js';
import { UpdateStorefrontDto } from './dto/update-storefront.dto.js';

@Injectable()
export class StorefrontService {
  private readonly prismaReadClient: ReadPrismaService;
  private readonly cacheLayer: CacheService;
  private readonly publicCache: PublicReadCacheService;
  private readonly jobQueue: JobsService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sellersService: SellersService,
    private readonly taxonomyService: TaxonomyService,
    private readonly searchService: SearchService,
    @Optional() prismaRead?: ReadPrismaService,
    @Optional() cache?: CacheService,
    @Optional() publicReadCache?: PublicReadCacheService,
    @Optional() jobsService?: JobsService
  ) {
    this.prismaReadClient = prismaRead ?? (prisma as unknown as ReadPrismaService);
    this.cacheLayer = cache ?? ({
      getOrSet: async (_key: string, _ttlMs: number, loader: () => Promise<unknown>) => loader()
    } as CacheService);
    this.publicCache =
      publicReadCache ??
      new PublicReadCacheService(
        { get: () => undefined } as any,
        {
          invalidate: async () => undefined,
          invalidatePrefix: async () => undefined
        } as any
      );
    this.jobQueue = jobsService ?? ({ enqueue: async () => null } as unknown as JobsService);
  }

  async getMyStorefront(userId: string) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const existing = await this.prisma.storefront.findUnique({
      where: { sellerId: seller.id },
      include: { taxonomyLinks: { include: { taxonomyNode: true }, orderBy: { sortOrder: 'asc' } } }
    });
    if (existing) {
      return this.serializeStorefrontWithProfile(existing, seller.userId ?? userId);
    }

    const slug = await this.ensureUniqueSlug(seller.handle ?? seller.storefrontName ?? seller.displayName ?? seller.name);
    const created = await this.prisma.storefront.create({
      data: {
        sellerId: seller.id,
        slug,
        name: seller.storefrontName ?? seller.displayName ?? seller.name,
        tagline: seller.category ?? undefined,
        description: seller.description ?? undefined,
        logoUrl: undefined,
        coverUrl: undefined,
        isPublished: false
      },
      include: { taxonomyLinks: { include: { taxonomyNode: true }, orderBy: { sortOrder: 'asc' } } }
    });
    return this.serializeStorefrontWithProfile(created, seller.userId ?? userId);
  }

  async updateMyStorefront(userId: string, payload: UpdateStorefrontDto) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const existing = await this.prisma.storefront.findUnique({
      where: { sellerId: seller.id },
      include: { taxonomyLinks: { include: { taxonomyNode: true }, orderBy: { sortOrder: 'asc' } } }
    });
    if (payload.taxonomyNodeIds) {
      if (payload.taxonomyNodeIds.length > 0) {
        await this.taxonomyService.assertNodesInActiveTree(payload.taxonomyNodeIds);
        await this.taxonomyService.ensureCoverageForNodes(userId, payload.taxonomyNodeIds);
      }
    }
    const slug = payload.slug
      ? await this.ensureUniqueSlug(payload.slug, existing?.id)
      : existing?.slug ?? (await this.ensureUniqueSlug(seller.handle ?? seller.storefrontName ?? seller.name));
    const previousSlug = existing?.slug ?? null;

    const data: Prisma.StorefrontUncheckedUpdateInput = {
      slug,
      name: payload.name ?? existing?.name ?? seller.storefrontName ?? seller.displayName ?? seller.name,
      tagline: payload.tagline ?? undefined,
      description: payload.description ?? undefined,
      heroTitle: payload.heroTitle ?? undefined,
      heroSubtitle: payload.heroSubtitle ?? undefined,
      heroMediaUrl: payload.heroMediaUrl ?? undefined,
      logoUrl: payload.logoUrl ?? undefined,
      coverUrl: payload.coverUrl ?? undefined,
      theme: payload.theme as Prisma.InputJsonValue | undefined,
      isPublished: payload.isPublished ?? undefined
    };

    const updated = existing
      ? await this.prisma.storefront.update({
          where: { id: existing.id },
          data,
          include: { taxonomyLinks: { include: { taxonomyNode: true }, orderBy: { sortOrder: 'asc' } } }
        })
      : await this.prisma.storefront.create({
          data: {
            sellerId: seller.id,
            ...(data as Prisma.StorefrontUncheckedCreateInput)
          },
          include: { taxonomyLinks: { include: { taxonomyNode: true }, orderBy: { sortOrder: 'asc' } } }
        });

    if (payload.taxonomyNodeIds) {
      await this.taxonomyService.syncStorefrontTaxonomy(userId, payload.taxonomyNodeIds, payload.primaryTaxonomyNodeId);
      const refreshed = await this.prisma.storefront.findUnique({
        where: { id: updated.id },
        include: { taxonomyLinks: { include: { taxonomyNode: true }, orderBy: { sortOrder: 'asc' } } }
      });
      if (refreshed) {
        await this.searchService.enqueueStorefrontIndex(refreshed.id);
        await this.invalidateAndWarmPublicStorefront(previousSlug, refreshed.slug, refreshed.isPublished);
        return this.serializeStorefrontWithProfile(refreshed, seller.userId ?? userId);
      }
    }
    await this.searchService.enqueueStorefrontIndex(updated.id);
    await this.invalidateAndWarmPublicStorefront(previousSlug, updated.slug, updated.isPublished);
    return this.serializeStorefrontWithProfile(updated, seller.userId ?? userId);
  }

  async getPublicStorefront(handle: string) {
    const cached = await this.cacheLayer.getOrSet(
      this.publicCache.storefrontKey(handle),
      this.publicCache.storefrontTtlMs(),
      async () => {
        const storefront = await this.resolveStorefront(handle, this.prismaReadClient);
        if (!storefront || !storefront.isPublished) {
          return { found: false as const };
        }

        return {
          found: true as const,
          storefront: await this.serializeStorefrontWithProfile(storefront, storefront.seller?.userId ?? null)
        };
      }
    );

    if (!cached.found) {
      throw new NotFoundException('Storefront not found');
    }

    return cached.storefront;
  }

  async listStorefrontListings(handle: string, query?: ListQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    const cached = await this.cacheLayer.getOrSet(
      this.publicCache.storefrontListingsKey(handle, skip, take),
      this.publicCache.publicReadTtlMs(),
      async () => {
        const storefront = await this.resolveStorefront(handle, this.prismaReadClient);
        if (!storefront || !storefront.isPublished) {
          return { found: false as const };
        }

        const listings = await this.prismaReadClient.marketplaceListing.findMany({
          where: {
            sellerId: storefront.sellerId,
            status: 'ACTIVE'
          },
          skip,
          take,
          include: { taxonomyLinks: true, seller: true },
          orderBy: { createdAt: 'desc' }
        });

        return {
          found: true as const,
          listings: listings.map((listing) => serializeListingPublic(listing as any))
        };
      }
    );

    if (!cached.found) {
      throw new NotFoundException('Storefront not found');
    }

    return cached.listings;
  }

  async warmPublicStorefrontCache(handle: string) {
    await Promise.all([
      this.getPublicStorefront(handle).catch(() => null),
      this.listStorefrontListings(handle, { limit: this.publicCache.warmListingsLimit() } as ListQueryDto).catch(
        () => null
      )
    ]);
  }

  private async resolveStorefront(handle: string, client: PrismaService | ReadPrismaService = this.prismaReadClient) {
    return client.storefront.findFirst({
      where: {
        OR: [{ slug: handle }, { seller: { handle } }]
      },
      include: {
        seller: true,
        taxonomyLinks: { include: { taxonomyNode: true }, orderBy: { sortOrder: 'asc' } }
      }
    });
  }

  private async loadProfileSettings(userId: string | null | undefined) {
    if (!userId) {
      return null;
    }
    const userSettingClient = (this.prismaReadClient as unknown as { userSetting?: { findUnique: (args: unknown) => Promise<{ payload?: unknown } | null> } }).userSetting;
    if (!userSettingClient?.findUnique) {
      return null;
    }
    const record = await userSettingClient.findUnique({
      where: { userId_key: { userId, key: 'profile' } }
    });
    return record?.payload && typeof record.payload === 'object' && !Array.isArray(record.payload)
      ? (record.payload as Record<string, unknown>)
      : null;
  }

  private async serializeStorefrontWithProfile(
    storefront: {
      id: string;
      sellerId: string;
      slug: string;
      name: string;
      tagline: string | null;
      description: string | null;
      heroTitle: string | null;
      heroSubtitle: string | null;
      heroMediaUrl: string | null;
      logoUrl: string | null;
      coverUrl: string | null;
      theme: unknown;
      isPublished: boolean;
      taxonomyLinks: Array<{
        id: string;
        taxonomyNodeId: string;
        isPrimary: boolean;
        sortOrder: number;
        pathSnapshot: unknown;
        taxonomyNode: {
          id: string;
          name: string;
          slug: string;
          kind: string;
          path: string;
        };
      }>;
      createdAt: Date;
      updatedAt: Date;
    },
    userId?: string | null
  ) {
    const profilePayload = await this.loadProfileSettings(userId);
    return this.serializeStorefront(storefront, profilePayload);
  }

  private async ensureUniqueSlug(value: string, currentId?: string) {
    const base = this.normalizeSlug(value);
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
      const existing = await this.prisma.storefront.findUnique({ where: { slug: candidate } });
      if (!existing || existing.id === currentId) {
        return candidate;
      }
    }

    return `${base}-${Date.now()}`;
  }

  private async invalidateAndWarmPublicStorefront(
    previousSlug: string | null,
    nextSlug: string,
    shouldWarm: boolean
  ) {
    const handles = new Set([previousSlug, nextSlug].filter(Boolean) as string[]);
    await Promise.all(Array.from(handles).map((handle) => this.publicCache.invalidateStorefront(handle)));

    if (!shouldWarm) {
      return;
    }

    await this.jobQueue.enqueue({
      queue: 'cache',
      type: 'CACHE_WARM_PUBLIC_READ',
      payload: {
        target: 'storefront',
        handle: nextSlug
      },
      dedupeKey: `cache-warm:storefront:${nextSlug}`
    });
  }

  private normalizeSlug(value: string) {
    return (
      String(value || 'storefront')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'storefront'
    );
  }

  private serializeStorefront(storefront: {
    id: string;
    sellerId: string;
    slug: string;
    name: string;
    tagline: string | null;
    description: string | null;
    heroTitle: string | null;
    heroSubtitle: string | null;
    heroMediaUrl: string | null;
    logoUrl: string | null;
    coverUrl: string | null;
    theme: unknown;
    isPublished: boolean;
    taxonomyLinks: Array<{
      id: string;
      taxonomyNodeId: string;
      isPrimary: boolean;
      sortOrder: number;
      pathSnapshot: unknown;
      taxonomyNode: {
        id: string;
        name: string;
        slug: string;
        kind: string;
        path: string;
      };
    }>;
    createdAt: Date;
    updatedAt: Date;
  }, profilePayload?: Record<string, unknown> | null) {
    const profile =
      profilePayload?.profile && typeof profilePayload.profile === 'object' && !Array.isArray(profilePayload.profile)
        ? (profilePayload.profile as Record<string, unknown>)
        : {};
    const identity =
      profile.identity && typeof profile.identity === 'object' && !Array.isArray(profile.identity)
        ? (profile.identity as Record<string, unknown>)
        : {};
    const policies =
      profile.policies && typeof profile.policies === 'object' && !Array.isArray(profile.policies)
        ? (profile.policies as Record<string, unknown>)
        : {};
    return {
      id: storefront.id,
      sellerId: storefront.sellerId,
      slug: storefront.slug,
      name: storefront.name,
      tagline: storefront.tagline,
      description: storefront.description,
      heroTitle: storefront.heroTitle,
      heroSubtitle: storefront.heroSubtitle,
      heroMediaUrl: storefront.heroMediaUrl,
      logoUrl: storefront.logoUrl,
      coverUrl: storefront.coverUrl,
      website: typeof identity.website === 'string' ? identity.website : null,
      policies: {
        termsUrl: typeof policies.termsUrl === 'string' ? policies.termsUrl : null,
        privacyUrl: typeof policies.privacyUrl === 'string' ? policies.privacyUrl : null
      },
      theme: storefront.theme ?? {},
      isPublished: storefront.isPublished,
      taxonomy: storefront.taxonomyLinks.map((link) => ({
        id: link.taxonomyNodeId,
        name: link.taxonomyNode?.name ?? '',
        slug: link.taxonomyNode?.slug ?? '',
        kind: link.taxonomyNode?.kind ?? '',
        path: link.taxonomyNode?.path ?? '',
        isPrimary: link.isPrimary,
        sortOrder: link.sortOrder,
        pathSnapshot: link.pathSnapshot ?? null
      })),
      createdAt: storefront.createdAt.toISOString(),
      updatedAt: storefront.updatedAt.toISOString()
    };
  }
}
