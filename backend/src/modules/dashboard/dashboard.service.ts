import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DisputeStatus, OrderStatus, Prisma, ReturnStatus, SellerKind, TransactionStatus, UserRole } from '@prisma/client';
import { CacheService } from '../../platform/cache/cache.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { JobsService } from '../jobs/jobs.service.js';
import { JobsWorker } from '../jobs/jobs.worker.js';

const SELLERFRONT_COMPAT_RECORD_IDS = ['sellerfront_mockdb_seed', 'sellerfront_mockdb_live'];

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jobsService: JobsService,
    private readonly jobsWorker: JobsWorker,
    private readonly cache: CacheService
  ) {}

  health() {
    return {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      app: {
        host: this.configService.get<string>('app.host') ?? '0.0.0.0',
        port: this.configService.get<number>('app.port') ?? 4010
      }
    };
  }

  async ready() {
    const startedAt = process.hrtime.bigint();
    const [_, jobsMetrics] = await Promise.all([
      this.prisma.$queryRaw`SELECT 1`,
      this.jobsService.metrics()
    ]);
    const databaseLatencyMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const warnings = this.securityWarnings();

    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: 'up',
          latencyMs: Number(databaseLatencyMs.toFixed(1))
        },
        upload: {
          provider: this.configService.get<string>('upload.defaultProvider') ?? 'LOCAL',
          sessionTtlMinutes: this.configService.get<number>('upload.sessionTtlMinutes') ?? 20
        },
        rateLimit: {
          defaultLimit: this.configService.get<number>('rateLimit.defaultLimit') ?? 120,
          windowMs: this.configService.get<number>('rateLimit.defaultWindowMs') ?? 60_000
        },
        jobs: {
          status: jobsMetrics.deadLetters > 0 ? 'degraded' : 'up',
          ...jobsMetrics
        },
        runtime: {
          requestTimeoutMs: this.configService.get<number>('app.requestTimeoutMs') ?? 15_000,
          bodyLimitBytes: this.configService.get<number>('app.bodyLimitBytes') ?? 10 * 1024 * 1024,
          securityHeadersEnabled: this.configService.get<boolean>('security.enableHeaders') ?? true,
          workerEnabled: this.configService.get<boolean>('jobs.workerEnabled') ?? true,
          workerPollMs: this.configService.get<number>('jobs.workerPollMs') ?? 2000
        }
      },
      worker: this.jobsWorker.getStatus(),
      warnings
    };
  }

  routes() {
    return {
      groups: [
        'auth',
        'dashboard',
        'users',
        'creators',
        'sellers',
        'profiles',
        'discovery',
        'collaboration',
        'marketplace',
        'live',
        'adz',
        'finance',
        'jobs',
        'settings',
        'workflow',
        'reviews'
      ]
    };
  }

  async landingContent() {
    const existing = await this.prisma.systemContent.findUnique({
      where: { key: 'landing' }
    });
    if (existing) {
      return existing.payload;
    }

    const created = await this.prisma.systemContent.create({
      data: {
        key: 'landing',
        payload: {
          title: 'Unified seller and creator backend',
          subtitle: 'One API surface with role-aware workspaces'
        }
      }
    });
    return created.payload;
  }

  async appBootstrap(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roleAssignments: true
      }
    });

    const existing = await this.prisma.userSetting.findUnique({
      where: { userId_key: { userId, key: 'bootstrap' } }
    });

    if (existing) {
      return existing.payload;
    }

    const payload = {
      featureFlags: { unifiedBackend: true },
      navBadges: {},
      activeRole: user?.role ?? UserRole.CREATOR,
      roles: user?.roleAssignments.map((assignment) => assignment.role) ?? [UserRole.CREATOR]
    };

    const created = await this.prisma.userSetting.create({
      data: {
        userId,
        key: 'bootstrap',
        payload
      }
    });
    return created.payload;
  }

  async feed(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        creatorProfile: true,
        sellerProfile: true
      }
    });

    if (user?.role === UserRole.SELLER) {
      const compatibilityOrderIds = await this.loadCompatibilityOrderIds();
      const [activeListings, openOrders] = await Promise.all([
        this.prisma.marketplaceListing.count({ where: { userId, status: 'ACTIVE' } }),
        this.prisma.order.count({
          where: {
            seller: { userId },
            status: { in: ['NEW', 'CONFIRMED', 'PACKED', 'ON_HOLD'] },
            ...(compatibilityOrderIds.length > 0 ? { id: { notIn: compatibilityOrderIds } } : {})
          }
        })
      ]);

      return {
        role: user.role,
        hero: {
          title: user.sellerProfile?.displayName ?? 'Seller workspace',
          subtitle: 'Listings, orders, transactions, and creator campaigns in one backend.'
        },
        quickStats: [
          { label: 'Active listings', value: activeListings },
          { label: 'Open orders', value: openOrders }
        ]
      };
    }

    if (user?.role === UserRole.PROVIDER) {
      const [openQuotes, activeBookings] = await Promise.all([
        this.prisma.providerQuote.count({ where: { userId, status: { in: ['draft', 'sent', 'negotiating'] } } }),
        this.prisma.providerBooking.count({ where: { userId, status: { in: ['requested', 'confirmed'] } } })
      ]);

      return {
        role: user.role,
        hero: {
          title: user.sellerProfile?.displayName ?? 'Provider workspace',
          subtitle: 'Quotes, bookings, consultations, and service delivery in one backend.'
        },
        quickStats: [
          { label: 'Open quotes', value: openQuotes },
          { label: 'Active bookings', value: activeBookings }
        ]
      };
    }

    const [activeCampaigns, pendingProposals] = await Promise.all([
      this.prisma.campaign.count({ where: { creatorId: userId } }),
      this.prisma.proposal.count({ where: { creatorId: userId, status: { in: ['SUBMITTED', 'IN_REVIEW', 'NEGOTIATING'] } } })
    ]);

    return {
      role: user?.role ?? UserRole.CREATOR,
      hero: {
        title: user?.creatorProfile?.name ?? 'Creator workspace',
        subtitle: 'Campaigns, proposals, tasks, and performance in one backend.'
      },
      quickStats: [
        { label: 'Active campaigns', value: activeCampaigns },
        { label: 'Pending proposals', value: pendingProposals }
      ]
    };
  }

  async summary(userId: string) {
    const cacheKey = `dashboard:summary:${userId}`;
    return this.cache.getOrSet(cacheKey, 15_000, async () => {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          roleAssignments: true
        }
      });

      if (!user) {
        return this.emptySummary();
      }

      const roles = user.roleAssignments.map((assignment) => assignment.role);
      if (!roles.length && user.role) {
        roles.push(user.role);
      }
      const activeRole = user.role ?? UserRole.CREATOR;
      const snapshot = await this.loadSnapshot(userId, activeRole);
      if (snapshot) {
        return snapshot;
      }

      const sellerProfile = activeRole === UserRole.SELLER
        ? await this.prisma.seller.findFirst({ where: { userId, kind: { not: SellerKind.PROVIDER } } })
        : null;

      const [campaignCount, pendingProposals, openTasks] = await Promise.all([
        this.prisma.campaign.count({
          where: {
            ...(sellerProfile
              ? { sellerId: sellerProfile.id, status: { in: ['OPEN', 'NEGOTIATION', 'ACTIVE'] } }
              : activeRole === UserRole.CREATOR
                ? { OR: [{ creatorId: userId }, { createdByUserId: userId }], status: { in: ['OPEN', 'NEGOTIATION', 'ACTIVE'] } }
                : { id: '__none__' })
          }
        }),
        this.prisma.proposal.count({
          where: {
            ...(sellerProfile
              ? { sellerId: sellerProfile.id, status: { in: ['SUBMITTED', 'IN_REVIEW', 'NEGOTIATING'] } }
              : activeRole === UserRole.CREATOR
                ? { creatorId: userId, status: { in: ['SUBMITTED', 'IN_REVIEW', 'NEGOTIATING'] } }
                : { id: '__none__' })
          }
        }),
        this.prisma.task.count({
          where: {
            OR: [{ assigneeUserId: userId }, { createdByUserId: userId }],
            status: { not: 'COMPLETED' }
          }
        })
      ]);

      const groupedTransactions = await this.prisma.transaction.groupBy({
        by: ['status'],
        where: {
          ...(sellerProfile ? { sellerId: sellerProfile.id } : { userId }),
          status: { in: [TransactionStatus.PENDING, TransactionStatus.AVAILABLE, TransactionStatus.PAID] }
        },
        _sum: { amount: true }
      });

      const totalsByStatus = new Map(
        groupedTransactions.map((transaction) => [transaction.status, Number(transaction._sum.amount ?? 0)])
      );

      const earnings = {
        available: totalsByStatus.get(TransactionStatus.AVAILABLE) ?? 0,
        pending: totalsByStatus.get(TransactionStatus.PENDING) ?? 0,
        lifetime: [TransactionStatus.PENDING, TransactionStatus.AVAILABLE, TransactionStatus.PAID].reduce(
          (sum, status) => sum + (totalsByStatus.get(status) ?? 0),
          0
        )
      };

      const reviewAverage = await this.prisma.review.aggregate({
        where: { subjectUserId: userId, subjectType: this.reviewSubjectForRole(activeRole), status: 'PUBLISHED' },
        _avg: { ratingOverall: true },
        _count: { _all: true }
      });
      const repliedCount = await this.prisma.review.count({
        where: { subjectUserId: userId, subjectType: this.reviewSubjectForRole(activeRole), status: 'PUBLISHED', replies: { some: {} } }
      });
      const needsReply = await this.prisma.review.count({
        where: { subjectUserId: userId, subjectType: this.reviewSubjectForRole(activeRole), status: 'PUBLISHED', requiresResponse: true, replies: { none: {} } }
      });
      const negativeCount = await this.prisma.review.count({
        where: {
          subjectUserId: userId,
          subjectType: this.reviewSubjectForRole(activeRole),
          status: 'PUBLISHED',
          sentiment: { in: ['negative', 'NEGATIVE'] }
        }
      });

      const reviewTotal = reviewAverage._count._all ?? 0;
      const averageRating = Number(reviewAverage._avg.ratingOverall ?? 0);
      const responseRate = reviewTotal ? Math.round((repliedCount / reviewTotal) * 100) : 0;
      const negativePct = reviewTotal ? (negativeCount / reviewTotal) * 100 : 0;
      const trustScore = this.computeTrustScore(averageRating, responseRate, negativePct);

      const sellerMetrics = activeRole === UserRole.SELLER && sellerProfile
        ? await this.buildSellerMetrics(userId, sellerProfile.id)
        : null;
      const providerMetrics = activeRole === UserRole.PROVIDER ? await this.buildProviderMetrics(userId) : null;

      const summary = {
        role: user.role ?? UserRole.CREATOR,
        roles,
        campaignsActive: campaignCount,
        proposalsPending: pendingProposals,
        tasksOpen: openTasks,
        earnings,
        reviews: {
          total: reviewTotal,
          averageRating,
          needsReply,
          responseRate,
          trustScore
        },
        ...(sellerMetrics ? { seller: sellerMetrics } : {}),
        ...(providerMetrics ? { provider: providerMetrics } : {})
      };

      await this.saveSnapshot(userId, activeRole, summary);
      return summary;
    });
  }

  async myDay(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const activeRole = user?.role ?? UserRole.CREATOR;
    const tasksPromise = this.prisma.task.findMany({
      where: {
        OR: [{ assigneeUserId: userId }, { createdByUserId: userId }]
      },
      take: 5,
      orderBy: { updatedAt: 'desc' }
    });

    if (activeRole === UserRole.PROVIDER) {
      const [tasks, bookings, consultations] = await Promise.all([
        tasksPromise,
        this.prisma.providerBooking.findMany({
          where: { userId },
          take: 3,
          orderBy: { updatedAt: 'desc' }
        }),
        this.prisma.providerConsultation.findMany({
          where: { userId },
          take: 2,
          orderBy: { updatedAt: 'desc' }
        })
      ]);

      return {
        agenda: [
          ...bookings.map((booking) => `Booking ${booking.id} (${booking.status})`),
          ...consultations.map((consultation) => `Consultation ${consultation.id} (${consultation.status})`)
        ],
        tasks: tasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          dueAt: task.dueAt
        }))
      };
    }

    const [tasks, campaigns] = await Promise.all([
      tasksPromise,
      this.prisma.campaign.findMany({
        where: activeRole === UserRole.SELLER
          ? { seller: { userId } }
          : { OR: [{ creatorId: userId }, { createdByUserId: userId }] },
        take: 5,
        orderBy: { updatedAt: 'desc' }
      })
    ]);

    return {
      agenda: campaigns.map((campaign) => `${campaign.title} (${campaign.status})`),
      tasks: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        dueAt: task.dueAt
      }))
    };
  }

  private securityWarnings() {
    const warnings: string[] = [];
    const warnOnDefaultSecrets = this.configService.get<boolean>('security.warnOnDefaultSecrets') ?? true;
    if (!warnOnDefaultSecrets) {
      return warnings;
    }

    const secretChecks = [
      ['auth.accessSecret', 'change-me-access-secret'],
      ['auth.refreshSecret', 'change-me-refresh-secret'],
      ['upload.signingSecret', 'change-me-upload-secret']
    ] as const;

    for (const [path, sentinel] of secretChecks) {
      const current = this.configService.get<string>(path);
      if (!current || current === sentinel) {
        warnings.push(`${path} is using a default or empty secret`);
      }
    }

    return warnings;
  }

  private computeTrustScore(avg: number, responseRate: number, negativePct: number) {
    return this.clamp(Math.round(avg * 16 + responseRate * 0.35 - negativePct * 0.45), 0, 100);
  }

  private clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  private emptySummary() {
    return {
      role: UserRole.CREATOR,
      roles: [UserRole.CREATOR],
      campaignsActive: 0,
      proposalsPending: 0,
      tasksOpen: 0,
      earnings: { available: 0, pending: 0, lifetime: 0 },
      reviews: { total: 0, averageRating: 0, needsReply: 0, responseRate: 0, trustScore: 0 }
    };
  }

  private async loadSnapshot(userId: string, role: UserRole) {
    const snapshot = await this.prisma.dashboardSnapshot.findUnique({
      where: { userId_role: { userId, role } }
    });
    if (!snapshot) return null;
    if (snapshot.expiresAt && snapshot.expiresAt <= new Date()) {
      return null;
    }
    return snapshot.payload as Record<string, unknown>;
  }

  private async saveSnapshot(userId: string, role: UserRole, summary: Record<string, unknown>) {
    const ttlMs = Number(this.configService.get<number>('dashboard.snapshotTtlMs') ?? 60_000);
    const now = new Date();
    const expiresAt = ttlMs > 0 ? new Date(now.getTime() + ttlMs) : null;
    await this.prisma.dashboardSnapshot.upsert({
      where: { userId_role: { userId, role } },
      create: {
        userId,
        role,
        payload: summary as Prisma.InputJsonValue,
        computedAt: now,
        expiresAt
      },
      update: {
        payload: summary as Prisma.InputJsonValue,
        computedAt: now,
        expiresAt
      }
    });
  }

  private async buildSellerMetrics(userId: string, sellerId: string) {
    const compatibilityOrderIds = await this.loadCompatibilityOrderIds();
    const openOrderStatuses: OrderStatus[] = [
      OrderStatus.NEW,
      OrderStatus.CONFIRMED,
      OrderStatus.PICKING,
      OrderStatus.PACKED,
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.SHIPPED,
      OrderStatus.ON_HOLD,
      OrderStatus.RETURN_REQUESTED
    ];
    const [activeListings, openOrders, openReturns, openDisputes] = await Promise.all([
      this.prisma.marketplaceListing.count({ where: { sellerId, status: 'ACTIVE' } }),
      this.prisma.order.count({
        where: {
          sellerId,
          status: { in: openOrderStatuses },
          ...(compatibilityOrderIds.length > 0 ? { id: { notIn: compatibilityOrderIds } } : {})
        }
      }),
      this.prisma.sellerReturn.count({
        where: {
          sellerId,
          status: { in: [ReturnStatus.REQUESTED, ReturnStatus.APPROVED, ReturnStatus.RECEIVED] }
        }
      }),
      this.prisma.sellerDispute.count({
        where: {
          sellerId,
          status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] }
        }
      })
    ]);

    const groupedTransactions = await this.prisma.transaction.groupBy({
      by: ['status'],
      where: {
        sellerId,
        status: { in: [TransactionStatus.PENDING, TransactionStatus.AVAILABLE, TransactionStatus.PAID] }
      },
      _sum: { amount: true }
    });

    const totalsByStatus = new Map(
      groupedTransactions.map((transaction) => [transaction.status, Number(transaction._sum.amount ?? 0)])
    );

    return {
      listingsActive: activeListings,
      ordersOpen: openOrders,
      returnsOpen: openReturns,
      disputesOpen: openDisputes,
      revenue: {
        pending: totalsByStatus.get(TransactionStatus.PENDING) ?? 0,
        available: totalsByStatus.get(TransactionStatus.AVAILABLE) ?? 0,
        paid: totalsByStatus.get(TransactionStatus.PAID) ?? 0
      }
    };
  }

  private async loadCompatibilityOrderIds() {
    const records = await this.prisma.appRecord.findMany({
      where: { id: { in: SELLERFRONT_COMPAT_RECORD_IDS } },
      select: { payload: true }
    });

    const ids = new Set<string>();
    for (const record of records) {
      const payload =
        record?.payload && typeof record.payload === 'object' && !Array.isArray(record.payload)
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

  private async buildProviderMetrics(userId: string) {
    const [openQuotes, activeBookings, openConsultations, portfolioItems] = await Promise.all([
      this.prisma.providerQuote.count({ where: { userId, status: { in: ['draft', 'sent', 'negotiating'] } } }),
      this.prisma.providerBooking.count({ where: { userId, status: { in: ['requested', 'confirmed'] } } }),
      this.prisma.providerConsultation.count({ where: { userId, status: { in: ['open', 'active'] } } }),
      this.prisma.providerPortfolioItem.count({ where: { userId } })
    ]);

    return {
      quotesOpen: openQuotes,
      bookingsActive: activeBookings,
      consultationsOpen: openConsultations,
      portfolioItems
    };
  }

  private reviewSubjectForRole(role: UserRole) {
    if (role === UserRole.SELLER) {
      return 'SELLER';
    }
    if (role === UserRole.PROVIDER) {
      return 'PROVIDER';
    }
    return 'CREATOR';
  }
}
