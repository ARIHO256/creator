import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizeListQuery } from '../../common/dto/list-query.dto.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { SellersService } from '../sellers/sellers.service.js';
import { CatalogMediaQueryDto } from './dto/catalog-media-query.dto.js';
import { CatalogTemplatesQueryDto } from './dto/catalog-templates-query.dto.js';
import { CreateCatalogTemplateDto } from './dto/create-catalog-template.dto.js';
import { UpdateCatalogTemplateDto } from './dto/update-catalog-template.dto.js';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sellersService: SellersService
  ) {}

  async templates(userId: string, query?: CatalogTemplatesQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const where: Prisma.CatalogTemplateWhereInput = {
      sellerId: seller.id,
      ...(query?.status ? { status: query.status } : {}),
      ...(query?.kind ? { kind: query.kind } : {}),
      ...(query?.q
        ? {
            OR: [
              { name: { contains: query.q } },
              { kind: { contains: query.q } }
            ]
          }
        : {})
    };
    const templates = await this.prisma.catalogTemplate.findMany({
      where,
      skip,
      take,
      orderBy: { updatedAt: 'desc' }
    });
    return { templates };
  }

  async createTemplate(userId: string, body: CreateCatalogTemplateDto) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    if (!body.name.trim() || !body.kind.trim()) {
      throw new BadRequestException('Template name and kind are required');
    }
    const template = await this.prisma.catalogTemplate.create({
      data: {
        sellerId: seller.id,
        name: body.name.trim(),
        kind: body.kind.trim(),
        status: body.status ?? 'ACTIVE',
        payload: body.payload as Prisma.InputJsonValue,
        metadata: (body.metadata ?? {}) as Prisma.InputJsonValue
      }
    });
    return template;
  }

  async updateTemplate(userId: string, id: string, body: UpdateCatalogTemplateDto) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const existing = await this.prisma.catalogTemplate.findFirst({
      where: { id, sellerId: seller.id }
    });
    if (!existing) {
      throw new NotFoundException('Catalog template not found');
    }
    return this.prisma.catalogTemplate.update({
      where: { id: existing.id },
      data: {
        name: body.name ? body.name.trim() : undefined,
        kind: body.kind ? body.kind.trim() : undefined,
        status: body.status ?? undefined,
        payload: body.payload ? (body.payload as Prisma.InputJsonValue) : undefined,
        metadata: body.metadata ? (body.metadata as Prisma.InputJsonValue) : undefined
      }
    });
  }

  async mediaLibrary(userId: string, query?: CatalogMediaQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    const where: Prisma.MediaAssetWhereInput = {
      userId,
      ...(query?.kind ? { kind: query.kind } : {}),
      ...(query?.q
        ? {
            OR: [
              { name: { contains: query.q } },
              { kind: { contains: query.q } }
            ]
          }
        : {})
    };
    const assets = await this.prisma.mediaAsset.findMany({
      where,
      skip,
      take,
      orderBy: { updatedAt: 'desc' }
    });
    const filtered = query?.tag
      ? assets.filter((asset) => {
          const tags = Array.isArray((asset.metadata as any)?.tags) ? (asset.metadata as any).tags : [];
          return tags.includes(query.tag);
        })
      : assets;
    return { assets: filtered };
  }
}
