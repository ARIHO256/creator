import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { RealtimeStreamService } from './realtime.stream.service.js';

@Injectable()
export class RealtimeSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeSubscriber.name);
  private client: any | null = null;
  private readonly enabled: boolean;
  private readonly prefix: string;

  constructor(
    @Optional() @Inject(ConfigService) private readonly configService?: ConfigService,
    private readonly streamService: RealtimeStreamService
  ) {
    this.enabled = !['0', 'false', 'no', 'off'].includes(
      String(this.readConfig('realtime.enabled', 'false')).toLowerCase()
    );
    this.prefix = String(this.readConfig('realtime.channelPrefix', 'mldz:realtime:'));
  }

  onModuleInit() {
    const redisUrl =
      this.readConfig<string>('realtime.redisUrl', '') ??
      this.readConfig<string>('cache.redisUrl', '') ??
      '';
    if (!this.enabled || !redisUrl) {
      if (!this.configService) {
        this.logger.debug('Realtime subscriber disabled because ConfigService is unavailable.');
      }
      return;
    }
    this.client = new Redis(redisUrl, { maxRetriesPerRequest: 2 });
    this.client.on('error', (error: Error) => {
      this.logger.warn(`Realtime subscriber Redis error: ${error.message}`);
    });
    const pattern = `${this.prefix}user:*`;
    this.client.psubscribe(pattern).catch((error: Error) => {
      this.logger.warn(`Realtime subscribe failed: ${error.message}`);
    });
    this.client.on('pmessage', (_pattern: string, channel: string, message: string) => {
      const rawChannel = channel.startsWith(this.prefix) ? channel.slice(this.prefix.length) : channel;
      if (!rawChannel.startsWith('user:')) {
        return;
      }
      const userId = rawChannel.slice('user:'.length);
      try {
        const event = JSON.parse(message);
        this.streamService.emitToUser(userId, event);
      } catch (error: any) {
        this.logger.debug(`Realtime subscriber parse failed: ${error?.message ?? error}`);
      }
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  private readConfig<T = string>(key: string, fallback: T): T {
    return (this.configService?.get<T>(key) ?? fallback) as T;
  }
}
