import { Injectable } from '@nestjs/common';
import { Prisma, TransactionStatus } from '@prisma/client';
import { CacheService } from '../../platform/cache/cache.service.js';
import { PrismaService, ReadPrismaService } from '../../platform/prisma/prisma.service.js';
import { ConfigService } from '@nestjs/config';

const SELLERFRONT_COMPAT_RECORD_IDS = ['sellerfront_mockdb_seed', 'sellerfront_mockdb_live'];

type ParsedMeta = Record<string, unknown>;

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prismaWrite: PrismaService,
    private readonly prisma: ReadPrismaService,
    private readonly cache: CacheService,
    private readonly configService: ConfigService
  ) {}

  async getOverview(userId: string, role: string) {
    return this.readSnapshot(
      userId,
      this.snapshotEntityId('overview', role),
      () => this.computeOverview(userId, role)
    );
  }

  async getPage(userId: string, role: string) {
    return this.readSnapshot(
      userId,
      this.snapshotEntityId('page', role),
      async () => {
        const current = await this.readStoredPage(userId, role);
        const normalizedRole = String(role || 'seller').toUpperCase();
        const livePayload =
          normalizedRole === 'PROVIDER'
            ? await this.buildProviderPage(userId, current)
            : await this.buildSellerPage(userId, current);

        return {
          ...livePayload,
          alertRules: Array.isArray(current.alertRules) ? current.alertRules : []
        };
      }
    );
  }

  async updatePage(userId: string, role: string, body: Record<string, unknown>) {
    const current = await this.readStoredPage(userId, role);
    const next = {
      ...current,
      ...(Array.isArray(body.alertRules) ? { alertRules: body.alertRules } : {})
    };

    const record = await this.prismaWrite.workspaceSetting.upsert({
      where: { userId_key: { userId, key: this.scopedKey(role, 'analytics_page') } },
      update: { payload: next as Prisma.InputJsonValue },
      create: { userId, key: this.scopedKey(role, 'analytics_page'), payload: next as Prisma.InputJsonValue }
    });
    await this.invalidateSnapshots(userId);

    return this.getPage(userId, role).then((page) => ({
      ...page,
      alertRules: Array.isArray((record.payload as Record<string, unknown> | null)?.alertRules)
        ? (((record.payload as Record<string, unknown>).alertRules as unknown[]) ?? [])
        : page.alertRules
    }));
  }

  async getRankDetail(
    userId: string,
    role: string,
    query?: { range?: string; category?: string }
  ) {
    const normalizedRole = String(role || 'seller').toUpperCase();
    const range = query?.range === '7' || query?.range === '90' ? query.range : '30';
    const rangeDays = range === '7' ? 7 : range === '90' ? 90 : 30;
    const category = typeof query?.category === 'string' && query.category.trim() ? query.category.trim() : 'All';
    const since = this.daysAgo(rangeDays - 1);
    since.setHours(0, 0, 0, 0);

    return this.readSnapshot(
      userId,
      this.snapshotEntityId('rank', role, { category, range }),
      () => {
        if (normalizedRole === 'PROVIDER') {
          return this.buildProviderRankDetail(userId, range, since);
        }

        return this.buildSellerRankDetail(userId, range, category, since);
      }
    );
  }

  private async computeOverview(userId: string, role: string) {
    const events = await this.prisma.analyticsEvent.findMany({
      where: { userId, createdAt: { gte: this.daysAgo(90) } },
      orderBy: { createdAt: 'desc' },
      take: 1000
    });
    const groupedEvents = this.filterEventsByRole(events, role);
    const summaries = new Map(
      groupedEvents.map((event) => [
        event.eventType,
        {
          count: event._count._all,
          total: Number(event._sum.value ?? 0)
        }
      ])
    );

    const totalViews = summaries.get('VIEW')?.total ?? 0;
    const totalClicks = summaries.get('CLICK')?.total ?? 0;
    const purchases = summaries.get('PURCHASE')?.total ?? 0;
    const eventsCount = groupedEvents.reduce((sum, event) => sum + event._count._all, 0);

    return {
      totalViews,
      totalClicks,
      purchases,
      conversionRate: totalClicks > 0 ? Number(((purchases / totalClicks) * 100).toFixed(2)) : 0,
      eventsCount
    };
  }

  private async buildSellerPage(userId: string, current: Record<string, unknown>) {
    const compatibilityOrderIds = await this.loadCompatibilityOrderIds();
    const [orders, transactions, listings, events, reviewStats, replyStats] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          seller: { userId },
          ...(compatibilityOrderIds.length > 0 ? { id: { notIn: compatibilityOrderIds } } : {})
        },
        select: { id: true, channel: true, total: true, status: true, createdAt: true }
      }),
      this.prisma.transaction.findMany({
        where: {
          seller: { userId },
          status: { in: [TransactionStatus.PENDING, TransactionStatus.AVAILABLE, TransactionStatus.PAID] }
        },
        select: { amount: true, status: true, createdAt: true }
      }),
      this.prisma.marketplaceListing.findMany({
        where: { userId },
        select: { marketplace: true, status: true, inventoryCount: true, createdAt: true }
      }),
      this.prisma.analyticsEvent.findMany({
        where: { userId, createdAt: { gte: this.daysAgo(90) } },
        select: { eventType: true, value: true, meta: true, createdAt: true }
      }),
      this.prisma.review.aggregate({
        where: { subjectUserId: userId, subjectType: 'SELLER', status: 'PUBLISHED' },
        _count: { _all: true },
        _avg: { ratingOverall: true }
      }),
      Promise.all([
        this.prisma.review.count({
          where: { subjectUserId: userId, subjectType: 'SELLER', status: 'PUBLISHED', replies: { some: {} } }
        }),
        this.prisma.review.count({
          where: {
            subjectUserId: userId,
            subjectType: 'SELLER',
            status: 'PUBLISHED',
            requiresResponse: true,
            replies: { none: {} }
          }
        })
      ])
    ]);

    const reviewTotal = reviewStats._count._all ?? 0;
    const averageRating = Number(reviewStats._avg.ratingOverall ?? 0);
    const repliedCount = replyStats[0];
    const needsReply = replyStats[1];
    const responseRate = reviewTotal > 0 ? Math.round((repliedCount / reviewTotal) * 100) : 0;
    const revenueTotal = transactions.reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);
    const views = this.sumEventValues(events, 'VIEW', 'SELLER');
    const clicks = this.sumEventValues(events, 'CLICK', 'SELLER');
    const purchases = this.sumEventValues(events, 'PURCHASE', 'SELLER');
    const conversionRate = clicks > 0 ? Number(((purchases / clicks) * 100).toFixed(2)) : 0;

    const channels = this.groupSellerChannels(orders, events);
    const topChannel = channels[0];
    const marketplaces = Array.from(
      new Set(['All', ...listings.map((entry) => String(entry.marketplace || '')).filter(Boolean)])
    );

    return {
      marketplaceOptions: marketplaces.length > 0 ? marketplaces : ['All'],
      overviewKpis: [
        {
          label: 'Revenue',
          value: this.formatMoney(revenueTotal),
          delta: `${orders.length} orders`,
          hint: 'Paid, pending, and available transactions in MySQL'
        },
        {
          label: 'Orders',
          value: String(orders.length),
          delta: `${this.countStatuses(orders, ['NEW', 'CONFIRMED', 'PACKED', 'ON_HOLD'])} open`,
          hint: 'Seller orders scoped to the logged-in account'
        },
        {
          label: 'Conversion',
          value: `${conversionRate.toFixed(1)}%`,
          delta: `${clicks} clicks`,
          hint: 'Purchase events divided by click events'
        },
        {
          label: 'Rating',
          value: averageRating.toFixed(1),
          delta: `${reviewTotal} reviews`,
          hint: `${responseRate}% response rate`
        }
      ],
      attributionRows: channels.map((entry) => ({
        channel: entry.name,
        share: entry.share,
        roas: entry.roas,
        note: `${entry.orders} orders · ${this.formatMoney(entry.revenue)} revenue`
      })),
      highlights: {
        topDriver: topChannel
          ? `${topChannel.name} leads with ${topChannel.orders} orders and ${this.formatMoney(topChannel.revenue)} revenue.`
          : 'No seller activity has been recorded yet.',
        risk:
          needsReply > 0
            ? `${needsReply} reviews still need a response.`
            : 'No review-response risk is currently recorded.',
        recommendation:
          orders.length > 0
            ? 'Focus on the best-performing channel and keep response coverage high.'
            : 'Create listings and complete the first sale to unlock channel-level analytics.'
      },
      cohort: {
        subtitle: `Analytics are computed from ${orders.length} orders, ${transactions.length} transactions, and ${events.length} tracked events.`,
        bullets: [
          `${listings.filter((entry) => entry.status === 'ACTIVE').length} active listings are currently contributing catalog inventory.`,
          `${this.countStatuses(orders, ['DELIVERED'])} delivered orders have completed the fulfillment cycle.`,
          `${views} views, ${clicks} clicks, and ${purchases} purchase events are attached to this seller account.`
        ],
        grid: this.buildCohortGrid(transactions, 8, 9)
      },
      alertRules: Array.isArray(current.alertRules) ? current.alertRules : [],
      metricOptions: ['Revenue', 'Orders', 'Conversion', 'Rating'],
      seriesByRange: {
        Today: this.buildSeries(events, 'VIEW', 12, 'hour'),
        '7D': this.buildSeries(transactions, 'amount', 7, 'day'),
        '30D': this.buildSeries(transactions, 'amount', 30, 'day'),
        '90D': this.buildSeries(transactions, 'amount', 90, 'day')
      }
    };
  }

  private async buildProviderPage(userId: string, current: Record<string, unknown>) {
    const [quotes, bookings, consultations, transactions, reviews] = await Promise.all([
      this.prisma.providerQuote.findMany({
        where: { userId },
        select: { amount: true, status: true, createdAt: true }
      }),
      this.prisma.providerBooking.findMany({
        where: { userId },
        select: { amount: true, status: true, createdAt: true }
      }),
      this.prisma.providerConsultation.findMany({
        where: { userId },
        select: { status: true, createdAt: true }
      }),
      this.prisma.transaction.findMany({
        where: { userId, sellerId: null, status: { in: [TransactionStatus.PENDING, TransactionStatus.AVAILABLE, TransactionStatus.PAID] } },
        select: { amount: true, status: true, createdAt: true }
      }),
      this.prisma.review.aggregate({
        where: { subjectUserId: userId, subjectType: 'PROVIDER', status: 'PUBLISHED' },
        _count: { _all: true },
        _avg: { ratingOverall: true }
      })
    ]);

    const bookingsTotal = bookings.length;
    const quotesTotal = quotes.length;
    const consultationsOpen = consultations.filter((entry) => ['open', 'active'].includes(String(entry.status))).length;
    const revenueTotal = transactions.reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);
    const averageRating = Number(reviews._avg.ratingOverall ?? 0);
    const reviewTotal = reviews._count._all ?? 0;

    const rows = [
      {
        channel: 'Bookings',
        share: bookingsTotal + quotesTotal + consultationsOpen > 0 ? (bookingsTotal / Math.max(1, bookingsTotal + quotesTotal + consultationsOpen)) * 100 : 0,
        roas: bookingsTotal > 0 ? Number((revenueTotal / Math.max(1, bookingsTotal)).toFixed(2)) : 0,
        note: `${bookingsTotal} bookings recorded`
      },
      {
        channel: 'Quotes',
        share: bookingsTotal + quotesTotal + consultationsOpen > 0 ? (quotesTotal / Math.max(1, bookingsTotal + quotesTotal + consultationsOpen)) * 100 : 0,
        roas: 0,
        note: `${quotesTotal} provider quotes recorded`
      },
      {
        channel: 'Consultations',
        share: bookingsTotal + quotesTotal + consultationsOpen > 0 ? (consultationsOpen / Math.max(1, bookingsTotal + quotesTotal + consultationsOpen)) * 100 : 0,
        roas: 0,
        note: `${consultationsOpen} open consultations`
      }
    ];

    return {
      marketplaceOptions: ['All'],
      overviewKpis: [
        {
          label: 'Revenue',
          value: this.formatMoney(revenueTotal),
          delta: `${bookingsTotal} bookings`,
          hint: 'Provider payouts and pending earnings'
        },
        {
          label: 'Bookings',
          value: String(bookingsTotal),
          delta: `${this.countStatuses(bookings, ['requested', 'confirmed'])} active`,
          hint: 'Provider bookings scoped to this account'
        },
        {
          label: 'Quotes',
          value: String(quotesTotal),
          delta: `${this.countStatuses(quotes, ['draft', 'sent', 'negotiating'])} open`,
          hint: 'Provider quotes in the database'
        },
        {
          label: 'Rating',
          value: averageRating.toFixed(1),
          delta: `${reviewTotal} reviews`,
          hint: `${consultationsOpen} consultations still open`
        }
      ],
      attributionRows: rows,
      highlights: {
        topDriver:
          bookingsTotal > 0
            ? `Bookings are the strongest driver with ${bookingsTotal} records in the database.`
            : 'No provider activity has been recorded yet.',
        risk:
          consultationsOpen > 0
            ? `${consultationsOpen} consultations still need action.`
            : 'No open consultation risk is currently recorded.',
        recommendation:
          quotesTotal > 0
            ? 'Follow up on open quotes to convert them into confirmed bookings.'
            : 'Create the first quote or booking to start populating provider analytics.'
      },
      cohort: {
        subtitle: `Analytics are computed from ${quotesTotal} quotes, ${bookingsTotal} bookings, and ${consultations.length} consultations.`,
        bullets: [
          `${this.countStatuses(bookings, ['completed'])} bookings have completed fulfillment.`,
          `${this.countStatuses(quotes, ['accepted'])} quotes have moved into an accepted state.`,
          `${transactions.length} provider-side transactions are currently stored in MySQL.`
        ],
        grid: this.buildCohortGrid(bookings, 8, 9)
      },
      alertRules: Array.isArray(current.alertRules) ? current.alertRules : [],
      metricOptions: ['Revenue', 'Bookings', 'Quotes', 'Rating'],
      seriesByRange: {
        Today: this.buildSeries(bookings, 'amount', 12, 'hour'),
        '7D': this.buildSeries(bookings, 'amount', 7, 'day'),
        '30D': this.buildSeries(bookings, 'amount', 30, 'day'),
        '90D': this.buildSeries(bookings, 'amount', 90, 'day')
      }
    };
  }

  private async buildSellerRankDetail(userId: string, range: string, category: string, since: Date) {
    const seller = await this.prisma.seller.findFirst({
      where: { userId },
      select: { id: true, displayName: true, name: true, category: true, categories: true }
    });
    const sellerId = seller?.id ?? '';
    const sellerName = seller?.displayName || seller?.name || 'Seller workspace';

    const [events, transactions, campaigns, deliveredOrders] = await Promise.all([
      this.prisma.analyticsEvent.findMany({
        where: { userId, createdAt: { gte: since } },
        select: { eventType: true, value: true, meta: true, createdAt: true },
        orderBy: { createdAt: 'asc' }
      }),
      this.prisma.transaction.findMany({
        where: {
          sellerId: sellerId || undefined,
          userId: sellerId ? undefined : userId,
          status: { in: [TransactionStatus.PENDING, TransactionStatus.AVAILABLE, TransactionStatus.PAID] },
          createdAt: { gte: since }
        },
        select: { amount: true, createdAt: true }
      }),
      sellerId
        ? this.prisma.campaign.findMany({
            where: { sellerId },
            orderBy: { updatedAt: 'desc' },
            take: 24,
            select: {
              id: true,
              title: true,
              budget: true,
              currency: true,
              status: true,
              metadata: true,
              updatedAt: true
            }
          })
        : Promise.resolve([]),
      sellerId
        ? this.prisma.order.count({
            where: {
              sellerId,
              status: { in: ['DELIVERED'] },
              createdAt: { gte: since }
            }
          })
        : Promise.resolve(0)
    ]);

    const filteredEvents = events.filter((event) => {
      const meta = this.parseEventMeta(event.meta);
      return String(meta.workspaceRole || 'SELLER').toUpperCase() === 'SELLER';
    });
    const filteredCampaigns = campaigns.filter((campaign) => {
      if (category === 'All') return true;
      const metadata = campaign.metadata && typeof campaign.metadata === 'object' && !Array.isArray(campaign.metadata)
        ? (campaign.metadata as Record<string, unknown>)
        : {};
      const tags = this.readStringList(metadata, 'categories');
      const primary = this.readString(metadata, 'category');
      return [primary, ...tags].some((entry) => entry.toLowerCase() === category.toLowerCase());
    });

    const views = this.sumEventValues(filteredEvents, 'VIEW', 'SELLER');
    const clicks = this.sumEventValues(filteredEvents, 'CLICK', 'SELLER');
    const purchases = this.sumEventValues(filteredEvents, 'PURCHASE', 'SELLER');
    const salesDriven = transactions.reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);
    const avgViewers = Math.round(views / Math.max(1, range === '7' ? 7 : range === '90' ? 90 : 30));
    const ctr = clicks > 0 || views > 0 ? Number(((clicks / Math.max(1, views)) * 100).toFixed(2)) : 0;
    const conversion = purchases > 0 || clicks > 0 ? Number(((purchases / Math.max(1, clicks)) * 100).toFixed(2)) : 0;

    const xp = campaigns.length * 50 + deliveredOrders * 40 + Math.round(purchases * 6) + Math.round(clicks * 0.08);
    const rank = this.buildRank(xp);
    const trend = this.buildRankTrend(filteredEvents, transactions, since, Number(range));
    const campaignRows = filteredCampaigns.slice(0, 6).map((campaign, index) => {
      const metadata = campaign.metadata && typeof campaign.metadata === 'object' && !Array.isArray(campaign.metadata)
        ? (campaign.metadata as Record<string, unknown>)
        : {};
      const sales = this.readNumber(metadata, 'salesDriven') || this.readNumber(metadata, 'revenue') || Number(campaign.budget ?? 0);
      const engagements = this.readNumber(metadata, 'engagements')
        || this.readNumber(metadata, 'views')
        || this.readNumber(metadata, 'clicks')
        || 0;
      const convRate = this.readNumber(metadata, 'conversionRate') || conversion;
      const categoryLabel = this.readString(metadata, 'category') || this.readStringList(metadata, 'categories')[0] || seller?.category || 'Beauty';
      return {
        id: index + 1,
        campaignId: campaign.id,
        name: campaign.title || `Campaign ${index + 1}`,
        seller: sellerName,
        category: this.normalizeRankCategory(categoryLabel),
        sales: Number(sales.toFixed(2)),
        engagements: Math.round(engagements),
        convRate: Number(convRate.toFixed(2))
      };
    });

    const benchmarks = {
      viewersPercentile: this.percentile(avgViewers, 250, 1400),
      ctrPercentile: this.percentile(ctr, 0.8, 5.5),
      conversionPercentile: this.percentile(conversion, 0.6, 6.5),
      salesPercentile: this.percentile(salesDriven, 500, 10000)
    };

    return {
      range,
      category,
      rank: {
        ...rank,
        benefits: {
          Bronze: ['Basic access to campaigns', 'Standard support'],
          Silver: [
            'Priority placement in campaign searches',
            'Access to mid-tier budgets',
            'Basic analytics & reporting'
          ],
          Gold: [
            'Priority support',
            'High-budget campaigns & early invites',
            'Deeper analytics & training'
          ]
        }
      },
      metrics: {
        avgViewers,
        ctr,
        conversion,
        salesDriven: Number(salesDriven.toFixed(2))
      },
      benchmarks,
      campaigns: campaignRows,
      goals: [
        {
          id: 'goal-1',
          label: 'Average viewers per live',
          current: avgViewers,
          target: Math.max(avgViewers, Math.round(avgViewers * 1.2)),
          unit: 'viewers'
        },
        {
          id: 'goal-2',
          label: 'Conversion rate',
          current: conversion,
          target: Number((Math.max(conversion, conversion * 1.15)).toFixed(1)),
          unit: '%'
        },
        {
          id: 'goal-3',
          label: 'Monthly sales driven',
          current: Number(salesDriven.toFixed(2)),
          target: Math.max(Number(salesDriven.toFixed(2)), Math.round(salesDriven * 1.18)),
          unit: 'USD'
        }
      ],
      trend
    };
  }

  private async buildProviderRankDetail(userId: string, range: string, since: Date) {
    const [bookings, quotes, transactions] = await Promise.all([
      this.prisma.providerBooking.findMany({
        where: { userId, createdAt: { gte: since } },
        select: { amount: true, createdAt: true }
      }),
      this.prisma.providerQuote.findMany({
        where: { userId, createdAt: { gte: since } },
        select: { amount: true, createdAt: true, status: true }
      }),
      this.prisma.transaction.findMany({
        where: {
          userId,
          sellerId: null,
          status: { in: [TransactionStatus.PENDING, TransactionStatus.AVAILABLE, TransactionStatus.PAID] },
          createdAt: { gte: since }
        },
        select: { amount: true, createdAt: true }
      })
    ]);

    const views = bookings.length * 180;
    const clicks = quotes.length * 24;
    const purchases = bookings.length;
    const salesDriven = transactions.reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);
    const avgViewers = Math.round(views / Math.max(1, Number(range)));
    const ctr = Number(((clicks / Math.max(1, views)) * 100).toFixed(2));
    const conversion = Number(((purchases / Math.max(1, clicks)) * 100).toFixed(2));
    const xp = bookings.length * 80 + quotes.length * 20 + Math.round(salesDriven / 25);
    const rank = this.buildRank(xp);

    return {
      range,
      category: 'All',
      rank: {
        ...rank,
        benefits: {
          Bronze: ['Basic access to campaigns', 'Standard support'],
          Silver: [
            'Priority placement in campaign searches',
            'Access to mid-tier budgets',
            'Basic analytics & reporting'
          ],
          Gold: [
            'Priority support',
            'High-budget campaigns & early invites',
            'Deeper analytics & training'
          ]
        }
      },
      metrics: {
        avgViewers,
        ctr,
        conversion,
        salesDriven: Number(salesDriven.toFixed(2))
      },
      benchmarks: {
        viewersPercentile: this.percentile(avgViewers, 120, 1200),
        ctrPercentile: this.percentile(ctr, 0.5, 5),
        conversionPercentile: this.percentile(conversion, 0.5, 8),
        salesPercentile: this.percentile(salesDriven, 300, 8000)
      },
      campaigns: quotes.slice(0, 6).map((quote, index) => ({
        id: index + 1,
        campaignId: `provider-${index + 1}`,
        name: `Quote ${index + 1}`,
        seller: 'Provider workspace',
        category: 'Tech',
        sales: Number(quote.amount ?? 0),
        engagements: 30 + index * 8,
        convRate: conversion
      })),
      goals: [
        { id: 'goal-1', label: 'Average viewers per live', current: avgViewers, target: Math.max(avgViewers, Math.round(avgViewers * 1.2)), unit: 'viewers' },
        { id: 'goal-2', label: 'Conversion rate', current: conversion, target: Number((Math.max(conversion, conversion * 1.15)).toFixed(1)), unit: '%' },
        { id: 'goal-3', label: 'Monthly sales driven', current: Number(salesDriven.toFixed(2)), target: Math.max(Number(salesDriven.toFixed(2)), Math.round(salesDriven * 1.18)), unit: 'USD' }
      ],
      trend: this.buildProviderTrend(bookings, quotes, transactions, since, Number(range))
    };
  }

  private async readStoredPage(userId: string, role: string) {
    const record = await this.prisma.workspaceSetting.findUnique({
      where: { userId_key: { userId, key: this.scopedKey(role, 'analytics_page') } }
    });

    return (record?.payload as Record<string, unknown> | null) ?? {};
  }

  private buildSeries(
    rows: Array<{ createdAt: Date } & Record<string, unknown>>,
    valueKey: 'amount' | 'VIEW',
    buckets: number,
    mode: 'hour' | 'day'
  ) {
    if (mode === 'hour') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const result = new Array<number>(buckets).fill(0);
      for (const row of rows) {
        const diffHours = Math.floor((row.createdAt.getTime() - start.getTime()) / (2 * 60 * 60 * 1000));
        if (diffHours < 0 || diffHours >= buckets) continue;
        result[diffHours] += this.resolveSeriesValue(row, valueKey);
      }
      return result.map((entry) => Number(entry.toFixed(2)));
    }

    const start = this.daysAgo(buckets - 1);
    start.setHours(0, 0, 0, 0);
    const result = new Array<number>(buckets).fill(0);
    for (const row of rows) {
      const diffDays = Math.floor((row.createdAt.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays < 0 || diffDays >= buckets) continue;
      result[diffDays] += this.resolveSeriesValue(row, valueKey);
    }
    return result.map((entry) => Number(entry.toFixed(2)));
  }

  private buildCohortGrid(
    rows: Array<{ createdAt: Date } & Record<string, unknown>>,
    rowCount: number,
    colCount: number
  ) {
    const weeklyCounts = new Array<number>(rowCount + colCount - 1).fill(0);
    const start = this.daysAgo((rowCount + colCount - 2) * 7);
    start.setHours(0, 0, 0, 0);

    for (const row of rows) {
      const diffWeeks = Math.floor((row.createdAt.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (diffWeeks < 0 || diffWeeks >= weeklyCounts.length) continue;
      weeklyCounts[diffWeeks] += 1;
    }

    return Array.from({ length: rowCount }, (_, rowIndex) => {
      const base = weeklyCounts[rowIndex] || 0;
      return Array.from({ length: colCount }, (_, colIndex) => {
        if (base <= 0) {
          return 0;
        }
        const current = weeklyCounts[rowIndex + colIndex] || 0;
        return Math.max(0, Math.min(100, Math.round((current / base) * 100)));
      });
    });
  }

  private resolveSeriesValue(row: Record<string, unknown>, valueKey: 'amount' | 'VIEW') {
    if (valueKey === 'amount') {
      return Number(row.amount ?? 0);
    }
    const eventType = String(row.eventType ?? '');
    return eventType === valueKey ? Number(row.value ?? 0) : 0;
  }

  private groupSellerChannels(
    orders: Array<{ channel: string; total: number }>,
    events: Array<{ eventType: string; value: number | null; meta: string | null }>
  ) {
    const channelTotals = new Map<string, { orders: number; revenue: number; clicks: number; purchases: number }>();
    for (const order of orders) {
      const channel = String(order.channel || 'Unknown');
      const current = channelTotals.get(channel) ?? { orders: 0, revenue: 0, clicks: 0, purchases: 0 };
      current.orders += 1;
      current.revenue += Number(order.total ?? 0);
      channelTotals.set(channel, current);
    }

    for (const event of events) {
      const meta = this.parseEventMeta(event.meta);
      const channel = typeof meta.channel === 'string' ? meta.channel : typeof meta.marketplace === 'string' ? meta.marketplace : '';
      if (!channel) continue;
      const current = channelTotals.get(channel) ?? { orders: 0, revenue: 0, clicks: 0, purchases: 0 };
      if (event.eventType === 'CLICK') current.clicks += Number(event.value ?? 0);
      if (event.eventType === 'PURCHASE') current.purchases += Number(event.value ?? 0);
      channelTotals.set(channel, current);
    }

    const totalRevenue = Array.from(channelTotals.values()).reduce((sum, entry) => sum + entry.revenue, 0);
    return Array.from(channelTotals.entries())
      .map(([name, entry]) => ({
        name,
        orders: entry.orders,
        revenue: Number(entry.revenue.toFixed(2)),
        share: totalRevenue > 0 ? Number(((entry.revenue / totalRevenue) * 100).toFixed(1)) : 0,
        roas: entry.clicks > 0 ? Number((entry.purchases / entry.clicks).toFixed(2)) : 0
      }))
      .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders)
      .slice(0, 5);
  }

  private countStatuses(rows: Array<{ status: string }>, statuses: string[]) {
    return rows.filter((entry) => statuses.includes(String(entry.status))).length;
  }

  private sumEventValues(
    events: Array<{ eventType: string; value: number | null; meta: string | null }>,
    eventType: string,
    role: string
  ) {
    return events.reduce((sum, event) => {
      if (event.eventType !== eventType) return sum;
      const meta = this.parseEventMeta(event.meta);
      if (String(meta.workspaceRole || '').toUpperCase() !== role) return sum;
      return sum + Number(event.value ?? 0);
    }, 0);
  }

  private filterEventsByRole(
    events: Array<{ eventType: string; value: number | null; meta: string | null }>,
    role: string
  ) {
    const normalizedRole = role.toUpperCase();
    const matching = events.filter((event) => {
      const meta = this.parseEventMeta(event.meta);
      return String(meta.workspaceRole || '').toUpperCase() === normalizedRole;
    });

    const summary = new Map<string, { eventType: string; _count: { _all: number }; _sum: { value: number } }>();
    for (const event of matching) {
      const current =
        summary.get(event.eventType) ?? { eventType: event.eventType, _count: { _all: 0 }, _sum: { value: 0 } };
      current._count._all += 1;
      current._sum.value += Number(event.value ?? 0);
      summary.set(event.eventType, current);
    }
    return Array.from(summary.values());
  }

  private parseEventMeta(meta: string | null): ParsedMeta {
    if (!meta) return {};
    try {
      const parsed = JSON.parse(meta);
      return parsed && typeof parsed === 'object' ? (parsed as ParsedMeta) : {};
    } catch {
      return {};
    }
  }

  private daysAgo(days: number) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

  private formatMoney(value: number) {
    return Number(value || 0).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  private scopedKey(role: string, key: string) {
    return `${String(role || 'seller').toLowerCase()}:${key}`;
  }

  private buildRank(pointsCurrent: number) {
    const currentTier = pointsCurrent >= 3000 ? 'Gold' : pointsCurrent >= 1000 ? 'Silver' : 'Bronze';
    const nextTier = currentTier === 'Bronze' ? 'Silver' : currentTier === 'Silver' ? 'Gold' : 'Platinum';
    const currentFloor = currentTier === 'Bronze' ? 0 : currentTier === 'Silver' ? 1000 : 3000;
    const nextThreshold = currentTier === 'Bronze' ? 1000 : currentTier === 'Silver' ? 3000 : 5000;
    const progressPercent = currentTier === 'Gold'
      ? 100
      : this.clamp(Math.round(((pointsCurrent - currentFloor) / Math.max(1, nextThreshold - currentFloor)) * 100), 0, 100);
    return {
      currentTier,
      nextTier,
      progressPercent,
      pointsCurrent,
      pointsToNext: nextThreshold
    };
  }

  private buildRankTrend(
    events: Array<{ eventType: string; value: number | null; createdAt: Date }>,
    transactions: Array<{ amount: number; createdAt: Date }>,
    since: Date,
    rangeDays: number
  ) {
    const points = Array.from({ length: rangeDays }, (_, index) => {
      const day = new Date(since);
      day.setDate(since.getDate() + index);
      day.setHours(0, 0, 0, 0);
      const next = new Date(day);
      next.setDate(day.getDate() + 1);
      const label = day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayEvents = events.filter((event) => event.createdAt >= day && event.createdAt < next);
      const daySales = transactions
        .filter((entry) => entry.createdAt >= day && entry.createdAt < next)
        .reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);
      return {
        label,
        views: Math.round(dayEvents.filter((event) => event.eventType === 'VIEW').reduce((sum, event) => sum + Number(event.value ?? 0), 0)),
        clicks: Math.round(dayEvents.filter((event) => event.eventType === 'CLICK').reduce((sum, event) => sum + Number(event.value ?? 0), 0)),
        conversions: Math.round(dayEvents.filter((event) => event.eventType === 'PURCHASE').reduce((sum, event) => sum + Number(event.value ?? 0), 0)),
        sales: Number(daySales.toFixed(2))
      };
    });
    return points;
  }

  private buildProviderTrend(
    bookings: Array<{ amount: number | null; createdAt: Date }>,
    quotes: Array<{ amount: number | null; createdAt: Date }>,
    transactions: Array<{ amount: number; createdAt: Date }>,
    since: Date,
    rangeDays: number
  ) {
    return Array.from({ length: rangeDays }, (_, index) => {
      const day = new Date(since);
      day.setDate(since.getDate() + index);
      day.setHours(0, 0, 0, 0);
      const next = new Date(day);
      next.setDate(day.getDate() + 1);
      const label = day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayBookings = bookings.filter((entry) => entry.createdAt >= day && entry.createdAt < next);
      const dayQuotes = quotes.filter((entry) => entry.createdAt >= day && entry.createdAt < next);
      const daySales = transactions
        .filter((entry) => entry.createdAt >= day && entry.createdAt < next)
        .reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);
      return {
        label,
        views: dayQuotes.length * 18,
        clicks: dayQuotes.length * 6,
        conversions: dayBookings.length,
        sales: Number(daySales.toFixed(2))
      };
    });
  }

  private percentile(value: number, floor: number, ceiling: number) {
    if (ceiling <= floor) return 0;
    return this.clamp(Math.round(((value - floor) / (ceiling - floor)) * 100), 1, 99);
  }

  private normalizeRankCategory(value: string): 'Beauty' | 'Tech' | 'Faith' {
    const normalized = value.toLowerCase();
    if (normalized.includes('faith') || normalized.includes('worship')) return 'Faith';
    if (normalized.includes('tech') || normalized.includes('elect') || normalized.includes('gadget')) return 'Tech';
    return 'Beauty';
  }

  private readStringList(value: unknown, key?: string) {
    const source = key && value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)[key]
      : value;
    if (Array.isArray(source)) {
      return source.map((entry) => String(entry).trim()).filter(Boolean);
    }
    if (typeof source === 'string') {
      return source.split(/[,\n|]/g).map((entry) => entry.trim()).filter(Boolean);
    }
    return [];
  }

  private readString(value: unknown, key?: string) {
    const source = key && value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)[key]
      : value;
    return typeof source === 'string' && source.trim() ? source.trim() : '';
  }

  private readNumber(value: unknown, key?: string) {
    const source = key && value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)[key]
      : value;
    const number = Number(source ?? 0);
    return Number.isFinite(number) ? number : 0;
  }

  private clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  private async loadCompatibilityOrderIds() {
    const records = await this.prisma.appRecord.findMany({
      where: {
        domain: 'sellerfront',
        entityType: 'mockdb',
        entityId: { in: SELLERFRONT_COMPAT_RECORD_IDS }
      },
      select: { payload: true }
    });
    const ids = new Set<string>();
    for (const record of records) {
      const payload = record.payload;
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        continue;
      }
      const orders = (payload as Record<string, unknown>).orders;
      if (!Array.isArray(orders)) {
        continue;
      }
      for (const order of orders) {
        if (!order || typeof order !== 'object' || Array.isArray(order)) {
          continue;
        }
        const id = (order as Record<string, unknown>).id;
        if (typeof id === 'string' && id.trim()) {
          ids.add(id.trim());
        }
      }
    }
    return Array.from(ids);
  }

  private async readSnapshot(
    userId: string,
    entityId: string,
    loader: () => Promise<Record<string, unknown>>
  ) {
    const ttlMs = Number(this.configService.get('analytics.snapshotTtlMs') ?? 60_000);
    const cacheKey = `analytics:snapshot:${userId}:${entityId}`;
    return this.cache.getOrSet(cacheKey, ttlMs, async () => {
      const snapshot = await this.prisma.appRecord.findFirst({
        where: {
          userId,
          domain: 'analytics',
          entityType: 'snapshot',
          entityId
        },
        orderBy: { updatedAt: 'desc' }
      });

      if (snapshot && snapshot.updatedAt.getTime() + ttlMs > Date.now()) {
        return (snapshot.payload as Record<string, unknown> | null) ?? {};
      }

      const payload = await loader();
      await this.saveSnapshot(userId, entityId, payload);
      return payload;
    });
  }

  private async saveSnapshot(userId: string, entityId: string, payload: Record<string, unknown>) {
    const existing = await this.prismaWrite.appRecord.findFirst({
      where: {
        userId,
        domain: 'analytics',
        entityType: 'snapshot',
        entityId
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true }
    });

    if (existing) {
      await this.prismaWrite.appRecord.update({
        where: { id: existing.id },
        data: { payload: payload as Prisma.InputJsonValue }
      });
      return;
    }

    await this.prismaWrite.appRecord.create({
      data: {
        userId,
        domain: 'analytics',
        entityType: 'snapshot',
        entityId,
        payload: payload as Prisma.InputJsonValue
      }
    });
  }

  private async invalidateSnapshots(userId: string) {
    await this.cache.invalidatePrefix(`analytics:snapshot:${userId}:`);
    await this.prismaWrite.appRecord.deleteMany({
      where: {
        userId,
        domain: 'analytics',
        entityType: 'snapshot'
      }
    });
  }

  private snapshotEntityId(
    kind: 'overview' | 'page' | 'rank',
    role: string,
    extra?: { category?: string; range?: string }
  ) {
    const normalizedRole = String(role || 'seller').toLowerCase();
    if (kind !== 'rank') {
      return `${normalizedRole}:${kind}`;
    }
    return `${normalizedRole}:${kind}:${String(extra?.range ?? '30')}:${String(extra?.category ?? 'all').toLowerCase()}`;
  }
}
