import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CatalogImportStatus, Prisma } from '@prisma/client';
import { normalizeListQuery } from '../../common/dto/list-query.dto.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { SellersService } from '../sellers/sellers.service.js';
import { JobsService } from '../jobs/jobs.service.js';
import { CatalogMediaQueryDto } from './dto/catalog-media-query.dto.js';
import { CatalogImportJobDto } from './dto/catalog-import-job.dto.js';
import { CatalogPresetQueryDto } from './dto/catalog-preset-query.dto.js';
import { CatalogTemplateValidateDto } from './dto/catalog-template-validate.dto.js';
import { ImportCatalogTemplatesDto } from './dto/catalog-templates-import.dto.js';
import { CatalogTemplatesQueryDto } from './dto/catalog-templates-query.dto.js';
import { CreateCatalogPresetDto } from './dto/create-catalog-preset.dto.js';
import { CreateCatalogTemplateDto } from './dto/create-catalog-template.dto.js';
import { UpdateCatalogPresetDto } from './dto/update-catalog-preset.dto.js';
import { UpdateCatalogTemplateDto } from './dto/update-catalog-template.dto.js';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sellersService: SellersService,
    private readonly jobsService: JobsService
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
    const { normalized, errors } = this.normalizeTemplates(items);
    if (errors.length) {
      throw new BadRequestException('Templates contain validation errors');
    }
    return this.applyImport(seller.id, normalized, mode);
  }

  async presets(userId: string, query?: CatalogPresetQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const presets = await this.prisma.catalogTemplatePreset.findMany({
      where: {
        sellerId: seller.id,
        ...(query?.q ? { name: { contains: query.q } } : {})
      },
      skip,
      take,
      orderBy: { updatedAt: 'desc' }
    });
    return { presets };
  }

  async createPreset(userId: string, body: CreateCatalogPresetDto) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    if (!body.name.trim()) {
      throw new BadRequestException('Preset name is required');
    }
    const templateIds = Array.isArray(body.templateIds) ? body.templateIds : [];
    const templates = templateIds.length
      ? await this.prisma.catalogTemplate.findMany({ where: { sellerId: seller.id, id: { in: templateIds } } })
      : [];
    const payload = body.payload ?? (templates.length ? { templates: templates.map((t) => this.serializeTemplate(t)) } : {});
    return this.prisma.catalogTemplatePreset.create({
      data: {
        sellerId: seller.id,
        name: body.name.trim(),
        description: body.description ?? null,
        templateIds: templateIds.length ? (templateIds as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
        payload: payload as Prisma.InputJsonValue,
        metadata: (body.metadata ?? {}) as Prisma.InputJsonValue
      }
    });
  }

  async updatePreset(userId: string, id: string, body: UpdateCatalogPresetDto) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const preset = await this.prisma.catalogTemplatePreset.findFirst({
      where: { id, sellerId: seller.id }
    });
    if (!preset) {
      throw new NotFoundException('Preset not found');
    }
    const templateIds = Array.isArray(body.templateIds) ? body.templateIds : undefined;
    const templates = templateIds && templateIds.length
      ? await this.prisma.catalogTemplate.findMany({ where: { sellerId: seller.id, id: { in: templateIds } } })
      : undefined;
    const payload = body.payload ?? (templates ? { templates: templates.map((t) => this.serializeTemplate(t)) } : undefined);
    return this.prisma.catalogTemplatePreset.update({
      where: { id: preset.id },
      data: {
        name: body.name ? body.name.trim() : undefined,
        description: body.description ?? undefined,
        templateIds: templateIds ? (templateIds as unknown as Prisma.InputJsonValue) : undefined,
        payload: payload ? (payload as Prisma.InputJsonValue) : undefined,
        metadata: body.metadata ? (body.metadata as Prisma.InputJsonValue) : undefined
      }
    });
  }

  async deletePreset(userId: string, id: string) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const preset = await this.prisma.catalogTemplatePreset.findFirst({
      where: { id, sellerId: seller.id }
    });
    if (!preset) {
      throw new NotFoundException('Preset not found');
    }
    await this.prisma.catalogTemplatePreset.delete({ where: { id: preset.id } });
    return { deleted: true };
  }

  async exportPreset(userId: string, id: string) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const preset = await this.prisma.catalogTemplatePreset.findFirst({
      where: { id, sellerId: seller.id }
    });
    if (!preset) {
      throw new NotFoundException('Preset not found');
    }
    return { preset };
  }

  async validateTemplates(userId: string, body: CatalogTemplateValidateDto) {
    await this.sellersService.ensureSellerProfile(userId);
    const { normalized, errors } = this.normalizeTemplates(body.templates);
    return { valid: errors.length === 0, errors, templates: normalized };
  }

  async createImportJob(userId: string, body: CatalogImportJobDto) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const { normalized, errors } = this.normalizeTemplates(body.templates);
    const job = await this.prisma.catalogImportJob.create({
      data: {
        sellerId: seller.id,
        status: CatalogImportStatus.QUEUED,
        totalCount: normalized.length,
        errorCount: errors.length,
        errorReport: errors.length ? (errors as Prisma.InputJsonValue) : Prisma.DbNull,
        metadata: {
          mode: body.mode ?? 'UPSERT',
          source: body.source ?? 'manual',
          templates: normalized
        } as Prisma.InputJsonValue
      }
    });
    await this.jobsService.enqueue({
      queue: 'catalog',
      type: 'CATALOG_IMPORT',
      payload: { jobId: job.id },
      dedupeKey: `catalog:import:${job.id}`
    });
    return { jobId: job.id, status: job.status, errors };
  }

  async importJob(userId: string, id: string) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const job = await this.prisma.catalogImportJob.findFirst({
      where: { id, sellerId: seller.id }
    });
    if (!job) {
      throw new NotFoundException('Import job not found');
    }
    return job;
  }

  async processImportJob(jobId: string) {
    const job = await this.prisma.catalogImportJob.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Import job not found');
    }
    if (job.status === CatalogImportStatus.COMPLETED) {
      return job;
    }

    await this.prisma.catalogImportJob.update({
      where: { id: job.id },
      data: { status: CatalogImportStatus.RUNNING }
    });

    const metadata = (job.metadata ?? {}) as Record<string, any>;
    const templates = Array.isArray(metadata.templates) ? metadata.templates : [];
    const mode = metadata.mode ?? 'UPSERT';

    const { normalized, errors } = this.normalizeTemplates(templates);
    const result = await this.applyImport(job.sellerId, normalized, mode);
    const errorReport = errors.length ? errors : [];

    await this.prisma.catalogImportJob.update({
      where: { id: job.id },
      data: {
        status: CatalogImportStatus.COMPLETED,
        totalCount: normalized.length,
        successCount: result.created + result.updated,
        errorCount: errorReport.length,
        errorReport: errorReport.length ? (errorReport as Prisma.InputJsonValue) : Prisma.DbNull,
        completedAt: new Date()
      }
    });

    return { ...result, jobId: job.id };
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

  private resolveTemplateAttrs(template: { attributes?: unknown; payload?: unknown }) {
    if (Array.isArray(template.attributes)) {
      return template.attributes as unknown[];
    }
    const payloadAttrs = (template.payload as Record<string, unknown> | null | undefined)?.attrs;
    if (Array.isArray(payloadAttrs)) {
      return payloadAttrs;
    }
    return [];
  }

  private normalizeTemplates(items: any[]) {
    const errors: Array<{ index: number; message: string }> = [];
    const normalized = items.map((item, index) => {
      const name = String(item?.name ?? '').trim();
      const kind = String(item?.kind ?? '').trim();
      if (!name || !kind) {
        errors.push({ index, message: 'name and kind are required' });
      }
      const attrs = Array.isArray(item?.attrs) ? item.attrs : [];
      return {
        name,
        kind,
        category: item?.category ? String(item.category).trim() : null,
        notes: item?.notes ?? null,
        language: item?.language ?? null,
        attrs,
        payload: item?.payload ?? {},
        status: item?.status ?? 'ACTIVE',
        metadata: item?.metadata ?? {}
      };
    });
    return { normalized, errors };
  }

  private async applyImport(sellerId: string, normalized: any[], mode: string) {
    const lookupPairs = normalized.map((item) => ({ name: item.name, kind: item.kind }));
    const existing = await this.prisma.catalogTemplate.findMany({
      where: {
        sellerId,
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
            sellerId,
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

  private serializeTemplate(template: {
    id: string;
    name: string;
    kind: string;
    category: string | null;
    notes: string | null;
    language: string | null;
    attributes: unknown;
    status: string;
    payload: unknown;
    metadata: unknown;
  }) {
    return {
      id: template.id,
      name: template.name,
      kind: template.kind,
      category: template.category ?? undefined,
      notes: template.notes ?? undefined,
      language: template.language ?? undefined,
      attrs: this.resolveTemplateAttrs(template),
      status: template.status,
      payload: template.payload ?? {},
      metadata: template.metadata ?? {}
    };
  }
}
