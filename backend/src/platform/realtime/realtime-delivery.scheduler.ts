import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobsService } from '../../modules/jobs/jobs.service.js';

@Injectable()
export class RealtimeDeliveryScheduler implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly jobsService: JobsService
  ) {}

  onModuleInit() {
    const enabled = !['0', 'false', 'no', 'off'].includes(
      String(this.configService.get('realtime.deliverySweepEnabled') ?? 'true').toLowerCase()
    );
    if (!enabled) return;
    const intervalMs = Number(this.configService.get('realtime.deliverySweepMs') ?? 15000);
    this.timer = setInterval(() => {
      const bucket = Math.floor(Date.now() / intervalMs);
      this.jobsService.enqueue({
        queue: 'realtime',
        type: 'REALTIME_DELIVERY_SWEEP',
        payload: { limit: 200 },
        dedupeKey: `realtime:sweep:${bucket}`
      }).catch(() => undefined);
    }, intervalMs);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
