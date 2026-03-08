import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
  RequestTimeoutException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, TimeoutError, catchError, throwError, timeout } from 'rxjs';

@Injectable()
export class RequestTimeoutInterceptor implements NestInterceptor {
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const timeoutMs = this.configService.get<number>('app.requestTimeoutMs') ?? 15_000;

    return next.handle().pipe(
      timeout({ first: timeoutMs }),
      catchError((error) => {
        if (error instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException(`Request timed out after ${timeoutMs}ms`));
        }

        return throwError(() => error);
      })
    );
  }
}
