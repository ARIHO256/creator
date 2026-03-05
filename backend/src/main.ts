import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const port = Number(process.env.PORT ?? '4010');
  const host = process.env.HOST ?? '0.0.0.0';

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false })
  );

  app.enableCors({ origin: true, credentials: true });
  app.enableShutdownHooks();

  await app.listen(port, host);

  const logger = new Logger('Bootstrap');
  logger.log(`MyLiveDealz Creator backend listening on ${await app.getUrl()}`);
  logger.log('Seed login: creator@mylivedealz.com / Password123!');
}

bootstrap();
