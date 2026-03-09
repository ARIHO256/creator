import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransactionStatus, UserRole } from '@prisma/client';
import { AppRecordsService } from '../../platform/app-records.service.js';
import { CacheService } from '../../platform/cache/cache.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { JobsService } from '../jobs/jobs.service.js';
import { JobsWorker } from '../jobs/jobs.worker.js';

@Injectable()
export class DashboardService {
  constructor(
    private readonly records: AppRecordsService,
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
    const record = await this.records
      .getByEntityId('dashboard', 'landing', 'public')
      .catch(() =>
        this.records.create(
          'dashboard',
          'landing',
          {
            title: 'Unified seller and creator backend',
            subtitle: 'One API surface with role-aware workspaces'
          },
          'public'
        )
      );
    return record.payload;
  }

  async appBootstrap(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roleAssignments: true
      }
    });

    const record = await this.records
      .getByEntityId('dashboard', 'bootstrap', 'default', userId)
      .catch(() =>
        this.records.create(
          'dashboard',
          'bootstrap',
          {
            featureFlags: { unifiedBackend: true },
            navBadges: {},
            activeRole: user?.role ?? UserRole.CREATOR,
            roles: user?.roleAssignments.map((assignment) => assignment.role) ?? [UserRole.CREATOR]
          },
          'default',
          userId
        )
      );
    return record.payload;
  }

  async feed(userId: string) {
    const existing = await this.records.getByEntityId('dashboard', 'feed', 'home', userId).catch(() => null);
    if (existing) {
      return existing.payload;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        creatorProfile: true,
        sellerProfile: true
      }
    });

    if (user?.role === UserRole.SELLER || user?.role === UserRole.PROVIDER) {
      const [activeListings, openOrders] = await Promise.all([
        this.prisma.marketplaceListing.count({ where: { userId, status: 'ACTIVE' } }),
        this.prisma.order.count({ where: { seller: { userId }, status: { in: ['NEW', 'CONFIRMED', 'PACKED', 'ON_HOLD'] } } })
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

      const [campaignCount, pendingProposals, openTasks] = await Promise.all([
        this.prisma.campaign.count({
          where: {
            OR: [{ creatorId: userId }, { createdByUserId: userId }],
            status: { in: ['OPEN', 'NEGOTIATION', 'ACTIVE'] }
          }
        }),
        this.prisma.proposal.count({
          where: {
            creatorId: userId,
            status: { in: ['SUBMITTED', 'IN_REVIEW', 'NEGOTIATING'] }
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
          userId,
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
        where: { subjectUserId: userId, status: 'PUBLISHED' },
        _avg: { ratingOverall: true },
        _count: { _all: true }
      });
      const repliedCount = await this.prisma.review.count({
        where: { subjectUserId: userId, status: 'PUBLISHED', replies: { some: {} } }
      });
      const needsReply = await this.prisma.review.count({
        where: { subjectUserId: userId, status: 'PUBLISHED', requiresResponse: true, replies: { none: {} } }
      });
      const negativeCount = await this.prisma.review.count({
        where: { subjectUserId: userId, status: 'PUBLISHED', sentiment: { in: ['negative', 'NEGATIVE'] } }
      });

      const reviewTotal = reviewAverage._count._all ?? 0;
      const averageRating = Number(reviewAverage._avg.ratingOverall ?? 0);
      const responseRate = reviewTotal ? Math.round((repliedCount / reviewTotal) * 100) : 0;
      const negativePct = reviewTotal ? (negativeCount / reviewTotal) * 100 : 0;
      const trustScore = this.computeTrustScore(averageRating, responseRate, negativePct);

      if (
        campaignCount === 0 &&
        pendingProposals === 0 &&
        openTasks === 0 &&
        earnings.lifetime === 0 &&
        reviewTotal === 0
      ) {
        return this.records
          .getByEntityId('dashboard', 'summary', 'main', userId)
          .then((record) => record.payload)
          .catch(() => this.emptySummary());
      }

      return {
        role: user?.role ?? UserRole.CREATOR,
        roles: user?.roleAssignments.map((assignment) => assignment.role) ?? [UserRole.CREATOR],
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
        }
      };
    });
  }

  async myDay(userId: string) {
    const existing = await this.records.getByEntityId('dashboard', 'my_day', 'today', userId).catch(() => null);
    if (existing) {
      return existing.payload;
    }

    const [tasks, campaigns] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          OR: [{ assigneeUserId: userId }, { createdByUserId: userId }]
        },
        take: 5,
        orderBy: { updatedAt: 'desc' }
      }),
      this.prisma.campaign.findMany({
        where: {
          OR: [{ creatorId: userId }, { createdByUserId: userId }, { seller: { userId } }]
        },
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
}
