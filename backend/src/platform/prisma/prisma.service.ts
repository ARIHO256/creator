import { INestApplication, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
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
  private readonly logger: Logger;
  private readonly queryBudgetMs: number;

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
    this.logger = new Logger(role === 'read' ? 'ReadPrismaService' : 'PrismaService');
    this.queryBudgetMs = Number(this.configService?.get('database.queryBudgetMs') ?? 75);

    this.$on('query', (event) => {
      const model = event.target ?? 'query';
      const action = `${this.role}_query`;
      const durationMs = Number(event.duration ?? 0);
      this.metrics?.recordDbQuery(model, action, durationMs);
      if (durationMs > this.queryBudgetMs) {
        this.metrics?.recordDbSlowQuery(model, action, durationMs, this.queryBudgetMs);
        this.logger.warn(`${action} exceeded ${this.queryBudgetMs}ms budget on ${model}: ${durationMs}ms`);
      }
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
