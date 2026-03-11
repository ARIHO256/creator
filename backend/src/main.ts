import 'reflect-metadata';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor.js';
import { RequestTimeoutInterceptor } from './common/interceptors/request-timeout.interceptor.js';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor.js';
import { AuditInterceptor } from './common/interceptors/audit.interceptor.js';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor.js';
import { buildSecurityHeaders } from './platform/security-headers.js';

async function bootstrap() {
  const port = Number(process.env.PORT ?? '4010');
  const host = process.env.HOST ?? '0.0.0.0';
  const bodyLimit = Number(process.env.BODY_LIMIT_BYTES ?? `${10 * 1024 * 1024}`);
  const loadTestEnabled = ['1', 'true', 'yes', 'on'].includes(String(process.env.LOAD_TEST_MODE ?? '').toLowerCase());
  const fastifyLogger =
    !loadTestEnabled &&
    !['0', 'false', 'no', 'off'].includes(String(process.env.FASTIFY_LOGGER ?? 'true').toLowerCase());

  console.info(`[bootstrap] creating Nest app on ${host}:${port}`);

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: fastifyLogger, bodyLimit }),
    { logger: ['error', 'warn'] }
  );
  app.useLogger(['error', 'warn']);

  app.enableCors({ origin: true, credentials: true });
  app.enableShutdownHooks();
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }]
  });

  const fastify = app.getHttpAdapter().getInstance();
  const configService = app.get(ConfigService);
  const securityHeaders = buildSecurityHeaders(
    configService.get<boolean>('security.enableHeaders') ?? true
  );
  fastify.addHook('onRequest', (request: any, reply: any, done: () => void) => {
    request.requestStartedAt = process.hrtime.bigint();
    reply.header('x-request-id', request.id);
    done();
  });
  fastify.addHook(
    'onSend',
    (
      request: any,
      reply: any,
      payload: unknown,
      done: (error: Error | null, payload: unknown) => void
    ) => {
      const startedAt = request.requestStartedAt ?? process.hrtime.bigint();
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      for (const [name, value] of Object.entries(securityHeaders)) {
        reply.header(name, value);
      }
      reply.header('x-request-id', request.id);
      reply.header('x-response-time', `${durationMs.toFixed(1)}ms`);
      done(null, payload);
    }
  );
  const requestLogsEnabled =
    (configService.get<boolean>('logging.requestLogs') ?? true) && !loadTestEnabled;
  if (requestLogsEnabled) {
    fastify.addHook('onResponse', (request: any, reply: any, done: () => void) => {
      const startedAt = request.requestStartedAt ?? process.hrtime.bigint();
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const logPayload = {
        requestId: request.id,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        durationMs: Number(durationMs.toFixed(1))
      };
      if (reply.statusCode >= 500) {
        request.log.error(logPayload, 'request failed');
      } else if (reply.statusCode >= 400) {
        request.log.warn(logPayload, 'request completed with client error');
      } else {
        request.log.info(logPayload, 'request completed successfully');
      }
      done();
    });
  }
  fastify.addHook('onError', (request: any, _reply: any, error: Error, done: (err?: Error) => void) => {
    request.log.error(
      {
        requestId: request.id,
        method: request.method,
        url: request.url,
        errorName: error?.name,
        errorMessage: error?.message,
        stack: error?.stack
      },
      'request raised an unhandled error'
    );
    done();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  app.useGlobalInterceptors(
    new ApiResponseInterceptor(),
    app.get(RequestTimeoutInterceptor),
    app.get(MetricsInterceptor),
    app.get(AuditInterceptor),
    app.get(IdempotencyInterceptor)
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  console.info('[bootstrap] Nest app configured, starting HTTP listener');
  await app.listen(port, host);

  console.info(`[bootstrap] MyLiveDealz Creator backend listening on ${await app.getUrl()}`);
}

bootstrap().catch((error) => {
  console.error('[bootstrap] fatal startup error');
  console.error(error);
  process.exit(1);
});
