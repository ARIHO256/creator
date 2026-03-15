import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Redis } from 'ioredis';
import { FastifyReply, FastifyRequest } from 'fastify';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator.js';

type BucketState = {
  allowed: boolean;
  count: number;
  resetAt: number;
};

const REDIS_RATE_LIMIT_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowStart = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local ttlMs = tonumber(ARGV[4])
local member = ARGV[5]

redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)
local count = redis.call('ZCARD', key)
if count >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local oldestScore = tonumber(oldest[2] or now)
  return {0, count, oldestScore}
end

redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, ttlMs)
return {1, count + 1, now}
`;

@Injectable()
export class RateLimitGuard implements CanActivate, OnModuleDestroy {
  private readonly buckets = new Map<string, number[]>();
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly instanceId = `${process.pid}-${Math.random().toString(16).slice(2)}`;
  private readonly redisPrefix: string;
  private readonly redis: Redis | null;
  private requestCount = 0;

  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {
    this.redisPrefix = String(this.configService.get('rateLimit.redisPrefix') ?? 'mldz:ratelimit:');
    const redisUrl = String(this.configService.get('rateLimit.redisUrl') ?? '');
    if (redisUrl) {
      this.redis = new Redis(redisUrl, { maxRetriesPerRequest: 2 });
      this.redis.on('error', (error) => {
        this.logger.warn(`Rate limit Redis error: ${error.message}`);
      });
    } else {
      this.redis = null;
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.configService.get<boolean>('rateLimit.disabled') ?? false) {
      return true;
    }

    const request = context.switchToHttp().getRequest<
      FastifyRequest & { user?: { sub?: string } }
    >();
    const reply = context.switchToHttp().getResponse<FastifyReply>();
    const options =
      this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
        context.getHandler(),
        context.getClass()
      ]) ?? {
        limit: this.configService.get<number>('rateLimit.defaultLimit') ?? 120,
        windowMs: this.configService.get<number>('rateLimit.defaultWindowMs') ?? 60_000
      };

    const routeKey = `${request.method}:${request.routeOptions?.url ?? request.url.split('?')[0]}`;
    const identity = this.resolveIdentity(request);
    const now = Date.now();
    const bucketKey = `${routeKey}:${identity}`;
    const bucket = await this.consume(bucketKey, options.limit, options.windowMs, now);

    if (!bucket.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      this.setHeaders(reply, options.limit, 0, bucket.resetAt);
      reply.header('retry-after', retryAfterSeconds);
      throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    this.setHeaders(reply, options.limit, Math.max(options.limit - bucket.count, 0), bucket.resetAt);
    return true;
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  private async consume(bucketKey: string, limit: number, windowMs: number, now: number): Promise<BucketState> {
    const distributed = await this.consumeDistributed(bucketKey, limit, windowMs, now);
    if (distributed) {
      return distributed;
    }
    return this.consumeLocal(bucketKey, limit, windowMs, now);
  }

  private async consumeDistributed(bucketKey: string, limit: number, windowMs: number, now: number) {
    if (!this.redis) {
      return null;
    }
    try {
      const result = (await this.redis.eval(
        REDIS_RATE_LIMIT_SCRIPT,
        1,
        `${this.redisPrefix}${bucketKey}`,
        now,
        now - windowMs,
        limit,
        windowMs,
        `${this.instanceId}:${now}:${Math.random().toString(16).slice(2)}`
      )) as [number | string, number | string, number | string];
      const allowed = Number(result?.[0] ?? 0) === 1;
      const count = Number(result?.[1] ?? 0);
      const anchor = Number(result?.[2] ?? now);
      return {
        allowed,
        count,
        resetAt: allowed ? now + windowMs : anchor + windowMs
      } satisfies BucketState;
    } catch (error: any) {
      this.logger.warn(`Distributed rate limit failed: ${error?.message ?? error}`);
      return null;
    }
  }

  private consumeLocal(bucketKey: string, limit: number, windowMs: number, now: number) {
    const windowStart = now - windowMs;
    const hits = (this.buckets.get(bucketKey) ?? []).filter((value) => value > windowStart);
    if (hits.length >= limit) {
      return {
        allowed: false,
        count: hits.length,
        resetAt: hits[0] + windowMs
      } satisfies BucketState;
    }

    hits.push(now);
    this.buckets.set(bucketKey, hits);
    this.compactBuckets(now);
    return {
      allowed: true,
      count: hits.length,
      resetAt: now + windowMs
    } satisfies BucketState;
  }

  private resolveIdentity(request: FastifyRequest & { user?: { sub?: string } }) {
    if (request.user?.sub) {
      return `user:${request.user.sub}`;
    }

    const forwardedFor = request.headers['x-forwarded-for'];
    const clientIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : String(forwardedFor ?? request.ip ?? 'unknown')
          .split(',')[0]
          ?.trim();

    return `ip:${clientIp || 'unknown'}`;
  }

  private setHeaders(reply: FastifyReply, limit: number, remaining: number, resetAt: number) {
    reply.header('x-ratelimit-limit', limit);
    reply.header('x-ratelimit-remaining', remaining);
    reply.header('x-ratelimit-reset', Math.ceil(resetAt / 1000));
  }

  private compactBuckets(now: number) {
    this.requestCount += 1;
    if (this.requestCount % 250 !== 0) {
      return;
    }

    for (const [key, hits] of this.buckets.entries()) {
      const activeHits = hits.filter((value) => value > now - 10 * 60_000);
      if (!activeHits.length) {
        this.buckets.delete(key);
      } else {
        this.buckets.set(key, activeHits);
      }
    }
  }
}
