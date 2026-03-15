import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { CACHE_POLICY_KEY, CachePolicyOptions } from '../decorators/cache-policy.decorator.js';

@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const enabled = this.configService.get<boolean>('cache.httpEnabled') ?? true;
    if (!enabled) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{ method?: string }>();
    if (!['GET', 'HEAD'].includes(String(request?.method ?? '').toUpperCase())) {
      return next.handle();
    }

    const policy =
      this.reflector.getAllAndOverride<CachePolicyOptions>(CACHE_POLICY_KEY, [
        context.getHandler(),
        context.getClass()
      ]) ?? null;

    if (!policy) {
      return next.handle();
    }

    const reply = context.switchToHttp().getResponse<{ header: (name: string, value: string) => void }>();
    const visibility = policy.visibility ?? 'public';
    const headerValues = [visibility, `max-age=${Math.max(0, policy.maxAge ?? 0)}`];
    if (typeof policy.sMaxAge === 'number') {
      headerValues.push(`s-maxage=${Math.max(0, policy.sMaxAge)}`);
    }
    if (typeof policy.staleWhileRevalidate === 'number') {
      headerValues.push(`stale-while-revalidate=${Math.max(0, policy.staleWhileRevalidate)}`);
    }
    if (typeof policy.staleIfError === 'number') {
      headerValues.push(`stale-if-error=${Math.max(0, policy.staleIfError)}`);
    }
    if (policy.immutable) {
      headerValues.push('immutable');
    }

    reply.header('cache-control', headerValues.join(', '));
    if (policy.vary?.length) {
      reply.header('vary', policy.vary.join(', '));
    }

    return next.handle();
  }
}
