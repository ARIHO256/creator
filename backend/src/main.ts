import 'reflect-metadata';
import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common';
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

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: fastifyLogger, bodyLimit })
  );

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
      request.log.info(
        {
          requestId: request.id,
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
          durationMs: Number(durationMs.toFixed(1))
        },
        'request completed'
      );
      done();
    });
  }

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

  await app.listen(port, host);

  const logger = new Logger('Bootstrap');
  logger.log(`MyLiveDealz Creator backend listening on ${await app.getUrl()}`);
}

bootstrap();
