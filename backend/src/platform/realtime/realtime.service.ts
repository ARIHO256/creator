import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobsService } from '../../modules/jobs/jobs.service.js';

@Injectable()
export class RealtimeService {
  constructor(
    private readonly jobsService: JobsService,
    private readonly configService: ConfigService
  ) {}

  enabled() {
    return !['0', 'false', 'no', 'off'].includes(
      String(this.configService.get('realtime.enabled') ?? 'true').toLowerCase()
    );
  }

  async publishUserEvent(userId: string, event: Record<string, unknown>) {
    if (!this.enabled()) {
      return;
    }
    const channel = `user:${userId}`;
    await this.jobsService.enqueue({
      queue: 'realtime',
      type: 'REALTIME_EVENT',
      payload: { channel, event },
      maxAttempts: this.configService.get<number>('realtime.maxAttempts') ?? 3
    });
  }
}
