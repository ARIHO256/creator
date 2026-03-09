import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizeListQuery } from '../../common/dto/list-query.dto.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { SellersService } from '../sellers/sellers.service.js';
import { CatalogMediaQueryDto } from './dto/catalog-media-query.dto.js';
import { ImportCatalogTemplatesDto } from './dto/catalog-templates-import.dto.js';
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
    const where = this.buildTemplateWhere(seller.id, query);
    const templates = await this.prisma.catalogTemplate.findMany({
      where,
      skip,
      take,
      orderBy: { updatedAt: 'desc' }
    });
    return { templates };
  }

  async exportTemplates(userId: string, query?: CatalogTemplatesQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const where = this.buildTemplateWhere(seller.id, query);
    const templates = await this.prisma.catalogTemplate.findMany({
      where,
      skip,
      take,
      orderBy: { updatedAt: 'desc' }
    });
    return {
      templates: templates.map((template) => ({
        id: template.id,
        name: template.name,
        kind: template.kind,
        category: template.category ?? undefined,
        notes: template.notes ?? undefined,
        language: template.language ?? undefined,
        attrs: this.resolveTemplateAttrs(template),
        status: template.status as 'ACTIVE' | 'ARCHIVED',
        payload: (template.payload ?? {}) as Record<string, unknown>,
        metadata: (template.metadata ?? {}) as Record<string, unknown>
      }))
    };
  }

  async createTemplate(userId: string, body: CreateCatalogTemplateDto) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    if (!body.name.trim() || !body.kind.trim()) {
      throw new BadRequestException('Template name and kind are required');
    }
    const attrs = Array.isArray(body.attrs) ? body.attrs : [];
    const payload = {
      ...(body.payload ?? {}),
      ...(attrs.length ? { attrs } : {})
    };
    const template = await this.prisma.catalogTemplate.create({
      data: {
        sellerId: seller.id,
        name: body.name.trim(),
        kind: body.kind.trim(),
        category: body.category?.trim() ?? null,
        notes: body.notes ?? null,
        language: body.language ?? null,
        attrCount: attrs.length,
        attributes: attrs.length ? (attrs as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
        status: body.status ?? 'ACTIVE',
        payload: payload as Prisma.InputJsonValue,
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
    const attrs = Array.isArray(body.attrs) ? body.attrs : undefined;
    const payload = body.payload
      ? {
          ...(body.payload ?? {}),
          ...(attrs ? { attrs } : {})
        }
      : undefined;
    return this.prisma.catalogTemplate.update({
      where: { id: existing.id },
      data: {
        name: body.name ? body.name.trim() : undefined,
        kind: body.kind ? body.kind.trim() : undefined,
        category: body.category ? body.category.trim() : undefined,
        notes: body.notes ?? undefined,
        language: body.language ?? undefined,
        attrCount: attrs ? attrs.length : undefined,
        attributes: attrs ? (attrs as unknown as Prisma.InputJsonValue) : undefined,
        status: body.status ?? undefined,
        payload: payload ? (payload as Prisma.InputJsonValue) : undefined,
        metadata: body.metadata ? (body.metadata as Prisma.InputJsonValue) : undefined
      }
    });
  }

  async importTemplates(userId: string, body: ImportCatalogTemplatesDto) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const mode = body.mode ?? 'UPSERT';
    const items = Array.isArray(body.templates) ? body.templates : [];
    if (!items.length) {
      throw new BadRequestException('Templates are required');
    }
    const normalized = items.map((item) => ({
      name: item.name.trim(),
      kind: item.kind.trim(),
      category: item.category?.trim() ?? null,
      notes: item.notes ?? null,
      language: item.language ?? null,
      attrs: Array.isArray(item.attrs) ? item.attrs : [],
      payload: item.payload ?? {},
      status: item.status ?? 'ACTIVE',
      metadata: item.metadata ?? {}
    }));
    const lookupPairs = normalized.map((item) => ({ name: item.name, kind: item.kind }));
    const existing = await this.prisma.catalogTemplate.findMany({
      where: {
        sellerId: seller.id,
        OR: lookupPairs
      }
    });
    const existingMap = new Map(existing.map((template) => [`${template.name}::${template.kind}`, template]));
    const result = { created: 0, updated: 0, skipped: 0, templates: [] as any[] };

    await this.prisma.$transaction(async (tx) => {
      for (const item of normalized) {
        if (!item.name || !item.kind) {
          result.skipped += 1;
          continue;
        }
        const key = `${item.name}::${item.kind}`;
        const current = existingMap.get(key);
        const attrs = item.attrs;
        const payload = {
          ...(item.payload ?? {}),
          ...(attrs.length ? { attrs } : {})
        };
        if (current) {
          if (mode === 'CREATE_ONLY') {
            result.skipped += 1;
            continue;
          }
          const updated = await tx.catalogTemplate.update({
            where: { id: current.id },
            data: {
              name: item.name,
              kind: item.kind,
              category: item.category,
              notes: item.notes,
              language: item.language,
              attrCount: attrs.length,
              attributes: attrs.length ? (attrs as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
              status: item.status,
              payload: payload as Prisma.InputJsonValue,
              metadata: item.metadata as Prisma.InputJsonValue
            }
          });
          result.updated += 1;
          result.templates.push(updated);
          continue;
        }
        if (mode === 'UPDATE_ONLY') {
          result.skipped += 1;
          continue;
        }
        const created = await tx.catalogTemplate.create({
          data: {
            sellerId: seller.id,
            name: item.name,
            kind: item.kind,
            category: item.category,
            notes: item.notes,
            language: item.language,
            attrCount: attrs.length,
            attributes: attrs.length ? (attrs as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
            status: item.status,
            payload: payload as Prisma.InputJsonValue,
            metadata: item.metadata as Prisma.InputJsonValue
          }
        });
        result.created += 1;
        result.templates.push(created);
      }
    });

    return result;
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

  private buildTemplateWhere(sellerId: string, query?: CatalogTemplatesQueryDto) {
    const where: Prisma.CatalogTemplateWhereInput = {
      sellerId,
      ...(query?.status ? { status: query.status } : {}),
      ...(query?.kind ? { kind: query.kind } : {}),
      ...(query?.category ? { category: query.category } : {}),
      ...(query?.language ? { language: query.language } : {}),
      ...(query?.q
        ? {
            OR: [
              { name: { contains: query.q } },
              { category: { contains: query.q } },
              { kind: { contains: query.q } }
            ]
          }
        : {})
    };
    return where;
  }

  private resolveTemplateAttrs(template: { attributes?: Prisma.JsonValue; payload?: Prisma.JsonValue }) {
    if (Array.isArray(template.attributes)) {
      return template.attributes as unknown[];
    }
    const payloadAttrs = (template.payload as Record<string, unknown> | null | undefined)?.attrs;
    if (Array.isArray(payloadAttrs)) {
      return payloadAttrs;
    }
    return [];
  }
}
