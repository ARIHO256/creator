import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TransactionStatus } from '@prisma/client';
import { normalizeListQuery } from '../../common/dto/list-query.dto.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { CacheService } from '../../platform/cache/cache.service.js';
import { SellersService } from '../sellers/sellers.service.js';
import { TaxonomyService } from '../taxonomy/taxonomy.service.js';
import { CreateDisputeDto } from './dto/create-dispute.dto.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { CreateExportJobDto } from './dto/create-export-job.dto.js';
import { CreateInventoryAdjustmentDto } from './dto/create-inventory-adjustment.dto.js';
import { CreateReturnDto } from './dto/create-return.dto.js';
import { DashboardSummaryQueryDto } from './dto/dashboard-summary.dto.js';
import { SellerDisputesQueryDto } from './dto/seller-disputes-query.dto.js';
import { SellerListingsQueryDto } from './dto/seller-listings-query.dto.js';
import { SellerOrdersQueryDto } from './dto/seller-orders-query.dto.js';
import { SellerReturnsQueryDto } from './dto/seller-returns-query.dto.js';
import { UpdateOrderDto } from './dto/update-order.dto.js';
import { CreateShippingProfileDto } from './dto/create-shipping-profile.dto.js';
import { CreateShippingRateDto } from './dto/create-shipping-rate.dto.js';
import { CreateWarehouseDto } from './dto/create-warehouse.dto.js';
import { UpdateDisputeDto } from './dto/update-dispute.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
import { UpdateReturnDto } from './dto/update-return.dto.js';
import { UpdateShippingProfileDto } from './dto/update-shipping-profile.dto.js';
import { UpdateShippingRateDto } from './dto/update-shipping-rate.dto.js';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto.js';

@Injectable()
export class CommerceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taxonomyService: TaxonomyService,
    private readonly sellersService: SellersService,
    private readonly cache: CacheService
  ) {}

  async dashboard(userId: string) {
    const [listingCount, orderCount] = await Promise.all([
      this.prisma.marketplaceListing.count({ where: { userId } }),
      this.prisma.order.count({ where: { seller: { userId } } })
    ]);

    return {
      quickActions: [
        { key: 'new-listing', label: 'New Listing', to: '/listings/new' },
        { key: 'orders', label: 'Orders', to: '/orders' }
      ],
      hero: {
        name: 'Seller Workspace',
        sub: 'Unified seller operations and growth command center.',
        ctaLabel: 'Open Listings',
        ctaTo: '/listings',
        chipWhenMLDZ: 'LiveDealz enabled',
        chipWhenNoMLDZ: 'Core commerce'
      },
      featured: {
        title: 'Operations Snapshot',
        sub: `${listingCount} listings and ${orderCount} tracked orders`,
        ctaLabel: 'Open Ops',
        ctaTo: '/ops'
      },
      bases: {
        revenueBase: 100,
        ordersBase: 100,
        trustBase: 100
      }
    };
  }

  async dashboardSummary(userId: string, query?: DashboardSummaryQueryDto) {
    const channels = this.parseCsv(query?.channels);
    const marketplaces = this.parseCsv(query?.marketplaces);
    const cacheKey = `seller:dashboardSummary:${userId}:${query?.range ?? ''}:${query?.from ?? ''}:${query?.to ?? ''}:${channels.join('|')}:${marketplaces.join('|')}`;
    return this.cache.getOrSet(cacheKey, 15_000, async () => {
      const seller = await this.sellersService.ensureSellerProfile(userId);
      const dateRange = this.parseDateRange(query?.from, query?.to);
      const transactionWhere: Prisma.TransactionWhereInput = {
        sellerId: seller.id,
        status: { in: [TransactionStatus.PENDING, TransactionStatus.AVAILABLE, TransactionStatus.PAID] },
        createdAt: dateRange ?? undefined,
        ...(channels.length > 0 ? { order: { channel: { in: channels } } } : {})
      };

      const orderWhere: Prisma.OrderWhereInput = {
        sellerId: seller.id,
        createdAt: dateRange ?? undefined,
        ...(channels.length > 0 ? { channel: { in: channels } } : {})
      };

      const reviewWhere: Prisma.ReviewWhereInput = {
        subjectUserId: userId,
        status: 'PUBLISHED',
        createdAt: dateRange ?? undefined,
        ...(channels.length > 0 ? { channel: { in: channels } } : {})
      };

      const [
        listingCount,
        orderCount,
        openOrders,
        transactionTotals,
        reviewAverage,
        reviewTotal,
        repliedCount,
        needsReply,
        flaggedCount,
        negativeCount
      ] = await Promise.all([
        this.prisma.marketplaceListing.count({
          where: {
            userId,
            ...(marketplaces.length > 0 ? { marketplace: { in: marketplaces } } : {})
          }
        }),
        this.prisma.order.count({ where: orderWhere }),
        this.prisma.order.count({
          where: { ...orderWhere, status: { in: ['NEW', 'CONFIRMED', 'PACKED', 'ON_HOLD'] } }
        }),
        this.prisma.transaction.aggregate({
          where: transactionWhere,
          _sum: { amount: true }
        }),
        this.prisma.review.aggregate({
          where: reviewWhere,
          _avg: { ratingOverall: true }
        }),
        this.prisma.review.count({ where: reviewWhere }),
        this.prisma.review.count({ where: { ...reviewWhere, replies: { some: {} } } }),
        this.prisma.review.count({
          where: { ...reviewWhere, requiresResponse: true, replies: { none: {} } }
        }),
        this.prisma.review.count({ where: { ...reviewWhere, status: 'FLAGGED' } }),
        this.prisma.review.count({
          where: { ...reviewWhere, sentiment: { in: ['negative', 'NEGATIVE'] } }
        })
      ]);

      const revenueBase = Number(transactionTotals._sum.amount ?? 0);
      const averageRating = Number(reviewAverage._avg.ratingOverall ?? 0);
      const responseRate = reviewTotal ? Math.round((repliedCount / reviewTotal) * 100) : 0;
      const negativePct = reviewTotal ? (negativeCount / reviewTotal) * 100 : 0;
      const trustBase = this.computeTrustScore(averageRating, responseRate, negativePct);

      if (
        listingCount === 0 &&
        orderCount === 0 &&
        revenueBase === 0 &&
        reviewTotal === 0
      ) {
        return {
          ...this.emptyDashboardSummary(),
          range: {
            range: query?.range ?? null,
            from: query?.from ?? null,
            to: query?.to ?? null
          }
        };
      }

      return {
        range: {
          range: query?.range ?? null,
          from: query?.from ?? null,
          to: query?.to ?? null
        },
        bases: {
          revenueBase,
          ordersBase: orderCount,
          trustBase
        },
        counts: {
          listings: listingCount,
          orders: orderCount,
          openOrders,
          reviews: {
            total: reviewTotal,
            averageRating,
            needsReply,
            flagged: flaggedCount,
            responseRate
          }
        }
      };
    });
  }

  async listings(userId: string, query?: SellerListingsQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    const marketplace = (query as SellerListingsQueryDto | undefined)?.marketplace;
    const listings = await this.prisma.marketplaceListing.findMany({
      where: {
        userId,
        ...(marketplace ? { marketplace } : {})
      },
      skip,
      take,
      orderBy: { updatedAt: 'desc' }
    });

    if (listings.length > 0) {
      return listings;
    }

    return { rows: [] };
  }

  async listingDetail(userId: string, id: string) {
    const listing = await this.prisma.marketplaceListing.findFirst({ where: { id, userId } });
    if (listing) {
      return listing;
    }

    throw new NotFoundException('Listing not found');
  }

  async listingWizard(userId: string) {
    const taxonomy = await this.taxonomyService.listingWizardTaxonomy();
    let baseLines: unknown = [];
    try {
      baseLines = await this.taxonomyService.listingWizardLines(userId);
    } catch {
      baseLines = [];
    }
    return {
      taxonomy,
      baseLines,
      copy: {}
    };
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

  private computeTrustScore(avg: number, responseRate: number, negativePct: number) {
    return this.clamp(Math.round(avg * 16 + responseRate * 0.35 - negativePct * 0.45), 0, 100);
  }

  private clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  private emptyDashboardSummary() {
    return {
      range: { range: null, from: null, to: null },
      bases: { revenueBase: 0, ordersBase: 0, trustBase: 0 },
      counts: {
        listings: 0,
        orders: 0,
        openOrders: 0,
        reviews: {
          total: 0,
          averageRating: 0,
          needsReply: 0,
          flagged: 0,
          responseRate: 0
        }
      }
    };
  }

  async orders(userId: string, query?: SellerOrdersQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    const channel = (query as SellerOrdersQueryDto | undefined)?.channel;
    const seller = await this.prisma.seller.findFirst({ where: { userId } });
    const orders = seller
      ? await this.prisma.order.findMany({
          where: {
            sellerId: seller.id,
            ...(channel ? { channel } : {})
          },
          skip,
          take,
          include: { items: true },
          orderBy: { updatedAt: 'desc' }
        })
      : [];

    if (orders.length > 0) {
      return { orders };
    }

    return { orders: [], returns: [], disputes: [] };
  }

  async orderDetail(userId: string, id: string, channel?: string) {
    const seller = await this.prisma.seller.findFirst({ where: { userId } });
    const order = seller
      ? await this.prisma.order.findFirst({
          where: {
            id,
            sellerId: seller.id,
            ...(channel ? { channel } : {})
          },
          include: { items: true, transactions: true }
        })
      : null;

    if (order) {
      return order;
    }

    throw new NotFoundException('Order not found');
  }

  async updateOrder(userId: string, id: string, payload: UpdateOrderDto, channel?: string) {
    const seller = await this.prisma.seller.findFirst({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    const order = await this.prisma.order.findFirst({
      where: {
        id,
        sellerId: seller.id,
        ...(channel ? { channel } : {})
      }
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (payload.status) {
      this.assertOrderTransition(order.status, payload.status);
    }

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: payload.status ? (payload.status as any) : undefined,
        notes: payload.notes ?? undefined,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async returns(userId: string, query?: SellerReturnsQueryDto) {
    const channel = query?.channel;
    const seller = await this.prisma.seller.findFirst({ where: { userId } });
    if (seller) {
      const returns = await this.prisma.sellerReturn.findMany({
        where: {
          sellerId: seller.id,
          ...(channel ? { order: { channel } } : {})
        },
        orderBy: { requestedAt: 'desc' }
      });
      if (returns.length > 0) {
        return returns;
      }
    }

    return [];
  }

  async disputes(userId: string, query?: SellerDisputesQueryDto) {
    const channel = query?.channel;
    const seller = await this.prisma.seller.findFirst({ where: { userId } });
    if (seller) {
      const disputes = await this.prisma.sellerDispute.findMany({
        where: {
          sellerId: seller.id,
          ...(channel ? { order: { channel } } : {})
        },
        orderBy: { openedAt: 'desc' }
      });
      if (disputes.length > 0) {
        return disputes;
      }
    }

    return [];
  }

  async inventory(userId: string) {
    const listings = await this.prisma.marketplaceListing.findMany({
      where: { userId },
      include: { inventorySlots: { include: { warehouse: true } } },
      orderBy: { updatedAt: 'desc' }
    });

    if (listings.length > 0) {
      return { rows: listings };
    }

    return { rows: [] };
  }

  private parseCsv(value?: string) {
    if (!value) return [];
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  async shippingProfiles(userId: string) {
    const seller = await this.prisma.seller.findFirst({ where: { userId } });
    const profiles = seller
      ? await this.prisma.shippingProfile.findMany({
          where: { sellerId: seller.id },
          include: { rates: true },
          orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }]
        })
      : [];

    if (profiles.length > 0) {
      return { profiles };
    }

    return { profiles: [] };
  }

  async warehouses(userId: string) {
    const seller = await this.prisma.seller.findFirst({ where: { userId } });
    const warehouses = seller
      ? await this.prisma.sellerWarehouse.findMany({
          where: { sellerId: seller.id },
          orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }]
        })
      : [];

    if (warehouses.length > 0) {
      return { warehouses };
    }

    return { warehouses: [] };
  }

  async exports(userId: string) {
    const seller = await this.prisma.seller.findFirst({ where: { userId } });
    const jobs = seller
      ? await this.prisma.sellerExportJob.findMany({
          where: { sellerId: seller.id },
          orderBy: { requestedAt: 'desc' }
        })
      : [];

    if (jobs.length > 0) {
      return { jobs };
    }

    return { jobs: [] };
  }

  async documents(userId: string) {
    const seller = await this.prisma.seller.findFirst({ where: { userId } });
    const documents = seller
      ? await this.prisma.sellerDocument.findMany({
          where: { sellerId: seller.id },
          orderBy: { uploadedAt: 'desc' }
        })
      : [];

    if (documents.length > 0) {
      return { documents };
    }

    return { documents: [] };
  }

  async financeWallets(userId: string) {
    const seller = await this.ensureSeller(userId);
    const totals = await this.prisma.transaction.groupBy({
      by: ['currency', 'status'],
      where: { sellerId: seller.id },
      _sum: { amount: true }
    });

    const wallets = new Map<
      string,
      { currency: string; available: number; pending: number; paid: number; total: number }
    >();
    for (const row of totals) {
      const currency = row.currency ?? 'USD';
      const entry =
        wallets.get(currency) ?? { currency, available: 0, pending: 0, paid: 0, total: 0 };
      const amount = Number(row._sum.amount ?? 0);
      if (row.status === TransactionStatus.AVAILABLE) entry.available += amount;
      if (row.status === TransactionStatus.PENDING) entry.pending += amount;
      if (row.status === TransactionStatus.PAID) entry.paid += amount;
      entry.total = entry.available + entry.pending + entry.paid;
      wallets.set(currency, entry);
    }

    return { wallets: Array.from(wallets.values()) };
  }

  async financeHolds(userId: string) {
    const seller = await this.ensureSeller(userId);
    const holds = await this.prisma.transaction.findMany({
      where: { sellerId: seller.id, status: TransactionStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return {
      holds: holds.map((hold) => ({
        id: hold.id,
        amount: hold.amount,
        currency: hold.currency,
        orderId: hold.orderId,
        status: hold.status,
        availableAt: hold.availableAt,
        createdAt: hold.createdAt,
        note: hold.note
      }))
    };
  }

  async financeInvoices(userId: string) {
    const seller = await this.ensureSeller(userId);
    const orders = await this.prisma.order.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return {
      invoices: orders.map((order) => ({
        id: order.id,
        orderId: order.id,
        total: order.total,
        currency: order.currency,
        status: order.status,
        issuedAt: order.createdAt,
        channel: order.channel,
        itemCount: order.itemCount
      }))
    };
  }

  async financeStatements(userId: string) {
    const seller = await this.ensureSeller(userId);
    const transactions = await this.prisma.transaction.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: 'desc' },
      take: 500
    });

    const statements = new Map<string, { period: string; currency: string; total: number; count: number }>();
    for (const transaction of transactions) {
      const period = transaction.createdAt.toISOString().slice(0, 7);
      const key = `${period}:${transaction.currency}`;
      const entry =
        statements.get(key) ?? { period, currency: transaction.currency, total: 0, count: 0 };
      entry.total += transaction.amount;
      entry.count += 1;
      statements.set(key, entry);
    }

    return { statements: Array.from(statements.values()).sort((a, b) => (a.period < b.period ? 1 : -1)) };
  }

  async financeTaxReports(userId: string) {
    const seller = await this.ensureSeller(userId);
    const transactions = await this.prisma.transaction.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: 'desc' },
      take: 1000
    });

    const reports = new Map<string, { year: string; currency: string; total: number; count: number }>();
    for (const transaction of transactions) {
      const year = String(transaction.createdAt.getUTCFullYear());
      const key = `${year}:${transaction.currency}`;
      const entry =
        reports.get(key) ?? { year, currency: transaction.currency, total: 0, count: 0 };
      entry.total += transaction.amount;
      entry.count += 1;
      reports.set(key, entry);
    }

    return { reports: Array.from(reports.values()).sort((a, b) => (a.year < b.year ? 1 : -1)) };
  }

  async createWarehouse(userId: string, payload: CreateWarehouseDto) {
    const seller = await this.ensureSeller(userId);
    if (payload.isDefault) {
      await this.prisma.sellerWarehouse.updateMany({
        where: { sellerId: seller.id },
        data: { isDefault: false }
      });
    }

    return this.prisma.sellerWarehouse.create({
      data: {
        sellerId: seller.id,
        name: payload.name,
        code: payload.code,
        type: payload.type ?? 'WAREHOUSE',
        status: payload.status ?? 'ACTIVE',
        isDefault: payload.isDefault ?? false,
        address: payload.address as Prisma.InputJsonValue | undefined,
        contact: payload.contact as Prisma.InputJsonValue | undefined,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async updateWarehouse(userId: string, id: string, payload: UpdateWarehouseDto) {
    const seller = await this.ensureSeller(userId);
    const warehouse = await this.prisma.sellerWarehouse.findFirst({
      where: { id, sellerId: seller.id }
    });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    if (payload.isDefault) {
      await this.prisma.sellerWarehouse.updateMany({
        where: { sellerId: seller.id },
        data: { isDefault: false }
      });
    }

    return this.prisma.sellerWarehouse.update({
      where: { id: warehouse.id },
      data: {
        name: payload.name ?? undefined,
        code: payload.code ?? undefined,
        type: payload.type ?? undefined,
        status: payload.status ?? undefined,
        isDefault: payload.isDefault ?? undefined,
        address: payload.address as Prisma.InputJsonValue | undefined,
        contact: payload.contact as Prisma.InputJsonValue | undefined,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async createShippingProfile(userId: string, payload: CreateShippingProfileDto) {
    const seller = await this.ensureSeller(userId);
    if (payload.isDefault) {
      await this.prisma.shippingProfile.updateMany({
        where: { sellerId: seller.id },
        data: { isDefault: false }
      });
    }

    return this.prisma.shippingProfile.create({
      data: {
        sellerId: seller.id,
        name: payload.name,
        description: payload.description,
        status: payload.status ?? 'ACTIVE',
        carrier: payload.carrier,
        serviceLevel: payload.serviceLevel,
        handlingTimeDays: payload.handlingTimeDays,
        regions: payload.regions as Prisma.InputJsonValue | undefined,
        isDefault: payload.isDefault ?? false,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async updateShippingProfile(userId: string, id: string, payload: UpdateShippingProfileDto) {
    const seller = await this.ensureSeller(userId);
    const profile = await this.prisma.shippingProfile.findFirst({
      where: { id, sellerId: seller.id }
    });
    if (!profile) {
      throw new NotFoundException('Shipping profile not found');
    }

    if (payload.isDefault) {
      await this.prisma.shippingProfile.updateMany({
        where: { sellerId: seller.id },
        data: { isDefault: false }
      });
    }

    return this.prisma.shippingProfile.update({
      where: { id: profile.id },
      data: {
        name: payload.name ?? undefined,
        description: payload.description ?? undefined,
        status: payload.status ?? undefined,
        carrier: payload.carrier ?? undefined,
        serviceLevel: payload.serviceLevel ?? undefined,
        handlingTimeDays: payload.handlingTimeDays ?? undefined,
        regions: payload.regions as Prisma.InputJsonValue | undefined,
        isDefault: payload.isDefault ?? undefined,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async createShippingRate(userId: string, profileId: string, payload: CreateShippingRateDto) {
    const seller = await this.ensureSeller(userId);
    const profile = await this.prisma.shippingProfile.findFirst({
      where: { id: profileId, sellerId: seller.id }
    });
    if (!profile) {
      throw new NotFoundException('Shipping profile not found');
    }

    return this.prisma.shippingRate.create({
      data: {
        profileId: profile.id,
        name: payload.name,
        rateType: payload.rateType ?? 'FLAT',
        minWeight: payload.minWeight,
        maxWeight: payload.maxWeight,
        minOrderValue: payload.minOrderValue,
        maxOrderValue: payload.maxOrderValue,
        price: payload.price,
        currency: payload.currency ?? 'USD',
        etaDays: payload.etaDays,
        regions: payload.regions as Prisma.InputJsonValue | undefined,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async updateShippingRate(
    userId: string,
    profileId: string,
    rateId: string,
    payload: UpdateShippingRateDto
  ) {
    const seller = await this.ensureSeller(userId);
    const profile = await this.prisma.shippingProfile.findFirst({
      where: { id: profileId, sellerId: seller.id }
    });
    if (!profile) {
      throw new NotFoundException('Shipping profile not found');
    }

    const rate = await this.prisma.shippingRate.findFirst({
      where: { id: rateId, profileId: profile.id }
    });
    if (!rate) {
      throw new NotFoundException('Shipping rate not found');
    }

    return this.prisma.shippingRate.update({
      where: { id: rate.id },
      data: {
        name: payload.name ?? undefined,
        rateType: payload.rateType ?? undefined,
        minWeight: payload.minWeight ?? undefined,
        maxWeight: payload.maxWeight ?? undefined,
        minOrderValue: payload.minOrderValue ?? undefined,
        maxOrderValue: payload.maxOrderValue ?? undefined,
        price: payload.price ?? undefined,
        currency: payload.currency ?? undefined,
        etaDays: payload.etaDays ?? undefined,
        regions: payload.regions as Prisma.InputJsonValue | undefined,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async createInventoryAdjustment(userId: string, payload: CreateInventoryAdjustmentDto) {
    const seller = await this.ensureSeller(userId);
    const listing = await this.prisma.marketplaceListing.findFirst({
      where: { id: payload.listingId, sellerId: seller.id }
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    const warehouse = await this.resolveWarehouse(seller.id, payload.warehouseId);
    if (!warehouse) {
      throw new BadRequestException('Warehouse is required for inventory adjustments');
    }

    const slotKey = {
      listingId_warehouseId: {
        listingId: listing.id,
        warehouseId: warehouse.id
      }
    };

    const [slot, adjustment] = await this.prisma.$transaction([
      this.prisma.listingInventorySlot.upsert({
        where: slotKey,
        update: {
          onHand: { increment: payload.delta }
        },
        create: {
          listingId: listing.id,
          warehouseId: warehouse.id,
          onHand: payload.delta,
          reserved: 0,
          safetyStock: 0
        }
      }),
      this.prisma.inventoryAdjustment.create({
        data: {
          listingId: listing.id,
          warehouseId: warehouse.id,
          createdByUserId: userId,
          delta: payload.delta,
          reason: payload.reason,
          metadata: payload.metadata as Prisma.InputJsonValue | undefined
        }
      }),
      this.prisma.marketplaceListing.update({
        where: { id: listing.id },
        data: { inventoryCount: { increment: payload.delta } }
      })
    ]);

    return { slot, adjustment };
  }

  async createDocument(userId: string, payload: CreateDocumentDto) {
    const seller = await this.ensureSeller(userId);
    if (payload.listingId) {
      const listing = await this.prisma.marketplaceListing.findFirst({
        where: { id: payload.listingId, sellerId: seller.id }
      });
      if (!listing) {
        throw new NotFoundException('Listing not found');
      }
    }

    return this.prisma.sellerDocument.create({
      data: {
        sellerId: seller.id,
        listingId: payload.listingId,
        type: payload.type,
        channel: payload.channel,
        regions: payload.regions as Prisma.InputJsonValue | undefined,
        fileName: payload.fileName,
        url: payload.url,
        status: payload.status ?? 'UPLOADED',
        uploadedAt: payload.uploadedAt ? new Date(payload.uploadedAt) : new Date(),
        expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : undefined,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async updateDocument(userId: string, id: string, payload: UpdateDocumentDto) {
    const seller = await this.ensureSeller(userId);
    const document = await this.prisma.sellerDocument.findFirst({
      where: { id, sellerId: seller.id }
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (payload.listingId) {
      const listing = await this.prisma.marketplaceListing.findFirst({
        where: { id: payload.listingId, sellerId: seller.id }
      });
      if (!listing) {
        throw new NotFoundException('Listing not found');
      }
    }

    return this.prisma.sellerDocument.update({
      where: { id: document.id },
      data: {
        type: payload.type ?? undefined,
        channel: payload.channel ?? undefined,
        regions: payload.regions as Prisma.InputJsonValue | undefined,
        fileName: payload.fileName ?? undefined,
        url: payload.url ?? undefined,
        status: payload.status ?? undefined,
        uploadedAt: payload.uploadedAt ? new Date(payload.uploadedAt) : undefined,
        expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : undefined,
        listingId: payload.listingId ?? undefined,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async createExportJob(userId: string, payload: CreateExportJobDto) {
    const seller = await this.ensureSeller(userId);
    return this.prisma.sellerExportJob.create({
      data: {
        sellerId: seller.id,
        type: payload.type,
        format: payload.format ?? 'CSV',
        status: 'QUEUED',
        filters: payload.filters as Prisma.InputJsonValue | undefined,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async createReturn(userId: string, payload: CreateReturnDto) {
    const seller = await this.ensureSeller(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: payload.orderId, sellerId: seller.id }
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.prisma.sellerReturn.create({
      data: {
        sellerId: seller.id,
        orderId: order.id,
        status: payload.status ?? 'REQUESTED',
        reason: payload.reason,
        notes: payload.notes,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async updateReturn(userId: string, id: string, payload: UpdateReturnDto) {
    const seller = await this.ensureSeller(userId);
    const existing = await this.prisma.sellerReturn.findFirst({
      where: { id, sellerId: seller.id }
    });
    if (!existing) {
      throw new NotFoundException('Return not found');
    }

    return this.prisma.sellerReturn.update({
      where: { id: existing.id },
      data: {
        status: payload.status ?? undefined,
        reason: payload.reason ?? undefined,
        notes: payload.notes ?? undefined,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined,
        approvedAt: payload.status === 'APPROVED' ? new Date() : undefined,
        receivedAt: payload.status === 'RECEIVED' ? new Date() : undefined,
        refundedAt: payload.status === 'REFUNDED' ? new Date() : undefined
      }
    });
  }

  async createDispute(userId: string, payload: CreateDisputeDto) {
    const seller = await this.ensureSeller(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: payload.orderId, sellerId: seller.id }
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.prisma.sellerDispute.create({
      data: {
        sellerId: seller.id,
        orderId: order.id,
        status: payload.status ?? 'OPEN',
        reason: payload.reason,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async updateDispute(userId: string, id: string, payload: UpdateDisputeDto) {
    const seller = await this.ensureSeller(userId);
    const existing = await this.prisma.sellerDispute.findFirst({
      where: { id, sellerId: seller.id }
    });
    if (!existing) {
      throw new NotFoundException('Dispute not found');
    }

    return this.prisma.sellerDispute.update({
      where: { id: existing.id },
      data: {
        status: payload.status ?? undefined,
        reason: payload.reason ?? undefined,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined,
        resolvedAt: payload.status && ['RESOLVED', 'REJECTED'].includes(payload.status) ? new Date() : undefined
      }
    });
  }

  private assertOrderTransition(current: string, next: string) {
    const transitions: Record<string, string[]> = {
      NEW: ['CONFIRMED', 'CANCELLED', 'ON_HOLD'],
      CONFIRMED: ['PICKING', 'CANCELLED', 'ON_HOLD'],
      PICKING: ['PACKED', 'ON_HOLD', 'CANCELLED'],
      PACKED: ['SHIPPED', 'OUT_FOR_DELIVERY', 'ON_HOLD'],
      OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED'],
      SHIPPED: ['DELIVERED', 'FAILED'],
      DELIVERED: ['RETURN_REQUESTED'],
      RETURN_REQUESTED: ['RETURNED', 'CANCELLED'],
      RETURNED: [],
      FAILED: [],
      ON_HOLD: ['CONFIRMED', 'PICKING', 'PACKED', 'CANCELLED'],
      CANCELLED: []
    };

    const allowed = transitions[current] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(`Order status cannot transition from ${current} to ${next}`);
    }
  }

  private async ensureSeller(userId: string) {
    return this.sellersService.ensureSellerProfile(userId);
  }

  private async resolveWarehouse(sellerId: string, warehouseId?: string) {
    if (warehouseId) {
      return this.prisma.sellerWarehouse.findFirst({
        where: { id: warehouseId, sellerId }
      });
    }

    return this.prisma.sellerWarehouse.findFirst({
      where: { sellerId, isDefault: true }
    });
  }
}
