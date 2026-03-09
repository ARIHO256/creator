import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ListQueryDto, normalizeListQuery } from '../../common/dto/list-query.dto.js';
import { serializeListingPublic } from '../../common/serializers/listing.serializer.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { SellersService } from '../sellers/sellers.service.js';
import { TaxonomyService } from '../taxonomy/taxonomy.service.js';
import { UpdateStorefrontDto } from './dto/update-storefront.dto.js';

@Injectable()
export class StorefrontService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sellersService: SellersService,
    private readonly taxonomyService: TaxonomyService
  ) {}

  async getMyStorefront(userId: string) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const existing = await this.prisma.storefront.findUnique({
      where: { sellerId: seller.id },
      include: { taxonomyLinks: { include: { taxonomyNode: true }, orderBy: { sortOrder: 'asc' } } }
    });
    if (existing) {
      return this.serializeStorefront(existing);
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
    return this.serializeStorefront(created);
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
        return this.serializeStorefront(refreshed);
      }
    }

    return this.serializeStorefront(updated);
  }

  async getPublicStorefront(handle: string) {
    const storefront = await this.resolveStorefront(handle);
    if (!storefront || !storefront.isPublished) {
      throw new NotFoundException('Storefront not found');
    }

    return this.serializeStorefront(storefront);
  }

  async listStorefrontListings(handle: string, query?: ListQueryDto) {
    const storefront = await this.resolveStorefront(handle);
    if (!storefront || !storefront.isPublished) {
      throw new NotFoundException('Storefront not found');
    }

    const { skip, take } = normalizeListQuery(query);
    const listings = await this.prisma.marketplaceListing.findMany({
      where: {
        sellerId: storefront.sellerId,
        status: 'ACTIVE'
      },
      skip,
      take,
      include: { taxonomyLinks: true, seller: true },
      orderBy: { createdAt: 'desc' }
    });
    return listings.map((listing) => serializeListingPublic(listing as any));
  }

  private async resolveStorefront(handle: string) {
    return this.prisma.storefront.findFirst({
      where: {
        OR: [{ slug: handle }, { seller: { handle } }]
      },
      include: {
        seller: true,
        taxonomyLinks: { include: { taxonomyNode: true }, orderBy: { sortOrder: 'asc' } }
      }
    });
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
  }) {
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
