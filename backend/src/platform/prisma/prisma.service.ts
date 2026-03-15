import { INestApplication, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { MetricsService } from '../metrics/metrics.service.js';

type PrismaRole = 'read' | 'write';

type ReadConnectionStatus = {
  configured: boolean;
  healthy: boolean;
  usingWriteFallback: boolean;
  fallbackEnabled: boolean;
  lastError: string | null;
};

const WRAPPER_PROPERTIES = new Set([
  'constructor',
  'onModuleInit',
  'onModuleDestroy',
  'enableShutdownHooks',
  'readConnectionStatus'
]);

function resolveDatasourceUrl(configService: ConfigService | undefined, role: PrismaRole) {
  const preferredKey = role === 'read' ? 'database.readUrl' : 'database.writeUrl';
  const fallbackKey = role === 'read' ? 'database.writeUrl' : 'database.readUrl';
  return String(configService?.get(preferredKey) ?? configService?.get(fallbackKey) ?? '').trim();
}

abstract class BasePrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger;
  private readonly queryBudgetMs: number;
  private readonly datasourceUrl: string;
  private readonly fallbackUrl: string;
  private readonly readFallbackEnabled: boolean;
  private readonly connectionStatusState: ReadConnectionStatus;
  private fallbackClient: PrismaClient | null = null;
  private activeClient: PrismaClient;

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
    this.datasourceUrl = datasourceUrl;
    this.fallbackUrl = resolveDatasourceUrl(configService, role === 'read' ? 'write' : 'read');
    this.readFallbackEnabled = !['0', 'false', 'no', 'off'].includes(
      String(this.configService?.get('database.readFallbackEnabled') ?? 'true').toLowerCase()
    );
    this.connectionStatusState = {
      configured: role === 'read' && Boolean(this.datasourceUrl) && this.datasourceUrl !== this.fallbackUrl,
      healthy: true,
      usingWriteFallback: false,
      fallbackEnabled: this.readFallbackEnabled,
      lastError: null
    };
    this.activeClient = this;

    this.attachQueryListener(this);

    return new Proxy(this, {
      get: (target, prop, receiver) => {
        if (
          typeof prop === 'symbol' ||
          WRAPPER_PROPERTIES.has(String(prop)) ||
          Object.prototype.hasOwnProperty.call(target, prop)
        ) {
          const value = Reflect.get(target, prop, receiver);
          return typeof value === 'function' ? value.bind(target) : value;
        }

        const source = target.activeClient;
        const value = Reflect.get(source, prop, source);
        return typeof value === 'function' ? value.bind(source) : value;
      }
    }) as this;
  }

  private attachQueryListener(client: PrismaClient) {
    client.$on('query', (event) => {
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

  private createClient(url: string) {
    const client = new PrismaClient({
      datasources: url ? { db: { url } } : undefined,
      log: [{ emit: 'event', level: 'query' }]
    });
    this.attachQueryListener(client);
    return client;
  }

  private async connectClient(client: PrismaClient) {
    await client.$connect();
  }

  private disconnectPrimaryClient() {
    return PrismaClient.prototype.$disconnect.call(this) as Promise<void>;
  }

  private markHealthy() {
    this.connectionStatusState.healthy = true;
    this.connectionStatusState.usingWriteFallback = false;
    this.connectionStatusState.lastError = null;
    if (this.role === 'read') {
      this.metrics?.setDependencyCircuit('db_read_replica', false);
    }
  }

  private markFallback(error: unknown) {
    this.connectionStatusState.healthy = false;
    this.connectionStatusState.usingWriteFallback = true;
    this.connectionStatusState.lastError = error instanceof Error ? error.message : String(error);
    this.metrics?.setDependencyCircuit('db_read_replica', true);
  }

  private canFallbackToWrite() {
    if (this.role !== 'read') {
      return false;
    }
    if (!this.readFallbackEnabled) {
      return false;
    }
    if (!this.datasourceUrl || !this.fallbackUrl) {
      return false;
    }
    return this.datasourceUrl !== this.fallbackUrl;
  }

  async onModuleInit() {
    try {
      await this.connectClient(this);
      this.markHealthy();
    } catch (error) {
      if (!this.canFallbackToWrite()) {
        throw error;
      }

      this.logger.warn(
        `Read replica connect failed; falling back to primary connection: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      await this.disconnectPrimaryClient().catch(() => undefined);
      const fallbackClient = this.createClient(this.fallbackUrl);

      try {
        await this.connectClient(fallbackClient);
      } catch (fallbackError) {
        await fallbackClient.$disconnect().catch(() => undefined);
        throw fallbackError;
      }

      this.fallbackClient = fallbackClient;
      this.activeClient = fallbackClient;
      this.markFallback(error);
    }
  }

  async onModuleDestroy() {
    if (this.fallbackClient) {
      await this.fallbackClient.$disconnect();
    }
    await this.disconnectPrimaryClient().catch(() => undefined);
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }

  readConnectionStatus(): ReadConnectionStatus {
    return { ...this.connectionStatusState };
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
