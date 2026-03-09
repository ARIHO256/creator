import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';

type AppRecordListOptions = {
  skip?: number;
  take?: number;
};

type AppRecordBulkUpdate = {
  entityId: string;
  payload: unknown;
};

@Injectable()
export class AppRecordsService {
  private readonly cache = new Map<string, { expiresAt: number; value: unknown }>();
  private readonly ttlMs = 5000;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  list(domain: string, entityType: string, userId?: string | null, options?: AppRecordListOptions) {
    const cacheKey = this.listCacheKey(domain, entityType, userId, options);

    return this.fromCache(cacheKey, () =>
      this.prisma.appRecord.findMany({
        where: { domain, entityType, userId: userId ?? undefined },
        orderBy: { updatedAt: 'desc' },
        skip: options?.skip,
        take: options?.take
      })
    );
  }

  async getByEntityId(domain: string, entityType: string, entityId: string, userId?: string | null) {
    const cacheKey = this.entityCacheKey(domain, entityType, entityId, userId);
    const record = await this.fromCache(cacheKey, () =>
      this.prisma.appRecord.findFirst({
        where: { domain, entityType, entityId, userId: userId ?? undefined }
      })
    );

    if (!record) {
      throw new NotFoundException(`${domain}/${entityType}/${entityId} not found`);
    }

    return record;
  }

  async create(domain: string, entityType: string, payload: unknown, entityId?: string, userId?: string | null) {
    const created = await this.prisma.appRecord.create({
      data: {
        domain,
        entityType,
        entityId: entityId ?? null,
        userId: userId ?? null,
        payload: payload as any
      }
    });

    this.invalidate(domain, entityType, entityId);
    return created;
  }

  async update(domain: string, entityType: string, entityId: string, payload: unknown, userId?: string | null) {
    const current = await this.getByEntityId(domain, entityType, entityId, userId);
    const updated = await this.prisma.appRecord.update({
      where: { id: current.id },
      data: { payload: payload as any }
    });

    this.invalidate(domain, entityType, entityId);
    return updated;
  }

  async upsert(domain: string, entityType: string, entityId: string, payload: unknown, userId?: string | null) {
    const existing = await this.prisma.appRecord.findFirst({
      where: { domain, entityType, entityId, userId: userId ?? undefined }
    });

    if (!existing) {
      return this.create(domain, entityType, payload, entityId, userId);
    }

    const updated = await this.prisma.appRecord.update({
      where: { id: existing.id },
      data: { payload: payload as any }
    });

    this.invalidate(domain, entityType, entityId);
    return updated;
  }

  async remove(domain: string, entityType: string, entityId: string, userId?: string | null) {
    const existing = await this.getByEntityId(domain, entityType, entityId, userId);
    await this.prisma.appRecord.delete({ where: { id: existing.id } });
    this.invalidate(domain, entityType, entityId);
    return { deleted: true };
  }

  async removeMany(domain: string, entityType: string, userId?: string | null, entityIds?: string[]) {
    const result = await this.prisma.appRecord.deleteMany({
      where: {
        domain,
        entityType,
        userId: userId ?? undefined,
        entityId: entityIds?.length ? { in: entityIds } : undefined
      }
    });

    this.invalidate(domain, entityType);
    return { deleted: result.count };
  }

  async updateMany(domain: string, entityType: string, updates: AppRecordBulkUpdate[], userId?: string | null) {
    if (updates.length === 0) {
      return { updated: 0 };
    }

    const existing = await this.prisma.appRecord.findMany({
      where: {
        domain,
        entityType,
        userId: userId ?? undefined,
        entityId: { in: updates.map((update) => update.entityId) }
      }
    });

    const recordsByEntityId = new Map(existing.map((record) => [record.entityId, record]));
    const operations = updates.flatMap((update) => {
      const record = recordsByEntityId.get(update.entityId);
      if (!record) {
        return [];
      }

      return [
        this.prisma.appRecord.update({
          where: { id: record.id },
          data: { payload: update.payload as any }
        })
      ];
    });

    if (operations.length === 0) {
      return { updated: 0 };
    }

    await this.prisma.$transaction(operations);
    this.invalidate(domain, entityType);
    return { updated: operations.length };
  }

  private fromCache<T>(key: string, loader: () => Promise<T>) {
    const current = this.cache.get(key);
    if (current && current.expiresAt > Date.now()) {
      return Promise.resolve(current.value as T);
    }

    return loader().then((value) => {
      this.cache.set(key, {
        value,
        expiresAt: Date.now() + this.ttlMs
      });
      return value;
    });
  }

  private listCacheKey(domain: string, entityType: string, userId?: string | null, options?: AppRecordListOptions) {
    return `list|${domain}|${entityType}|${userId ?? '*'}|${options?.skip ?? 0}|${options?.take ?? '*'}`;
  }

  private entityCacheKey(domain: string, entityType: string, entityId: string, userId?: string | null) {
    return `entity|${domain}|${entityType}|${entityId}|${userId ?? '*'}`;
  }

  private invalidate(domain: string, entityType: string, entityId?: string) {
    const listPrefix = `list|${domain}|${entityType}|`;
    const entityPrefix = entityId
      ? `entity|${domain}|${entityType}|${entityId}|`
      : `entity|${domain}|${entityType}|`;

    for (const key of this.cache.keys()) {
      if (key.startsWith(listPrefix) || key.startsWith(entityPrefix)) {
        this.cache.delete(key);
      }
    }
  }
}
