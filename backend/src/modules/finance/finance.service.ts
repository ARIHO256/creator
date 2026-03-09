import { Inject, Injectable } from '@nestjs/common';
import { Prisma, TransactionStatus } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { RequestPayoutDto } from './dto/request-payout.dto.js';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto.js';

@Injectable()
export class FinanceService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  async earningsSummary(userId: string) {
    const groupedTransactions = await this.prisma.transaction.groupBy({
      by: ['status'],
      where: {
        userId,
        status: { in: ['PENDING', 'AVAILABLE', 'PAID'] }
      },
      _sum: { amount: true }
    });

    const totalsByStatus = new Map(
      groupedTransactions.map((transaction) => [transaction.status, Number(transaction._sum.amount ?? 0)])
    );

    return {
      available: totalsByStatus.get('AVAILABLE') ?? 0,
      pending: totalsByStatus.get('PENDING') ?? 0,
      lifetime: [TransactionStatus.PENDING, TransactionStatus.AVAILABLE, TransactionStatus.PAID].reduce(
        (sum, status) => sum + (totalsByStatus.get(status) ?? 0),
        0
      )
    };
  }

  async payouts(userId: string) {
    const payouts = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: 'PAYOUT'
      },
      orderBy: { createdAt: 'desc' }
    });

    return payouts;
  }

  requestPayout(userId: string, body: RequestPayoutDto) {
    return this.prisma.transaction.create({
      data: {
        userId,
        type: 'PAYOUT',
        status: 'PENDING',
        amount: Number(body.amount ?? 0),
        currency: String(body.currency ?? 'USD'),
        note: String(body.note ?? 'Payout request'),
        availableAt: null,
        metadata: (body.metadata ?? {}) as Prisma.InputJsonValue
      }
    });
  }

  async analyticsOverview(userId: string) {
    const [purchaseEvents, orderCount] = await Promise.all([
      this.prisma.analyticsEvent.aggregate({
        where: { userId, eventType: 'PURCHASE' },
        _sum: { value: true },
        _count: { _all: true }
      }),
      this.prisma.order.count({
        where: {
          OR: [{ buyerUserId: userId }, { seller: { userId } }]
        }
      })
    ]);

    const sales = Number(purchaseEvents._sum.value ?? 0);
    return {
      rank: sales > 500 ? 'Gold' : sales > 100 ? 'Silver' : 'Bronze',
      score: sales,
      orderCount
    };
  }

  async subscription(userId: string) {
    const existing = await this.prisma.userSubscription.findUnique({
      where: { userId }
    });
    if (!existing) {
      return { plan: 'basic', cycle: 'monthly', status: 'inactive' };
    }
    return {
      plan: existing.plan,
      cycle: existing.cycle,
      status: existing.status,
      metadata: existing.metadata
    };
  }

  updateSubscription(userId: string, body: UpdateSubscriptionDto) {
    const plan = String(body.plan ?? 'basic');
    const cycle = String(body.cycle ?? 'monthly');
    const status = String(body.status ?? 'active');
    return this.prisma.userSubscription.upsert({
      where: { userId },
      update: {
        plan,
        cycle,
        status,
        metadata: (body.metadata ?? {}) as Prisma.InputJsonValue
      },
      create: {
        userId,
        plan,
        cycle,
        status,
        metadata: (body.metadata ?? {}) as Prisma.InputJsonValue
      }
    });
  }
}
