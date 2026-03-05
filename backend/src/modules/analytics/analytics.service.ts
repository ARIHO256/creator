import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(userId: string) {
    const events = await this.prisma.analyticsEvent.findMany({ where: { userId } });
    const totalViews = events
      .filter((event) => event.eventType === 'VIEW')
      .reduce((sum, event) => sum + (event.value ?? 0), 0);
    const totalClicks = events
      .filter((event) => event.eventType === 'CLICK')
      .reduce((sum, event) => sum + (event.value ?? 0), 0);
    const purchases = events
      .filter((event) => event.eventType === 'PURCHASE')
      .reduce((sum, event) => sum + (event.value ?? 0), 0);

    return {
      totalViews,
      totalClicks,
      purchases,
      conversionRate: totalClicks > 0 ? Number(((purchases / totalClicks) * 100).toFixed(2)) : 0,
      eventsCount: events.length
    };
  }
}
