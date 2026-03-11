import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(userId: string) {
    const groupedEvents = await this.prisma.analyticsEvent.groupBy({
      by: ['eventType'],
      where: { userId },
      _count: { _all: true },
      _sum: { value: true }
    });

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

  async getPage(userId: string) {
    const record = await this.prisma.workspaceSetting.findUnique({
      where: { userId_key: { userId, key: 'analytics_page' } }
    });

    return (record?.payload as Record<string, unknown> | null) ?? {
      marketplaceOptions: ['All'],
      overviewKpis: [],
      attributionRows: [],
      highlights: { topDriver: '', risk: '', recommendation: '' },
      cohort: { subtitle: '', bullets: [] },
      alertRules: [],
      metricOptions: []
    };
  }

  async updatePage(userId: string, body: Record<string, unknown>) {
    const current = await this.getPage(userId);
    const next = {
      ...current,
      ...body
    };

    const record = await this.prisma.workspaceSetting.upsert({
      where: { userId_key: { userId, key: 'analytics_page' } },
      update: { payload: next as Prisma.InputJsonValue },
      create: { userId, key: 'analytics_page', payload: next as Prisma.InputJsonValue }
    });

    return record.payload as Record<string, unknown>;
  }
}
