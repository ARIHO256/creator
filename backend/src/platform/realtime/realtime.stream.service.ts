import { HttpException, HttpStatus, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { FastifyReply } from 'fastify';

type StreamClient = {
  connectionId: string;
  pingTimer: NodeJS.Timeout;
  reply: FastifyReply;
};

type BufferedEvent = {
  eventType: string;
  id: string;
  payload: string;
  seq: number;
  ts: number;
};

type EmitOptions = {
  eventType?: string;
  persistDistributedHistory?: boolean;
  persistLocalHistory?: boolean;
  streamId?: string;
};

const ACQUIRE_STREAM_SLOT_SCRIPT = `
local userKey = KEYS[1]
local totalKey = KEYS[2]
local now = tonumber(ARGV[1])
local expiry = tonumber(ARGV[2])
local maxPerUser = tonumber(ARGV[3])
local maxTotal = tonumber(ARGV[4])
local userMember = ARGV[5]
local totalMember = ARGV[6]
local ttlMs = tonumber(ARGV[7])

redis.call('ZREMRANGEBYSCORE', userKey, 0, now)
redis.call('ZREMRANGEBYSCORE', totalKey, 0, now)

local userCount = redis.call('ZCARD', userKey)
local totalCount = redis.call('ZCARD', totalKey)
if userCount >= maxPerUser or totalCount >= maxTotal then
  return {0, userCount, totalCount}
end

redis.call('ZADD', userKey, expiry, userMember)
redis.call('ZADD', totalKey, expiry, totalMember)
redis.call('PEXPIRE', userKey, ttlMs)
redis.call('PEXPIRE', totalKey, ttlMs)
return {1, userCount + 1, totalCount + 1}
`;

const REFRESH_STREAM_SLOT_SCRIPT = `
local userKey = KEYS[1]
local totalKey = KEYS[2]
local expiry = tonumber(ARGV[1])
local userMember = ARGV[2]
local totalMember = ARGV[3]
local ttlMs = tonumber(ARGV[4])

redis.call('ZADD', userKey, expiry, userMember)
redis.call('ZADD', totalKey, expiry, totalMember)
redis.call('PEXPIRE', userKey, ttlMs)
redis.call('PEXPIRE', totalKey, ttlMs)
return 1
`;

const RELEASE_STREAM_SLOT_SCRIPT = `
redis.call('ZREM', KEYS[1], ARGV[1])
redis.call('ZREM', KEYS[2], ARGV[2])
return 1
`;

const HAS_STREAM_CLIENTS_SCRIPT = `
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, tonumber(ARGV[1]))
return redis.call('ZCARD', KEYS[1])
`;

@Injectable()
export class RealtimeStreamService implements OnModuleDestroy {
  private readonly logger = new Logger(RealtimeStreamService.name);
  private readonly clients = new Map<string, Set<StreamClient>>();
  private readonly history = new Map<string, BufferedEvent[]>();
  private readonly instanceId = `${process.pid}-${Math.random().toString(16).slice(2)}`;
  private readonly redisPrefix: string;
  private readonly redis: Redis | null;
  private seq = 0;

  constructor(private readonly configService: ConfigService) {
    this.redisPrefix = String(
      this.configService.get('realtime.streamStatePrefix') ??
        this.configService.get('realtime.channelPrefix') ??
        'mldz:realtime:state:'
    );
    const redisUrl =
      String(this.configService.get('realtime.redisUrl') ?? '') ||
      String(this.configService.get('cache.redisUrl') ?? '');
    if (redisUrl) {
      this.redis = new Redis(redisUrl, { maxRetriesPerRequest: 2 });
      this.redis.on('error', (error) => {
        this.logger.warn(`Realtime stream Redis error: ${error.message}`);
      });
    } else {
      this.redis = null;
    }
  }

  async open(userId: string, reply: FastifyReply, lastEventId?: string | null) {
    const connectionId = `${this.instanceId}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
    const admitted = await this.acquireSlot(userId, connectionId);
    if (!admitted) {
      throw new HttpException('Realtime stream limit reached', HttpStatus.TOO_MANY_REQUESTS);
    }

    const pingMs = Number(this.configService.get('realtime.streamPingMs') ?? 25000);
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.flushHeaders?.();
    reply.raw.write(`event: ready\ndata: {"userId":"${userId}"}\n\n`);

    const pingTimer = setInterval(() => {
      try {
        reply.raw.write(`: ping\n\n`);
        void this.refreshSlot(userId, connectionId);
      } catch {
        // ignore
      }
    }, pingMs);

    const client: StreamClient = { connectionId, pingTimer, reply };
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(client);

    if (lastEventId) {
      await this.replayFromHistory(userId, lastEventId, reply);
    }

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      clearInterval(pingTimer);
      const set = this.clients.get(userId);
      if (set) {
        set.delete(client);
        if (!set.size) {
          this.clients.delete(userId);
        }
      }
      void this.releaseSlot(userId, connectionId);
    };

    reply.raw.on('close', cleanup);
    reply.raw.on('error', cleanup);
  }

  async emitToUser(userId: string, event: Record<string, unknown>, options: EmitOptions = {}) {
    const prepared = this.prepareEvent(event, options.streamId, options.eventType);
    await this.emitPreparedToUser(userId, prepared, options);
  }

  prepareEvent(event: Record<string, unknown>, streamId?: string, eventType?: string): BufferedEvent {
    const id = streamId ?? this.nextEventId();
    const meta = this.parseEventId(id);
    return {
      eventType: eventType ?? (typeof event.type === 'string' ? event.type : 'message'),
      id,
      payload: JSON.stringify(event),
      seq: meta?.seq ?? 0,
      ts: meta?.ts ?? Date.now()
    };
  }

  async emitPreparedToUser(
    userId: string,
    event: BufferedEvent,
    options: Pick<EmitOptions, 'persistDistributedHistory' | 'persistLocalHistory'> = {}
  ) {
    if (options.persistLocalHistory !== false) {
      this.storeLocalEvent(userId, event);
    }
    if (options.persistDistributedHistory !== false) {
      await this.storeDistributedEvent(userId, event);
    }

    const set = this.clients.get(userId);
    if (!set?.size) return;

    for (const client of set) {
      try {
        client.reply.raw.write(`id: ${event.id}\n`);
        client.reply.raw.write(`event: ${event.eventType}\n`);
        client.reply.raw.write(`data: ${event.payload}\n\n`);
      } catch (error: any) {
        this.logger.debug(`Stream write failed: ${error?.message ?? error}`);
        try {
          client.reply.raw.destroy();
        } catch {
          // ignore
        }
      }
    }
  }

  async hasClient(userId: string) {
    if ((this.clients.get(userId)?.size ?? 0) > 0) {
      return true;
    }
    if (!this.redis) {
      return false;
    }
    try {
      const count = await this.redis.eval(
        HAS_STREAM_CLIENTS_SCRIPT,
        1,
        this.userPresenceKey(userId),
        Date.now()
      );
      return Number(count ?? 0) > 0;
    } catch (error: any) {
      this.logger.warn(`Realtime presence check failed: ${error?.message ?? error}`);
      return false;
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  private async acquireSlot(userId: string, connectionId: string) {
    const maxPerUser = Number(this.configService.get('realtime.streamMaxClientsPerUser') ?? 3);
    const maxTotal = Number(this.configService.get('realtime.streamMaxClientsTotal') ?? 5000);
    if (!this.redis) {
      const currentUserCount = this.clients.get(userId)?.size ?? 0;
      const totalCount = this.countLocalClients();
      return currentUserCount < maxPerUser && totalCount < maxTotal;
    }

    const now = Date.now();
    const ttlMs = this.presenceTtlMs();
    try {
      const result = (await this.redis.eval(
        ACQUIRE_STREAM_SLOT_SCRIPT,
        2,
        this.userPresenceKey(userId),
        this.totalPresenceKey(),
        now,
        now + ttlMs,
        maxPerUser,
        maxTotal,
        connectionId,
        `${userId}:${connectionId}`,
        ttlMs * 2
      )) as [number | string, number | string, number | string];
      return Number(result?.[0] ?? 0) === 1;
    } catch (error: any) {
      this.logger.warn(`Realtime presence acquire failed: ${error?.message ?? error}`);
      const currentUserCount = this.clients.get(userId)?.size ?? 0;
      const totalCount = this.countLocalClients();
      return currentUserCount < maxPerUser && totalCount < maxTotal;
    }
  }

  private async refreshSlot(userId: string, connectionId: string) {
    if (!this.redis) {
      return;
    }
    const ttlMs = this.presenceTtlMs();
    const expiry = Date.now() + ttlMs;
    try {
      await this.redis.eval(
        REFRESH_STREAM_SLOT_SCRIPT,
        2,
        this.userPresenceKey(userId),
        this.totalPresenceKey(),
        expiry,
        connectionId,
        `${userId}:${connectionId}`,
        ttlMs * 2
      );
    } catch (error: any) {
      this.logger.warn(`Realtime presence refresh failed: ${error?.message ?? error}`);
    }
  }

  private async releaseSlot(userId: string, connectionId: string) {
    if (!this.redis) {
      return;
    }
    try {
      await this.redis.eval(
        RELEASE_STREAM_SLOT_SCRIPT,
        2,
        this.userPresenceKey(userId),
        this.totalPresenceKey(),
        connectionId,
        `${userId}:${connectionId}`
      );
    } catch (error: any) {
      this.logger.warn(`Realtime presence release failed: ${error?.message ?? error}`);
    }
  }

  private async storeDistributedEvent(userId: string, event: BufferedEvent) {
    if (!this.redis) {
      return;
    }
    const maxSize = Number(this.configService.get('realtime.streamHistorySize') ?? 50);
    const ttlMs = Number(this.configService.get('realtime.streamHistoryTtlMs') ?? 5 * 60 * 1000);
    try {
      await this.redis
        .multi()
        .rpush(this.historyKey(userId), JSON.stringify(event))
        .ltrim(this.historyKey(userId), -maxSize, -1)
        .pexpire(this.historyKey(userId), ttlMs)
        .exec();
    } catch (error: any) {
      this.logger.warn(`Realtime history write failed: ${error?.message ?? error}`);
    }
  }

  private storeLocalEvent(userId: string, event: BufferedEvent) {
    const list = this.history.get(userId) ?? [];
    list.push(event);
    this.history.set(userId, list);
    this.pruneHistory(userId);
  }

  private pruneHistory(userId: string) {
    const list = this.history.get(userId);
    if (!list?.length) return;
    const maxSize = Number(this.configService.get('realtime.streamHistorySize') ?? 50);
    const ttlMs = Number(this.configService.get('realtime.streamHistoryTtlMs') ?? 5 * 60 * 1000);
    const cutoff = Date.now() - ttlMs;
    const filtered = list.filter((entry) => entry.ts >= cutoff);
    const trimmed = filtered.length > maxSize ? filtered.slice(filtered.length - maxSize) : filtered;
    if (!trimmed.length) {
      this.history.delete(userId);
      return;
    }
    this.history.set(userId, trimmed);
  }

  private async replayFromHistory(userId: string, lastEventId: string, reply: FastifyReply) {
    const marker = this.parseEventId(lastEventId);
    if (!marker) return;
    const list = await this.readHistory(userId);
    for (const entry of list) {
      if (entry.ts < marker.ts) continue;
      if (entry.ts === marker.ts && entry.seq <= marker.seq) continue;
      try {
        reply.raw.write(`id: ${entry.id}\n`);
        reply.raw.write(`event: ${entry.eventType}\n`);
        reply.raw.write(`data: ${entry.payload}\n\n`);
      } catch {
        return;
      }
    }
  }

  private async readHistory(userId: string) {
    if (!this.redis) {
      return this.history.get(userId) ?? [];
    }
    try {
      const entries = await this.redis.lrange(this.historyKey(userId), 0, -1);
      const parsed = entries
        .map((entry) => this.parseBufferedEvent(entry))
        .filter((entry): entry is BufferedEvent => Boolean(entry));
      if (parsed.length) {
        return parsed;
      }
    } catch (error: any) {
      this.logger.warn(`Realtime history read failed: ${error?.message ?? error}`);
    }
    return this.history.get(userId) ?? [];
  }

  private parseBufferedEvent(raw: string) {
    try {
      const parsed = JSON.parse(raw) as Partial<BufferedEvent>;
      if (!parsed || typeof parsed.id !== 'string' || typeof parsed.payload !== 'string') {
        return null;
      }
      const meta = this.parseEventId(parsed.id);
      return {
        eventType: typeof parsed.eventType === 'string' ? parsed.eventType : 'message',
        id: parsed.id,
        payload: parsed.payload,
        seq: meta?.seq ?? Number(parsed.seq ?? 0),
        ts: meta?.ts ?? Number(parsed.ts ?? Date.now())
      };
    } catch {
      return null;
    }
  }

  private nextEventId() {
    const ts = Date.now();
    this.seq = (this.seq + 1) % 10_000_000;
    return `${ts}-${this.seq}`;
  }

  private parseEventId(eventId: string) {
    const [tsStr, seqStr] = eventId.split('-');
    const ts = Number(tsStr);
    const seq = Number(seqStr ?? 0);
    if (!Number.isFinite(ts) || !Number.isFinite(seq)) {
      return null;
    }
    return { seq, ts };
  }

  private presenceTtlMs() {
    const pingMs = Number(this.configService.get('realtime.streamPingMs') ?? 25000);
    const configured = Number(this.configService.get('realtime.streamPresenceTtlMs') ?? 90000);
    return Math.max(configured, pingMs * 3);
  }

  private userPresenceKey(userId: string) {
    return `${this.redisPrefix}presence:user:${userId}`;
  }

  private totalPresenceKey() {
    return `${this.redisPrefix}presence:all`;
  }

  private historyKey(userId: string) {
    return `${this.redisPrefix}history:${userId}`;
  }

  private countLocalClients() {
    let total = 0;
    for (const set of this.clients.values()) {
      total += set.size;
    }
    return total;
  }
}
