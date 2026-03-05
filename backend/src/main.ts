import 'reflect-metadata';
import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor.js';

async function bootstrap() {
  const port = Number(process.env.PORT ?? '4010');
  const host = process.env.HOST ?? '0.0.0.0';

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true })
  );

  app.enableCors({ origin: true, credentials: true });
  app.enableShutdownHooks();
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }]
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(port, host);

  const logger = new Logger('Bootstrap');
  logger.log(`MyLiveDealz Creator backend listening on ${await app.getUrl()}`);
}

bootstrap();
