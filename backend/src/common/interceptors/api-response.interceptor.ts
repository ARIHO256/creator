import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<any>();
    const route = request?.routeOptions?.url ?? request?.routerPath ?? request?.url ?? '';
    const skipEnvelope = route.includes('/metrics');
    return next.handle().pipe(
      map((data) => {
        if (skipEnvelope) {
          return data;
        }
        if (data && typeof data === 'object' && 'success' in (data as Record<string, unknown>)) {
          return data;
        }
        return {
          success: true,
          data,
          timestamp: new Date().toISOString()
        };
      })
    );
  }
}
