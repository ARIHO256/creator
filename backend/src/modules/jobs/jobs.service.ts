import { Injectable, NotFoundException } from '@nestjs/common';
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
  constructor(private readonly prisma: PrismaService) {}

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
        maxAttempts: input.maxAttempts ?? 5,
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
    const attempts = job.attempts + 1;
    const terminalStatus =
      attempts >= job.maxAttempts ? BackgroundJobStatus.DEAD_LETTER : BackgroundJobStatus.FAILED;

    return this.prisma.backgroundJob.update({
      where: { id },
      data: {
        status: terminalStatus,
        attempts,
        lockedAt: null,
        lockedBy: null,
        lastError: error,
        runAfter: terminalStatus === BackgroundJobStatus.FAILED ? new Date(Date.now() + 60_000) : job.runAfter
      }
    });
  }
}
