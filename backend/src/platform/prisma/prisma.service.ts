import { INestApplication, Injectable, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { MetricsService } from '../metrics/metrics.service.js';

type PrismaRole = 'read' | 'write';

function resolveDatasourceUrl(configService: ConfigService | undefined, role: PrismaRole) {
  const preferredKey = role === 'read' ? 'database.readUrl' : 'database.writeUrl';
  const fallbackKey = role === 'read' ? 'database.writeUrl' : 'database.readUrl';
  return String(configService?.get(preferredKey) ?? configService?.get(fallbackKey) ?? '').trim();
}

abstract class BasePrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  protected constructor(
    private readonly role: PrismaRole,
    @Optional() private readonly configService?: ConfigService,
    @Optional() private readonly metrics?: MetricsService
  ) {
    const datasourceUrl = resolveDatasourceUrl(configService, role);
    super({
      datasources: datasourceUrl ? { db: { url: datasourceUrl } } : undefined,
      log: [{ emit: 'event', level: 'query' }]
    });

    this.$on('query', (event) => {
      if (!this.metrics) return;
      const model = event.target ?? 'query';
      this.metrics.recordDbQuery(model, `${this.role}_query`, Number(event.duration ?? 0));
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}

@Injectable()
export class PrismaService extends BasePrismaService {
  constructor(
    @Optional() configService?: ConfigService,
    @Optional() metrics?: MetricsService
  ) {
    super('write', configService, metrics);
  }
}

@Injectable()
export class ReadPrismaService extends BasePrismaService {
  constructor(
    @Optional() configService?: ConfigService,
    @Optional() metrics?: MetricsService
  ) {
    super('read', configService, metrics);
  }
}
