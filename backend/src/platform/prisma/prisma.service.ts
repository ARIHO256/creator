import { INestApplication, Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { MetricsService } from '../metrics/metrics.service.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(@Optional() private readonly metrics?: MetricsService) {
    super({
      log: [{ emit: 'event', level: 'query' }]
    });
    this.$on('query', (event) => {
      if (!this.metrics) return;
      const model = event.target ?? 'query';
      this.metrics.recordDbQuery(model, 'query', Number(event.duration ?? 0));
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
