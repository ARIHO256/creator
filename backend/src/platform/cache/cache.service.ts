import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

  constructor(private readonly configService: ConfigService) {
    this.defaultTtlMs = Number(this.configService.get('cache.defaultTtlMs') ?? 15_000);
    this.maxEntries = Number(this.configService.get('cache.maxEntries') ?? 5_000);
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number) {
    const now = Date.now();
    const ttl = ttlMs ?? this.defaultTtlMs;
    this.store.set(key, { value, expiresAt: now + ttl, createdAt: now });
    this.prune();
  }

  async getOrSet<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
    const existing = this.get<T>(key);
    if (existing !== null) return existing;
    const inflight = this.pending.get(key);
    if (inflight) return (await inflight) as T;

    const promise = loader()
      .then((value) => {
        this.set(key, value, ttlMs);
        return value;
      })
      .finally(() => {
        this.pending.delete(key);
      });

    this.pending.set(key, promise);
    return promise;
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
