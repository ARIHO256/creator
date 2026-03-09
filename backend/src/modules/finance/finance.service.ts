import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, TransactionStatus, TransactionType } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { normalizeListQuery } from '../../common/dto/list-query.dto.js';
import { SellersService } from '../sellers/sellers.service.js';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto.js';
import { PayoutActionDto } from './dto/payout-action.dto.js';
import { PayoutsQueryDto } from './dto/payouts-query.dto.js';
import { RequestPayoutDto } from './dto/request-payout.dto.js';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto.js';
import { CreateSettlementBatchDto } from './dto/create-settlement-batch.dto.js';
import { SettlementQueryDto } from './dto/settlement-query.dto.js';
import { ReconcileSettlementDto } from './dto/reconcile-settlement.dto.js';
import { JobsService } from '../jobs/jobs.service.js';

@Injectable()
export class FinanceService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    private readonly sellersService: SellersService,
    private readonly audit: AuditService,
    private readonly jobsService: JobsService,
    private readonly configService: ConfigService
  ) {}

  async earningsSummary(userId: string) {
    const scope = await this.resolveFinanceScope(userId);
    const groupedTransactions = await this.prisma.transaction.groupBy({
      by: ['status'],
      where: {
        ...(scope.sellerId ? { sellerId: scope.sellerId } : { userId }),
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
    const scope = await this.resolveFinanceScope(userId);
    const payouts = await this.prisma.transaction.findMany({
      where: {
        ...(scope.sellerId ? { sellerId: scope.sellerId } : { userId }),
        type: 'PAYOUT'
      },
      orderBy: { createdAt: 'desc' }
    });

    return payouts;
  }

  async requestPayout(userId: string, body: RequestPayoutDto) {
    const scope = await this.resolveFinanceScope(userId);
    const available = await this.availableBalance(scope);
    if (Number(body.amount ?? 0) > available) {
      throw new BadRequestException('Insufficient available balance for payout');
    }
    const payout = await this.prisma.transaction.create({
      data: {
        userId,
        sellerId: scope.sellerId ?? null,
        type: 'PAYOUT',
        status: 'PENDING',
        amount: Number(body.amount ?? 0),
        currency: String(body.currency ?? 'USD'),
        note: String(body.note ?? 'Payout request'),
        availableAt: null,
        metadata: (body.metadata ?? {}) as Prisma.InputJsonValue
      }
    });
    await this.audit.log({
      userId,
      action: 'finance.payout_requested',
      entityType: 'transaction',
      entityId: payout.id,
      route: '/api/earnings/payouts/request',
      method: 'POST',
      statusCode: 201,
      metadata: { amount: payout.amount, currency: payout.currency }
    });
    return payout;
  }

  async payoutRequests(query?: PayoutsQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    const status = query?.status ? this.normalizeStatus(query.status) : undefined;
    const payouts = await this.prisma.transaction.findMany({
      where: {
        type: TransactionType.PAYOUT,
        ...(status ? { status } : {})
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' }
    });
    return { payouts };
  }

  async approvePayout(userId: string, id: string, body: PayoutActionDto) {
    return this.updatePayoutStatus(userId, id, 'PAID', body.note);
  }

  async rejectPayout(userId: string, id: string, body: PayoutActionDto) {
    return this.updatePayoutStatus(userId, id, 'FAILED', body.note);
  }

  async cancelPayout(userId: string, id: string, body: PayoutActionDto) {
    return this.updatePayoutStatus(userId, id, 'CANCELLED', body.note);
  }

  async createAdjustment(userId: string, body: CreateAdjustmentDto) {
    if (!body.userId && !body.sellerId) {
      throw new BadRequestException('Adjustment requires userId or sellerId');
    }
    const adjustment = await this.prisma.transaction.create({
      data: {
        userId: body.userId ?? userId,
        sellerId: body.sellerId ?? null,
        type: TransactionType.ADJUSTMENT,
        status: body.amount >= 0 ? TransactionStatus.AVAILABLE : TransactionStatus.PAID,
        amount: Number(body.amount),
        currency: String(body.currency ?? 'USD'),
        note: body.note ?? 'Adjustment',
        availableAt: new Date(),
        metadata: (body.metadata ?? {}) as Prisma.InputJsonValue
      }
    });
    await this.audit.log({
      userId,
      action: 'finance.adjustment_created',
      entityType: 'transaction',
      entityId: adjustment.id,
      route: '/api/finance/adjustments',
      method: 'POST',
      statusCode: 201
    });
    return adjustment;
  }

  async settlementBatches(query?: SettlementQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    const status = query?.status ? (query.status as any) : undefined;
    const batches = await this.prisma.settlementBatch.findMany({
      where: {
        ...(status ? { status } : {})
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { items: true }
    });
    return { batches };
  }

  async settlementBatch(id: string) {
    const batch = await this.prisma.settlementBatch.findUnique({
      where: { id },
      include: { items: true, reconciliations: true }
    });
    if (!batch) {
      throw new NotFoundException('Settlement batch not found');
    }
    return batch;
  }

  async createSettlementBatch(userId: string, body: CreateSettlementBatchDto) {
    const limitConfig = Number(this.configService.get('finance.settlementBatchLimit') ?? 500);
    const limit = Math.max(1, Math.min(body.limit ?? limitConfig, 2000));
    const currency = body.currency ?? 'USD';
    const minAmount = Number(body.minAmount ?? 0);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        status: TransactionStatus.AVAILABLE,
        type: { not: TransactionType.PAYOUT },
        ...(body.sellerId ? { sellerId: body.sellerId } : {}),
        ...(currency ? { currency } : {}),
        ...(minAmount ? { amount: { gte: minAmount } } : {})
      },
      orderBy: { createdAt: 'asc' },
      take: limit
    });

    if (!transactions.length) {
      throw new BadRequestException('No eligible transactions for settlement');
    }

    const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const batch = await this.prisma.$transaction(async (tx) => {
      const created = await tx.settlementBatch.create({
        data: {
          status: 'PENDING',
          totalAmount,
          currency,
          itemCount: transactions.length,
          createdByUserId: userId,
          metadata: (body.metadata ?? {}) as Prisma.InputJsonValue
        }
      });
      await tx.settlementItem.createMany({
        data: transactions.map((transaction) => ({
          batchId: created.id,
          transactionId: transaction.id,
          sellerId: transaction.sellerId ?? null,
          userId: transaction.userId,
          amount: transaction.amount,
          currency: transaction.currency,
          status: 'PENDING'
        }))
      });
      return created;
    });

    await this.jobsService.enqueue({
      queue: 'finance',
      type: 'FINANCE_SETTLEMENT_RUN',
      payload: { batchId: batch.id },
      dedupeKey: `finance:settlement:${batch.id}`
    });

    await this.audit.log({
      userId,
      action: 'finance.settlement_created',
      entityType: 'settlement_batch',
      entityId: batch.id,
      route: '/api/finance/settlements',
      method: 'POST',
      statusCode: 201,
      metadata: { totalAmount, itemCount: transactions.length }
    });

    return batch;
  }

  async reconcileSettlement(userId: string, id: string, body?: ReconcileSettlementDto) {
    const batch = await this.prisma.settlementBatch.findUnique({ where: { id } });
    if (!batch) {
      throw new NotFoundException('Settlement batch not found');
    }
    const run = await this.prisma.reconciliationRun.create({
      data: {
        batchId: batch.id,
        status: 'PENDING',
        summary: body?.note ? ({ note: body.note } as Prisma.InputJsonValue) : Prisma.DbNull
      }
    });
    await this.jobsService.enqueue({
      queue: 'finance',
      type: 'FINANCE_RECONCILE',
      payload: { batchId: batch.id, runId: run.id },
      dedupeKey: `finance:reconcile:${batch.id}:${run.id}`
    });
    await this.audit.log({
      userId,
      action: 'finance.settlement_reconcile_requested',
      entityType: 'settlement_batch',
      entityId: batch.id,
      route: `/api/finance/settlements/${id}/reconcile`,
      method: 'POST',
      statusCode: 202
    });
    return { runId: run.id };
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

  private normalizeStatus(status: string) {
    const normalized = String(status || '').trim().toUpperCase();
    if (!Object.values(TransactionStatus).includes(normalized as TransactionStatus)) {
      throw new BadRequestException('Invalid payout status');
    }
    return normalized as TransactionStatus;
  }

  private async resolveFinanceScope(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    if (user?.role === 'SELLER' || user?.role === 'PROVIDER') {
      const seller = await this.sellersService.ensureSellerProfile(userId);
      return { userId, sellerId: seller.id };
    }
    return { userId, sellerId: null };
  }

  private async availableBalance(scope: { userId: string; sellerId: string | null }) {
    const totals = await this.prisma.transaction.aggregate({
      where: {
        ...(scope.sellerId ? { sellerId: scope.sellerId } : { userId: scope.userId }),
        status: TransactionStatus.AVAILABLE
      },
      _sum: { amount: true }
    });
    return Number(totals._sum.amount ?? 0);
  }

  private async updatePayoutStatus(userId: string, id: string, nextStatus: TransactionStatus, note?: string) {
    const payout = await this.prisma.transaction.findUnique({ where: { id } });
    if (!payout || payout.type !== TransactionType.PAYOUT) {
      throw new NotFoundException('Payout not found');
    }
    this.assertPayoutTransition(payout.status, nextStatus);
    const updated = await this.prisma.transaction.update({
      where: { id },
      data: {
        status: nextStatus,
        note: note ?? payout.note ?? undefined,
        paidAt: nextStatus === TransactionStatus.PAID ? new Date() : payout.paidAt
      }
    });
    await this.audit.log({
      userId,
      action: 'finance.payout_status_updated',
      entityType: 'transaction',
      entityId: updated.id,
      route: `/api/finance/payouts/${id}`,
      method: 'POST',
      statusCode: 200,
      metadata: { status: updated.status }
    });
    return updated;
  }

  private assertPayoutTransition(current: TransactionStatus, next: TransactionStatus) {
    const transitions: Record<TransactionStatus, TransactionStatus[]> = {
      PENDING: [TransactionStatus.PAID, TransactionStatus.FAILED, TransactionStatus.CANCELLED],
      AVAILABLE: [TransactionStatus.PAID, TransactionStatus.CANCELLED],
      PAID: [],
      FAILED: [],
      CANCELLED: []
    };
    if (!transitions[current]?.includes(next)) {
      throw new BadRequestException(`Payout status cannot transition from ${current} to ${next}`);
    }
  }
}
