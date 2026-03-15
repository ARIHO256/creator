import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DisputeStatus, OrderStatus, Prisma, ReturnStatus, SellerKind, TransactionStatus, UserRole } from '@prisma/client';
import { CacheService } from '../../platform/cache/cache.service.js';
import { PrismaService, ReadPrismaService } from '../../platform/prisma/prisma.service.js';
import { JobsService } from '../jobs/jobs.service.js';
import { JobsWorker } from '../jobs/jobs.worker.js';

const SELLERFRONT_COMPAT_RECORD_IDS = ['sellerfront_mockdb_seed', 'sellerfront_mockdb_live'];

@Injectable()
export class DashboardService {
  constructor(
    private readonly prismaWrite: PrismaService,
    private readonly prisma: ReadPrismaService,
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
    const readStartedAt = process.hrtime.bigint();
    const [_, __, jobsMetrics] = await Promise.all([
      this.prismaWrite.$queryRaw`SELECT 1`,
      this.prisma.$queryRaw`SELECT 1`,
      this.jobsService.metrics()
    ]);
    const databaseLatencyMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const readDatabaseLatencyMs = Number(process.hrtime.bigint() - readStartedAt) / 1_000_000;
    const warnings = this.securityWarnings();

    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: 'up',
          latencyMs: Number(databaseLatencyMs.toFixed(1))
        },
        databaseRead: {
          status: 'up',
          latencyMs: Number(readDatabaseLatencyMs.toFixed(1)),
          replicaConfigured:
            Boolean(this.configService.get<string>('database.readUrl')) &&
            this.configService.get<string>('database.readUrl') !== this.configService.get<string>('database.writeUrl')
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
          workerPollMs: this.configService.get<number>('jobs.workerPollMs') ?? 2000,
          realtimeStreamServerEnabled: this.configService.get<boolean>('realtime.streamServerEnabled') ?? true,
          realtimeSubscriberEnabled: this.configService.get<boolean>('realtime.subscriberEnabled') ?? true
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

    const created = await this.prismaWrite.systemContent.create({
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

    const created = await this.prismaWrite.userSetting.create({
      data: {
        userId,
        key: 'bootstrap',
        payload
      }
    });
    return created.payload;
  }

  async feed(userId: string) {
    return this.readReadModel(userId, 'feed', () => this.computeFeed(userId));
  }

  private async computeFeed(userId: string) {
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

  async liveFeed(userId: string) {
    return this.readReadModel(userId, 'live-feed', () => this.computeLiveFeed(userId));
  }

  private async computeLiveFeed(userId: string) {
    const seller = await this.resolveSellerWorkspace(userId);
    const sellerId = seller?.id ?? '';
    const sellerName = seller?.displayName || seller?.name || 'Seller workspace';
    const categories = this.uniqueStrings([
      ...this.readStringList(seller?.categories),
      seller?.category ?? ''
    ]);
    const config = await this.readWorkspaceSetting(userId, 'seller_live_feed');

    const [campaigns, creatorFollows, sessions, replays, proposalsPending, contractsActive] = await Promise.all([
      sellerId
        ? this.prisma.campaign.findMany({
            where: { sellerId },
            include: {
              creator: {
                include: {
                  creatorProfile: true
                }
              }
            },
            orderBy: { updatedAt: 'desc' },
            take: 20
          })
        : Promise.resolve([]),
      sellerId
        ? this.prisma.creatorFollow.findMany({
            where: { sellerId },
            include: {
              creator: {
                include: {
                  creatorProfile: true
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 12
          })
        : Promise.resolve([]),
      this.prisma.liveSession.findMany({
        where: { userId },
        orderBy: [{ updatedAt: 'desc' }],
        take: 20
      }),
      this.prisma.liveReplay.findMany({
        where: { userId },
        orderBy: [{ updatedAt: 'desc' }],
        take: 12
      }),
      sellerId
        ? this.prisma.proposal.count({
            where: { sellerId, status: { in: ['SUBMITTED', 'IN_REVIEW', 'NEGOTIATING'] } }
          })
        : Promise.resolve(0),
      sellerId
        ? this.prisma.contract.count({
            where: { sellerId, status: { in: ['ACTIVE', 'TERMINATION_REQUESTED'] } }
          })
        : Promise.resolve(0)
    ]);

    const activeCampaigns = campaigns.filter((campaign) => ['OPEN', 'NEGOTIATION', 'ACTIVE'].includes(String(campaign.status))).length;
    const executionCampaigns = campaigns.filter((campaign) => ['ACTIVE'].includes(String(campaign.status))).length;
    const supplierActsAsCreator = campaigns.some((campaign) => this.readString(campaign.metadata, 'creatorUsageDecision') === 'I will NOT use a Creator');

    const feedItems = [
      ...sessions.map((session: any) => this.serializeLiveFeedSession(session, sellerName, campaigns)),
      ...replays.map((replay: any) => this.serializeLiveFeedReplay(replay, sellerName, campaigns))
    ]
      .filter(Boolean)
      .sort((left, right) => this.sortFeedItems(right, left))
      .slice(0, 12);

    const followedCreators = creatorFollows.map((follow: any) => {
      const profile = follow.creator?.creatorProfile;
      const liveSession = sessions.find((entry: any) => this.readString(entry.data, 'hostId') === follow.creatorUserId);
      const scheduledSession = sessions.find((entry: any) => {
        if (this.readString(entry.data, 'hostId') !== follow.creatorUserId) return false;
        const normalized = this.normalizeLiveSessionStatus(entry.status, entry);
        return normalized === 'Upcoming';
      });

      return {
        id: follow.creatorUserId,
        name: profile?.handle || profile?.name || `creator-${follow.creatorUserId.slice(0, 6)}`,
        type: profile?.tier || 'Creator',
        category: this.readStringList(profile?.categories)[0] || categories[0] || 'Lifestyle',
        status: liveSession
          ? `Live now · ${this.formatCompactNumber(this.readNumber(liveSession.data, 'peakViewers') || 0)} viewers`
          : scheduledSession
            ? `Upcoming · ${this.formatShortDate(this.readDateValue(scheduledSession.scheduledAt, this.readString(scheduledSession.data, 'startISO')))}`
            : 'Updates only',
        viewers: liveSession ? this.readNumber(liveSession.data, 'peakViewers') || 0 : null
      };
    });

    const nextSession = sessions
      .map((session: any) => this.normalizeWorkspaceSession(session, sellerName, campaigns))
      .filter((session: any) => session.status !== 'Ended')
      .sort((left: any, right: any) => new Date(left.startISO).getTime() - new Date(right.startISO).getTime())[0] ?? null;

    const topCategory = categories[0] || 'General';
    const totalBudget = campaigns.reduce((sum, campaign: any) => sum + Number(campaign.budget ?? 0), 0);

    return {
      supplierActsAsCreator,
      hero: {
        initials: this.buildInitials(sellerName),
        name: sellerName,
        subtitle: `${seller?.isVerified ? 'Verified Supplier' : 'Supplier'}${seller?.region ? ` · ${seller.region}` : ''}`,
        tier: seller?.kind === SellerKind.PROVIDER ? 'Supplier Tier · Provider' : 'Supplier Tier · Pro',
        kpis: [
          { label: 'Active campaigns', value: String(activeCampaigns), sub: `${executionCampaigns} in execution` },
          { label: 'Pending approvals', value: String(proposalsPending), sub: supplierActsAsCreator ? 'Self-content review' : 'Creator deliverables' },
          { label: 'Open collabs', value: String(contractsActive), sub: `${creatorFollows.length} followed creators` }
        ]
      },
      todayItems:
        Array.isArray(config?.todayItems) && config?.todayItems.length > 0
          ? config.todayItems
          : this.buildLiveFeedTodayItems(campaigns, sessions, proposalsPending),
      feedItems,
      followedCreators,
      pipeline: {
        stages: supplierActsAsCreator
          ? [
              { label: 'Briefs created', value: String(campaigns.length), amount: this.formatMoney(totalBudget), progressPct: campaigns.length > 0 ? 84 : 0, highlight: false },
              { label: 'Content in review', value: String(proposalsPending), amount: this.formatMoney(totalBudget * 0.35), progressPct: proposalsPending > 0 ? 58 : 0, highlight: true },
              { label: 'Scheduled', value: String(sessions.filter((entry: any) => this.normalizeLiveSessionStatus(entry.status, entry) === 'Upcoming').length), amount: this.formatMoney(totalBudget * 0.42), progressPct: sessions.length > 0 ? 66 : 0, highlight: false },
              { label: 'Executing', value: String(sessions.filter((entry: any) => this.normalizeLiveSessionStatus(entry.status, entry) === 'Live').length), amount: this.formatMoney(totalBudget * 0.2), progressPct: sessions.length > 0 ? 44 : 0, highlight: false }
            ]
          : [
              { label: 'Open collabs', value: String(campaigns.length), amount: this.formatMoney(totalBudget), progressPct: campaigns.length > 0 ? 88 : 0, highlight: false },
              { label: 'Pitches received', value: String(proposalsPending), amount: this.formatMoney(totalBudget * 0.6), progressPct: proposalsPending > 0 ? 74 : 0, highlight: false },
              { label: 'Negotiating', value: String(campaigns.filter((campaign) => String(campaign.status) === 'NEGOTIATION').length), amount: this.formatMoney(totalBudget * 0.32), progressPct: campaigns.length > 0 ? 58 : 0, highlight: false },
              { label: 'Active contracts', value: String(contractsActive), amount: this.formatMoney(totalBudget * 0.24), progressPct: contractsActive > 0 ? 42 : 0, highlight: true }
            ]
      },
      crew: {
        title: nextSession?.campaign || 'No scheduled live session',
        rows: [
          { role: 'Host', name: nextSession?.hostRole === 'Supplier' ? 'You (Supplier acting as Creator)' : nextSession?.host || 'Assigned Creator', status: nextSession ? 'Confirmed' : 'Missing' },
          { role: 'Producer', name: sellerName, status: nextSession ? 'Assigned' : 'Missing' },
          { role: 'Moderator', name: nextSession ? 'Not assigned' : 'Not assigned', status: 'Missing' }
        ]
      },
      aiSuggestions:
        Array.isArray(config?.aiSuggestions) && config?.aiSuggestions.length > 0
          ? config.aiSuggestions
          : this.buildLiveFeedSuggestions({
              activeCampaigns,
              proposalsPending,
              contractsActive,
              topCategory,
              upcomingSessions: sessions.filter((entry: any) => this.normalizeLiveSessionStatus(entry.status, entry) === 'Upcoming').length
            }),
      categoryInsights: categories.slice(0, 3).map((label, index) => ({
        label,
        badge: index === 0
          ? `${Math.max(1, activeCampaigns)} active campaign${activeCampaigns === 1 ? '' : 's'}`
          : index === 1
            ? `${contractsActive} open contract${contractsActive === 1 ? '' : 's'}`
            : `${feedItems.length} feed update${feedItems.length === 1 ? '' : 's'}`,
        badgeTone: index === 0 ? 'emerald' : index === 1 ? 'sky' : 'amber'
      })),
      topCategory
    };
  }

  async sellerPublicProfile(userId: string) {
    return this.readReadModel(userId, 'seller-public-profile', () => this.computeSellerPublicProfile(userId));
  }

  private async computeSellerPublicProfile(userId: string) {
    const seller = await this.resolveSellerWorkspace(userId);
    const sellerName = seller?.displayName || seller?.name || 'Supplier';
    const sellerId = seller?.id ?? '';
    const config = await this.readWorkspaceSetting(userId, 'seller_public_profile');

    const [profileSetting, campaigns, opportunities, listingsCount, reviews, contractsCount] = await Promise.all([
      this.prisma.userSetting.findUnique({
        where: {
          userId_key: {
            userId,
            key: 'profile'
          }
        }
      }),
      sellerId
        ? this.prisma.campaign.findMany({
            where: { sellerId },
            orderBy: { updatedAt: 'desc' },
            take: 8
          })
        : Promise.resolve([]),
      sellerId
        ? this.prisma.opportunity.findMany({
            where: { sellerId },
            orderBy: { updatedAt: 'desc' },
            take: 6
          })
        : Promise.resolve([]),
      sellerId ? this.prisma.marketplaceListing.count({ where: { sellerId } }) : Promise.resolve(0),
      this.prisma.review.findMany({
        where: {
          subjectUserId: userId,
          subjectType: seller?.kind === SellerKind.PROVIDER ? 'PROVIDER' : 'SELLER',
          status: 'PUBLISHED'
        },
        orderBy: { createdAt: 'desc' },
        take: 12
      }),
      sellerId ? this.prisma.contract.count({ where: { sellerId } }) : Promise.resolve(0)
    ]);

    const profilePayload = (profileSetting?.payload as Record<string, unknown> | null) ?? {};
    const socialEntries = this.buildSellerSocials(profilePayload);
    const categories = this.uniqueStrings([
      ...this.readStringList(profilePayload, 'productLines'),
      ...this.readStringList(profilePayload, 'regions'),
      ...this.readStringList(seller?.categories),
      seller?.category ?? ''
    ]);
    const reviewAverage = reviews.length
      ? reviews.reduce((sum, review) => sum + Number(review.ratingOverall ?? 0), 0) / reviews.length
      : Number(seller?.rating ?? 0);

    const performance = {
      payoutWindow: this.readString(config, 'payoutWindow') || this.deriveSellerPayoutWindow(contractsCount, campaigns.length),
      returnRate: `${Math.max(0.5, Math.min(9.9, Number((reviews.length > 0 ? 1 + 1 / reviews.length : 1.8).toFixed(1))))}%`,
      conversionRate: `${Math.max(0.6, Math.min(12, Number((campaigns.length > 0 ? 2.4 + campaigns.length * 0.2 : 2.4).toFixed(1))))}%`,
      completedCollabs: contractsCount,
      rating: reviewAverage > 0 ? `${reviewAverage.toFixed(1)}/5` : '0.0/5',
      fulfillmentSla: this.readString(config, 'fulfillmentSla') || this.deriveSellerFulfillmentSla(listingsCount, campaigns.length)
    };

    return {
      supplier: {
        id: sellerId,
        name: sellerName,
        handle: seller?.handle ? `@${seller.handle.replace(/^@/, '')}` : `@${this.slugify(sellerName)}`,
        initials: this.buildInitials(sellerName),
        type: seller?.kind === SellerKind.PROVIDER ? 'Services' : 'Products (Wholesale + Retail)',
        region: seller?.region || this.readString(profilePayload, 'region') || 'Global',
        verified: Boolean(seller?.isVerified),
        kyb: Boolean(seller?.isVerified),
        categoryLine: categories.slice(0, 3).join(' · ') || 'Catalog-backed supplier',
        shipsTo: this.readString(profilePayload, 'shippingRegions') || 'Ships to Africa / Asia'
      },
      about: {
        text: this.readString(config, 'about') || this.deriveSellerAbout(sellerName, categories, campaigns.length, listingsCount),
        collabPreferences: this.readString(config, 'collabPreferences') || this.deriveSellerCollabPreferences(categories, contractsCount),
        categories: categories.slice(0, 6),
        trustNote: this.readString(config, 'trustNote') || this.deriveSellerTrustNote(Boolean(seller?.isVerified), contractsCount)
      },
      heroMetrics: {
        avgCreatorPayout: performance.payoutWindow,
        rating: performance.rating,
        fulfillment: performance.fulfillmentSla,
        skuCount: `${listingsCount}+`,
        responseTime: this.readString(config, 'responseTime') || this.deriveSellerResponseTime(campaigns.length, contractsCount)
      },
      performance,
      portfolio: campaigns.slice(0, 3).map((campaign: any) => ({
        id: campaign.id,
        title: campaign.title,
        meta: `${this.readString(campaign.metadata, 'type') || 'Campaign'} · ${seller?.region || 'Global'}`,
        body: campaign.description || this.readString(campaign.metadata, 'summary') || 'Campaign details are stored in the collaboration workspace.',
        kpis: [
          `Budget ${this.formatMoney(Number(campaign.budget ?? 0), campaign.currency || 'USD')}`,
          `Status ${this.humanizeStatus(campaign.status)}`,
          `Updated ${this.formatShortDate(campaign.updatedAt)}`
        ]
      })),
      opportunities: opportunities.slice(0, 4).map((opportunity: any) => ({
        id: opportunity.id,
        title: opportunity.title,
        type: this.readString(opportunity.metadata, 'type') || opportunity.title || 'Campaign opportunity',
        region: seller?.region || 'Global',
        budget: Number(opportunity.budget ?? 0),
        status: opportunity.status || 'Open'
      })),
      reviews: {
        average: reviewAverage,
        total: reviews.length,
        items: reviews.slice(0, 3).map((review: any) => ({
          id: review.id,
          brand: review.authorName || 'Creator review',
          quote: review.body || 'Review details are available in the reviews workspace.'
        }))
      },
      socials: socialEntries,
      campaigns: campaigns.slice(0, 3).map((campaign: any) => ({
        id: campaign.id,
        title: campaign.title,
        period: this.formatDateRange(campaign.startAt, campaign.endAt),
        gmv: this.formatMoney(Number(campaign.budget ?? 0), campaign.currency || 'USD'),
        payout: performance.payoutWindow,
        rating: performance.rating
      })),
      tags: categories.slice(0, 8),
      compatibility: {
        score: this.clamp(Math.round((reviewAverage || 4) * 18 + campaigns.length * 2 + contractsCount), 35, 98),
        summary: `${sellerName} is strongest in ${categories[0] || 'its primary category'} campaigns and clear conversion-led briefs.`,
        bullets: [
          `${campaigns.length} recent campaign${campaigns.length === 1 ? '' : 's'} recorded in MySQL.`,
          `${performance.fulfillmentSla} fulfillment window.`,
          `${performance.payoutWindow} payout window.`
        ]
      },
      quickFacts: {
        facts: [
          seller?.isVerified ? 'KYB verified supplier account.' : 'Verification in progress.',
          `Typical payout to creators: ${performance.payoutWindow}.`,
          ...this.deriveSellerQuickFacts(campaigns.length, contractsCount, performance.fulfillmentSla),
          ...this.readStringList(config, 'quickFacts')
        ].slice(0, 4),
        deckContent: [
          `Supplier Brand Kit`,
          ``,
          `Brand: ${sellerName}`,
          `Handle: ${seller?.handle ? `@${seller.handle.replace(/^@/, '')}` : this.slugify(sellerName)}`,
          `Categories: ${categories.join(', ') || 'General'}`,
          `Payout window: ${performance.payoutWindow}`,
          `Fulfillment SLA: ${performance.fulfillmentSla}`
        ].join('\n')
      }
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

      const [campaignCount, pendingProposals, openTasks, unreadThreads, unreadNotifications] = await Promise.all([
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
        }),
        this.prisma.messageThread.findMany({
          where: { userId, lastMessageAt: { not: null } },
          select: { lastReadAt: true, lastMessageAt: true }
        }),
        this.prisma.notification.count({ where: { userId, readAt: null } })
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
        messagesUnread: unreadThreads.filter((entry) =>
          !entry.lastReadAt || (entry.lastMessageAt && entry.lastReadAt < entry.lastMessageAt)
        ).length,
        notificationsUnread: unreadNotifications,
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
    return this.readReadModel(userId, 'my-day', () => this.computeMyDay(userId));
  }

  private async computeMyDay(userId: string) {
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
    await this.prismaWrite.dashboardSnapshot.upsert({
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

  private async buildProviderMetrics(userId: string) {
    const [quotes, bookings, openConsultations, portfolioItems, groupedTransactions] = await Promise.all([
      this.prisma.providerQuote.findMany({ where: { userId }, select: { status: true } }),
      this.prisma.providerBooking.findMany({ where: { userId }, select: { status: true, amount: true } }),
      this.prisma.providerConsultation.count({ where: { userId, status: { in: ['open', 'active'] } } }),
      this.prisma.providerPortfolioItem.count({ where: { userId } }),
      this.prisma.transaction.groupBy({
        by: ['status'],
        where: { userId, sellerId: null, status: { in: [TransactionStatus.PENDING, TransactionStatus.AVAILABLE, TransactionStatus.PAID] } },
        _sum: { amount: true }
      })
    ]);

    const quoteStatuses = quotes.reduce<Record<string, number>>((acc, quote) => {
      const key = String(quote.status || '').toLowerCase();
      if (!key) return acc;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    const bookingStatuses = bookings.reduce<Record<string, number>>((acc, booking) => {
      const key = String(booking.status || '').toLowerCase();
      if (!key) return acc;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    const revenueByStatus = new Map(
      groupedTransactions.map((entry) => [entry.status, Number(entry._sum.amount ?? 0)])
    );
    const totalBookingValue = bookings.reduce((sum, booking) => sum + Number(booking.amount ?? 0), 0);

    return {
      quotesOpen: quotes.filter((quote) => ['draft', 'sent', 'negotiating'].includes(String(quote.status))).length,
      quotesTotal: quotes.length,
      quoteStatuses,
      bookingsActive: bookings.filter((booking) => ['requested', 'confirmed'].includes(String(booking.status))).length,
      bookingStatuses,
      consultationsOpen: openConsultations,
      portfolioItems,
      revenue: {
        pending: revenueByStatus.get(TransactionStatus.PENDING) ?? 0,
        available: revenueByStatus.get(TransactionStatus.AVAILABLE) ?? 0,
        paid: revenueByStatus.get(TransactionStatus.PAID) ?? 0,
        total: [TransactionStatus.PENDING, TransactionStatus.AVAILABLE, TransactionStatus.PAID].reduce(
          (sum, status) => sum + (revenueByStatus.get(status) ?? 0),
          0
        ),
        averageBookingValue: bookings.length > 0 ? Number((totalBookingValue / bookings.length).toFixed(2)) : 0
      }
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

  private async resolveSellerWorkspace(userId: string) {
    return this.prisma.seller.findFirst({
      where: { userId },
      include: {
        storefront: true
      }
    });
  }

  private async ensureWorkspaceSetting(userId: string, key: string, payload: Record<string, unknown>) {
    const existing = await this.prisma.workspaceSetting.findUnique({
      where: {
        userId_key: {
          userId,
          key
        }
      }
    });
    if (existing?.payload && typeof existing.payload === 'object' && !Array.isArray(existing.payload)) {
      return existing.payload as Record<string, unknown>;
    }
    const record = await this.prismaWrite.workspaceSetting.upsert({
      where: {
        userId_key: {
          userId,
          key
        }
      },
      update: {
        payload: payload as Prisma.InputJsonValue
      },
      create: {
        userId,
        key,
        payload: payload as Prisma.InputJsonValue
      }
    });
    return (record.payload as Record<string, unknown>) ?? payload;
  }

  private async readWorkspaceSetting(userId: string, key: string) {
    const existing = await this.prisma.workspaceSetting.findUnique({
      where: {
        userId_key: {
          userId,
          key
        }
      }
    });
    return existing?.payload && typeof existing.payload === 'object' && !Array.isArray(existing.payload)
      ? (existing.payload as Record<string, unknown>)
      : null;
  }

  private async readReadModel(
    userId: string,
    entityId: string,
    loader: () => Promise<Record<string, unknown>>
  ) {
    const ttlMs = Number(this.configService.get('dashboard.readModelTtlMs') ?? 60_000);
    const cacheKey = `dashboard:read-model:${userId}:${entityId}`;
    return this.cache.getOrSet(cacheKey, ttlMs, async () => {
      const snapshot = await this.prisma.appRecord.findFirst({
        where: {
          userId,
          domain: 'dashboard',
          entityType: 'read_model',
          entityId
        },
        orderBy: { updatedAt: 'desc' }
      });

      if (snapshot && snapshot.updatedAt.getTime() + ttlMs > Date.now()) {
        return (snapshot.payload as Record<string, unknown> | null) ?? {};
      }

      const payload = await loader();
      await this.saveReadModel(userId, entityId, payload);
      return payload;
    });
  }

  private async saveReadModel(userId: string, entityId: string, payload: Record<string, unknown>) {
    const existing = await this.prismaWrite.appRecord.findFirst({
      where: {
        userId,
        domain: 'dashboard',
        entityType: 'read_model',
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
        domain: 'dashboard',
        entityType: 'read_model',
        entityId,
        payload: payload as Prisma.InputJsonValue
      }
    });
  }

  private buildLiveFeedTodayItems(campaigns: any[], sessions: any[], proposalsPending: number) {
    const items: Array<Record<string, string>> = [];
    if (proposalsPending > 0) {
      items.push({ time: 'Now', label: `Review ${proposalsPending} pending creator pitch${proposalsPending === 1 ? '' : 'es'}` });
    }
    const nextSession = sessions
      .map((session: any) => ({ session, start: this.readDateValue(session.scheduledAt, this.readString(session.data, 'startISO')) }))
      .filter((entry) => entry.start)
      .sort((left, right) => left.start.getTime() - right.start.getTime())[0];
    if (nextSession) {
      items.push({
        time: nextSession.start.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false }),
        label: `Prepare ${this.readString(nextSession.session.data, 'title') || nextSession.session.title || 'next live session'}`
      });
    }
    if (campaigns.length > 0) {
      items.push({ time: 'Today', label: `Track ${campaigns.length} active campaign${campaigns.length === 1 ? '' : 's'}` });
    }
    return items.slice(0, 3);
  }

  private buildLiveFeedSuggestions(params: {
    activeCampaigns: number;
    proposalsPending: number;
    contractsActive: number;
    topCategory: string;
    upcomingSessions: number;
  }) {
    const suggestions: Array<Record<string, string>> = [];
    if (params.proposalsPending > 0) {
      suggestions.push({
        title: 'Review creator responses',
        body: `${params.proposalsPending} pitch${params.proposalsPending === 1 ? '' : 'es'} need attention to keep launch timing on track.`
      });
    }
    if (params.upcomingSessions > 0) {
      suggestions.push({
        title: 'Finalize the next live slot',
        body: `${params.upcomingSessions} upcoming live session${params.upcomingSessions === 1 ? '' : 's'} should have assets and timing confirmed.`
      });
    }
    if (params.activeCampaigns > 0) {
      suggestions.push({
        title: 'Promote the strongest category',
        body: `${params.topCategory} is your leading category signal from current campaign activity.`
      });
    }
    if (params.contractsActive > 0) {
      suggestions.push({
        title: 'Keep collaboration handoffs tight',
        body: `${params.contractsActive} active contract${params.contractsActive === 1 ? '' : 's'} can benefit from clear delivery checkpoints.`
      });
    }
    return suggestions.slice(0, 3);
  }

  private deriveSellerAbout(sellerName: string, categories: string[], campaignsCount: number, listingsCount: number) {
    const categoryLine = categories.slice(0, 2).join(' and ') || 'catalog-backed products';
    return `${sellerName} runs ${categoryLine} campaigns with ${listingsCount} listing${listingsCount === 1 ? '' : 's'} and ${campaignsCount} recent collaboration workflow${campaignsCount === 1 ? '' : 's'}.`;
  }

  private deriveSellerCollabPreferences(categories: string[], contractsCount: number) {
    const categoryLine = categories.slice(0, 3).join(', ') || 'catalog-led promotions';
    return `${categoryLine} with clear deliverables, attribution tracking, and ${contractsCount} active collaboration handoff${contractsCount === 1 ? '' : 's'}.`;
  }

  private deriveSellerTrustNote(isVerified: boolean, contractsCount: number) {
    return isVerified
      ? `Verified seller workspace with ${contractsCount} tracked collaboration contract${contractsCount === 1 ? '' : 's'}.`
      : `Verification is still in progress; ${contractsCount} collaboration contract${contractsCount === 1 ? '' : 's'} are tracked in workspace records.`;
  }

  private deriveSellerPayoutWindow(contractsCount: number, campaignsCount: number) {
    if (contractsCount > 4 || campaignsCount > 6) return '48h';
    if (contractsCount > 0 || campaignsCount > 0) return '72h';
    return '—';
  }

  private deriveSellerFulfillmentSla(listingsCount: number, campaignsCount: number) {
    if (listingsCount > 20 || campaignsCount > 5) return '24h';
    if (listingsCount > 0 || campaignsCount > 0) return '48h';
    return '—';
  }

  private deriveSellerResponseTime(campaignsCount: number, contractsCount: number) {
    if (campaignsCount > 5 || contractsCount > 3) return '<4h';
    if (campaignsCount > 0 || contractsCount > 0) return '<8h';
    return '—';
  }

  private deriveSellerQuickFacts(campaignsCount: number, contractsCount: number, fulfillmentSla: string) {
    const facts: string[] = [];
    if (campaignsCount > 0) {
      facts.push(`${campaignsCount} recent campaign${campaignsCount === 1 ? '' : 's'} recorded in workspace data.`);
    }
    if (contractsCount > 0) {
      facts.push(`${contractsCount} active collaboration contract${contractsCount === 1 ? '' : 's'} tracked.`);
    }
    if (fulfillmentSla !== '—') {
      facts.push(`Operational fulfillment target: ${fulfillmentSla}.`);
    }
    return facts;
  }

  private serializeLiveFeedSession(session: any, sellerName: string, campaigns: any[]) {
    const normalized = this.normalizeWorkspaceSession(session, sellerName, campaigns);
    return {
      id: normalized.id,
      type: normalized.status === 'Live' ? 'live' : 'upcoming',
      title: normalized.title,
      brand: normalized.campaign || sellerName,
      viewers: normalized.status === 'Live'
        ? this.formatCompactNumber(normalized.peakViewers)
        : normalized.location,
      time: normalized.status === 'Live'
        ? normalized.time
        : `Starts ${this.formatShortDate(normalized.startISO)}`,
      tag: normalized.hostRole === 'Supplier' ? 'Supplier-hosted' : 'Creator-hosted'
    };
  }

  private serializeLiveFeedReplay(replay: any, sellerName: string, campaigns: any[]) {
    const sessionId = typeof replay.sessionId === 'string' ? replay.sessionId : '';
    const sourceSession = sessionId
      ? campaigns.find(() => false)
      : null;
    const data = replay.data && typeof replay.data === 'object' && !Array.isArray(replay.data)
      ? replay.data as Record<string, unknown>
      : {};
    return {
      id: replay.id,
      type: 'replay',
      title: this.readString(data, 'title') || this.readString(data, 'headline') || 'Replay highlight',
      brand: this.readString(data, 'campaignTitle') || sellerName,
      viewers: this.formatCompactNumber(this.readNumber(data, 'views') || this.readNumber(data, 'peakViewers') || 0),
      time: this.formatShortDate(replay.updatedAt),
      tag: sourceSession ? 'Replay' : 'Post-live'
    };
  }

  private normalizeWorkspaceSession(session: any, sellerName: string, campaigns: any[]) {
    const data = session.data && typeof session.data === 'object' && !Array.isArray(session.data)
      ? session.data as Record<string, unknown>
      : {};
    const scheduledAt = this.readDateValue(session.scheduledAt, this.readString(data, 'startISO')) || session.createdAt;
    const startISO = scheduledAt.toISOString();
    const endISO = this.readDateValue(session.endedAt, this.readString(data, 'endISO'))
      || new Date(scheduledAt.getTime() + Math.max(30, this.readNumber(data, 'durationMin') || 90) * 60_000);
    const campaignId = this.readString(data, 'campaignId');
    const campaign = campaigns.find((entry: any) => entry.id === campaignId);
    const hostRole = this.readString(data, 'hostRole') || (this.readString(campaign?.metadata, 'creatorUsageDecision') === 'I will NOT use a Creator' ? 'Supplier' : 'Creator');
    const title = session.title || this.readString(data, 'title') || campaign?.title || 'Live Session';
    return {
      id: session.id,
      title,
      campaign: campaign?.title || this.readString(data, 'campaignTitle') || sellerName,
      location: this.readString(data, 'location') || 'MyLiveDealz',
      status: this.normalizeLiveSessionStatus(session.status, session),
      startISO,
      endISO: endISO.toISOString(),
      time: `${this.formatTime(startISO)}-${this.formatTime(endISO)}`,
      host: this.readString(data, 'host') || (hostRole === 'Supplier' ? sellerName : 'Assigned Creator'),
      hostRole,
      peakViewers: this.readNumber(data, 'peakViewers') || 0
    };
  }

  private normalizeLiveSessionStatus(status: string, session: any) {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'live') return 'Live';
    if (normalized === 'ended') return 'Ended';
    if (normalized === 'ready') return 'Ready';
    if (normalized === 'scheduled') return 'Upcoming';
    if (normalized === 'draft') {
      const scheduled = session?.scheduledAt ? new Date(session.scheduledAt) : null;
      return scheduled && scheduled.getTime() > Date.now() ? 'Upcoming' : 'Draft';
    }
    return this.humanizeStatus(status || 'Draft');
  }

  private buildSellerSocials(profilePayload: Record<string, unknown>) {
    const socials = profilePayload.socials && typeof profilePayload.socials === 'object' && !Array.isArray(profilePayload.socials)
      ? profilePayload.socials as Record<string, unknown>
      : {};
    const customSocials = Array.isArray(profilePayload.customSocials) ? profilePayload.customSocials as Array<Record<string, unknown>> : [];
    const base = [
      { id: 'website', name: 'Website', key: 'website', tag: 'W', color: 'bg-slate-600' },
      { id: 'facebook', name: 'Facebook', key: 'facebook', tag: 'f', color: 'bg-blue-600' },
      { id: 'instagram', name: 'Instagram', key: 'instagram', tag: 'I', color: 'bg-pink-500' },
      { id: 'tiktok', name: 'TikTok', key: 'tiktok', tag: 'T', color: 'bg-slate-900' },
      { id: 'youtube', name: 'YouTube', key: 'youtube', tag: 'Y', color: 'bg-rose-600' }
    ]
      .map((entry) => {
        const raw = entry.key === 'website' ? this.readString(profilePayload, 'website') : this.readString(socials, entry.key);
        if (!raw) return null;
        return {
          id: entry.id,
          name: entry.name,
          handle: raw,
          tag: entry.tag,
          color: entry.color
        };
      })
      .filter(Boolean);

    const custom = customSocials
      .map((entry, index) => {
        const label = this.readString(entry, 'label') || this.readString(entry, 'name');
        const value = this.readString(entry, 'value') || this.readString(entry, 'url');
        if (!label || !value) return null;
        return {
          id: `custom-${index}`,
          name: label,
          handle: value,
          tag: label.charAt(0).toUpperCase(),
          color: 'bg-slate-500'
        };
      })
      .filter(Boolean);

    return [...base, ...custom];
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
    const num = typeof source === 'number' ? source : Number(source);
    return Number.isFinite(num) ? num : 0;
  }

  private readDateValue(primary?: Date | null, secondary?: string) {
    if (primary instanceof Date && !Number.isNaN(primary.getTime())) {
      return primary;
    }
    if (secondary) {
      const parsed = new Date(secondary);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return null;
  }

  private uniqueStrings(values: string[]) {
    return Array.from(new Set(values.map((entry) => String(entry || '').trim()).filter(Boolean)));
  }

  private buildInitials(name: string) {
    return String(name || '')
      .split(/\s+/)
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'SP';
  }

  private formatCompactNumber(value: number) {
    return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0));
  }

  private formatMoney(value: number, currency = 'USD') {
    try {
      return new Intl.NumberFormat('en', {
        style: 'currency',
        currency,
        maximumFractionDigits: 1
      }).format(Number(value || 0));
    } catch {
      return `${currency} ${Number(value || 0).toFixed(1)}`;
    }
  }

  private formatShortDate(value: Date | string) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('en', { month: 'short', day: 'numeric' });
  }

  private formatTime(value: Date | string) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  private formatDateRange(start?: Date | null, end?: Date | null) {
    if (!start && !end) return 'Date not scheduled';
    const startLabel = start ? this.formatShortDate(start) : 'Start pending';
    const endLabel = end ? this.formatShortDate(end) : 'End pending';
    return `${startLabel} - ${endLabel}`;
  }

  private humanizeStatus(value: string) {
    const normalized = String(value || '').replace(/[_-]+/g, ' ').trim();
    if (!normalized) return 'Unknown';
    return normalized
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  private slugify(value: string) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'supplier';
  }

  private sortFeedItems(left: Record<string, unknown>, right: Record<string, unknown>) {
    const leftScore = String(left.type) === 'live' ? 3 : String(left.type) === 'upcoming' ? 2 : 1;
    const rightScore = String(right.type) === 'live' ? 3 : String(right.type) === 'upcoming' ? 2 : 1;
    return leftScore - rightScore;
  }
}
