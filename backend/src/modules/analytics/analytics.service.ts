import { Injectable } from '@nestjs/common';
import { Prisma, TransactionStatus } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

const SELLERFRONT_COMPAT_RECORD_IDS = ['sellerfront_mockdb_seed', 'sellerfront_mockdb_live'];

type ParsedMeta = Record<string, unknown>;

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(userId: string, role: string) {
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

  async getPage(userId: string, role: string) {
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

  async updatePage(userId: string, role: string, body: Record<string, unknown>) {
    const current = await this.readStoredPage(userId, role);
    const next = {
      ...current,
      ...(Array.isArray(body.alertRules) ? { alertRules: body.alertRules } : {})
    };

    const record = await this.prisma.workspaceSetting.upsert({
      where: { userId_key: { userId, key: this.scopedKey(role, 'analytics_page') } },
      update: { payload: next as Prisma.InputJsonValue },
      create: { userId, key: this.scopedKey(role, 'analytics_page'), payload: next as Prisma.InputJsonValue }
    });

    return this.getPage(userId, role).then((page) => ({
      ...page,
      alertRules: Array.isArray((record.payload as Record<string, unknown> | null)?.alertRules)
        ? (((record.payload as Record<string, unknown>).alertRules as unknown[]) ?? [])
        : page.alertRules
    }));
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
        ]
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
        ]
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

  private async loadCompatibilityOrderIds() {
    const records = await this.prisma.appRecord.findMany({
      where: { id: { in: SELLERFRONT_COMPAT_RECORD_IDS } },
      select: { payload: true }
    });

    const ids = new Set<string>();
    for (const record of records) {
      const payload =
        record.payload && typeof record.payload === 'object' && !Array.isArray(record.payload)
          ? (record.payload as Record<string, unknown>)
          : null;
      const orders = Array.isArray(payload?.orders) ? payload.orders : [];
      for (const entry of orders) {
        const order =
          entry && typeof entry === 'object' && !Array.isArray(entry)
            ? (entry as Record<string, unknown>)
            : null;
        const id = typeof order?.id === 'string' ? order.id : '';
        if (id) ids.add(id);
      }
    }

    return Array.from(ids);
  }
}
