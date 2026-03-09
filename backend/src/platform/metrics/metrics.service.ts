import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  private readonly httpRequests: Counter<string>;
  private readonly httpDuration: Histogram<string>;
  private readonly cacheHits: Counter<string>;
  private readonly cacheMisses: Counter<string>;
  private readonly dbDuration: Histogram<string>;
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

    this.dbDuration = new Histogram({
      name: 'db_query_duration_ms',
      help: 'Database query duration in milliseconds',
      labelNames: ['model', 'action'],
      buckets: [1, 2, 5, 10, 25, 50, 100, 250, 500],
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

  recordDbQuery(model: string, action: string, durationMs: number) {
    this.dbDuration.observe({ model, action }, durationMs);
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
