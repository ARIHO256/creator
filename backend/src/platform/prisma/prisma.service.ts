import { INestApplication, Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { MetricsService } from '../metrics/metrics.service.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(@Optional() private readonly metrics?: MetricsService) {
    super();
    this.$use(async (params, next) => {
      const startedAt = process.hrtime.bigint();
      const result = await next(params);
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      if (this.metrics) {
        const model = params.model ?? 'raw';
        const action = params.action ?? 'query';
        this.metrics.recordDbQuery(model, action, Number(durationMs.toFixed(2)));
      }
      return result;
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
