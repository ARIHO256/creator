import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobsService } from './jobs.service.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { MetricsService } from '../../platform/metrics/metrics.service.js';
import { RealtimePublisher } from '../../platform/realtime/realtime.publisher.js';
import { RealtimeStreamService } from '../../platform/realtime/realtime.stream.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

type WorkerStatus = {
  running: boolean;
  lastRunAt?: string;
  lastJobId?: string;
  errors: number;
};

@Injectable()
export class JobsWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('JobsWorker');
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private status: WorkerStatus = { running: false, errors: 0 };

  constructor(
    private readonly jobsService: JobsService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly metrics?: MetricsService,
    @Optional() private readonly realtimePublisher?: RealtimePublisher,
    @Optional() private readonly realtimeStream?: RealtimeStreamService
  ) {}

  onModuleInit() {
    if (this.configService.get<boolean>('jobs.workerEnabled') ?? true) {
      this.start();
    }
  }

  onModuleDestroy() {
    this.stop();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.status.running = true;
    this.schedule();
    this.logger.log('Background job worker started');
  }

  stop() {
    this.running = false;
    this.status.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.logger.log('Background job worker stopped');
  }

  getStatus(): WorkerStatus {
    return this.status;
  }

  private schedule() {
    if (!this.running) return;
    const pollMs = this.configService.get<number>('jobs.workerPollMs') ?? 2000;
    this.timer = setTimeout(() => this.tick().catch(() => undefined), pollMs);
  }

  private async tick() {
    if (!this.running) return;

    const workerId = this.configService.get<string>('jobs.workerId') ?? 'api';
    const batch = this.configService.get<number>('jobs.workerBatch') ?? 5;
    const lockTtlMs = this.configService.get<number>('jobs.lockTtlMs') ?? 10 * 60 * 1000;

    for (let i = 0; i < batch; i++) {
      const job = await this.jobsService.fetchAndLockNext(workerId, lockTtlMs);
      if (!job) {
        break;
      }

      this.status.lastRunAt = new Date().toISOString();
      this.status.lastJobId = job.id;

      try {
        await this.process(job);
        await this.jobsService.markCompleted(job.id, { processedBy: workerId });
        this.metrics?.recordJobProcessed(job.type, 'success');
      } catch (error: any) {
        this.status.errors += 1;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Job ${job.id} failed: ${message}`);
        await this.jobsService.markFailed(job.id, message);
        this.metrics?.recordJobProcessed(job.type, 'failed');
      }
    }

    this.schedule();
  }

  private async process(job: Awaited<ReturnType<JobsService['fetchAndLockNext']>>) {
    switch (job?.type) {
      case 'MEDIA_UPLOAD_COMPLETED':
        // Placeholder for actual processing (e.g., media scanning, CDN push)
        return;
      case 'ONBOARDING_SUBMITTED':
        // Placeholder for actual processing (e.g., notify reviewers, start KYC)
        return;
      case 'WHOLESALE_QUOTE_CREATED':
      case 'WHOLESALE_QUOTE_UPDATED':
        // Placeholder for actual processing (e.g., notify buyer/seller, analytics)
        return;
      case 'AUDIT_EVENT':
        if (this.auditService) {
          await this.auditService.persist(job.payload as any);
        }
        return;
      case 'REALTIME_EVENT':
        {
          const payload = job.payload as { channel?: string; event?: Record<string, unknown> };
          if (payload?.channel && payload?.event) {
            if (this.realtimePublisher) {
              await this.realtimePublisher.publish(payload.channel, payload.event);
            }
            if (this.realtimeStream && payload.channel.startsWith('user:')) {
              const userId = payload.channel.slice('user:'.length);
              this.realtimeStream.emitToUser(userId, payload.event);
            }
          }
        }
        return;
      case 'MARKET_APPROVAL_SLA_CHECK':
        {
          const payload = job.payload as { approvalId?: string };
          if (!payload?.approvalId) return;
          const approval = await this.prisma.marketApprovalRequest.findUnique({
            where: { id: payload.approvalId }
          });
          if (!approval || !approval.slaDueAt) return;
          const now = new Date();
          if (approval.slaDueAt > now) return;
          if (approval.slaStatus === 'BREACHED') return;
          if (!['PENDING', 'NEEDS_CHANGES'].includes(approval.status)) return;
          const slaHours = this.configService.get<number>('approvals.slaHours') ?? 48;
          const escalateAfterHours = this.configService.get<number>('approvals.escalateAfterHours') ?? 72;
          const breachAt = approval.slaDueAt;
          const extraHours = Math.max(0, escalateAfterHours - slaHours);
          const escalateAt = new Date(breachAt.getTime() + extraHours * 60 * 60 * 1000);
          const shouldEscalate = now >= escalateAt;
          await this.prisma.marketApprovalRequest.update({
            where: { id: approval.id },
            data: {
              slaStatus: 'BREACHED',
              escalatedAt: shouldEscalate ? (approval.escalatedAt ?? now) : approval.escalatedAt
            }
          });
          if (approval.requestedByUserId) {
            const meta = (approval.metadata ?? {}) as Record<string, any>;
            if (!meta.slaBreachedNotifiedAt) {
              const notification = await this.prisma.notification.create({
                data: {
                  userId: approval.requestedByUserId,
                  title: 'Approval SLA breached',
                  body: `Your ${approval.entityType} approval is past the SLA window.`,
                  kind: 'approval_sla_breached',
                  metadata: {
                    approvalId: approval.id,
                    entityType: approval.entityType,
                    status: approval.status
                  } as Prisma.InputJsonValue
                }
              });
              await this.prisma.marketApprovalRequest.update({
                where: { id: approval.id },
                data: {
                  metadata: {
                    ...meta,
                    slaBreachedNotifiedAt: now.toISOString(),
                    slaBreachedNotificationId: notification.id
                  } as Prisma.InputJsonValue
                }
              });
              await this.publishUserEvent(approval.requestedByUserId, {
                type: 'notification.created',
                notificationId: notification.id,
                kind: notification.kind,
                createdAt: notification.createdAt.toISOString()
              });
            }
          }
        }
        return;
      case 'MARKET_APPROVAL_REMINDER':
        {
          const payload = job.payload as { approvalId?: string };
          if (!payload?.approvalId) return;
          const approval = await this.prisma.marketApprovalRequest.findUnique({
            where: { id: payload.approvalId }
          });
          if (!approval || !approval.requestedByUserId) return;
          if (!['PENDING', 'NEEDS_CHANGES'].includes(approval.status)) return;
          const meta = (approval.metadata ?? {}) as Record<string, any>;
          if (meta.reminderSentAt) return;
          const now = new Date();
          const notification = await this.prisma.notification.create({
            data: {
              userId: approval.requestedByUserId,
              title: 'Approval still pending',
              body: `Your ${approval.entityType} approval is still pending review.`,
              kind: 'approval_reminder',
              metadata: {
                approvalId: approval.id,
                entityType: approval.entityType,
                status: approval.status
              } as Prisma.InputJsonValue
            }
          });
          await this.prisma.marketApprovalRequest.update({
            where: { id: approval.id },
            data: {
              metadata: {
                ...meta,
                reminderSentAt: now.toISOString(),
                reminderNotificationId: notification.id
              } as Prisma.InputJsonValue
            }
          });
          await this.publishUserEvent(approval.requestedByUserId, {
            type: 'notification.created',
            notificationId: notification.id,
            kind: notification.kind,
            createdAt: notification.createdAt.toISOString()
          });
        }
        return;
      default:
        return;
    }
  }

  private async publishUserEvent(userId: string, event: Record<string, unknown>) {
    const channel = `user:${userId}`;
    if (this.realtimePublisher) {
      await this.realtimePublisher.publish(channel, event);
    }
    if (this.realtimeStream) {
      this.realtimeStream.emitToUser(userId, event);
    }
  }
}
