import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

const SELLERFRONT_LIVE_RECORD_ID = 'sellerfront_mockdb_live';
const SELLERFRONT_SEED_RECORD_ID = 'sellerfront_mockdb_seed';
const asJson = (value: Record<string, unknown>) => value as unknown as Prisma.InputJsonValue;
const sanitize = (value: string) => value.replace(/[^a-zA-Z0-9:_-]+/g, '_');

@Injectable()
export class SellerfrontService {
  constructor(private readonly prisma: PrismaService) {}

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
}
