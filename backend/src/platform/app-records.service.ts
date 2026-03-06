import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';

@Injectable()
export class AppRecordsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  list(domain: string, entityType: string, userId?: string | null) {
    return this.prisma.appRecord.findMany({
      where: { domain, entityType, userId: userId ?? undefined },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async getByEntityId(domain: string, entityType: string, entityId: string, userId?: string | null) {
    const record = await this.prisma.appRecord.findFirst({
      where: { domain, entityType, entityId, userId: userId ?? undefined }
    });

    if (!record) {
      throw new NotFoundException(`${domain}/${entityType}/${entityId} not found`);
    }

    return record;
  }

  create(domain: string, entityType: string, payload: unknown, entityId?: string, userId?: string | null) {
    return this.prisma.appRecord.create({
      data: {
        domain,
        entityType,
        entityId: entityId ?? null,
        userId: userId ?? null,
        payload: payload as any
      }
    });
  }

  async update(domain: string, entityType: string, entityId: string, payload: unknown, userId?: string | null) {
    const current = await this.getByEntityId(domain, entityType, entityId, userId);
    return this.prisma.appRecord.update({
      where: { id: current.id },
      data: { payload: payload as any }
    });
  }

  async upsert(domain: string, entityType: string, entityId: string, payload: unknown, userId?: string | null) {
    const existing = await this.prisma.appRecord.findFirst({
      where: { domain, entityType, entityId, userId: userId ?? undefined }
    });

    if (!existing) {
      return this.create(domain, entityType, payload, entityId, userId);
    }

    return this.prisma.appRecord.update({
      where: { id: existing.id },
      data: { payload: payload as any }
    });
  }

  async remove(domain: string, entityType: string, entityId: string, userId?: string | null) {
    const existing = await this.getByEntityId(domain, entityType, entityId, userId);
    await this.prisma.appRecord.delete({ where: { id: existing.id } });
    return { deleted: true };
  }
}
