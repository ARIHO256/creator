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
import { BulkListingCommitDto } from './dto/bulk-listing-commit.dto.js';
import { BulkListingValidateDto } from './dto/bulk-listing-validate.dto.js';
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
import { JobsService } from '../jobs/jobs.service.js';
import { ExportsService } from '../exports/exports.service.js';
import { randomUUID } from 'crypto';

type StarterShippingRateTemplate = {
  name: string;
  rateType: 'FLAT' | 'WEIGHT' | 'VALUE' | 'REGION';
  price: number;
  currency: string;
  etaDays: number;
  regions: string[];
};

type StarterShippingProfileTemplate = {
  name: string;
  description: string;
  carrier: string;
  serviceLevel: string;
  handlingTimeDays: number;
  regions: string[];
  metadata: Record<string, unknown>;
  rates: StarterShippingRateTemplate[];
};

const STARTER_SHIPPING_PROFILE_TEMPLATES: StarterShippingProfileTemplate[] = [
  {
    name: 'Starter Standard',
    description: 'Balanced default profile for local and regional parcel deliveries.',
    carrier: 'EVzone Fulfillment',
    serviceLevel: 'Standard',
    handlingTimeDays: 2,
    regions: ['Uganda', 'Kenya', 'Tanzania', 'Rwanda'],
    metadata: {
      source: 'system_seed',
      starterKey: 'starter_standard',
      policyPreset: 'standard'
    },
    rates: [
      {
        name: 'Local parcel',
        rateType: 'FLAT',
        price: 4,
        currency: 'USD',
        etaDays: 2,
        regions: ['Uganda']
      },
      {
        name: 'East Africa parcel',
        rateType: 'FLAT',
        price: 8,
        currency: 'USD',
        etaDays: 4,
        regions: ['Kenya', 'Tanzania', 'Rwanda']
      }
    ]
  },
  {
    name: 'Starter Express',
    description: 'Faster shipping profile for same-day and next-day capable sellers.',
    carrier: 'EVzone Fulfillment',
    serviceLevel: 'Express',
    handlingTimeDays: 1,
    regions: ['Uganda', 'Kenya'],
    metadata: {
      source: 'system_seed',
      starterKey: 'starter_express',
      policyPreset: 'fast'
    },
    rates: [
      {
        name: 'Metro express',
        rateType: 'FLAT',
        price: 7,
        currency: 'USD',
        etaDays: 1,
        regions: ['Uganda']
      },
      {
        name: 'Regional express',
        rateType: 'FLAT',
        price: 12,
        currency: 'USD',
        etaDays: 2,
        regions: ['Kenya']
      }
    ]
  },
  {
    name: 'Starter Cross-Border',
    description: 'Cross-border profile for heavier or non-urgent international orders.',
    carrier: 'EVzone Logistics Network',
    serviceLevel: 'Economy Freight',
    handlingTimeDays: 3,
    regions: ['Uganda', 'Kenya', 'Tanzania', 'Rwanda', 'South Africa', 'China', 'United Arab Emirates'],
    metadata: {
      source: 'system_seed',
      starterKey: 'starter_cross_border',
      policyPreset: 'strict'
    },
    rates: [
      {
        name: 'Cross-border freight',
        rateType: 'FLAT',
        price: 24,
        currency: 'USD',
        etaDays: 7,
        regions: ['South Africa', 'China', 'United Arab Emirates']
      }
    ]
  },
  {
    name: 'Starter Economy',
    description: 'Lower-cost regional profile for price-sensitive orders with a longer delivery window.',
    carrier: 'EVzone Saver Network',
    serviceLevel: 'Economy',
    handlingTimeDays: 4,
    regions: ['Uganda', 'Kenya', 'Tanzania', 'Rwanda', 'Burundi'],
    metadata: {
      source: 'system_seed',
      starterKey: 'starter_economy',
      policyPreset: 'standard'
    },
    rates: [
      {
        name: 'Economy local',
        rateType: 'FLAT',
        price: 3,
        currency: 'USD',
        etaDays: 3,
        regions: ['Uganda']
      },
      {
        name: 'Economy regional',
        rateType: 'FLAT',
        price: 6,
        currency: 'USD',
        etaDays: 6,
        regions: ['Kenya', 'Tanzania', 'Rwanda', 'Burundi']
      }
    ]
  }
];

@Injectable()
export class CommerceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taxonomyService: TaxonomyService,
    private readonly sellersService: SellersService,
    private readonly cache: CacheService,
    private readonly jobsService: JobsService,
    private readonly exportsService: ExportsService
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
    const page = await this.prisma.appRecord.findFirst({
      where: {
        userId,
        domain: 'seller_workspace',
        entityType: 'listing_wizard',
        entityId: 'main'
      },
      orderBy: { updatedAt: 'desc' }
    });
    const pagePayload = (page?.payload as Record<string, unknown> | null) ?? {};
    let baseLines: unknown = [];
    try {
      baseLines = await this.taxonomyService.listingWizardLines(userId);
    } catch {
      baseLines = [];
    }
    return {
      taxonomy,
      baseLines,
      copy: (pagePayload.copy as Record<string, unknown> | undefined) ?? {}
    };
  }

  async cart(userId: string) {
    const current = await this.loadWorkspaceSetting(userId, 'seller_cart');
    return this.normalizeCart(current);
  }

  async addCartItem(userId: string, body: { listingId?: string; qty?: number }) {
    const listingId = typeof body?.listingId === 'string' ? body.listingId.trim() : '';
    if (!listingId) {
      throw new BadRequestException('listingId is required');
    }

    const qty = Number.isFinite(body?.qty) ? Math.max(1, Math.floor(Number(body.qty))) : 1;
    const current = this.normalizeCart(await this.loadWorkspaceSetting(userId, 'seller_cart'));
    const existing = current.items.find((item) => item.listingId === listingId);
    const next = {
      ...current,
      items: existing
        ? current.items.map((item) =>
            item.listingId === listingId ? { ...item, qty: item.qty + qty } : item
          )
        : [...current.items, { listingId, qty }],
      updatedAt: new Date().toISOString()
    };

    await this.upsertWorkspaceSetting(userId, 'seller_cart', next);
    return next;
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
    const seller = await this.ensureSeller(userId);
    const orders = await this.prisma.order.findMany({
      where: {
        sellerId: seller.id,
        ...(channel ? { channel } : {})
      },
      skip,
      take,
      include: { items: true },
      orderBy: { updatedAt: 'desc' }
    });

    const page = await this.prisma.appRecord.findFirst({
      where: {
        userId,
        domain: 'seller_workspace',
        entityType: 'orders',
        entityId: 'main'
      },
      orderBy: { updatedAt: 'desc' }
    });
    const pagePayload = (page?.payload as Record<string, unknown> | null) ?? {};

    return {
      headline: typeof pagePayload.headline === 'string' ? pagePayload.headline : 'Orders',
      subhead:
        typeof pagePayload.subhead === 'string'
          ? pagePayload.subhead
          : 'Orders and operations preview',
      orders,
      returns: [],
      disputes: []
    };
  }

  async orderDetail(userId: string, id: string, channel?: string) {
    const seller = await this.ensureSeller(userId);
    const order = await this.prisma.order.findFirst({
      where: {
        id,
        sellerId: seller.id,
        ...(channel ? { channel } : {})
      },
      include: { items: true, transactions: true }
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async expressRiders(userId: string) {
    await this.ensureSeller(userId);
    const record = await this.prisma.workspaceSetting.findUnique({
      where: {
        userId_key: {
          userId,
          key: 'express_riders'
        }
      }
    });

    const payload =
      record?.payload && typeof record.payload === 'object' && !Array.isArray(record.payload)
        ? (record.payload as Record<string, unknown>)
        : {};

    return {
      riders: Array.isArray(payload.riders) ? payload.riders : []
    };
  }

  async printInvoice(userId: string, id: string) {
    const payload = await this.buildPrintPayload(userId, id);
    return { ...payload, printType: 'invoice' };
  }

  async printPackingSlip(userId: string, id: string) {
    const payload = await this.buildPrintPayload(userId, id);
    return { ...payload, printType: 'packing-slip' };
  }

  async printSticker(userId: string, id: string) {
    const payload = await this.buildPrintPayload(userId, id);
    return { ...payload, printType: 'sticker' };
  }

  async updateOrder(userId: string, id: string, payload: UpdateOrderDto, channel?: string) {
    const seller = await this.ensureSeller(userId);

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

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: payload.status ? (payload.status as any) : undefined,
        notes: payload.notes ?? undefined,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
    await this.invalidateSellerDashboards(userId);
    return updated;
  }

  async returns(userId: string, query?: SellerReturnsQueryDto) {
    const channel = query?.channel;
    const seller = await this.ensureSeller(userId);
    return this.prisma.sellerReturn.findMany({
      where: {
        sellerId: seller.id,
        ...(channel ? { order: { channel } } : {})
      },
      orderBy: { requestedAt: 'desc' }
    });
  }

  async disputes(userId: string, query?: SellerDisputesQueryDto) {
    const channel = query?.channel;
    const seller = await this.ensureSeller(userId);
    return this.prisma.sellerDispute.findMany({
      where: {
        sellerId: seller.id,
        ...(channel ? { order: { channel } } : {})
      },
      orderBy: { openedAt: 'desc' }
    });
  }

  async inventory(userId: string) {
    const seller = await this.ensureSeller(userId);
    const listings = await this.prisma.marketplaceListing.findMany({
      where: { sellerId: seller.id },
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
    const seller = await this.ensureSeller(userId);
    await this.ensureDefaultShippingProfiles(seller.id);
    const profiles = await this.prisma.shippingProfile.findMany({
      where: { sellerId: seller.id },
      include: { rates: true },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }]
    });

    return { profiles };
  }

  async warehouses(userId: string) {
    const seller = await this.ensureSeller(userId);
    const warehouses = await this.prisma.sellerWarehouse.findMany({
      where: { sellerId: seller.id },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }]
    });

    return { warehouses };
  }

  async exports(userId: string) {
    const seller = await this.ensureSeller(userId);
    const jobs = await this.prisma.sellerExportJob.findMany({
      where: { sellerId: seller.id },
      include: { exportFiles: true },
      orderBy: { requestedAt: 'desc' }
    });

    return { jobs };
  }

  async exportJob(userId: string, id: string) {
    const seller = await this.ensureSeller(userId);
    return this.exportsService.jobForSeller(seller.id, id);
  }

  async exportDownload(userId: string, id: string, fileId?: string) {
    const seller = await this.ensureSeller(userId);
    return this.exportsService.openFileForSeller(seller.id, id, fileId);
  }

  async documents(userId: string) {
    const seller = await this.ensureSeller(userId);
    const documents = await this.prisma.sellerDocument.findMany({
      where: { sellerId: seller.id },
      orderBy: { uploadedAt: 'desc' }
    });

    return { documents };
  }

  async financeWallets(userId: string) {
    const seeded = await this.loadWorkspaceSetting(userId, 'finance_home_ui');
    if (seeded && Array.isArray((seeded as Record<string, unknown>).balances)) {
      return seeded;
    }
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
    const seeded = await this.loadWorkspaceSetting(userId, 'finance_holds_ui');
    if (seeded && Array.isArray((seeded as Record<string, unknown>).holds)) {
      return seeded;
    }
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
    const seeded = await this.loadWorkspaceSetting(userId, 'finance_invoices_ui');
    if (seeded && Array.isArray((seeded as Record<string, unknown>).invoices)) {
      return seeded;
    }
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
    const seeded = await this.loadWorkspaceSetting(userId, 'finance_statements_ui');
    if (seeded && Array.isArray((seeded as Record<string, unknown>).statements)) {
      return seeded;
    }
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
    const seeded = await this.loadWorkspaceSetting(userId, 'finance_tax_reports_ui');
    if (seeded && Array.isArray((seeded as Record<string, unknown>).reports)) {
      return seeded;
    }
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

  async financeHome(userId: string) {
    const seeded = await this.loadWorkspaceSetting(userId, 'finance_home_ui');
    if (seeded) {
      return seeded;
    }
    return this.financeWallets(userId);
  }

  async updateFinanceInvoice(userId: string, id: string, patch: Record<string, unknown>) {
    const payload = (await this.loadWorkspaceSetting(userId, 'finance_invoices_ui')) ?? { invoices: [] };
    const invoices = Array.isArray((payload as Record<string, unknown>).invoices)
      ? (((payload as Record<string, unknown>).invoices as unknown[]) as Record<string, unknown>[])
      : [];
    const next = invoices.map((invoice) =>
      String(invoice.id) === id ? { ...invoice, ...patch, updatedAt: new Date().toISOString() } : invoice
    );
    await this.upsertWorkspaceSetting(userId, 'finance_invoices_ui', { invoices: next });
    return next.find((invoice) => String(invoice.id) === id) ?? null;
  }

  async removeFinanceHold(userId: string, id: string) {
    const payload = (await this.loadWorkspaceSetting(userId, 'finance_holds_ui')) ?? { holds: [] };
    const holds = Array.isArray((payload as Record<string, unknown>).holds)
      ? (((payload as Record<string, unknown>).holds as unknown[]) as Record<string, unknown>[])
      : [];
    const next = holds.filter((hold) => String(hold.id) !== id);
    await this.upsertWorkspaceSetting(userId, 'finance_holds_ui', { holds: next });
    return { deleted: true };
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

  async validateBulkListings(userId: string, payload: BulkListingValidateDto) {
    const session = await this.prisma.uploadSession.findFirst({
      where: { id: payload.uploadSessionId, userId }
    });
    if (!session) {
      throw new NotFoundException('Upload session not found');
    }
    const job = await this.jobsService.enqueue({
      queue: 'listings',
      type: 'BULK_VALIDATE',
      userId,
      payload: {
        uploadSessionId: session.id,
        mapping: payload.mapping ?? null,
        mode: payload.mode ?? 'listing'
      }
    });
    return { jobId: job.id, status: 'queued', uploadSessionId: session.id };
  }

  async commitBulkListings(userId: string, payload: BulkListingCommitDto) {
    const session = await this.prisma.uploadSession.findFirst({
      where: { id: payload.uploadSessionId, userId }
    });
    if (!session) {
      throw new NotFoundException('Upload session not found');
    }
    const job = await this.jobsService.enqueue({
      queue: 'listings',
      type: 'BULK_COMMIT',
      userId,
      payload: {
        uploadSessionId: session.id,
        validateJobId: payload.validateJobId ?? null
      }
    });
    return { jobId: job.id, status: 'queued', uploadSessionId: session.id };
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

    const created = await this.prisma.sellerDocument.create({
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

    await this.jobsService.enqueue({
      queue: 'moderation',
      type: 'MODERATION_SCAN',
      payload: { targetType: 'seller_document', targetId: created.id }
    });

    return created;
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
    return this.exportsService.createJob(seller.id, {
      type: payload.type,
      format: payload.format,
      filters: payload.filters,
      metadata: payload.metadata
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

    const created = await this.prisma.sellerReturn.create({
      data: {
        sellerId: seller.id,
        orderId: order.id,
        status: payload.status ?? 'REQUESTED',
        reason: payload.reason,
        notes: payload.notes,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
    await this.invalidateSellerDashboards(userId);
    return created;
  }

  async updateReturn(userId: string, id: string, payload: UpdateReturnDto) {
    const seller = await this.ensureSeller(userId);
    const existing = await this.prisma.sellerReturn.findFirst({
      where: { id, sellerId: seller.id }
    });
    if (!existing) {
      throw new NotFoundException('Return not found');
    }

    const updated = await this.prisma.sellerReturn.update({
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
    await this.invalidateSellerDashboards(userId);
    return updated;
  }

  async createDispute(userId: string, payload: CreateDisputeDto) {
    const seller = await this.ensureSeller(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: payload.orderId, sellerId: seller.id }
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const created = await this.prisma.sellerDispute.create({
      data: {
        sellerId: seller.id,
        orderId: order.id,
        status: payload.status ?? 'OPEN',
        reason: payload.reason,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
    await this.invalidateSellerDashboards(userId);
    return created;
  }

  async updateDispute(userId: string, id: string, payload: UpdateDisputeDto) {
    const seller = await this.ensureSeller(userId);
    const existing = await this.prisma.sellerDispute.findFirst({
      where: { id, sellerId: seller.id }
    });
    if (!existing) {
      throw new NotFoundException('Dispute not found');
    }

    const updated = await this.prisma.sellerDispute.update({
      where: { id: existing.id },
      data: {
        status: payload.status ?? undefined,
        reason: payload.reason ?? undefined,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined,
        resolvedAt: payload.status && ['RESOLVED', 'REJECTED'].includes(payload.status) ? new Date() : undefined
      }
    });
    await this.invalidateSellerDashboards(userId);
    return updated;
  }

  private async buildPrintPayload(userId: string, id: string) {
    const seller = await this.ensureSeller(userId);
    const order = await this.prisma.order.findFirst({
      where: { id, sellerId: seller.id },
      include: { items: true, seller: true, buyer: true }
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    const itemTotal = order.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
    const totals = {
      itemTotal,
      total: order.total,
      currency: order.currency
    };
    return {
      order: {
        id: order.id,
        status: order.status,
        channel: order.channel,
        createdAt: order.createdAt.toISOString(),
        notes: order.notes ?? null,
        metadata: order.metadata ?? null
      },
      seller: {
        id: order.seller.id,
        name: order.seller.displayName ?? order.seller.name,
        storefrontName: order.seller.storefrontName ?? null,
        handle: order.seller.handle ?? null
      },
      buyer: order.buyer
        ? { id: order.buyer.id, email: order.buyer.email ?? null }
        : null,
      items: order.items.map((item) => ({
        id: item.id,
        sku: item.sku ?? null,
        name: item.name,
        qty: item.qty,
        unitPrice: item.unitPrice,
        currency: item.currency
      })),
      totals
    };
  }

  private async invalidateSellerDashboards(userId: string) {
    await Promise.all([
      this.cache.invalidatePrefix(`seller:dashboardSummary:${userId}:`),
      this.cache.invalidate(`dashboard:summary:${userId}`)
    ]);
    await this.prisma.dashboardSnapshot.deleteMany({
      where: {
        userId,
        role: { in: ['SELLER', 'PROVIDER'] }
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

  private async ensureDefaultShippingProfiles(sellerId: string) {
    const existingProfiles = await this.prisma.shippingProfile.findMany({
      where: { sellerId },
      select: { name: true, isDefault: true },
      orderBy: { createdAt: 'asc' }
    });

    if (existingProfiles.length >= STARTER_SHIPPING_PROFILE_TEMPLATES.length) {
      return;
    }

    const existingNames = new Set(
      existingProfiles.map((profile) => profile.name.trim().toLowerCase()).filter(Boolean)
    );
    const remainingSlots = Math.max(0, STARTER_SHIPPING_PROFILE_TEMPLATES.length - existingProfiles.length);
    const templatesToCreate = STARTER_SHIPPING_PROFILE_TEMPLATES
      .filter((template) => !existingNames.has(template.name.trim().toLowerCase()))
      .slice(0, remainingSlots);

    if (!templatesToCreate.length) {
      return;
    }

    let assignDefaultToNextCreated = !existingProfiles.some((profile) => profile.isDefault);
    const operations: Prisma.PrismaPromise<unknown>[] = [];

    for (const template of templatesToCreate) {
      const profileId = randomUUID();
      operations.push(
        this.prisma.shippingProfile.create({
          data: {
            id: profileId,
            sellerId,
            name: template.name,
            description: template.description,
            status: 'ACTIVE',
            carrier: template.carrier,
            serviceLevel: template.serviceLevel,
            handlingTimeDays: template.handlingTimeDays,
            regions: template.regions,
            isDefault: assignDefaultToNextCreated,
            metadata: template.metadata as Prisma.InputJsonValue
          }
        })
      );
      assignDefaultToNextCreated = false;

      if (template.rates.length) {
        operations.push(
          this.prisma.shippingRate.createMany({
            data: template.rates.map((rate) => ({
              profileId,
              name: rate.name,
              rateType: rate.rateType,
              price: rate.price,
              currency: rate.currency,
              etaDays: rate.etaDays,
              regions: rate.regions
            }))
          })
        );
      }
    }

    await this.prisma.$transaction(operations);
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

  private async loadWorkspaceSetting(userId: string, key: string) {
    const setting = await this.prisma.workspaceSetting.findUnique({
      where: { userId_key: { userId, key } }
    });
    return (setting?.payload as Record<string, unknown> | null) ?? null;
  }

  private async upsertWorkspaceSetting(userId: string, key: string, payload: Record<string, unknown>) {
    return this.prisma.workspaceSetting.upsert({
      where: { userId_key: { userId, key } },
      update: { payload: payload as Prisma.InputJsonValue },
      create: { userId, key, payload: payload as Prisma.InputJsonValue }
    });
  }

  private normalizeCart(payload: Record<string, unknown> | null) {
    const items = Array.isArray(payload?.items)
      ? payload.items
          .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const input = item as Record<string, unknown>;
            const listingId = typeof input.listingId === 'string' ? input.listingId : '';
            if (!listingId) return null;
            const qty = Number.isFinite(input.qty) ? Math.max(1, Math.floor(Number(input.qty))) : 1;
            return { listingId, qty };
          })
          .filter(Boolean)
      : [];

    return {
      id: typeof payload?.id === 'string' ? payload.id : 'cart_default',
      items,
      updatedAt:
        typeof payload?.updatedAt === 'string' ? payload.updatedAt : new Date().toISOString()
    };
  }
}
