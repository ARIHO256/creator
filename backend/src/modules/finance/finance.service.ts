import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { AppRecordsService } from '../../platform/app-records.service.js';

@Injectable()
export class FinanceService {
  constructor(
    @Inject(AppRecordsService) private readonly records: AppRecordsService,
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  async earningsSummary(userId: string) {
    const transactions = await this.prisma.transaction.findMany({ where: { userId } });
    if (transactions.length > 0) {
      return {
        available: this.sumTransactions(transactions, ['AVAILABLE']),
        pending: this.sumTransactions(transactions, ['PENDING']),
        lifetime: this.sumTransactions(transactions, ['PENDING', 'AVAILABLE', 'PAID'])
      };
    }

    return this.records
      .getByEntityId('finance', 'earnings_summary', 'main', userId)
      .then((record) => record.payload)
      .catch(() => ({ available: 0, pending: 0, lifetime: 0 }));
  }

  async payouts(userId: string) {
    const payouts = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: 'PAYOUT'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (payouts.length > 0) {
      return payouts;
    }

    return this.records
      .list('finance', 'payout', userId)
      .then((rows) => rows.map((row) => ({ id: row.entityId, ...(row.payload as object) })));
  }

  requestPayout(userId: string, body: Record<string, unknown>) {
    return this.prisma.transaction.create({
      data: {
        userId,
        type: 'PAYOUT',
        status: 'PENDING',
        amount: Number(body.amount ?? 0),
        currency: String(body.currency ?? 'USD'),
        note: String(body.note ?? 'Payout request'),
        availableAt: null,
        metadata: body as Prisma.InputJsonValue
      }
    });
  }

  async analyticsOverview(userId: string) {
    const [purchaseEvents, orderCount] = await Promise.all([
      this.prisma.analyticsEvent.findMany({
        where: { userId, eventType: 'PURCHASE' }
      }),
      this.prisma.order.count({
        where: {
          OR: [{ buyerUserId: userId }, { seller: { userId } }]
        }
      })
    ]);

    if (purchaseEvents.length > 0 || orderCount > 0) {
      const sales = purchaseEvents.reduce((sum, event) => sum + Number(event.value ?? 0), 0);
      return {
        rank: sales > 500 ? 'Gold' : sales > 100 ? 'Silver' : 'Bronze',
        score: sales,
        orderCount
      };
    }

    return this.records
      .getByEntityId('finance', 'analytics_overview', 'main', userId)
      .then((record) => record.payload)
      .catch(() => ({ rank: 'Bronze', score: 0 }));
  }

  subscription(userId: string) {
    return this.records
      .getByEntityId('finance', 'subscription', 'main', userId)
      .then((record) => record.payload)
      .catch(() => ({ plan: 'basic', cycle: 'monthly' }));
  }

  updateSubscription(userId: string, body: Record<string, unknown>) {
    return this.records.upsert('finance', 'subscription', 'main', body, userId);
  }

  private sumTransactions(
    transactions: Array<{ amount: number; status: string }>,
    statuses: string[]
  ) {
    return transactions
      .filter((transaction) => statuses.includes(transaction.status))
      .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);
  }
}
