import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { createHash } from 'crypto';
import { Observable, from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { IdempotencyService } from '../../platform/idempotency/idempotency.service.js';

const IDEMPOTENCY_HEADERS = ['idempotency-key', 'x-idempotency-key'];
const SUPPORTED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly idempotency: IdempotencyService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<any>();
    if (!request?.method) {
      return next.handle();
    }

    const method = String(request.method).toUpperCase();
    if (!SUPPORTED_METHODS.has(method)) {
      return next.handle();
    }

    const key = this.resolveKey(request.headers ?? {});
    if (!key) {
      return next.handle();
    }

    const userId = request.user?.sub ?? request.user?.id;
    if (!userId) {
      return next.handle();
    }

    const route = request.routeOptions?.url ?? request.routerPath ?? request.url?.split('?')[0] ?? 'unknown';
    const requestHash = this.hashBody(request.body);

    return from(
      this.idempotency.claim({
        userId,
        key,
        method,
        route,
        requestHash
      })
    ).pipe(mergeMap(() => next.handle()));
  }

  private resolveKey(headers: Record<string, string | string[] | undefined>) {
    for (const header of IDEMPOTENCY_HEADERS) {
      const value = headers[header];
      if (Array.isArray(value)) {
        if (value[0]) return value[0];
        continue;
      }
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return null;
  }

  private hashBody(body: unknown) {
    if (body === undefined) return null;
    const serialized = this.stableStringify(body, 0);
    if (!serialized) {
      return null;
    }
    return createHash('sha256').update(serialized).digest('hex');
  }

  private stableStringify(value: unknown, depth: number): string | null {
    if (depth > 6) {
      return null;
    }

    if (value === null || value === undefined) {
      return JSON.stringify(value);
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return JSON.stringify(value);
    }

    if (typeof value === 'bigint') {
      return JSON.stringify(value.toString());
    }

    if (value instanceof Date) {
      return JSON.stringify(value.toISOString());
    }

    if (Array.isArray(value)) {
      const items = value.map((entry) => this.stableStringify(entry, depth + 1));
      if (items.some((entry) => entry === null)) return null;
      return `[${items.join(',')}]`;
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
        a.localeCompare(b)
      );
      const parts: string[] = [];
      for (const [key, entry] of entries) {
        const serialized = this.stableStringify(entry, depth + 1);
        if (serialized === null) {
          return null;
        }
        parts.push(`${JSON.stringify(key)}:${serialized}`);
      }
      return `{${parts.join(',')}}`;
    }

    return null;
  }
}
