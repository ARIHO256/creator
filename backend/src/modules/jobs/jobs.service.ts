import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BackgroundJobStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { ListBackgroundJobsDto } from './dto/list-background-jobs.dto.js';

export type EnqueueBackgroundJobInput = {
  queue: string;
  type: string;
  payload: Record<string, unknown>;
  userId?: string | null;
  dedupeKey?: string | null;
  priority?: number;
  maxAttempts?: number;
  runAfter?: Date;
  correlationId?: string | null;
};

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {}

  async enqueue(input: EnqueueBackgroundJobInput) {
    if (input.dedupeKey) {
      const existing = await this.prisma.backgroundJob.findUnique({
        where: { dedupeKey: input.dedupeKey }
      });

      if (existing) {
        return existing;
      }
    }

    return this.prisma.backgroundJob.create({
      data: {
        userId: input.userId ?? null,
        queue: input.queue,
        type: input.type,
        dedupeKey: input.dedupeKey ?? null,
        priority: input.priority ?? 100,
        maxAttempts: input.maxAttempts ?? (this.configService.get<number>('jobs.defaultMaxAttempts') ?? 5),
        runAfter: input.runAfter ?? new Date(),
        correlationId: input.correlationId ?? null,
        payload: input.payload as Prisma.InputJsonValue
      }
    });
  }

  list(query: ListBackgroundJobsDto) {
    return this.prisma.backgroundJob.findMany({
      where: {
        queue: query.queue ?? undefined,
        status: query.status as BackgroundJobStatus | undefined
      },
      orderBy: [{ priority: 'asc' }, { runAfter: 'asc' }, { createdAt: 'desc' }],
      take: query.take ?? 50
    });
  }

  async get(id: string) {
    const job = await this.prisma.backgroundJob.findUnique({
      where: { id }
    });

    if (!job) {
      throw new NotFoundException('Background job not found');
    }

    return job;
  }

  async metrics() {
    const now = new Date();
    const [statusCounts, duePending, activeLocks, deadLetters] = await Promise.all([
      this.prisma.backgroundJob.groupBy({
        by: ['status'],
        _count: { _all: true }
      }),
      this.prisma.backgroundJob.count({
        where: {
          status: BackgroundJobStatus.PENDING,
          runAfter: { lte: now }
        }
      }),
      this.prisma.backgroundJob.count({
        where: {
          status: BackgroundJobStatus.PROCESSING
        }
      }),
      this.prisma.backgroundJob.count({
        where: {
          status: BackgroundJobStatus.DEAD_LETTER
        }
      })
    ]);

    return {
      total: statusCounts.reduce((sum, entry) => sum + entry._count._all, 0),
      duePending,
      activeLocks,
      deadLetters,
      byStatus: Object.fromEntries(statusCounts.map((entry) => [entry.status, entry._count._all]))
    };
  }

  async fetchAndLockNext(workerId: string, lockTtlMs: number) {
    const now = new Date();
    const lockExpiry = new Date(now.getTime() - lockTtlMs);

    const job = await this.prisma.$transaction(async (tx) => {
      const nextJob = await tx.backgroundJob.findFirst({
        where: {
          status: BackgroundJobStatus.PENDING,
          runAfter: { lte: now }
        },
        orderBy: [{ priority: 'asc' }, { runAfter: 'asc' }, { createdAt: 'asc' }]
      });

      if (!nextJob) {
        return null;
      }

      const locked = await tx.backgroundJob.update({
        where: { id: nextJob.id },
        data: {
          status: BackgroundJobStatus.PROCESSING,
          attempts: nextJob.attempts + 1,
          lockedAt: now,
          lockedBy: workerId
        }
      });

      return locked;
    });

    // Simple lock expiry: if a job was stuck as PROCESSING beyond lockTtlMs, requeue it.
    if (!job) {
      const stale = await this.prisma.backgroundJob.findFirst({
        where: {
          status: BackgroundJobStatus.PROCESSING,
          lockedAt: { lt: lockExpiry }
        },
        orderBy: { lockedAt: 'asc' }
      });

      if (!stale) {
        return null;
      }

      const requeued = await this.prisma.backgroundJob.update({
        where: { id: stale.id },
        data: {
          status: BackgroundJobStatus.PENDING,
          lockedAt: null,
          lockedBy: null,
          runAfter: now
        }
      });

      return requeued;
    }

    return job;
  }

  async requeue(id: string) {
    await this.get(id);
    return this.prisma.backgroundJob.update({
      where: { id },
      data: {
        status: BackgroundJobStatus.PENDING,
        attempts: 0,
        lockedAt: null,
        lockedBy: null,
        lastError: null,
        runAfter: new Date()
      }
    });
  }

  async markCompleted(id: string, result?: Record<string, unknown>) {
    await this.get(id);
    return this.prisma.backgroundJob.update({
      where: { id },
      data: {
        status: BackgroundJobStatus.COMPLETED,
        lockedAt: null,
        lockedBy: null,
        result: (result ?? null) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined
      }
    });
  }

  async markFailed(id: string, error: string) {
    const job = await this.get(id);
    const attempts = job.attempts;
    const retryDelayMs = this.configService.get<number>('jobs.retryDelayMs') ?? 60_000;
    const terminalStatus =
      attempts >= job.maxAttempts ? BackgroundJobStatus.DEAD_LETTER : BackgroundJobStatus.PENDING;

    return this.prisma.backgroundJob.update({
      where: { id },
      data: {
        status: terminalStatus,
        attempts,
        lockedAt: null,
        lockedBy: null,
        lastError: error,
        runAfter: terminalStatus === BackgroundJobStatus.PENDING ? new Date(Date.now() + retryDelayMs) : job.runAfter
      }
    });
  }
}
