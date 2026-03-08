import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ListQueryDto, normalizeListQuery } from '../../common/dto/list-query.dto.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { SellersService } from '../sellers/sellers.service.js';
import { UpdateStorefrontDto } from './dto/update-storefront.dto.js';

@Injectable()
export class StorefrontService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sellersService: SellersService
  ) {}

  async getMyStorefront(userId: string) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const existing = await this.prisma.storefront.findUnique({ where: { sellerId: seller.id } });
    if (existing) {
      return existing;
    }

    const slug = await this.ensureUniqueSlug(seller.handle ?? seller.storefrontName ?? seller.displayName ?? seller.name);
    return this.prisma.storefront.create({
      data: {
        sellerId: seller.id,
        slug,
        name: seller.storefrontName ?? seller.displayName ?? seller.name,
        tagline: seller.category ?? undefined,
        description: seller.description ?? undefined,
        logoUrl: undefined,
        coverUrl: undefined,
        isPublished: false
      }
    });
  }

  async updateMyStorefront(userId: string, payload: UpdateStorefrontDto) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const existing = await this.prisma.storefront.findUnique({ where: { sellerId: seller.id } });
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

    if (existing) {
      return this.prisma.storefront.update({
        where: { id: existing.id },
        data
      });
    }

    return this.prisma.storefront.create({
      data: {
        sellerId: seller.id,
        ...(data as Prisma.StorefrontUncheckedCreateInput)
      }
    });
  }

  async getPublicStorefront(handle: string) {
    const storefront = await this.resolveStorefront(handle);
    if (!storefront || !storefront.isPublished) {
      throw new NotFoundException('Storefront not found');
    }

    return storefront;
  }

  async listStorefrontListings(handle: string, query?: ListQueryDto) {
    const storefront = await this.resolveStorefront(handle);
    if (!storefront || !storefront.isPublished) {
      throw new NotFoundException('Storefront not found');
    }

    const { skip, take } = normalizeListQuery(query);
    return this.prisma.marketplaceListing.findMany({
      where: {
        sellerId: storefront.sellerId,
        status: 'ACTIVE'
      },
      skip,
      take,
      include: { taxonomyLinks: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  private async resolveStorefront(handle: string) {
    return this.prisma.storefront.findFirst({
      where: {
        OR: [{ slug: handle }, { seller: { handle } }]
      },
      include: {
        seller: true
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
}
