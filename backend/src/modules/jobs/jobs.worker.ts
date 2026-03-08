import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobsService } from './jobs.service.js';

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
    @Inject(ConfigService) private readonly configService: ConfigService
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
      } catch (error: any) {
        this.status.errors += 1;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Job ${job.id} failed: ${message}`);
        await this.jobsService.markFailed(job.id, message);
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
      default:
        return;
    }
  }
}
