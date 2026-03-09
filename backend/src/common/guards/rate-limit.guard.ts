import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { FastifyReply, FastifyRequest } from 'fastify';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator.js';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, number[]>();
  private requestCount = 0;

  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {}

  canActivate(context: ExecutionContext): boolean {
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
    const windowStart = now - options.windowMs;
    const bucketKey = `${routeKey}:${identity}`;
    const hits = (this.buckets.get(bucketKey) ?? []).filter((value) => value > windowStart);

    if (hits.length >= options.limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((hits[0] + options.windowMs - now) / 1000));
      this.setHeaders(reply, options.limit, 0, hits[0] + options.windowMs);
      reply.header('retry-after', retryAfterSeconds);
      throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    hits.push(now);
    this.buckets.set(bucketKey, hits);
    this.setHeaders(reply, options.limit, Math.max(options.limit - hits.length, 0), now + options.windowMs);
    this.compactBuckets(now);
    return true;
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
      if (activeHits.length === 0) {
        this.buckets.delete(key);
      } else {
        this.buckets.set(key, activeHits);
      }
    }
  }
}
