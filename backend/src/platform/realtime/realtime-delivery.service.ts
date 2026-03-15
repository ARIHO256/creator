import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, DeliveryStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { JobsService } from '../../modules/jobs/jobs.service.js';

@Injectable()
export class RealtimeDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jobsService: JobsService
  ) {}

  enabled() {
    return !['0', 'false', 'no', 'off'].includes(
      String(this.configService.get('realtime.deliveryEnabled') ?? 'true').toLowerCase()
    );
  }

  async recordEvent(userId: string, event: Record<string, unknown>) {
    if (!this.enabled()) {
      return null;
    }
    const ttlMs = Number(this.configService.get('realtime.deliveryTtlMs') ?? 600_000);
    const eventId = String((event.id as string | undefined) ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const expiresAt = ttlMs > 0 ? new Date(Date.now() + ttlMs) : null;
    const receipt = await this.prisma.deliveryReceipt.upsert({
      where: { userId_eventId: { userId, eventId } },
      create: {
        userId,
        eventId,
        channel: typeof event.channel === 'string' ? event.channel : null,
        eventType: typeof event.type === 'string' ? event.type : null,
        status: DeliveryStatus.PENDING,
        payload: event as Prisma.InputJsonValue,
        expiresAt
      },
      update: {
        payload: event as Prisma.InputJsonValue,
        expiresAt
      }
    });
    return receipt;
  }

  async markDelivered(eventId: string) {
    return this.prisma.deliveryReceipt.updateMany({
      where: { eventId, status: DeliveryStatus.PENDING },
      data: { status: DeliveryStatus.DELIVERED, lastAttemptAt: new Date() }
    });
  }

  async ack(userId: string, eventId: string) {
    return this.prisma.deliveryReceipt.updateMany({
      where: { userId, eventId },
      data: { status: DeliveryStatus.ACKED, ackedAt: new Date() }
    });
  }

  async pending(userId: string, limit?: number) {
    const max = Number(this.configService.get('realtime.deliveryPollLimit') ?? 50);
    const take = Math.max(1, Math.min(limit ?? max, max));
    const receipts = await this.prisma.deliveryReceipt.findMany({
      where: {
        userId,
        status: { in: [DeliveryStatus.PENDING, DeliveryStatus.DELIVERED] }
      },
      orderBy: { createdAt: 'asc' },
      take
    });
    return receipts;
  }

  async failIfExceededAttempts(eventId: string, attempts: number) {
    const max = Number(this.configService.get('realtime.deliveryMaxAttempts') ?? 5);
    if (attempts < max) return;
    await this.prisma.deliveryReceipt.updateMany({
      where: { eventId },
      data: { status: DeliveryStatus.FAILED }
    });
  }

  async recordAttempt(userId: string, eventId: string, delivered: boolean) {
    const now = new Date();
    if (delivered) {
      await this.prisma.deliveryReceipt.updateMany({
        where: { userId, eventId },
        data: {
          attempts: { increment: 1 },
          lastAttemptAt: now,
          status: DeliveryStatus.DELIVERED
        }
      });
      return;
    }

    const maxAttempts = Number(this.configService.get('realtime.deliveryMaxAttempts') ?? 5);
    await this.prisma.$transaction(async (tx) => {
      await tx.deliveryReceipt.updateMany({
        where: { userId, eventId },
        data: {
          attempts: { increment: 1 },
          lastAttemptAt: now
        }
      });
      await tx.deliveryReceipt.updateMany({
        where: {
          userId,
          eventId,
          attempts: { gte: maxAttempts },
          status: { in: [DeliveryStatus.PENDING, DeliveryStatus.DELIVERED] }
        },
        data: { status: DeliveryStatus.FAILED }
      });
    });
  }

  async sweepPending(limit?: number) {
    if (!this.enabled()) return { processed: 0 };
    const now = new Date();
    const retryMs = Number(this.configService.get('realtime.deliveryRetryMs') ?? 15000);
    const maxAttempts = Number(this.configService.get('realtime.deliveryMaxAttempts') ?? 5);
    const take = Math.max(1, Math.min(limit ?? 100, 500));

    await this.prisma.deliveryReceipt.updateMany({
      where: {
        status: { in: [DeliveryStatus.PENDING, DeliveryStatus.DELIVERED] },
        expiresAt: { lte: now }
      },
      data: { status: DeliveryStatus.FAILED }
    });

    const due = await this.prisma.deliveryReceipt.findMany({
      where: {
        status: { in: [DeliveryStatus.PENDING, DeliveryStatus.DELIVERED] },
        attempts: { lt: maxAttempts },
        OR: [{ lastAttemptAt: null }, { lastAttemptAt: { lt: new Date(now.getTime() - retryMs) } }]
      },
      orderBy: { createdAt: 'asc' },
      take
    });

    for (const receipt of due) {
      await this.jobsService.enqueue({
        queue: 'realtime',
        type: 'REALTIME_EVENT',
        payload: {
          channel: `user:${receipt.userId}`,
          event: { ...(receipt.payload as Record<string, unknown>), id: receipt.eventId }
        },
        maxAttempts: maxAttempts
      });
    }

    return { processed: due.length };
  }
}
