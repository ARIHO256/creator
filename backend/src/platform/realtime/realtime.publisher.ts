import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RealtimePublisher implements OnModuleDestroy {
  private readonly logger = new Logger(RealtimePublisher.name);
  private client: any | null = null;
  private readonly enabled: boolean;
  private readonly prefix: string;

  constructor(private readonly configService: ConfigService) {
    this.enabled = !['0', 'false', 'no', 'off'].includes(
      String(this.configService.get('realtime.enabled') ?? 'true').toLowerCase()
    );
    this.prefix = String(this.configService.get('realtime.channelPrefix') ?? 'mldz:realtime:');
    const redisUrl =
      this.configService.get<string>('realtime.redisUrl') ??
      this.configService.get<string>('cache.redisUrl') ??
      '';

    if (this.enabled && redisUrl) {
      this.client = new Redis(redisUrl, { maxRetriesPerRequest: 2 });
      this.client.on('error', (error) => {
        this.logger.warn(`Realtime Redis error: ${error.message}`);
      });
    }
  }

  async publish(channel: string, payload: Record<string, unknown>) {
    if (!this.enabled || !this.client) {
      return;
    }
    const message = JSON.stringify(payload);
    await this.client.publish(`${this.prefix}${channel}`, message);
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }
}
