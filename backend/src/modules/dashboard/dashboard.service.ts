import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AppRecordsService } from '../../platform/app-records.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(
    private readonly records: AppRecordsService,
    private readonly prisma: PrismaService
  ) {}

  health() {
    return { status: 'ok' };
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
      return {
        role: user.role,
        hero: {
          title: user.sellerProfile?.displayName ?? 'Seller workspace',
          subtitle: 'Listings, orders, transactions, and creator campaigns in one backend.'
        },
        quickStats: [
          { label: 'Active listings', value: await this.prisma.marketplaceListing.count({ where: { userId, status: 'ACTIVE' } }) },
          { label: 'Open orders', value: await this.prisma.order.count({ where: { seller: { userId }, status: { in: ['NEW', 'CONFIRMED', 'PACKED', 'ON_HOLD'] } } }) }
        ]
      };
    }

    return {
      role: user?.role ?? UserRole.CREATOR,
      hero: {
        title: user?.creatorProfile?.name ?? 'Creator workspace',
        subtitle: 'Campaigns, proposals, tasks, and performance in one backend.'
      },
      quickStats: [
        { label: 'Active campaigns', value: await this.prisma.campaign.count({ where: { creatorId: userId } }) },
        { label: 'Pending proposals', value: await this.prisma.proposal.count({ where: { creatorId: userId, status: { in: ['SUBMITTED', 'IN_REVIEW', 'NEGOTIATING'] } } }) }
      ]
    };
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
}
