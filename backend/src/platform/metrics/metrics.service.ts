import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  private readonly httpRequests: Counter<string>;
  private readonly httpDuration: Histogram<string>;
  private readonly cacheHits: Counter<string>;
  private readonly cacheMisses: Counter<string>;
  private readonly cacheWrites: Counter<string>;
  private readonly cacheErrors: Counter<string>;
  private readonly cacheWaits: Counter<string>;
  private readonly dbDuration: Histogram<string>;
  private readonly dbSlowQueries: Counter<string>;
  private readonly dependencyCircuitState: Gauge<string>;
  private readonly jobsProcessed: Counter<string>;
  private readonly jobsFailed: Counter<string>;

  constructor() {
    collectDefaultMetrics({ register: this.registry });

    this.httpRequests = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry]
    });

    this.httpDuration = new Histogram({
      name: 'http_request_duration_ms',
      help: 'HTTP request duration in milliseconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000],
      registers: [this.registry]
    });

    this.cacheHits = new Counter({
      name: 'cache_hits_total',
      help: 'Cache hits',
      labelNames: ['cache', 'layer'],
      registers: [this.registry]
    });

    this.cacheMisses = new Counter({
      name: 'cache_misses_total',
      help: 'Cache misses',
      labelNames: ['cache', 'layer'],
      registers: [this.registry]
    });

    this.cacheWrites = new Counter({
      name: 'cache_writes_total',
      help: 'Cache writes',
      labelNames: ['cache', 'layer'],
      registers: [this.registry]
    });

    this.cacheErrors = new Counter({
      name: 'cache_errors_total',
      help: 'Cache operation errors',
      labelNames: ['cache', 'layer', 'operation'],
      registers: [this.registry]
    });

    this.cacheWaits = new Counter({
      name: 'cache_waits_total',
      help: 'Cache stampede waits',
      labelNames: ['cache'],
      registers: [this.registry]
    });

    this.dbDuration = new Histogram({
      name: 'db_query_duration_ms',
      help: 'Database query duration in milliseconds',
      labelNames: ['model', 'action'],
      buckets: [1, 2, 5, 10, 25, 50, 100, 250, 500],
      registers: [this.registry]
    });

    this.dbSlowQueries = new Counter({
      name: 'db_slow_queries_total',
      help: 'Database queries exceeding the configured latency budget',
      labelNames: ['model', 'action', 'budget_ms'],
      registers: [this.registry]
    });

    this.dependencyCircuitState = new Gauge({
      name: 'dependency_circuit_state',
      help: 'Circuit breaker state for external dependencies',
      labelNames: ['dependency'],
      registers: [this.registry]
    });

    this.jobsProcessed = new Counter({
      name: 'jobs_processed_total',
      help: 'Jobs processed',
      labelNames: ['type', 'status'],
      registers: [this.registry]
    });

    this.jobsFailed = new Counter({
      name: 'jobs_failed_total',
      help: 'Jobs failed',
      labelNames: ['type'],
      registers: [this.registry]
    });
  }

  recordHttp(method: string, route: string, status: number, durationMs: number) {
    const labels = { method, route, status: String(status) };
    this.httpRequests.inc(labels);
    this.httpDuration.observe(labels, durationMs);
  }

  recordCacheHit(cache: string, layer: 'memory' | 'redis') {
    this.cacheHits.inc({ cache, layer });
  }

  recordCacheMiss(cache: string, layer: 'memory' | 'redis') {
    this.cacheMisses.inc({ cache, layer });
  }

  recordCacheWrite(cache: string, layer: 'memory' | 'redis') {
    this.cacheWrites.inc({ cache, layer });
  }

  recordCacheError(cache: string, layer: 'memory' | 'redis', operation: string) {
    this.cacheErrors.inc({ cache, layer, operation });
  }

  recordCacheWait(cache: string) {
    this.cacheWaits.inc({ cache });
  }

  recordDbQuery(model: string, action: string, durationMs: number) {
    this.dbDuration.observe({ model, action }, durationMs);
  }

  recordDbSlowQuery(model: string, action: string, durationMs: number, budgetMs: number) {
    this.dbDuration.observe({ model, action }, durationMs);
    this.dbSlowQueries.inc({ model, action, budget_ms: String(budgetMs) });
  }

  setDependencyCircuit(dependency: string, open: boolean) {
    this.dependencyCircuitState.set({ dependency }, open ? 1 : 0);
  }

  recordJobProcessed(type: string, status: 'success' | 'failed') {
    this.jobsProcessed.inc({ type, status });
    if (status === 'failed') {
      this.jobsFailed.inc({ type });
    }
  }

  async getMetrics() {
    return this.registry.metrics();
  }
}
