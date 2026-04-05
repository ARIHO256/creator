import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TransactionStatus, TransactionType } from '@prisma/client';
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

type FinanceStatementRecord = {
  id: string;
  period: string;
  currency: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  inflow: number;
  outflow: number;
  generatedAt: string;
  status: 'Ready';
  count: number;
  lines: Array<{
    id: string;
    at: string;
    type: string;
    source: string;
    ref: string;
    amount: number;
    note: string;
  }>;
};

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
    const [listingCount, orderCount, transactionTotals, reviewAverage, reviewTotal, repliedCount, negativeCount] = await Promise.all([
      this.prisma.marketplaceListing.count({ where: { userId } }),
      this.prisma.order.count({
        where: { seller: { userId } }
      }),
      this.prisma.transaction.aggregate({
        where: {
          seller: { userId },
          status: { in: [TransactionStatus.PENDING, TransactionStatus.AVAILABLE, TransactionStatus.PAID] }
        },
        _sum: { amount: true }
      }),
      this.prisma.review.aggregate({
        where: { subjectUserId: userId, subjectType: 'SELLER', status: 'PUBLISHED' },
        _avg: { ratingOverall: true }
      }),
      this.prisma.review.count({
        where: { subjectUserId: userId, subjectType: 'SELLER', status: 'PUBLISHED' }
      }),
      this.prisma.review.count({
        where: { subjectUserId: userId, subjectType: 'SELLER', status: 'PUBLISHED', replies: { some: {} } }
      }),
      this.prisma.review.count({
        where: {
          subjectUserId: userId,
          subjectType: 'SELLER',
          status: 'PUBLISHED',
          sentiment: { in: ['negative', 'NEGATIVE'] }
        }
      })
    ]);

    const revenueBase = Number(transactionTotals._sum.amount ?? 0);
    const averageRating = Number(reviewAverage._avg.ratingOverall ?? 0);
    const responseRate = reviewTotal ? Math.round((repliedCount / reviewTotal) * 100) : 0;
    const negativePct = reviewTotal ? (negativeCount / reviewTotal) * 100 : 0;
    const trustBase = this.computeTrustScore(averageRating, responseRate, negativePct);

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
        revenueBase,
        ordersBase: orderCount,
        trustBase
      }
    };
  }

  async dashboardSummary(userId: string, query?: DashboardSummaryQueryDto) {
    const channels = this.parseCsv(query?.channels);
    const marketplaces = this.parseCsv(query?.marketplaces);
    const warehouses = this.parseCsv(query?.warehouses);
    const cacheKey = `seller:dashboardSummary:${userId}:${query?.range ?? ''}:${query?.from ?? ''}:${query?.to ?? ''}:${channels.join('|')}:${marketplaces.join('|')}:${warehouses.join('|')}`;
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
        ...(channels.length > 0 ? { channel: { in: channels } } : {}),
        ...(warehouses.length > 0 ? { warehouse: { in: warehouses } } : {})
      };

      const listingWhere: Prisma.MarketplaceListingWhereInput = {
        userId,
        ...(marketplaces.length > 0 ? { marketplace: { in: marketplaces } } : {})
      };

      const reviewWhere: Prisma.ReviewWhereInput = {
        subjectUserId: userId,
        status: 'PUBLISHED',
        createdAt: dateRange ?? undefined,
        ...(channels.length > 0 ? { channel: { in: channels } } : {})
      };
      const relatedOrderFilter =
        channels.length > 0 || warehouses.length > 0
          ? {
              order: {
                ...(channels.length > 0 ? { channel: { in: channels } } : {}),
                ...(warehouses.length > 0 ? { warehouse: { in: warehouses } } : {})
              }
            }
          : {};

      const [
        listingCount,
        orderCount,
        openOrders,
        transactionTotals,
        groupedTransactions,
        reviewAverage,
        reviewTotal,
        repliedCount,
        needsReply,
        flaggedCount,
        negativeCount,
        returnsOpen,
        disputesOpen,
        lowStockListings,
        outOfStockListings,
        activeListings,
        draftListings,
        unreadThreadRows,
        unreadNotifications,
        statusGroups,
        channelGroups,
        recentOrders,
        recentTransactions
      ] = await Promise.all([
        this.prisma.marketplaceListing.count({ where: listingWhere }),
        this.prisma.order.count({ where: orderWhere }),
        this.prisma.order.count({
          where: { ...orderWhere, status: { in: ['NEW', 'CONFIRMED', 'PACKED', 'ON_HOLD'] } }
        }),
        this.prisma.transaction.aggregate({
          where: transactionWhere,
          _sum: { amount: true }
        }),
        this.prisma.transaction.groupBy({
          by: ['status'],
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
        }),
        this.prisma.sellerReturn.count({
          where: {
            sellerId: seller.id,
            createdAt: dateRange ?? undefined,
            status: { in: ['REQUESTED', 'APPROVED', 'RECEIVED'] },
            ...relatedOrderFilter
          }
        }),
        this.prisma.sellerDispute.count({
          where: {
            sellerId: seller.id,
            createdAt: dateRange ?? undefined,
            status: { in: ['OPEN', 'UNDER_REVIEW'] },
            ...relatedOrderFilter
          }
        }),
        this.prisma.marketplaceListing.count({
          where: { ...listingWhere, inventoryCount: { gt: 0, lte: 10 } }
        }),
        this.prisma.marketplaceListing.count({
          where: { ...listingWhere, inventoryCount: { lte: 0 } }
        }),
        this.prisma.marketplaceListing.count({
          where: { ...listingWhere, status: 'ACTIVE' }
        }),
        this.prisma.marketplaceListing.count({
          where: { ...listingWhere, status: 'DRAFT' }
        }),
        this.prisma.messageThread.findMany({
          where: { userId, lastMessageAt: { not: null } },
          select: { lastReadAt: true, lastMessageAt: true }
        }),
        this.prisma.notification.count({
          where: { userId, readAt: null }
        }),
        this.prisma.order.groupBy({
          by: ['status'],
          where: orderWhere,
          _count: { _all: true }
        }),
        this.prisma.order.groupBy({
          by: ['channel'],
          where: orderWhere,
          _count: { _all: true },
          _sum: { total: true }
        }),
        this.prisma.order.findMany({
          where: {
            ...orderWhere,
            createdAt: {
              ...(dateRange ?? {}),
              gte: this.resolveTrendWindowStart(query?.range, query?.from)
            }
          },
          select: { createdAt: true, total: true, status: true },
          orderBy: { createdAt: 'asc' }
        }),
        this.prisma.transaction.findMany({
          where: {
            ...transactionWhere,
            createdAt: {
              ...(dateRange ?? {}),
              gte: this.resolveTrendWindowStart(query?.range, query?.from)
            }
          },
          select: { createdAt: true, amount: true, status: true },
          orderBy: { createdAt: 'asc' }
        })
      ]);

      const revenueBase = Number(transactionTotals._sum.amount ?? 0);
      const averageRating = Number(reviewAverage._avg.ratingOverall ?? 0);
      const responseRate = reviewTotal ? Math.round((repliedCount / reviewTotal) * 100) : 0;
      const negativePct = reviewTotal ? (negativeCount / reviewTotal) * 100 : 0;
      const trustBase = this.computeTrustScore(averageRating, responseRate, negativePct);
      const transactionTotalsByStatus = new Map(
        groupedTransactions.map((entry) => [String(entry.status), Number(entry._sum.amount ?? 0)])
      );
      const unreadThreads = unreadThreadRows.filter((entry) =>
        !entry.lastReadAt || (entry.lastMessageAt && entry.lastReadAt < entry.lastMessageAt)
      ).length;
      const orderStatuses = this.toCountMap(statusGroups, 'status');
      const channelBreakdown = channelGroups
        .map((entry) => ({
          name: String(entry.channel || 'Unknown'),
          orders: entry._count._all,
          revenue: Number(entry._sum.total ?? 0)
        }))
        .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders);
      const trend = this.buildSellerTrend(recentOrders, recentTransactions, query?.range, query?.from, query?.to);
      const cashflow = this.buildCashflow(recentTransactions);

      if (
        listingCount === 0 &&
        orderCount === 0 &&
        revenueBase === 0 &&
        reviewTotal === 0 &&
        returnsOpen === 0 &&
        disputesOpen === 0
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
          activeListings,
          draftListings,
          lowStockListings,
          outOfStockListings,
          returnsOpen,
          disputesOpen,
          unreadThreads,
          unreadNotifications,
          orderStatuses,
          reviews: {
            total: reviewTotal,
            averageRating,
            needsReply,
            flagged: flaggedCount,
            responseRate
          }
        },
        revenue: {
          total: revenueBase,
          pending: transactionTotalsByStatus.get(TransactionStatus.PENDING) ?? 0,
          available: transactionTotalsByStatus.get(TransactionStatus.AVAILABLE) ?? 0,
          paid: transactionTotalsByStatus.get(TransactionStatus.PAID) ?? 0,
          averageOrderValue: orderCount > 0 ? Number((revenueBase / orderCount).toFixed(2)) : 0
        },
        channels: channelBreakdown,
        trend,
        cashflow
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
    const config = this.normalizeSellerListingWizardConfig(
      await this.getSellerListingWizardConfig(),
      taxonomy
    );
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
      copy: (pagePayload.copy as Record<string, unknown> | undefined) ?? {},
      config
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
        activeListings: 0,
        draftListings: 0,
        lowStockListings: 0,
        outOfStockListings: 0,
        returnsOpen: 0,
        disputesOpen: 0,
        unreadThreads: 0,
        unreadNotifications: 0,
        orderStatuses: {},
        reviews: {
          total: 0,
          averageRating: 0,
          needsReply: 0,
          flagged: 0,
          responseRate: 0
        }
      },
      revenue: {
        total: 0,
        pending: 0,
        available: 0,
        paid: 0,
        averageOrderValue: 0
      },
      channels: [],
      trend: {
        labels: [],
        revenue: [],
        orders: []
      },
      cashflow: []
    };
  }

  private resolveTrendWindowStart(range?: string, from?: string) {
    if (from) {
      return this.parseDate(from, 'from');
    }

    const now = new Date();
    const normalized = String(range || '7d').toLowerCase();
    const start = new Date(now);
    if (normalized === 'today') {
      start.setHours(0, 0, 0, 0);
      return start;
    }
    if (normalized === '30d') {
      start.setDate(start.getDate() - 29);
      return start;
    }
    if (normalized === '90d') {
      start.setDate(start.getDate() - 89);
      return start;
    }
    if (normalized === 'ytd') {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    start.setDate(start.getDate() - 6);
    return start;
  }

  private toCountMap<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
    return rows.reduce<Record<string, number>>((acc, row) => {
      const name = String(row[key] ?? '');
      if (!name) return acc;
      const count = Number((row as { _count?: { _all?: number } })._count?._all ?? 0);
      acc[name] = count;
      return acc;
    }, {});
  }

  private buildSellerTrend(
    orders: Array<{ createdAt: Date; total: number; status: string }>,
    transactions: Array<{ createdAt: Date; amount: number; status: TransactionStatus }>,
    range?: string,
    from?: string,
    to?: string
  ) {
    const buckets = this.buildTrendBuckets(range, from, to);
    const revenue = new Array<number>(buckets.length).fill(0);
    const orderCounts = new Array<number>(buckets.length).fill(0);

    for (const entry of orders) {
      const index = this.findTrendBucketIndex(entry.createdAt, buckets);
      if (index >= 0) {
        orderCounts[index] += 1;
      }
    }

    for (const entry of transactions) {
      const index = this.findTrendBucketIndex(entry.createdAt, buckets);
      if (index >= 0) {
        revenue[index] += Number(entry.amount ?? 0);
      }
    }

    return {
      labels: buckets.map((bucket) => bucket.label),
      revenue: revenue.map((value) => Number(value.toFixed(2))),
      orders: orderCounts
    };
  }

  private buildCashflow(transactions: Array<{ createdAt: Date; amount: number; status: TransactionStatus }>) {
    const today = new Date();
    const buckets = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(today);
      day.setDate(today.getDate() - (6 - index));
      day.setHours(0, 0, 0, 0);
      return {
        key: day.toISOString().slice(0, 10),
        label: day.toLocaleDateString('en-US', { weekday: 'short' }),
        inflow: 0,
        payout: 0
      };
    });

    const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));
    for (const entry of transactions) {
      const key = entry.createdAt.toISOString().slice(0, 10);
      const bucket = bucketMap.get(key);
      if (!bucket) continue;
      if (entry.status === TransactionStatus.PAID) {
        bucket.payout += Number(entry.amount ?? 0);
      } else {
        bucket.inflow += Number(entry.amount ?? 0);
      }
    }

    return buckets.map((bucket) => ({
      day: bucket.label,
      inflow: Number(bucket.inflow.toFixed(2)),
      payout: Number(bucket.payout.toFixed(2))
    }));
  }

  private buildTrendBuckets(range?: string, from?: string, to?: string) {
    const normalized = String(range || '7d').toLowerCase();
    if (normalized === 'today') {
      const start = this.resolveTrendWindowStart(range, from);
      return Array.from({ length: 12 }, (_, index) => {
        const bucketStart = new Date(start);
        bucketStart.setHours(start.getHours() + index * 2, 0, 0, 0);
        const bucketEnd = new Date(bucketStart);
        bucketEnd.setHours(bucketStart.getHours() + 2, 0, 0, 0);
        return {
          label: `${String(bucketStart.getHours()).padStart(2, '0')}:00`,
          start: bucketStart,
          end: bucketEnd
        };
      });
    }

    const end = to ? this.parseDate(to, 'to') : new Date();
    const start = this.resolveTrendWindowStart(range, from);
    const days =
      normalized === '30d' ? 30 :
      normalized === '90d' ? 90 :
      normalized === 'ytd' ? Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000)) :
      7;

    return Array.from({ length: days }, (_, index) => {
      const bucketStart = new Date(start);
      bucketStart.setDate(start.getDate() + index);
      bucketStart.setHours(0, 0, 0, 0);
      const bucketEnd = new Date(bucketStart);
      bucketEnd.setDate(bucketStart.getDate() + 1);
      return {
        label: bucketStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        start: bucketStart,
        end: bucketEnd
      };
    });
  }

  private findTrendBucketIndex(date: Date, buckets: Array<{ start: Date; end: Date }>) {
    return buckets.findIndex((bucket) => date >= bucket.start && date < bucket.end);
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

  async exportDisputePack(userId: string, id: string) {
    const seller = await this.ensureSeller(userId);
    const dispute = await this.prisma.sellerDispute.findFirst({
      where: { id, sellerId: seller.id },
      include: {
        order: {
          include: {
            items: true,
          },
        },
      },
    });
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    const metadata =
      dispute.metadata && typeof dispute.metadata === 'object' && !Array.isArray(dispute.metadata)
        ? (dispute.metadata as Record<string, unknown>)
        : {};
    const evidence = Array.isArray(metadata.evidence)
      ? metadata.evidence
          .map((entry) =>
            entry && typeof entry === 'object' && !Array.isArray(entry)
              ? (entry as Record<string, unknown>)
              : null
          )
          .filter((entry): entry is Record<string, unknown> => Boolean(entry))
      : [];
    const resolution =
      metadata.resolution && typeof metadata.resolution === 'object' && !Array.isArray(metadata.resolution)
        ? (metadata.resolution as Record<string, unknown>)
        : {};

    const lines = [
      'EVzone Dispute Evidence Pack',
      `Dispute ID: ${dispute.id}`,
      `Order ID: ${dispute.orderId}`,
      `Status: ${dispute.status}`,
      `Reason: ${dispute.reason || 'Not provided'}`,
      `Opened: ${dispute.openedAt.toISOString()}`,
      `Updated: ${dispute.updatedAt.toISOString()}`,
      `Order Total: ${Number(dispute.order.total || 0).toFixed(2)} ${dispute.order.currency}`,
      `Items: ${dispute.order.items.map((item) => `${item.name} x${item.qty}`).join(', ') || 'None'}`,
      '',
      'Evidence',
      ...(evidence.length
        ? evidence.map((entry, index) => {
            const name = String(entry.name || entry.fileName || `Evidence ${index + 1}`);
            const uploadedAt = String(entry.uploadedAt || entry.createdAt || '');
            const visibility = String(entry.visibility || 'internal');
            return `- ${name} (${visibility}${uploadedAt ? `, ${uploadedAt}` : ''})`;
          })
        : ['- No evidence uploaded']),
      '',
      'Resolution',
      `- Type: ${String(resolution.type || 'Not set')}`,
      `- Notes: ${String(resolution.notes || 'Not set')}`,
      `- Updated At: ${String(resolution.updatedAt || 'Not set')}`,
    ];

    return {
      id: dispute.id,
      filename: `dispute-pack-${dispute.id}.txt`,
      content: lines.join('\n'),
    };
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
    return { statements: await this.buildFinanceStatements(userId) };
  }

  async generateFinanceStatement(userId: string) {
    const statements = await this.buildFinanceStatements(userId);
    const latest = statements[0];
    if (!latest) {
      throw new BadRequestException('No transactions available to generate a statement');
    }

    const generatedAt = new Date().toISOString();
    const payload = (await this.loadWorkspaceSetting(userId, 'finance_statements_ui')) ?? {};
    const generatedAtById =
      payload.generatedAtById && typeof payload.generatedAtById === 'object'
        ? { ...(payload.generatedAtById as Record<string, unknown>) }
        : {};
    generatedAtById[latest.id] = generatedAt;
    await this.upsertWorkspaceSetting(userId, 'finance_statements_ui', {
      ...payload,
      generatedAtById
    });

    return {
      statement: {
        ...latest,
        generatedAt
      }
    };
  }

  private formatTransactionTypeLabel(type: TransactionType) {
    return String(type)
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private defaultTransactionNote(type: TransactionType, status: TransactionStatus) {
    if (type === TransactionType.ORDER_PAYMENT) return `Order payment ${status.toLowerCase()}.`;
    if (type === TransactionType.PAYOUT) return `Seller payout ${status.toLowerCase()}.`;
    if (type === TransactionType.REFUND) return `Refund ${status.toLowerCase()}.`;
    if (type === TransactionType.COMMISSION) return `Commission ${status.toLowerCase()}.`;
    return `Adjustment ${status.toLowerCase()}.`;
  }

  private async buildFinanceStatements(userId: string) {
    const seller = await this.ensureSeller(userId);
    const transactions = await this.prisma.transaction.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: 'asc' },
      take: 1000
    });
    const payload = (await this.loadWorkspaceSetting(userId, 'finance_statements_ui')) ?? {};
    const generatedAtById =
      payload.generatedAtById && typeof payload.generatedAtById === 'object'
        ? (payload.generatedAtById as Record<string, unknown>)
        : {};

    const statements = new Map<string, FinanceStatementRecord>();
    const balances = new Map<string, number>();

    for (const transaction of transactions) {
      const periodStartDate = new Date(Date.UTC(transaction.createdAt.getUTCFullYear(), transaction.createdAt.getUTCMonth(), 1));
      const periodEndDate = new Date(Date.UTC(transaction.createdAt.getUTCFullYear(), transaction.createdAt.getUTCMonth() + 1, 0, 23, 59, 59, 999));
      const period = periodStartDate.toISOString().slice(0, 7);
      const key = `${period}:${transaction.currency}`;
      const openingBalance = balances.get(transaction.currency) ?? 0;
      const statementId = `STM-${period}-${transaction.currency}`;
      const entry: FinanceStatementRecord = statements.get(key) ?? {
        id: statementId,
        period,
        currency: transaction.currency,
        periodStart: periodStartDate.toISOString(),
        periodEnd: periodEndDate.toISOString(),
        openingBalance,
        closingBalance: openingBalance,
        inflow: 0,
        outflow: 0,
        generatedAt:
          typeof generatedAtById[statementId] === 'string'
            ? String(generatedAtById[statementId])
            : transaction.createdAt.toISOString(),
        status: 'Ready' as const,
        count: 0,
        lines: []
      };

      const amount = Number(transaction.amount ?? 0);
      if (amount >= 0) {
        entry.inflow += amount;
      } else {
        entry.outflow += Math.abs(amount);
      }
      entry.count += 1;
      entry.lines.push({
        id: transaction.id,
        at: transaction.createdAt.toISOString(),
        type: amount >= 0 ? 'Credit' : 'Debit',
        source: this.formatTransactionTypeLabel(transaction.type),
        ref: transaction.orderId ?? transaction.id,
        amount,
        note: transaction.note?.trim() || this.defaultTransactionNote(transaction.type, transaction.status)
      });
      entry.closingBalance += amount;
      statements.set(key, entry);
      balances.set(transaction.currency, entry.closingBalance);
    }

    return Array.from(statements.values()).sort((a, b) => {
      if (a.period === b.period) return a.currency.localeCompare(b.currency);
      return a.period < b.period ? 1 : -1;
    });
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

  async financeHome(userId: string) {
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
    const [sellerProfile, buyerProfile, defaultWarehouse] = await Promise.all([
      order.seller.userId ? this.loadUserProfileSetting(order.seller.userId) : Promise.resolve(null),
      order.buyerUserId ? this.loadUserProfileSetting(order.buyerUserId) : Promise.resolve(null),
      this.prisma.sellerWarehouse.findFirst({
        where: { sellerId: order.seller.id },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]
      })
    ]);
    const metadata = this.buildPrintMetadata({
      orderId: order.id,
      metadata: this.asRecord(order.metadata),
      seller: order.seller,
      sellerUser: order.seller.userId
        ? await this.prisma.user.findUnique({
            where: { id: order.seller.userId },
            select: { email: true, phone: true }
          })
        : null,
      sellerProfile,
      defaultWarehouse,
      buyer: order.buyer,
      buyerProfile
    });
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
        metadata
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

  private async loadUserProfileSetting(userId: string) {
    const setting = await this.prisma.userSetting.findUnique({
      where: { userId_key: { userId, key: 'profile' } },
      select: { payload: true }
    });
    return this.asRecord(setting?.payload);
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private readString(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
  }

  private formatAddress(parts: Array<unknown>) {
    return parts
      .map((entry) => this.readString(entry))
      .filter(Boolean)
      .join(', ');
  }

  private pickDefaultProfileAddress(profile: Record<string, unknown>) {
    const root = this.asRecord(profile.profile);
    const identity = this.asRecord(root.identity);
    const addresses = Array.isArray(root.addresses)
      ? root.addresses.map((entry) => this.asRecord(entry))
      : [];
    const address = addresses.find((entry) => Boolean(entry.isDefault)) ?? addresses[0] ?? {};

    return {
      displayName: this.readString(identity.displayName),
      email: this.readString(identity.email),
      phone: this.readString(identity.phone),
      address: this.formatAddress([
        address.line1,
        address.line2,
        address.city,
        address.region,
        address.country
      ])
    };
  }

  private describeWarehouse(
    warehouse:
      | {
          name: string;
          address: Prisma.JsonValue | null;
          contact: Prisma.JsonValue | null;
        }
      | null
      | undefined
  ) {
    const address = this.asRecord(warehouse?.address);
    const contact = this.asRecord(warehouse?.contact);
    return {
      name: this.readString(warehouse?.name),
      address: this.formatAddress([
        warehouse?.name,
        address.line1,
        address.line2,
        address.city,
        address.region,
        address.country
      ]),
      phone: this.readString(contact.phone)
    };
  }

  private buildPrintMetadata(params: {
    orderId: string;
    metadata: Record<string, unknown>;
    seller: {
      name: string;
      displayName: string;
      storefrontName: string | null;
    };
    sellerUser: { email: string | null; phone: string | null } | null;
    sellerProfile: Record<string, unknown> | null;
    defaultWarehouse: {
      name: string;
      address: Prisma.JsonValue | null;
      contact: Prisma.JsonValue | null;
    } | null;
    buyer: { email: string | null } | null;
    buyerProfile: Record<string, unknown> | null;
  }) {
    const profileSeller = this.pickDefaultProfileAddress(params.sellerProfile ?? {});
    const profileBuyer = this.pickDefaultProfileAddress(params.buyerProfile ?? {});
    const warehouse = this.describeWarehouse(params.defaultWarehouse);
    const sellerName =
      this.readString(params.metadata.sellerName) ||
      this.readString(params.seller.storefrontName) ||
      this.readString(params.seller.displayName) ||
      this.readString(params.seller.name);
    const sellerAddress =
      this.readString(params.metadata.sellerAddress) ||
      profileSeller.address ||
      warehouse.address;
    const sellerPhone =
      this.readString(params.metadata.sellerPhone) ||
      profileSeller.phone ||
      warehouse.phone ||
      this.readString(params.sellerUser?.phone);
    const sellerEmail =
      this.readString(params.metadata.sellerEmail) ||
      profileSeller.email ||
      this.readString(params.sellerUser?.email);
    const shippingName =
      this.readString(params.metadata.shippingName) ||
      this.readString(params.metadata.customer) ||
      profileBuyer.displayName;
    const shippingAddress =
      this.readString(params.metadata.shippingAddress) ||
      this.readString(params.metadata.billingAddress) ||
      profileBuyer.address;
    const buyerPhone =
      this.readString(params.metadata.buyerPhone) ||
      profileBuyer.phone;
    const buyerEmail =
      this.readString(params.metadata.buyerEmail) ||
      profileBuyer.email ||
      this.readString(params.buyer?.email);

    return {
      ...params.metadata,
      customer: this.readString(params.metadata.customer) || shippingName,
      shippingName,
      shippingAddress,
      buyerPhone,
      buyerEmail,
      sellerName,
      sellerAddress,
      sellerPhone,
      sellerEmail,
      warehouseName: this.readString(params.metadata.warehouseName) || warehouse.name
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

  private normalizeSellerListingWizardConfig(payload: unknown, taxonomy: unknown[]) {
    const source = this.asRecord(payload);
    const markets = this.normalizeSellerListingWizardMarkets(source.markets, taxonomy);
    const variantOptions = this.normalizeSellerListingWizardVariantOptions(source.variantOptions);
    const steps = this.normalizeSellerListingWizardSteps(source.steps);
    const initialForm = this.normalizeSellerListingWizardInitialForm(
      source.initialForm,
      markets,
      variantOptions
    );

    return {
      ...source,
      markets,
      steps,
      variantOptions,
      initialForm
    };
  }

  private normalizeSellerListingWizardMarkets(value: unknown, taxonomy: unknown[]) {
    const normalized = (Array.isArray(value) ? value : [])
      .map((entry) => this.asRecord(entry))
      .map((entry) => {
        const name = this.readString(entry.name);
        const fallbackId = this.slugify(this.readString(entry.slug) || name || 'market');
        const id = this.readString(entry.id) || fallbackId;
        if (!id || !name) {
          return null;
        }
        return {
          ...entry,
          id,
          name,
          region: this.readString(entry.region) || name,
          currency: this.readString(entry.currency) || 'USD'
        };
      })
      .filter((entry) => entry !== null);

    if (normalized.length > 0) {
      return normalized;
    }

    const fromTaxonomy = (Array.isArray(taxonomy) ? taxonomy : [])
      .map((entry) => this.asRecord(entry))
      .filter((entry) => this.readString(entry.type).toLowerCase() === 'marketplace')
      .map((entry) => {
        const metadata = this.asRecord(entry.metadata);
        const name = this.readString(entry.name);
        const id = this.readString(entry.id) || this.slugify(name || 'market');
        if (!id || !name) {
          return null;
        }
        return {
          id,
          name,
          region: this.readString(metadata.region) || name,
          currency: this.readString(metadata.currency) || 'USD'
        };
      })
      .filter((entry) => entry !== null);

    if (fromTaxonomy.length > 0) {
      return fromTaxonomy;
    }

    return [
      {
        id: 'evmart',
        name: 'EVmart',
        region: 'Global',
        currency: 'USD'
      }
    ];
  }

  private normalizeSellerListingWizardSteps(value: unknown) {
    const normalized = (Array.isArray(value) ? value : [])
      .map((entry) => this.asRecord(entry))
      .map((entry) => {
        const id = this.readString(entry.id);
        if (!id) {
          return null;
        }
        const defaultType = ['pricing', 'warranty', 'inventory', 'delivery', 'seo'].includes(id)
          ? 'standard'
          : 'form';
        return {
          ...entry,
          id,
          label: this.readString(entry.label) || id,
          description: this.readString(entry.description),
          type: this.readString(entry.type) || defaultType,
          requiredFields: Number.isFinite(Number(entry.requiredFields)) ? Number(entry.requiredFields) : 0,
          optionalFields: Number.isFinite(Number(entry.optionalFields)) ? Number(entry.optionalFields) : 0
        };
      })
      .filter((entry) => entry !== null);

    if (normalized.length > 0) {
      return normalized;
    }

    return [
      { id: 'core', label: 'Core details', description: 'Vehicle basics and identity.', type: 'form', requiredFields: 6, optionalFields: 3 },
      { id: 'preOwned', label: 'Pre-owned details', description: 'Condition details for used units.', type: 'form', requiredFields: 3, optionalFields: 2 },
      { id: 'bev', label: 'Battery and range', description: 'EV battery, range and charging specs.', type: 'form', requiredFields: 4, optionalFields: 2 },
      { id: 'extras', label: 'Extras and add-ons', description: 'Optional accessories and extras.', type: 'form', requiredFields: 0, optionalFields: 4 },
      { id: 'gallery', label: 'Media gallery', description: 'Primary image and listing visuals.', type: 'form', requiredFields: 1, optionalFields: 2 },
      { id: 'pricing', label: 'Pricing and tiers', description: 'Retail price and optional wholesale tiers.', type: 'standard', requiredFields: 2, optionalFields: 2 },
      { id: 'warranty', label: 'Warranty', description: 'Warranty terms and duration.', type: 'standard', requiredFields: 1, optionalFields: 1 },
      { id: 'inventory', label: 'Inventory', description: 'Variant stock and quantity levels.', type: 'standard', requiredFields: 1, optionalFields: 1 },
      { id: 'delivery', label: 'Markets and delivery', description: 'Markets, delivery modes and regions.', type: 'standard', requiredFields: 3, optionalFields: 1 },
      { id: 'seo', label: 'SEO and discoverability', description: 'Search title, description and keywords.', type: 'standard', requiredFields: 2, optionalFields: 2 }
    ];
  }

  private normalizeSellerListingWizardVariantOptions(value: unknown) {
    const source = this.asRecord(value);
    return {
      colors: this.normalizeStringArray(source.colors, ['Arctic White', 'Midnight Black', 'Graphite Gray', 'Ocean Blue']),
      trims: this.normalizeStringArray(source.trims, ['Standard', 'Premium', 'Performance']),
      batteries: this.normalizeStringArray(source.batteries, ['50 kWh', '75 kWh', '100 kWh']),
      wheelSizes: this.normalizeStringArray(source.wheelSizes, ['17"', '18"', '19"']),
      interiorColors: this.normalizeStringArray(source.interiorColors, ['Black', 'Beige', 'Gray'])
    };
  }

  private normalizeSellerListingWizardInitialForm(
    value: unknown,
    markets: Array<Record<string, unknown>>,
    variantOptions: {
      colors: string[];
      trims: string[];
      batteries: string[];
      wheelSizes: string[];
      interiorColors: string[];
    }
  ) {
    const source = this.asRecord(value);
    const marketIds = markets
      .map((market) => this.readString(market.id))
      .filter(Boolean);
    const sourceMarkets = this.asRecord(source.markets);
    const sourceSelectedIds = Array.isArray(sourceMarkets.selectedIds)
      ? sourceMarkets.selectedIds.map((entry) => this.readString(entry)).filter((id) => marketIds.includes(id))
      : [];
    const selectedIds =
      sourceSelectedIds.length > 0
        ? sourceSelectedIds
        : this.readBoolean(sourceMarkets.allActive, true)
          ? marketIds
          : marketIds.slice(0, 1);

    const defaultVariant = this.buildDefaultListingWizardVariant(0, variantOptions);
    const variants = (Array.isArray(source.variants) ? source.variants : [])
      .map((entry, index) => this.normalizeListingWizardVariant(entry, index, variantOptions))
      .filter(Boolean);

    const sourceDeliveryRegions = this.asRecord(source.deliveryRegions);
    const sourceExtras = this.asRecord(source.extras);

    return {
      title: this.readFormString(source.title),
      brand: this.readFormString(source.brand),
      model: this.readFormString(source.model),
      bodyType: this.readFormString(source.bodyType) || 'SUV',
      powertrainType: this.readFormString(source.powertrainType) || 'BEV',
      batteryCapacity: this.readFormString(source.batteryCapacity),
      range: this.readFormString(source.range),
      numPorts: this.readFormString(source.numPorts),
      connectorType: this.readFormString(source.connectorType),
      isUsed: this.readBoolean(source.isUsed, false),
      mileage: this.readFormString(source.mileage),
      owners: this.readFormString(source.owners),
      serviceHistory: this.readFormString(source.serviceHistory),
      hasWarranty: this.readBoolean(source.hasWarranty, false),
      warrantyMonths: this.readFormString(source.warrantyMonths),
      warrantyDetails: this.readFormString(source.warrantyDetails),
      enableWholesale: this.readBoolean(source.enableWholesale, false),
      price: this.readFormString(source.price),
      currency: this.readFormString(source.currency) || 'USD',
      keySellingPoint: this.readFormString(source.keySellingPoint),
      extras: {
        fastCharger: this.readBoolean(sourceExtras.fastCharger, false),
        floorMats: this.readBoolean(sourceExtras.floorMats, false),
        roofRack: this.readBoolean(sourceExtras.roofRack, false),
        extendedWarranty: this.readBoolean(sourceExtras.extendedWarranty, false)
      },
      heroImageUploaded: this.readBoolean(source.heroImageUploaded, false),
      variants: variants.length > 0 ? variants : [defaultVariant],
      allowPickup: this.readBoolean(source.allowPickup, false),
      allowDelivery: this.readBoolean(source.allowDelivery, false),
      deliverToBuyerWarehouse: this.readBoolean(source.deliverToBuyerWarehouse, false),
      deliveryRegions: {
        local: this.readBoolean(sourceDeliveryRegions.local, false),
        upcountry: this.readBoolean(sourceDeliveryRegions.upcountry, false),
        crossBorder: this.readBoolean(sourceDeliveryRegions.crossBorder, false)
      },
      markets: {
        allActive: selectedIds.length === marketIds.length && marketIds.length > 0,
        selectedIds
      },
      seoTitle: this.readFormString(source.seoTitle),
      seoDescription: this.readFormString(source.seoDescription),
      seoAudience: this.readFormString(source.seoAudience),
      seoKeywords: Array.isArray(source.seoKeywords)
        ? source.seoKeywords.map((entry) => this.readString(entry)).filter(Boolean).join(', ')
        : this.readFormString(source.seoKeywords)
    };
  }

  private normalizeListingWizardVariant(
    value: unknown,
    index: number,
    variantOptions: {
      colors: string[];
      trims: string[];
      batteries: string[];
      wheelSizes: string[];
      interiorColors: string[];
    }
  ) {
    const source = this.asRecord(value);
    const defaults = this.buildDefaultListingWizardVariant(index, variantOptions);
    const tiers = (Array.isArray(source.wholesaleTiers) ? source.wholesaleTiers : [])
      .map((entry, tierIndex) => {
        const tier = this.asRecord(entry);
        return {
          id: this.readFormString(tier.id) || `${defaults.id}-t${tierIndex + 1}`,
          minQty: this.readFormString(tier.minQty),
          maxQty: this.readFormString(tier.maxQty),
          price: this.readFormString(tier.price),
          isFinal: this.readBoolean(tier.isFinal, false)
        };
      })
      .filter((tier) => tier.minQty || tier.maxQty || tier.price || tier.isFinal);

    return {
      ...defaults,
      id: this.readFormString(source.id) || defaults.id,
      name: this.readFormString(source.name) || defaults.name,
      color: this.readFormString(source.color) || defaults.color,
      trim: this.readFormString(source.trim) || defaults.trim,
      battery: this.readFormString(source.battery) || defaults.battery,
      wheelSize: this.readFormString(source.wheelSize) || defaults.wheelSize,
      interiorColor: this.readFormString(source.interiorColor) || defaults.interiorColor,
      price: this.readFormString(source.price),
      stockQty: this.readFormString(source.stockQty),
      sku: this.readFormString(source.sku),
      warrantyMonths: this.readFormString(source.warrantyMonths),
      wholesaleTiers: tiers.length > 0 ? tiers : defaults.wholesaleTiers
    };
  }

  private buildDefaultListingWizardVariant(
    index: number,
    variantOptions: {
      colors: string[];
      trims: string[];
      batteries: string[];
      wheelSizes: string[];
      interiorColors: string[];
    }
  ) {
    const id = `variant-${index + 1}`;
    return {
      id,
      name: index === 0 ? 'Standard' : `Variant ${index + 1}`,
      color: variantOptions.colors[0] || '',
      trim: variantOptions.trims[0] || '',
      battery: variantOptions.batteries[0] || '',
      wheelSize: variantOptions.wheelSizes[0] || '',
      interiorColor: variantOptions.interiorColors[0] || '',
      price: '',
      stockQty: '',
      sku: '',
      warrantyMonths: '',
      wholesaleTiers: [
        {
          id: `${id}-t1`,
          minQty: '1',
          maxQty: '10',
          price: '',
          isFinal: false
        }
      ]
    };
  }

  private normalizeStringArray(value: unknown, fallback: string[]) {
    const items = (Array.isArray(value) ? value : [])
      .map((entry) => this.readString(entry))
      .filter(Boolean);
    return items.length > 0 ? items : fallback;
  }

  private readFormString(value: unknown) {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
    return '';
  }

  private readBoolean(value: unknown, fallback = false) {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
      if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
    }
    return fallback;
  }

  private slugify(value: string) {
    const normalized = value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return normalized || 'value';
  }

  private async getSellerListingWizardConfig() {
    const existing = await this.prisma.systemContent.findUnique({
      where: { key: 'seller_listing_wizard_config' }
    });
    if (existing) {
      return existing.payload;
    }

    const created = await this.prisma.systemContent.create({
      data: {
        key: 'seller_listing_wizard_config',
        payload: {} as Prisma.InputJsonValue
      }
    });
    return created.payload;
  }

}
