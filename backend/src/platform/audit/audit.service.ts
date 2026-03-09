import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { JobsService } from '../../modules/jobs/jobs.service.js';
import { ListAuditEventsDto } from './dto/list-audit-events.dto.js';

export type AuditEventInput = {
  userId?: string | null;
  role?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  route: string;
  method: string;
  statusCode: number;
  requestId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jobsService: JobsService
  ) {}

  enabled() {
    return !['0', 'false', 'no', 'off'].includes(
      String(this.configService.get('audit.enabled') ?? 'true').toLowerCase()
    );
  }

  async log(event: AuditEventInput) {
    if (!this.enabled()) return;
    const sampleRate = Number(this.configService.get('audit.sampleRate') ?? 1);
    if (sampleRate < 1 && Math.random() > sampleRate) {
      return;
    }
    const asyncEnabled = !['0', 'false', 'no', 'off'].includes(
      String(this.configService.get('audit.async') ?? 'true').toLowerCase()
    );
    if (asyncEnabled && this.jobsService) {
      await this.jobsService.enqueue({
        queue: 'audit',
        type: 'AUDIT_EVENT',
        payload: event as Record<string, unknown>,
        dedupeKey: event.requestId ? `audit:${event.requestId}` : null
      });
      return;
    }

    await this.persist(event);
  }

  async persist(event: AuditEventInput) {
    await this.prisma.auditEvent.create({
      data: {
        userId: event.userId ?? null,
        role: event.role ?? null,
        action: event.action,
        entityType: event.entityType ?? null,
        entityId: event.entityId ?? null,
        route: event.route,
        method: event.method,
        statusCode: event.statusCode,
        requestId: event.requestId ?? null,
        ip: event.ip ?? null,
        userAgent: event.userAgent ?? null,
        metadata: (event.metadata ?? null) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined
      }
    });
  }

  list(query: ListAuditEventsDto) {
    const take = query.take ?? 50;
    const skip = query.offset ?? 0;
    return this.prisma.auditEvent.findMany({
      where: {
        userId: query.userId ?? undefined,
        action: query.action ?? undefined,
        entityType: query.entityType ?? undefined,
        entityId: query.entityId ?? undefined
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip
    });
  }
}
