import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  private readonly expectedClient404Paths = new Set(['/', '/favicon.ico']);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const response = ctx.getResponse<FastifyReply>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload =
      exception instanceof HttpException
        ? exception.getResponse()
        : {
            message: 'Internal server error'
          };

    const method = String(request.method ?? 'UNKNOWN');
    const requestUrl = String(request.url ?? '');
    const requestPath = requestUrl.split('?')[0];
    const requestId = String(request.id ?? 'unknown');

    if (status >= 500) {
      this.logger.error(
        `${method} ${requestUrl} -> ${status} (${requestId})`,
        exception instanceof Error ? exception.stack : String(exception)
      );
    } else if (!(status === 404 && this.expectedClient404Paths.has(requestPath))) {
      this.logger.warn(`${method} ${requestUrl} -> ${status} (${requestId})`);
    }

    response.header('x-request-id', request.id);
    response.status(status).send({
      success: false,
      error: {
        statusCode: status,
        ...(typeof payload === 'string' ? { message: payload } : (payload as Record<string, unknown>))
      },
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: request.id
    });
  }
}
