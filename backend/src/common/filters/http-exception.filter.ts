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

    this.logger.error(
      `${request.method} ${request.url} -> ${status} (${request.id})`,
      exception instanceof Error ? exception.stack : String(exception)
    );

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
