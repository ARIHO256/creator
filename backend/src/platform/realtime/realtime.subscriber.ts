import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { REALTIME_INSTANCE_ID, RealtimePublishEnvelope } from './realtime.instance.js';
import { RealtimeStreamService } from './realtime.stream.service.js';

@Injectable()
export class RealtimeSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeSubscriber.name);
  private client: any | null = null;
  private readonly enabled: boolean;
  private readonly prefix: string;
  private readonly subscriberEnabled: boolean;

  constructor(
    private readonly streamService: RealtimeStreamService,
    @Optional() @Inject(ConfigService) private readonly configService?: ConfigService
  ) {
    this.enabled = !['0', 'false', 'no', 'off'].includes(
      String(this.readConfig('realtime.enabled', 'false')).toLowerCase()
    );
    this.subscriberEnabled = !['0', 'false', 'no', 'off'].includes(
      String(this.readConfig('realtime.subscriberEnabled', 'true')).toLowerCase()
    );
    this.prefix = String(this.readConfig('realtime.channelPrefix', 'mldz:realtime:'));
  }

  onModuleInit() {
    const redisUrl =
      this.readConfig<string>('realtime.redisUrl', '') ??
      this.readConfig<string>('cache.redisUrl', '') ??
      '';
    if (!this.enabled || !this.subscriberEnabled || !redisUrl) {
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
        const envelope = JSON.parse(message) as RealtimePublishEnvelope | Record<string, unknown>;
        const published = this.normalizeEnvelope(envelope);
        if (!published || published.source === REALTIME_INSTANCE_ID) {
          return;
        }
        void this.streamService.emitToUser(userId, published.event, {
          eventType: published.meta?.eventType,
          persistDistributedHistory: false,
          streamId: published.meta?.streamId
        });
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

  private normalizeEnvelope(envelope: RealtimePublishEnvelope | Record<string, unknown>) {
    if ('event' in envelope && envelope.event && typeof envelope.event === 'object') {
      return envelope as RealtimePublishEnvelope;
    }
    return {
      event: envelope as Record<string, unknown>,
      source: ''
    } satisfies RealtimePublishEnvelope;
  }
}
