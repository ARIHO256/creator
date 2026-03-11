import { Injectable, NotFoundException } from '@nestjs/common';
import { AppRecord, Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

const SELLERFRONT_LIVE_RECORD_ID = 'sellerfront_mockdb_live';
const SELLERFRONT_SEED_RECORD_ID = 'sellerfront_mockdb_seed';
const asJson = (value: Record<string, unknown>) => value as unknown as Prisma.InputJsonValue;
const sanitize = (value: string) => value.replace(/[^a-zA-Z0-9:_-]+/g, '_');
type StorageType = 'local' | 'session';

@Injectable()
export class SellerfrontService {
  constructor(private readonly prisma: PrismaService) {}

  async getBootstrap(userId: string | null) {
    const [modules, pageContent, local, session] = await Promise.all([
      this.collectModules(userId),
      this.collectPageContent(userId),
      this.collectStorage('local', userId),
      this.collectStorage('session', userId)
    ]);

    return {
      app: 'sellerfront',
      modules,
      pageContent,
      storage: {
        local,
        session
      }
    };
  }

  private async withSeededModules(payload: unknown) {
    const snapshot =
      payload && typeof payload === 'object'
        ? ({ ...(payload as Record<string, unknown>) } as Record<string, unknown>)
        : {};

    const records = await this.prisma.appRecord.findMany({
      where: {
        domain: 'frontend_state_module',
        entityType: 'sellerfront',
        userId: null
      },
      select: {
        entityId: true,
        payload: true
      }
    });

    const modules = {
      ...((snapshot.modules as Record<string, unknown> | undefined) ?? {})
    };

    for (const record of records) {
      if (!record.entityId) continue;
      modules[record.entityId] = record.payload;
    }

    snapshot.modules = modules;
    return snapshot;
  }

  async getMockDb() {
    const live = await this.prisma.appRecord.findUnique({
      where: { id: SELLERFRONT_LIVE_RECORD_ID }
    });

    if (live?.payload) {
      return this.withSeededModules(live.payload);
    }

    const seed = await this.prisma.appRecord.findUnique({
      where: { id: SELLERFRONT_SEED_RECORD_ID }
    });

    if (!seed?.payload) {
      throw new NotFoundException('Sellerfront mock database has not been imported yet');
    }

    const payload = await this.withSeededModules(seed.payload);

    await this.prisma.appRecord.upsert({
      where: { id: SELLERFRONT_LIVE_RECORD_ID },
      update: { payload: asJson(payload) },
      create: {
        id: SELLERFRONT_LIVE_RECORD_ID,
        domain: 'sellerfront',
        entityType: 'mock_db',
        entityId: 'live',
        payload: asJson(payload)
      }
    });

    return payload;
  }

  async getModule(key: string) {
    const userRecord = await this.prisma.appRecord.findFirst({
      where: {
        domain: 'frontend_state_module',
        entityType: 'sellerfront',
        entityId: key,
        userId: { not: null }
      },
      orderBy: { updatedAt: 'desc' }
    });

    if (userRecord?.payload !== undefined) {
      return userRecord.payload;
    }

    const record = await this.prisma.appRecord.findUnique({
      where: { id: this.moduleRecordId(key) }
    });

    return record?.payload ?? null;
  }

  async getStorage(storageType: StorageType, userId: string | null) {
    return this.collectStorage(storageType, userId);
  }

  async getPageContent(pageKey: string, role: string, userId: string | null) {
    const userRecord = userId
      ? await this.prisma.appRecord.findFirst({
          where: {
            domain: 'sellerfront_page_content',
            entityType: pageKey,
            entityId: role,
            userId
          },
          orderBy: { updatedAt: 'desc' }
        })
      : null;

    if (userRecord?.payload !== undefined) {
      return userRecord.payload;
    }

    const globalRecord = await this.prisma.appRecord.findFirst({
      where: {
        domain: 'sellerfront_page_content',
        entityType: pageKey,
        entityId: role,
        userId: null
      },
      orderBy: { updatedAt: 'desc' }
    });

    return globalRecord?.payload ?? null;
  }

  async upsertModule(userId: string | null, key: string, payload: unknown) {
    const record = await this.prisma.appRecord.upsert({
      where: { id: this.moduleRecordId(key, userId ?? undefined) },
      update: {
        ...(userId ? { userId } : {}),
        payload: payload as Prisma.InputJsonValue
      },
      create: {
        id: this.moduleRecordId(key, userId ?? undefined),
        ...(userId ? { userId } : {}),
        domain: 'frontend_state_module',
        entityType: 'sellerfront',
        entityId: key,
        payload: payload as Prisma.InputJsonValue
      }
    });

    return record.payload;
  }

  async upsertPageContent(userId: string | null, pageKey: string, role: string, payload: unknown) {
    const record = await this.prisma.appRecord.upsert({
      where: { id: this.pageContentRecordId(pageKey, role, userId ?? undefined) },
      update: {
        ...(userId ? { userId } : {}),
        domain: 'sellerfront_page_content',
        entityType: pageKey,
        entityId: role,
        payload: payload as Prisma.InputJsonValue
      },
      create: {
        id: this.pageContentRecordId(pageKey, role, userId ?? undefined),
        ...(userId ? { userId } : {}),
        domain: 'sellerfront_page_content',
        entityType: pageKey,
        entityId: role,
        payload: payload as Prisma.InputJsonValue
      }
    });

    return record.payload;
  }

  async upsertStorageEntries(
    userId: string | null,
    storageType: StorageType,
    entries: Record<string, string | null>
  ) {
    const output: Record<string, string | null> = {};

    for (const [key, value] of Object.entries(entries)) {
      if (value === null) {
        await this.prisma.appRecord.deleteMany({
          where: { id: this.storageRecordId(storageType, key, userId ?? undefined) }
        });
        output[key] = null;
        continue;
      }

      const record = await this.prisma.appRecord.upsert({
        where: { id: this.storageRecordId(storageType, key, userId ?? undefined) },
        update: {
          ...(userId ? { userId } : {}),
          payload: { value } as Prisma.InputJsonValue
        },
        create: {
          id: this.storageRecordId(storageType, key, userId ?? undefined),
          ...(userId ? { userId } : {}),
          domain: 'frontend_state_storage',
          entityType: `sellerfront:${storageType}`,
          entityId: key,
          payload: { value } as Prisma.InputJsonValue
        }
      });

      output[key] = this.readStorageRecord(record);
    }

    return output;
  }

  async updateMockDb(userId: string | null, payload: Record<string, unknown>) {
    const jsonPayload = asJson(payload);
    const record = await this.prisma.appRecord.upsert({
      where: { id: SELLERFRONT_LIVE_RECORD_ID },
      update: {
        ...(userId ? { userId } : {}),
        payload: jsonPayload
      },
      create: {
        id: SELLERFRONT_LIVE_RECORD_ID,
        domain: 'sellerfront',
        entityType: 'mock_db',
        entityId: 'live',
        ...(userId ? { userId } : {}),
        payload: jsonPayload
      }
    });

    return record.payload;
  }

  async resetMockDb(userId: string) {
    const seed = await this.prisma.appRecord.findUnique({
      where: { id: SELLERFRONT_SEED_RECORD_ID }
    });

    if (!seed?.payload) {
      throw new NotFoundException('Sellerfront seed snapshot is not available');
    }

    const record = await this.prisma.appRecord.upsert({
      where: { id: SELLERFRONT_LIVE_RECORD_ID },
      update: {
        userId,
        payload: seed.payload
      },
      create: {
        id: SELLERFRONT_LIVE_RECORD_ID,
        userId,
        domain: 'sellerfront',
        entityType: 'mock_db',
        entityId: 'live',
        payload: seed.payload
      }
    });

    return record.payload;
  }

  private moduleRecordId(key: string, userId?: string) {
    return userId
      ? `frontend_state_module_sellerfront_${sanitize(key)}_${sanitize(userId)}`
      : `frontend_state_module_sellerfront_${sanitize(key)}_global`;
  }

  private pageContentRecordId(pageKey: string, role: string, userId?: string) {
    return userId
      ? `sellerfront_page_${sanitize(pageKey)}_${sanitize(role)}_${sanitize(userId)}`
      : `sellerfront_page_${sanitize(pageKey)}_${sanitize(role)}`;
  }

  private storageRecordId(storageType: StorageType, key: string, userId?: string) {
    return userId
      ? `frontend_state_storage_sellerfront_${storageType}_${sanitize(key)}_${sanitize(userId)}`
      : `frontend_state_storage_sellerfront_${storageType}_${sanitize(key)}_global`;
  }

  private async collectModules(userId: string | null) {
    const [globalRecords, userRecords] = await Promise.all([
      this.prisma.appRecord.findMany({
        where: {
          domain: 'frontend_state_module',
          entityType: 'sellerfront',
          userId: null
        }
      }),
      userId
        ? this.prisma.appRecord.findMany({
            where: {
              domain: 'frontend_state_module',
              entityType: 'sellerfront',
              userId
            }
          })
        : Promise.resolve([])
    ]);

    return [...globalRecords, ...userRecords].reduce<Record<string, unknown>>((acc, record) => {
      if (record.entityId) {
        acc[record.entityId] = record.payload;
      }
      return acc;
    }, {});
  }

  private async collectPageContent(userId: string | null) {
    const [globalRecords, userRecords] = await Promise.all([
      this.prisma.appRecord.findMany({
        where: {
          domain: 'sellerfront_page_content',
          userId: null
        }
      }),
      userId
        ? this.prisma.appRecord.findMany({
            where: {
              domain: 'sellerfront_page_content',
              userId
            }
          })
        : Promise.resolve([])
    ]);

    return [...globalRecords, ...userRecords].reduce<Record<string, Record<string, unknown>>>((acc, record) => {
      if (!record.entityType || !record.entityId) return acc;
      acc[record.entityType] = {
        ...(acc[record.entityType] || {}),
        [record.entityId]: record.payload
      };
      return acc;
    }, {});
  }

  private async collectStorage(storageType: StorageType, userId: string | null) {
    const [globalRecords, userRecords] = await Promise.all([
      this.prisma.appRecord.findMany({
        where: {
          domain: 'frontend_state_storage',
          entityType: `sellerfront:${storageType}`,
          userId: null
        }
      }),
      userId
        ? this.prisma.appRecord.findMany({
            where: {
              domain: 'frontend_state_storage',
              entityType: `sellerfront:${storageType}`,
              userId
            }
          })
        : Promise.resolve([])
    ]);

    return [...globalRecords, ...userRecords].reduce<Record<string, string>>((acc, record) => {
      if (!record.entityId) return acc;
      const value = this.readStorageRecord(record);
      if (value !== null) {
        acc[record.entityId] = value;
      }
      return acc;
    }, {});
  }

  private readStorageRecord(record: AppRecord) {
    const payload = record.payload as { value?: unknown } | null;
    return typeof payload?.value === 'string' ? payload.value : null;
  }
}
