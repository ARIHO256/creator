import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { AuditService } from '../../platform/audit/audit.service.js';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<any>();
    const response = context.switchToHttp().getResponse<any>();
    const method = String(request?.method ?? 'GET').toUpperCase();
    const route = request?.routeOptions?.url ?? request?.routerPath ?? request?.url ?? 'unknown';

    const shouldAudit = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    if (!shouldAudit) {
      return next.handle();
    }

    const user = request?.user ?? {};
    const params = request?.params ?? {};
    const entityId = typeof params.id === 'string' ? params.id : null;

    return next.handle().pipe(
      finalize(() => {
        const statusCode = response?.statusCode ?? 200;
        const action = `${method} ${route}`;
        const entityType = this.inferEntityType(route);
        void this.audit.log({
          userId: user?.sub ?? user?.id ?? null,
          role: user?.role ?? null,
          action,
          entityType,
          entityId,
          route,
          method,
          statusCode,
          requestId: request?.id ?? null,
          ip: request?.ip ?? request?.headers?.['x-forwarded-for'] ?? null,
          userAgent: request?.headers?.['user-agent'] ?? null
        }).catch((error) => {
          this.logger.warn(
            `Audit logging failed for ${method} ${route}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        });
      })
    );
  }

  private inferEntityType(route: string): string | null {
    if (!route) return null;
    const clean = route.split('?')[0].replace(/^\/+/, '');
    const segments = clean.split('/').filter(Boolean);
    if (segments[0] === 'api') segments.shift();
    if (segments.length === 0) return null;
    if (segments.length >= 2 && segments[1].startsWith(':')) {
      return segments[0];
    }
    if (segments.length >= 2 && segments[0] === 'seller') {
      return segments[1];
    }
    return segments[0];
  }
}
