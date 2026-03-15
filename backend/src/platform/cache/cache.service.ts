import { Inject, Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { MetricsService } from '../metrics/metrics.service.js';

type CacheEntry = {
  value: unknown;
  expiresAt: number;
  createdAt: number;
};

@Injectable()
export class CacheService {
  private readonly store = new Map<string, CacheEntry>();
  private readonly pending = new Map<string, Promise<unknown>>();
  private readonly defaultTtlMs: number;
  private readonly maxEntries: number;
  private readonly redisPrefix: string;
  private readonly lockTtlMs: number;
  private readonly redisTimeoutMs: number;
  private readonly redisCircuitFailureThreshold: number;
  private readonly redisCircuitResetMs: number;
  private readonly logger = new Logger('CacheService');
  private redis: Redis | null = null;
  private readonly instanceId = `${process.pid}-${Math.random().toString(16).slice(2)}`;
  private readonly redisCircuit = {
    consecutiveFailures: 0,
    openUntil: 0
  };

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Optional() @Inject(MetricsService) private readonly metrics?: MetricsService
  ) {
    this.defaultTtlMs = Number(this.configService.get('cache.defaultTtlMs') ?? 15_000);
    this.maxEntries = Number(this.configService.get('cache.maxEntries') ?? 5_000);
    this.redisPrefix = String(this.configService.get('cache.redisPrefix') ?? 'mldz:cache:');
    this.lockTtlMs = Number(this.configService.get('cache.lockTtlMs') ?? 5000);
    this.redisTimeoutMs = Number(this.configService.get('cache.redisTimeoutMs') ?? 150);
    this.redisCircuitFailureThreshold = Number(
      this.configService.get('cache.redisCircuitFailureThreshold') ?? 5
    );
    this.redisCircuitResetMs = Number(this.configService.get('cache.redisCircuitResetMs') ?? 10_000);

    const redisUrl = this.configService.get<string>('cache.redisUrl');
    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 2,
        enableReadyCheck: true
      });
      this.redis.on('error', (err) => {
        this.logger.warn(`Redis error: ${err.message}`);
      });
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  private getLocal<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  private async getRemote<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;
    const raw = await this.withRedisBudget<string | null>(key, 'get', () => this.redis!.get(this.redisPrefix + key), null);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch (error: any) {
      this.metrics?.recordCacheError(this.cacheName(key), 'redis', 'parse');
      this.logger.warn(`Redis parse failed: ${error?.message ?? 'unknown error'}`);
      return null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const local = this.getLocal<T>(key);
    if (local !== null) {
      this.metrics?.recordCacheHit(this.cacheName(key), 'memory');
      return local;
    }

    const remote = await this.getRemote<T>(key);
    if (remote !== null) {
      this.metrics?.recordCacheHit(this.cacheName(key), 'redis');
      this.setLocal(key, remote, this.defaultTtlMs);
      return remote;
    }

    this.metrics?.recordCacheMiss(this.cacheName(key), 'memory');
    this.metrics?.recordCacheMiss(this.cacheName(key), 'redis');
    return null;
  }

  private setLocal<T>(key: string, value: T, ttlMs?: number) {
    const now = Date.now();
    const ttl = ttlMs ?? this.defaultTtlMs;
    this.store.set(key, { value, expiresAt: now + ttl, createdAt: now });
    this.metrics?.recordCacheWrite(this.cacheName(key), 'memory');
    this.prune();
  }

  private async setRemote<T>(key: string, value: T, ttlMs?: number) {
    if (!this.redis) return;
    const ttl = ttlMs ?? this.defaultTtlMs;
    const success = await this.withRedisBudget<boolean>(
      key,
      'set',
      async () => {
        await this.redis!.set(this.redisPrefix + key, JSON.stringify(value), 'PX', ttl);
        return true;
      },
      false
    );
    if (success) {
      this.metrics?.recordCacheWrite(this.cacheName(key), 'redis');
    }
  }

  async getOrSet<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
    const existing = await this.get<T>(key);
    if (existing !== null) return existing;
    const inflight = this.pending.get(key);
    if (inflight) return (await inflight) as T;

    if (this.redis) {
      const lockKey = `${this.redisPrefix}${key}:lock`;
      const lock = await this.withRedisBudget<string | null>(
        key,
        'lock',
        () => this.redis!.set(lockKey, this.instanceId, 'PX', this.lockTtlMs, 'NX'),
        null
      );
      if (!lock) {
        this.metrics?.recordCacheWait(this.cacheName(key));
        for (let i = 0; i < 5; i += 1) {
          await this.sleep(120);
          const cached = await this.getRemote<T>(key);
          if (cached !== null) {
            this.setLocal(key, cached, ttlMs);
            return cached;
          }
        }
      }
    }

    const promise = loader()
      .then((value) => {
        this.setLocal(key, value, ttlMs);
        void this.setRemote(key, value, ttlMs);
        return value;
      })
      .finally(() => {
        this.pending.delete(key);
      });

    this.pending.set(key, promise);
    return promise;
  }

  async invalidate(key: string) {
    this.store.delete(key);
    if (!this.redis) return;
    await this.withRedisBudget(key, 'invalidate', () => this.redis!.del(this.redisPrefix + key), 0);
  }

  async invalidatePrefix(prefix: string) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
    if (!this.redis) return;
    const match = `${this.redisPrefix}${prefix}*`;
    await this.withRedisBudget(
      prefix,
      'invalidate_prefix',
      async () => {
        let cursor = '0';
        do {
          const [nextCursor, keys] = await this.redis!.scan(cursor, 'MATCH', match, 'COUNT', 200);
          cursor = nextCursor;
          if (keys.length) {
            await this.redis!.del(...keys);
          }
        } while (cursor !== '0');
      },
      undefined
    );
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private cacheName(key: string) {
    return key.split(':')[0] || 'cache';
  }

  private async withRedisBudget<T>(key: string, operation: string, loader: () => Promise<T>, fallback: T): Promise<T> {
    if (!this.redis) {
      return fallback;
    }

    const now = Date.now();
    if (this.redisCircuit.openUntil > now) {
      this.metrics?.setDependencyCircuit('redis', true);
      return fallback;
    }

    try {
      const result = await Promise.race([
        loader(),
        this.sleep(this.redisTimeoutMs).then(() => {
          throw new Error(`timed out after ${this.redisTimeoutMs}ms`);
        })
      ]);
      this.redisCircuit.consecutiveFailures = 0;
      this.redisCircuit.openUntil = 0;
      this.metrics?.setDependencyCircuit('redis', false);
      return result as T;
    } catch (error: any) {
      this.redisCircuit.consecutiveFailures += 1;
      if (this.redisCircuit.consecutiveFailures >= this.redisCircuitFailureThreshold) {
        this.redisCircuit.openUntil = Date.now() + this.redisCircuitResetMs;
        this.metrics?.setDependencyCircuit('redis', true);
      }
      this.metrics?.recordCacheError(this.cacheName(key), 'redis', operation);
      this.logger.warn(`Redis ${operation} failed: ${error?.message ?? 'unknown error'}`);
      return fallback;
    }
  }

  private prune() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }

    if (this.store.size <= this.maxEntries) return;

    const entries = Array.from(this.store.entries()).sort((a, b) => a[1].createdAt - b[1].createdAt);
    const excess = this.store.size - this.maxEntries;
    for (let i = 0; i < excess; i += 1) {
      this.store.delete(entries[i][0]);
    }
  }
}
