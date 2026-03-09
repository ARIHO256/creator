import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyReply } from 'fastify';

type StreamClient = {
  reply: FastifyReply;
  pingTimer: NodeJS.Timeout;
};

type BufferedEvent = {
  id: string;
  ts: number;
  seq: number;
  eventType: string;
  payload: string;
};

@Injectable()
export class RealtimeStreamService {
  private readonly logger = new Logger(RealtimeStreamService.name);
  private readonly clients = new Map<string, Set<StreamClient>>();
  private readonly history = new Map<string, BufferedEvent[]>();
  private seq = 0;

  constructor(private readonly configService: ConfigService) {}

  open(userId: string, reply: FastifyReply, lastEventId?: string | null) {
    const maxPerUser = Number(this.configService.get('realtime.streamMaxClientsPerUser') ?? 3);
    const maxTotal = Number(this.configService.get('realtime.streamMaxClientsTotal') ?? 5000);
    const currentUserCount = this.clients.get(userId)?.size ?? 0;
    const totalCount = this.countClients();
    if (currentUserCount >= maxPerUser || totalCount >= maxTotal) {
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
      } catch {
        // ignore
      }
    }, pingMs);

    const client: StreamClient = { reply, pingTimer };
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(client);

    if (lastEventId) {
      this.replayFromHistory(userId, lastEventId, reply);
    }

    const cleanup = () => {
      clearInterval(pingTimer);
      const set = this.clients.get(userId);
      if (set) {
        set.delete(client);
        if (!set.size) {
          this.clients.delete(userId);
        }
      }
    };

    reply.raw.on('close', cleanup);
    reply.raw.on('error', cleanup);
  }

  emitToUser(userId: string, event: Record<string, unknown>) {
    const set = this.clients.get(userId);
    if (!set || !set.size) return;

    const eventType = typeof event.type === 'string' ? event.type : 'message';
    const payload = JSON.stringify(event);
    const eventId = this.nextEventId();
    this.storeEvent(userId, eventId, eventType, payload);

    for (const client of set) {
      try {
        client.reply.raw.write(`id: ${eventId}\n`);
        client.reply.raw.write(`event: ${eventType}\n`);
        client.reply.raw.write(`data: ${payload}\n\n`);
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

  hasClient(userId: string) {
    return (this.clients.get(userId)?.size ?? 0) > 0;
  }

  private nextEventId() {
    const ts = Date.now();
    this.seq = (this.seq + 1) % 10_000_000;
    return `${ts}-${this.seq}`;
  }

  private storeEvent(userId: string, id: string, eventType: string, payload: string) {
    const [tsStr, seqStr] = id.split('-');
    const ts = Number(tsStr);
    const seq = Number(seqStr);
    if (!Number.isFinite(ts)) {
      return;
    }
    const list = this.history.get(userId) ?? [];
    list.push({ id, ts, seq, eventType, payload });
    this.history.set(userId, list);
    this.pruneHistory(userId);
  }

  private pruneHistory(userId: string) {
    const list = this.history.get(userId);
    if (!list || !list.length) return;
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

  private replayFromHistory(userId: string, lastEventId: string, reply: FastifyReply) {
    const list = this.history.get(userId);
    if (!list || !list.length) return;
    const marker = this.parseEventId(lastEventId);
    if (!marker) return;
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

  private parseEventId(eventId: string) {
    const [tsStr, seqStr] = eventId.split('-');
    const ts = Number(tsStr);
    const seq = Number(seqStr ?? 0);
    if (!Number.isFinite(ts) || !Number.isFinite(seq)) {
      return null;
    }
    return { ts, seq };
  }

  private countClients() {
    let total = 0;
    for (const set of this.clients.values()) {
      total += set.size;
    }
    return total;
  }
}
