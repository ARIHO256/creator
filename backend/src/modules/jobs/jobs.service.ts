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
    const [statusCounts, queuePending, duePending, activeLocks, deadLetters] = await Promise.all([
      this.prisma.backgroundJob.groupBy({
        by: ['status'],
        _count: { _all: true }
      }),
      this.prisma.backgroundJob.groupBy({
        by: ['queue'],
        where: {
          status: BackgroundJobStatus.PENDING,
          runAfter: { lte: now }
        },
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
      byStatus: Object.fromEntries(statusCounts.map((entry) => [entry.status, entry._count._all])),
      duePendingByQueue: Object.fromEntries(queuePending.map((entry) => [entry.queue, entry._count._all]))
    };
  }

  async fetchAndLockBatch(workerId: string, lockTtlMs: number, limit: number, queues?: string[]) {
    const now = new Date();
    const lockExpiry = new Date(now.getTime() - lockTtlMs);
    const queueFilter =
      queues && queues.length > 0
        ? Prisma.sql`AND queue IN (${Prisma.join(queues.map((queue) => Prisma.sql`${queue}`))})`
        : Prisma.empty;

    return this.prisma.$transaction(async (tx) => {
      const jobs: Array<{ id: string; attempts: number }> = [];

      const pending = await tx.$queryRaw<Array<{ id: string; attempts: number }>>(Prisma.sql`
        SELECT id, attempts
        FROM \`BackgroundJob\`
        WHERE status = ${BackgroundJobStatus.PENDING}
          AND runAfter <= ${now}
          ${queueFilter}
        ORDER BY priority ASC, runAfter ASC, createdAt ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      `);

      if (pending.length > 0) {
        jobs.push(...pending);
      }

      if (jobs.length < limit) {
        const staleProcessing = await tx.$queryRaw<Array<{ id: string; attempts: number }>>(Prisma.sql`
          SELECT id, attempts
          FROM \`BackgroundJob\`
          WHERE status = ${BackgroundJobStatus.PROCESSING}
            AND lockedAt IS NOT NULL
            AND lockedAt < ${lockExpiry}
            ${queueFilter}
          ORDER BY lockedAt ASC
          LIMIT ${limit - jobs.length}
          FOR UPDATE SKIP LOCKED
        `);
        jobs.push(...staleProcessing);
      }

      if (jobs.length === 0) {
        return [];
      }

      const ids = jobs.map((job) => job.id);
      await tx.$executeRaw(Prisma.sql`
        UPDATE \`BackgroundJob\`
        SET
          status = ${BackgroundJobStatus.PROCESSING},
          attempts = attempts + 1,
          lockedAt = ${now},
          lockedBy = ${workerId},
          runAfter = ${now}
        WHERE id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}`))})
      `);

      const locked = await tx.backgroundJob.findMany({
        where: { id: { in: ids } }
      });
      const ordered = new Map(locked.map((job) => [job.id, job]));
      return ids.map((id) => ordered.get(id)).filter(Boolean);
    });
  }

  async fetchAndLockNext(workerId: string, lockTtlMs: number, queues?: string[]) {
    const [job] = await this.fetchAndLockBatch(workerId, lockTtlMs, 1, queues);
    return job ?? null;
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
