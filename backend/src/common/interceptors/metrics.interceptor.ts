import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MetricsService } from '../../platform/metrics/metrics.service.js';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<any>();
    const response = context.switchToHttp().getResponse<any>();
    const startedAt = process.hrtime.bigint();
    const method = request?.method ?? 'GET';
    const route = request?.routeOptions?.url ?? request?.routerPath ?? request?.url ?? 'unknown';

    return next.handle().pipe(
      finalize(() => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        const status = response?.statusCode ?? 200;
        this.metrics.recordHttp(method, route, status, Number(durationMs.toFixed(1)));
      })
    );
  }
}
