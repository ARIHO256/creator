import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AppRecordsService } from '../../platform/app-records.service.js';

@Injectable()
export class FinanceService {
  constructor(@Inject(AppRecordsService) private readonly records: AppRecordsService) {}

  earningsSummary(userId: string) {
    return this.records.getByEntityId('finance', 'earnings_summary', 'main', userId).then((r) => r.payload).catch(() => ({ available: 0, pending: 0, lifetime: 0 }));
  }

  payouts(userId: string) {
    return this.records.list('finance', 'payout', userId).then((rows) => rows.map((r) => ({ id: r.entityId, ...(r.payload as any) })));
  }

  requestPayout(userId: string, body: any) {
    const id = randomUUID();
    return this.records.create('finance', 'payout', { ...body, status: 'requested', requestedAt: new Date().toISOString() }, id, userId);
  }

  analyticsOverview(userId: string) {
    return this.records.getByEntityId('finance', 'analytics_overview', 'main', userId).then((r) => r.payload).catch(() => ({ rank: 'Bronze', score: 0 }));
  }

  subscription(userId: string) {
    return this.records.getByEntityId('finance', 'subscription', 'main', userId).then((r) => r.payload).catch(() => ({ plan: 'basic', cycle: 'monthly' }));
  }

  updateSubscription(userId: string, body: any) {
    return this.records.upsert('finance', 'subscription', 'main', body, userId);
  }
}
