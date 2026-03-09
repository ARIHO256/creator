import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { CreateDealDto } from './dto/create-deal.dto.js';
import { UpdateDealDto } from './dto/update-deal.dto.js';

@Injectable()
export class DealsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.deal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getById(userId: string, id: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id, userId } });
    if (!deal) {
      throw new NotFoundException('Deal not found');
    }
    return deal;
  }

  async create(userId: string, payload: CreateDealDto) {
    return this.prisma.deal.create({
      data: {
        userId,
        title: payload.title,
        description: payload.description,
        category: payload.category,
        price: payload.price,
        currency: payload.currency ?? 'USD',
        startAt: payload.startAt ? new Date(payload.startAt) : null,
        endAt: payload.endAt ? new Date(payload.endAt) : null,
        status: 'DRAFT'
      }
    });
  }

  async update(userId: string, id: string, payload: UpdateDealDto) {
    await this.getById(userId, id);

    return this.prisma.deal.update({
      where: { id },
      data: {
        ...payload,
        startAt: payload.startAt ? new Date(payload.startAt) : undefined,
        endAt: payload.endAt ? new Date(payload.endAt) : undefined
      }
    });
  }

  async remove(userId: string, id: string) {
    await this.getById(userId, id);
    await this.prisma.deal.delete({ where: { id } });
    return { deleted: true };
  }
}
