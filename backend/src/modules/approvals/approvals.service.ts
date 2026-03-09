import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizeListQuery } from '../../common/dto/list-query.dto.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { CreateMarketApprovalDto } from './dto/create-market-approval.dto.js';
import { MarketApprovalsQueryDto } from './dto/market-approvals-query.dto.js';
import { UpdateMarketApprovalDto } from './dto/update-market-approval.dto.js';

@Injectable()
export class ApprovalsService {
  constructor(private readonly prisma: PrismaService) {}

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
    return this.prisma.marketApprovalRequest.create({
      data: {
        entityType: body.entityType.trim(),
        entityId: body.entityId.trim(),
        marketplace: body.marketplace ?? null,
        status: 'PENDING',
        requestedByUserId: userId,
        metadata: (body.metadata ?? {}) as Prisma.InputJsonValue
      }
    });
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
    return this.prisma.marketApprovalRequest.update({
      where: { id },
      data: {
        status: nextStatus,
        reviewedByUserId: userId,
        reviewedAt: new Date(),
        decisionReason: body.decisionReason ?? approval.decisionReason ?? null
      }
    });
  }
}
