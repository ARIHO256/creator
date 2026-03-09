import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobsService } from '../../modules/jobs/jobs.service.js';
import { RealtimeDeliveryService } from './realtime-delivery.service.js';

@Injectable()
export class RealtimeService {
  constructor(
    private readonly jobsService: JobsService,
    private readonly configService: ConfigService,
    private readonly delivery: RealtimeDeliveryService
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
    const receipt = await this.delivery.recordEvent(userId, event);
    const channel = `user:${userId}`;
    await this.jobsService.enqueue({
      queue: 'realtime',
      type: 'REALTIME_EVENT',
      payload: { channel, event: receipt ? { ...event, id: receipt.eventId } : event },
      maxAttempts: this.configService.get<number>('realtime.maxAttempts') ?? 3
    });
  }
}
