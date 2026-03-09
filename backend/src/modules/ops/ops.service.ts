import { BadRequestException, Injectable } from '@nestjs/common';
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

  async inventory(userId: string) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const rows = await this.prisma.marketplaceListing.findMany({
      where: { sellerId: seller.id },
      include: { inventorySlots: { include: { warehouse: true } } },
      orderBy: { updatedAt: 'desc' }
    });
    return { rows };
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
    const warehouses = await this.prisma.sellerWarehouse.findMany({
      where: { sellerId: seller.id },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }]
    });
    return { warehouses };
  }

  async documents(userId: string) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const documents = await this.prisma.sellerDocument.findMany({
      where: { sellerId: seller.id },
      orderBy: { uploadedAt: 'desc' }
    });
    return { documents };
  }

  async exports(userId: string) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const jobs = await this.prisma.sellerExportJob.findMany({
      where: { sellerId: seller.id },
      orderBy: { requestedAt: 'desc' }
    });
    return { jobs };
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
}
