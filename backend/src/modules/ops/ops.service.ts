import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CacheService } from '../../platform/cache/cache.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { SellersService } from '../sellers/sellers.service.js';
import { OpsSummaryQueryDto } from './dto/ops-summary-query.dto.js';

@Injectable()
export class OpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sellersService: SellersService,
    private readonly cache: CacheService
  ) {}

  async overview(userId: string, query?: OpsSummaryQueryDto) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const channel = query?.channel;
    const marketplace = query?.marketplace;
    const dateRange = this.parseDateRange(query?.from, query?.to);
    const cacheKey = `ops:overview:${seller.id}:${channel ?? ''}:${marketplace ?? ''}:${query?.from ?? ''}:${query?.to ?? ''}`;

    return this.cache.getOrSet(cacheKey, 15_000, async () => {
      const [listings, orders, returnsCount, disputesCount, documentsCount, exportsCount] =
        await Promise.all([
          this.prisma.marketplaceListing.count({
            where: {
              sellerId: seller.id,
              ...(marketplace ? { marketplace } : {}),
              ...(dateRange ? { createdAt: dateRange } : {})
            }
          }),
          this.prisma.order.count({
            where: {
              sellerId: seller.id,
              ...(channel ? { channel } : {}),
              ...(dateRange ? { createdAt: dateRange } : {})
            }
          }),
          this.prisma.sellerReturn.count({
            where: { sellerId: seller.id, ...(dateRange ? { requestedAt: dateRange } : {}) }
          }),
          this.prisma.sellerDispute.count({
            where: { sellerId: seller.id, ...(dateRange ? { openedAt: dateRange } : {}) }
          }),
          this.prisma.sellerDocument.count({
            where: { sellerId: seller.id, ...(dateRange ? { uploadedAt: dateRange } : {}) }
          }),
          this.prisma.sellerExportJob.count({
            where: { sellerId: seller.id, ...(dateRange ? { requestedAt: dateRange } : {}) }
          })
        ]);

      return {
        listings,
        orders,
        returns: returnsCount,
        disputes: disputesCount,
        documents: documentsCount,
        exports: exportsCount
      };
    });
  }

  async overviewPage(userId: string) {
    return this.loadSetting(userId, 'ops_overview_page');
  }

  async inventory(userId: string) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const rows = await this.prisma.marketplaceListing.findMany({
      where: { sellerId: seller.id },
      include: { inventorySlots: { include: { warehouse: true } } },
      orderBy: { updatedAt: 'desc' }
    });
    return { rows };
  }

  async inventoryPage(userId: string) {
    return this.loadSetting(userId, 'ops_inventory_page');
  }

  async shipping(userId: string) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const profiles = await this.prisma.shippingProfile.findMany({
      where: { sellerId: seller.id },
      include: { rates: true },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }]
    });
    return { profiles };
  }

  async warehouses(userId: string) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const [warehouses, extras] = await Promise.all([
      this.prisma.sellerWarehouse.findMany({
        where: { sellerId: seller.id },
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }]
      }),
      this.loadSetting(userId, 'ops_warehouses_page')
    ]);
    return {
      warehouses,
      rules: Array.isArray((extras as Record<string, unknown> | null)?.rules)
        ? ((extras as Record<string, unknown>).rules as unknown[])
        : [],
      buyerPrefs: Array.isArray((extras as Record<string, unknown> | null)?.buyerPrefs)
        ? ((extras as Record<string, unknown>).buyerPrefs as unknown[])
        : []
    };
  }

  async documents(userId: string) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const [documents, extras] = await Promise.all([
      this.prisma.sellerDocument.findMany({
        where: { sellerId: seller.id },
        orderBy: { uploadedAt: 'desc' }
      }),
      this.loadSetting(userId, 'ops_documents_page')
    ]);
    return {
      documents,
      templates: Array.isArray((extras as Record<string, unknown> | null)?.templates)
        ? ((extras as Record<string, unknown>).templates as unknown[])
        : []
    };
  }

  async exports(userId: string) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const [jobs, extras] = await Promise.all([
      this.prisma.sellerExportJob.findMany({
        where: { sellerId: seller.id },
        orderBy: { requestedAt: 'desc' }
      }),
      this.loadSetting(userId, 'ops_exports_page')
    ]);
    return {
      jobs,
      templates: Array.isArray((extras as Record<string, unknown> | null)?.templates)
        ? ((extras as Record<string, unknown>).templates as unknown[])
        : [],
      schedules: Array.isArray((extras as Record<string, unknown> | null)?.schedules)
        ? ((extras as Record<string, unknown>).schedules as unknown[])
        : []
    };
  }

  async exceptions(userId: string) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const [returns, disputes] = await Promise.all([
      this.prisma.sellerReturn.findMany({
        where: { sellerId: seller.id },
        orderBy: { requestedAt: 'desc' },
        take: 50
      }),
      this.prisma.sellerDispute.findMany({
        where: { sellerId: seller.id },
        orderBy: { openedAt: 'desc' },
        take: 50
      })
    ]);
    return { returns, disputes };
  }

  async compliancePage(userId: string) {
    return this.loadSetting(userId, 'ops_compliance_page');
  }

  async updateOverviewPage(userId: string, body: Record<string, unknown>) {
    return this.upsertSetting(userId, 'ops_overview_page', body);
  }

  async updateInventoryPage(userId: string, body: Record<string, unknown>) {
    return this.upsertSetting(userId, 'ops_inventory_page', body);
  }

  async updateCompliancePage(userId: string, body: Record<string, unknown>) {
    return this.upsertSetting(userId, 'ops_compliance_page', body);
  }

  private parseDateRange(from?: string, to?: string) {
    if (!from && !to) return null;
    const start = from ? this.parseDate(from, 'from') : undefined;
    const end = to ? this.parseDate(to, 'to') : undefined;
    return {
      gte: start ?? undefined,
      lte: end ?? undefined
    };
  }

  private parseDate(value: string, field: string) {
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) {
      throw new BadRequestException(`Invalid ${field} date`);
    }
    return date;
  }

  private async loadSetting(userId: string, key: string) {
    const setting = await this.prisma.workspaceSetting.findUnique({
      where: {
        userId_key: {
          userId,
          key
        }
      }
    });
    return (setting?.payload as Record<string, unknown> | null) ?? null;
  }

  private async upsertSetting(userId: string, key: string, body: Record<string, unknown>) {
    const sanitized = body as Prisma.InputJsonValue;
    const record = await this.prisma.workspaceSetting.upsert({
      where: {
        userId_key: {
          userId,
          key
        }
      },
      update: {
        payload: sanitized
      },
      create: {
        userId,
        key,
        payload: sanitized
      }
    });
    return record.payload as Record<string, unknown>;
  }
}
