import { Injectable } from '@nestjs/common';
import { Prisma, type AppRecord } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

type StorageType = 'local' | 'session';

const asJson = (value: unknown) => value as Prisma.InputJsonValue;
const sanitize = (value: string) => value.replace(/[^a-zA-Z0-9:_-]+/g, '_');

@Injectable()
export class FrontendStateService {
  constructor(private readonly prisma: PrismaService) {}

  async getBootstrap(app: string, userId: string) {
    const [globalRecords, userRecords] = await Promise.all([
      this.prisma.appRecord.findMany({
        where: {
          userId: null,
          OR: [
            { domain: 'frontend_state_module', entityType: app },
            { domain: 'frontend_state_storage', entityType: `${app}:local` },
            { domain: 'frontend_state_storage', entityType: `${app}:session` }
          ]
        }
      }),
      this.prisma.appRecord.findMany({
        where: {
          userId,
          OR: [
            { domain: 'frontend_state_module', entityType: app },
            { domain: 'frontend_state_storage', entityType: `${app}:local` },
            { domain: 'frontend_state_storage', entityType: `${app}:session` }
          ]
        }
      })
    ]);

    const modules = this.collectModules(app, [...globalRecords, ...userRecords]);
    const localStorage = this.collectStorage(app, 'local', [...globalRecords, ...userRecords]);
    const sessionStorage = this.collectStorage(app, 'session', [...globalRecords, ...userRecords]);

    return {
      app,
      modules,
      storage: {
        local: localStorage,
        session: sessionStorage
      }
    };
  }

  async getModule(app: string, key: string, userId: string) {
    const [userRecord, globalRecord] = await Promise.all([
      this.prisma.appRecord.findUnique({
        where: { id: this.moduleRecordId(app, key, userId) }
      }),
      this.prisma.appRecord.findUnique({
        where: { id: this.moduleRecordId(app, key) }
      })
    ]);

    return userRecord?.payload ?? globalRecord?.payload ?? null;
  }

  async upsertModule(app: string, key: string, payload: unknown, userId: string) {
    const record = await this.prisma.appRecord.upsert({
      where: { id: this.moduleRecordId(app, key, userId) },
      update: {
        userId,
        payload: asJson(payload)
      },
      create: {
        id: this.moduleRecordId(app, key, userId),
        userId,
        domain: 'frontend_state_module',
        entityType: app,
        entityId: key,
        payload: asJson(payload)
      }
    });

    return record.payload;
  }

  async upsertModules(app: string, modules: Record<string, unknown>, userId: string) {
    const entries = Object.entries(modules);
    const payload = {} as Record<string, unknown>;

    for (const [key, value] of entries) {
      payload[key] = await this.upsertModule(app, key, value, userId);
    }

    return payload;
  }

  async getStorage(app: string, storageType: StorageType, userId: string) {
    const [globalRecords, userRecords] = await Promise.all([
      this.prisma.appRecord.findMany({
        where: {
          userId: null,
          domain: 'frontend_state_storage',
          entityType: `${app}:${storageType}`
        }
      }),
      this.prisma.appRecord.findMany({
        where: {
          userId,
          domain: 'frontend_state_storage',
          entityType: `${app}:${storageType}`
        }
      })
    ]);

    return this.collectStorage(app, storageType, [...globalRecords, ...userRecords]);
  }

  async upsertStorageEntries(
    app: string,
    storageType: StorageType,
    entries: Record<string, string | null>,
    userId: string
  ) {
    const output: Record<string, string | null> = {};

    for (const [key, value] of Object.entries(entries)) {
      if (value === null) {
        await this.prisma.appRecord.deleteMany({
          where: {
            id: this.storageRecordId(app, storageType, key, userId)
          }
        });
        output[key] = null;
        continue;
      }

      const record = await this.prisma.appRecord.upsert({
        where: { id: this.storageRecordId(app, storageType, key, userId) },
        update: {
          userId,
          payload: asJson({ value })
        },
        create: {
          id: this.storageRecordId(app, storageType, key, userId),
          userId,
          domain: 'frontend_state_storage',
          entityType: `${app}:${storageType}`,
          entityId: key,
          payload: asJson({ value })
        }
      });

      output[key] = this.readStorageRecord(record);
    }

    return output;
  }

  async seedModule(app: string, key: string, payload: unknown) {
    await this.prisma.appRecord.upsert({
      where: { id: this.moduleRecordId(app, key) },
      update: {
        domain: 'frontend_state_module',
        entityType: app,
        entityId: key,
        payload: asJson(payload)
      },
      create: {
        id: this.moduleRecordId(app, key),
        domain: 'frontend_state_module',
        entityType: app,
        entityId: key,
        payload: asJson(payload)
      }
    });
  }

  private collectModules(app: string, records: AppRecord[]) {
    return records
      .filter((record) => record.domain === 'frontend_state_module' && record.entityType === app)
      .reduce<Record<string, unknown>>((acc, record) => {
        if (!record.entityId) return acc;
        acc[record.entityId] = record.payload;
        return acc;
      }, {});
  }

  private collectStorage(app: string, storageType: StorageType, records: AppRecord[]) {
    return records
      .filter(
        (record) =>
          record.domain === 'frontend_state_storage' && record.entityType === `${app}:${storageType}`
      )
      .reduce<Record<string, string>>((acc, record) => {
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

  private moduleRecordId(app: string, key: string, userId?: string) {
    return userId
      ? `frontend_state_module_${sanitize(app)}_${sanitize(key)}_${sanitize(userId)}`
      : `frontend_state_module_${sanitize(app)}_${sanitize(key)}_global`;
  }

  private storageRecordId(app: string, storageType: StorageType, key: string, userId?: string) {
    return userId
      ? `frontend_state_storage_${sanitize(app)}_${storageType}_${sanitize(key)}_${sanitize(userId)}`
      : `frontend_state_storage_${sanitize(app)}_${storageType}_${sanitize(key)}_global`;
  }
}
