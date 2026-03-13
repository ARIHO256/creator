import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(userId: string, role: string) {
    const events = await this.prisma.analyticsEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 500
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
    const record = await this.prisma.workspaceSetting.findUnique({
      where: { userId_key: { userId, key: this.scopedKey(role, 'analytics_page') } }
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

  async updatePage(userId: string, role: string, body: Record<string, unknown>) {
    const current = await this.getPage(userId, role);
    const next = {
      ...current,
      ...body
    };

    const record = await this.prisma.workspaceSetting.upsert({
      where: { userId_key: { userId, key: this.scopedKey(role, 'analytics_page') } },
      update: { payload: next as Prisma.InputJsonValue },
      create: { userId, key: this.scopedKey(role, 'analytics_page'), payload: next as Prisma.InputJsonValue }
    });

    return record.payload as Record<string, unknown>;
  }

  private filterEventsByRole(
    events: Array<{ eventType: string; value: number | null; meta: string | null }>,
    role: string
  ) {
    const normalizedRole = role.toUpperCase();
    const matching = events.filter((event) => {
      const meta = this.parseEventMeta(event.meta);
      return meta.workspaceRole === normalizedRole;
    });

    const source = matching.length > 0 ? matching : [];
    const summary = new Map<string, { eventType: string; _count: { _all: number }; _sum: { value: number } }>();
    for (const event of source) {
      const current =
        summary.get(event.eventType) ?? { eventType: event.eventType, _count: { _all: 0 }, _sum: { value: 0 } };
      current._count._all += 1;
      current._sum.value += Number(event.value ?? 0);
      summary.set(event.eventType, current);
    }
    return Array.from(summary.values());
  }

  private parseEventMeta(meta: string | null) {
    if (!meta) return {} as Record<string, unknown>;
    try {
      const parsed = JSON.parse(meta);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }

  private scopedKey(role: string, key: string) {
    return `${String(role || 'seller').toLowerCase()}:${key}`;
  }
}
