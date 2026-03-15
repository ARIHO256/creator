import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";
import { REALTIME_INSTANCE_ID, RealtimePublishEnvelope, RealtimePublishMeta } from "./realtime.instance.js";

@Injectable()
export class RealtimePublisher implements OnModuleDestroy {
  private readonly logger = new Logger(RealtimePublisher.name);
  private client: any | null = null;
  private readonly enabled: boolean;
  private readonly prefix: string;

  constructor(private readonly configService: ConfigService) {
    // guard against missing service (shouldn't happen if ConfigModule is imported)
    const cfg =
      this.configService ?? ({ get: () => undefined } as unknown as ConfigService);

    this.enabled = !["0", "false", "no", "off"].includes(
      String(cfg.get("realtime.enabled") ?? "true").toLowerCase(),
    );
    this.prefix = String(cfg.get("realtime.channelPrefix") ?? "mldz:realtime:");
    const redisUrl =
      (cfg.get<string>("realtime.redisUrl") as string) ??
      (cfg.get<string>("cache.redisUrl") as string) ??
      "";

    if (this.enabled && redisUrl) {
      this.client = new Redis(redisUrl, { maxRetriesPerRequest: 2 });
      this.client.on("error", (error) => {
        this.logger.warn(`Realtime Redis error: ${error.message}`);
      });
    }
  }

  async publish(channel: string, payload: Record<string, unknown>, meta?: RealtimePublishMeta) {
    if (!this.enabled || !this.client) {
      return;
    }
    const message = JSON.stringify({
      event: payload,
      meta,
      source: REALTIME_INSTANCE_ID
    } satisfies RealtimePublishEnvelope);
    await this.client.publish(`${this.prefix}${channel}`, message);
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }
}
