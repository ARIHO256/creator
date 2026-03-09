import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizeListQuery } from '../../common/dto/list-query.dto.js';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { JobsService } from '../jobs/jobs.service.js';
import { CreateMarketApprovalDto } from './dto/create-market-approval.dto.js';
import { MarketApprovalsQueryDto } from './dto/market-approvals-query.dto.js';
import { UpdateMarketApprovalDto } from './dto/update-market-approval.dto.js';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jobsService: JobsService
  ) {}

  async list(query?: MarketApprovalsQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    const where: Prisma.MarketApprovalRequestWhereInput = {
      ...(query?.status ? { status: query.status } : {}),
      ...(query?.marketplace ? { marketplace: query.marketplace } : {}),
      ...(query?.q
        ? {
            OR: [
              { entityType: { contains: query.q } },
              { entityId: { contains: query.q } }
            ]
          }
        : {})
    };
    const approvals = await this.prisma.marketApprovalRequest.findMany({
      where,
      skip,
      take,
      orderBy: { updatedAt: 'desc' }
    });
    return { approvals };
  }

  async get(id: string) {
    const approval = await this.prisma.marketApprovalRequest.findUnique({ where: { id } });
    if (!approval) {
      throw new NotFoundException('Market approval not found');
    }
    return approval;
  }

  async create(userId: string, body: CreateMarketApprovalDto) {
    if (!body.entityType.trim() || !body.entityId.trim()) {
      throw new BadRequestException('entityType and entityId are required');
    }
    const slaDueAt = this.computeSlaDueAt();
    const approval = await this.prisma.marketApprovalRequest.create({
      data: {
        entityType: body.entityType.trim(),
        entityId: body.entityId.trim(),
        marketplace: body.marketplace ?? null,
        status: 'PENDING',
        slaDueAt,
        slaStatus: 'ON_TIME',
        requestedByUserId: userId,
        metadata: (body.metadata ?? {}) as Prisma.InputJsonValue
      }
    });
    await this.scheduleSlaCheck(approval.id, slaDueAt);
    const reminderAt = this.computeReminderAt(slaDueAt);
    if (reminderAt) {
      await this.scheduleReminder(approval.id, reminderAt);
    }
    return approval;
  }

  async update(userId: string, id: string, body: UpdateMarketApprovalDto) {
    const approval = await this.prisma.marketApprovalRequest.findUnique({ where: { id } });
    if (!approval) {
      throw new NotFoundException('Market approval not found');
    }
    const nextStatus = body.status ?? approval.status;
    if (!nextStatus) {
      throw new BadRequestException('Status is required');
    }
    const updated = await this.prisma.marketApprovalRequest.update({
      where: { id },
      data: {
        status: nextStatus,
        reviewedByUserId: userId,
        reviewedAt: new Date(),
        decisionReason: body.decisionReason ?? approval.decisionReason ?? null
      }
    });
    if (nextStatus === 'PENDING' || nextStatus === 'NEEDS_CHANGES') {
      const slaDueAt = approval.slaDueAt ?? this.computeSlaDueAt();
      await this.scheduleSlaCheck(approval.id, slaDueAt);
      const reminderAt = this.computeReminderAt(slaDueAt);
      if (reminderAt) {
        await this.scheduleReminder(approval.id, reminderAt);
      }
    }
    return updated;
  }

  async handleSlaCheck(approvalId: string) {
    const approval = await this.prisma.marketApprovalRequest.findUnique({
      where: { id: approvalId }
    });
    if (!approval) {
      return { skipped: true };
    }
    if (!approval.slaDueAt) {
      return { skipped: true };
    }
    const now = new Date();
    if (approval.slaDueAt > now) {
      return { skipped: true };
    }
    if (approval.slaStatus === 'BREACHED') {
      return { skipped: true };
    }
    if (!['PENDING', 'NEEDS_CHANGES'].includes(approval.status)) {
      return { skipped: true };
    }
    const updated = await this.prisma.marketApprovalRequest.update({
      where: { id: approvalId },
      data: {
        slaStatus: 'BREACHED',
        escalatedAt: approval.escalatedAt ?? now
      }
    });
    return { updated };
  }

  private computeSlaDueAt() {
    const hours = this.configService.get<number>('approvals.slaHours') ?? 48;
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  private computeReminderAt(slaDueAt: Date) {
    const reminderHours = this.configService.get<number>('approvals.reminderHours') ?? 24;
    if (!reminderHours || reminderHours <= 0) {
      return null;
    }
    const reminderAt = new Date(slaDueAt.getTime() - reminderHours * 60 * 60 * 1000);
    const now = new Date();
    return reminderAt < now ? now : reminderAt;
  }

  private async scheduleSlaCheck(approvalId: string, slaDueAt: Date) {
    await this.jobsService.enqueue({
      queue: 'approvals',
      type: 'MARKET_APPROVAL_SLA_CHECK',
      payload: { approvalId },
      dedupeKey: `approval-sla:${approvalId}:${slaDueAt.toISOString()}`,
      runAfter: slaDueAt
    });
  }

  private async scheduleReminder(approvalId: string, reminderAt: Date) {
    await this.jobsService.enqueue({
      queue: 'approvals',
      type: 'MARKET_APPROVAL_REMINDER',
      payload: { approvalId },
      dedupeKey: `approval-reminder:${approvalId}:${reminderAt.toISOString()}`,
      runAfter: reminderAt
    });
  }
}
