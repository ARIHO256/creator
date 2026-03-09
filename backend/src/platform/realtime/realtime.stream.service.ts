import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyReply } from 'fastify';

type StreamClient = {
  reply: FastifyReply;
  pingTimer: NodeJS.Timeout;
};

@Injectable()
export class RealtimeStreamService {
  private readonly logger = new Logger(RealtimeStreamService.name);
  private readonly clients = new Map<string, Set<StreamClient>>();

  constructor(private readonly configService: ConfigService) {}

  open(userId: string, reply: FastifyReply) {
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

    for (const client of set) {
      try {
        client.reply.raw.write(`event: ${eventType}\n`);
        client.reply.raw.write(`data: ${payload}\n\n`);
      } catch (error: any) {
        this.logger.debug(`Stream write failed: ${error?.message ?? error}`);
      }
    }
  }
}
