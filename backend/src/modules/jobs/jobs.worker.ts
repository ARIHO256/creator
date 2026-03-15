import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { JobsService } from './jobs.service.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { MetricsService } from '../../platform/metrics/metrics.service.js';
import { RealtimePublisher } from '../../platform/realtime/realtime.publisher.js';
import { RealtimeStreamService } from '../../platform/realtime/realtime.stream.service.js';
import { RealtimeDeliveryService } from '../../platform/realtime/realtime-delivery.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { ModerationService } from '../communications/moderation.service.js';
import { RegulatoryAutomationService } from '../regulatory/regulatory-automation.service.js';
import { ExportsService } from '../exports/exports.service.js';
import { CatalogService } from '../catalog/catalog.service.js';
import { SearchService } from '../search/search.service.js';

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
    @Optional() private readonly realtimeStream?: RealtimeStreamService,
    @Optional() private readonly realtimeDelivery?: RealtimeDeliveryService,
    @Optional() private readonly moderation?: ModerationService,
    @Optional() private readonly regulatoryAutomation?: RegulatoryAutomationService,
    @Optional() private readonly exportsService?: ExportsService,
    @Optional() private readonly catalogService?: CatalogService,
    @Optional() private readonly searchService?: SearchService
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
    const concurrency = Math.max(
      1,
      Math.min(this.configService.get<number>('jobs.workerConcurrency') ?? batch, batch)
    );
    const lockTtlMs = this.configService.get<number>('jobs.lockTtlMs') ?? 10 * 60 * 1000;
    const jobs: NonNullable<Awaited<ReturnType<JobsService['fetchAndLockNext']>>>[] = [];

    for (let i = 0; i < batch; i++) {
      const job = await this.jobsService.fetchAndLockNext(workerId, lockTtlMs);
      if (!job) {
        break;
      }
      jobs.push(job);
    }

    for (let i = 0; i < jobs.length; i += concurrency) {
      const slice = jobs.slice(i, i + concurrency);
      await Promise.allSettled(slice.map((job) => this.processLockedJob(job, workerId)));
    }

    this.schedule();
  }

  private async processLockedJob(
    job: NonNullable<Awaited<ReturnType<JobsService['fetchAndLockNext']>>>,
    workerId: string
  ) {
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
            const preparedEvent = this.realtimeStream?.prepareEvent(payload.event);
            if (this.realtimePublisher) {
              await this.realtimePublisher.publish(payload.channel, payload.event, preparedEvent
                ? { eventType: preparedEvent.eventType, streamId: preparedEvent.id }
                : undefined);
            }
            if (this.realtimeStream && payload.channel.startsWith('user:')) {
              const userId = payload.channel.slice('user:'.length);
              await this.realtimeStream.emitPreparedToUser(
                userId,
                preparedEvent ?? this.realtimeStream.prepareEvent(payload.event)
              );
              if (this.realtimeDelivery && typeof payload.event.id === 'string') {
                const receipt = await this.prisma.deliveryReceipt.findUnique({
                  where: { userId_eventId: { userId, eventId: payload.event.id } }
                });
                if (receipt) {
                  const maxAttempts = Number(this.configService.get('realtime.deliveryMaxAttempts') ?? 5);
                  const attempts = receipt.attempts + 1;
                  const hasClient = await this.realtimeStream.hasClient(userId);
                  const status = hasClient ? 'DELIVERED' : attempts >= maxAttempts ? 'FAILED' : receipt.status;
                  await this.prisma.deliveryReceipt.update({
                    where: { id: receipt.id },
                    data: { attempts, lastAttemptAt: new Date(), status }
                  });
                }
              }
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
                    status: approval.status,
                    workspaceRole: String(meta.requestedWorkspaceRole || 'SELLER').toUpperCase()
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
                status: approval.status,
                workspaceRole: String(meta.requestedWorkspaceRole || 'SELLER').toUpperCase()
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
      case 'FINANCE_SETTLEMENT_RUN':
        {
          const payload = job.payload as { batchId?: string };
          if (!payload?.batchId) return;
          const batch = await this.prisma.settlementBatch.findUnique({
            where: { id: payload.batchId },
            include: { items: true }
          });
          if (!batch) return;
          if (!['PENDING', 'PROCESSING'].includes(batch.status)) return;
          const now = new Date();
          try {
            await this.prisma.$transaction(async (tx) => {
              await tx.settlementBatch.update({
                where: { id: batch.id },
                data: {
                  status: 'PROCESSING',
                  startedAt: batch.startedAt ?? now
                }
              });
              const itemIds = batch.items.map((item) => item.id);
              if (itemIds.length) {
                await tx.settlementItem.updateMany({
                  where: { id: { in: itemIds } },
                  data: { status: 'PROCESSING' }
                });
                const transactionIds = batch.items.map((item) => item.transactionId);
                await tx.transaction.updateMany({
                  where: { id: { in: transactionIds } },
                  data: { status: 'PAID', paidAt: now }
                });
                await tx.settlementItem.updateMany({
                  where: { id: { in: itemIds } },
                  data: { status: 'COMPLETED' }
                });
              }
              await tx.settlementBatch.update({
                where: { id: batch.id },
                data: { status: 'COMPLETED', completedAt: now }
              });
            });
          } catch (error: any) {
            await this.prisma.$transaction(async (tx) => {
              await tx.settlementBatch.update({
                where: { id: batch.id },
                data: { status: 'FAILED', completedAt: now, metadata: { error: String(error?.message ?? error) } as any }
              });
              await tx.settlementItem.updateMany({
                where: { batchId: batch.id, status: { notIn: ['COMPLETED'] } },
                data: { status: 'FAILED' }
              });
            });
          }
        }
        return;
      case 'FINANCE_RECONCILE':
        {
          const payload = job.payload as { batchId?: string; runId?: string };
          if (!payload?.batchId || !payload?.runId) return;
          const [batch, run] = await Promise.all([
            this.prisma.settlementBatch.findUnique({ where: { id: payload.batchId }, include: { items: true } }),
            this.prisma.reconciliationRun.findUnique({ where: { id: payload.runId } })
          ]);
          if (!batch || !run) return;
          const now = new Date();
          const total = batch.items.reduce((sum, item) => sum + item.amount, 0);
          const allCompleted = batch.items.every((item) => item.status === 'COMPLETED');
          const matches = Math.abs(total - batch.totalAmount) < 0.01;
          if (!allCompleted || !matches) {
            await this.prisma.reconciliationRun.update({
              where: { id: run.id },
              data: {
                status: 'FAILED',
                completedAt: now,
                summary: { total, expected: batch.totalAmount, allCompleted, matches } as any
              }
            });
            return;
          }
          await this.prisma.$transaction(async (tx) => {
            await tx.reconciliationRun.update({
              where: { id: run.id },
              data: {
                status: 'COMPLETED',
                completedAt: now,
                summary: { total, expected: batch.totalAmount, matches } as any
              }
            });
            await tx.settlementBatch.update({
              where: { id: batch.id },
              data: { status: 'RECONCILED', reconciledAt: now }
            });
          });
        }
        return;
      case 'MODERATION_SCAN':
        {
          if (!this.moderation) return;
          const payload = job.payload as { targetType?: string; targetId?: string };
          if (!payload?.targetType || !payload?.targetId) return;
          if (payload.targetType === 'message') {
            const message = await this.prisma.message.findUnique({ where: { id: payload.targetId } });
            if (!message) return;
            await this.moderation.scanText('message', message.id, message.body);
            return;
          }
          if (payload.targetType === 'support_ticket') {
            const ticket = await this.prisma.supportTicket.findUnique({ where: { id: payload.targetId } });
            if (!ticket) return;
            const text = [ticket.subject, ticket.category, ticket.marketplace, ticket.ref].filter(Boolean).join(' ');
            await this.moderation.scanText('support_ticket', ticket.id, text);
            return;
          }
          if (payload.targetType === 'seller_document') {
            const document = await this.prisma.sellerDocument.findUnique({ where: { id: payload.targetId } });
            if (!document) return;
            await this.moderation.scanAttachment(
              'seller_document',
              document.id,
              document.fileName,
              document.metadata && typeof document.metadata === 'object' ? (document.metadata as any).mimeType : null,
              document.metadata && typeof document.metadata === 'object' ? (document.metadata as any).sizeBytes : null
            );
            return;
          }
        }
        return;
      case 'REGULATORY_AUTO_REVIEW':
        {
          if (!this.regulatoryAutomation) return;
          const payload = job.payload as { userId?: string; deskId?: string };
          await this.regulatoryAutomation.runAutoReview(payload.userId, payload.deskId);
        }
        return;
      case 'REGULATORY_EVIDENCE_BUNDLE':
        {
          if (!this.regulatoryAutomation) return;
          const payload = job.payload as { bundleId?: string };
          if (!payload?.bundleId) return;
          await this.regulatoryAutomation.generateEvidenceBundle(payload.bundleId);
        }
        return;
      case 'EXPORTS_GENERATE':
        {
          if (!this.exportsService) return;
          const payload = job.payload as { jobId?: string };
          if (!payload?.jobId) return;
          await this.exportsService.generate(payload.jobId);
        }
        return;
      case 'CATALOG_IMPORT':
        {
          if (!this.catalogService) return;
          const payload = job.payload as { jobId?: string };
          if (!payload?.jobId) return;
          await this.catalogService.processImportJob(payload.jobId);
        }
        return;
      case 'SEARCH_INDEX_LISTING':
        {
          if (!this.searchService) return;
          const payload = job.payload as { listingId?: string };
          if (!payload?.listingId) return;
          await this.searchService.indexListing(payload.listingId);
        }
        return;
      case 'SEARCH_INDEX_STOREFRONT':
        {
          if (!this.searchService) return;
          const payload = job.payload as { storefrontId?: string };
          if (!payload?.storefrontId) return;
          await this.searchService.indexStorefront(payload.storefrontId);
        }
        return;
      case 'SEARCH_REINDEX':
        {
          if (!this.searchService) return;
          await this.searchService.reindexAll();
        }
        return;
      case 'REALTIME_DELIVERY_SWEEP':
        {
          if (!this.realtimeDelivery) return;
          const payload = job.payload as { limit?: number };
          await this.realtimeDelivery.sweepPending(payload?.limit);
        }
        return;
      default:
        return;
    }
  }

  private async publishUserEvent(userId: string, event: Record<string, unknown>) {
    const channel = `user:${userId}`;
    const preparedEvent = this.realtimeStream?.prepareEvent(event);
    if (this.realtimePublisher) {
      await this.realtimePublisher.publish(
        channel,
        event,
        preparedEvent ? { eventType: preparedEvent.eventType, streamId: preparedEvent.id } : undefined
      );
    }
    if (this.realtimeStream) {
      await this.realtimeStream.emitPreparedToUser(
        userId,
        preparedEvent ?? this.realtimeStream.prepareEvent(event)
      );
    }
  }
}
