import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

const SELLERFRONT_LIVE_RECORD_ID = 'sellerfront_mockdb_live';
const SELLERFRONT_SEED_RECORD_ID = 'sellerfront_mockdb_seed';
const asJson = (value: Record<string, unknown>) => value as unknown as Prisma.InputJsonValue;

@Injectable()
export class SellerfrontService {
  constructor(private readonly prisma: PrismaService) {}

  async getMockDb() {
    const live = await this.prisma.appRecord.findUnique({
      where: { id: SELLERFRONT_LIVE_RECORD_ID }
    });

    if (live?.payload) {
      return live.payload;
    }

    const seed = await this.prisma.appRecord.findUnique({
      where: { id: SELLERFRONT_SEED_RECORD_ID }
    });

    if (!seed?.payload) {
      throw new NotFoundException('Sellerfront mock database has not been imported yet');
    }

    await this.prisma.appRecord.upsert({
      where: { id: SELLERFRONT_LIVE_RECORD_ID },
      update: { payload: seed.payload },
      create: {
        id: SELLERFRONT_LIVE_RECORD_ID,
        domain: 'sellerfront',
        entityType: 'mock_db',
        entityId: 'live',
        payload: seed.payload
      }
    });

    return seed.payload;
  }

  async updateMockDb(userId: string, payload: Record<string, unknown>) {
    const jsonPayload = asJson(payload);
    const record = await this.prisma.appRecord.upsert({
      where: { id: SELLERFRONT_LIVE_RECORD_ID },
      update: {
        userId,
        payload: jsonPayload
      },
      create: {
        id: SELLERFRONT_LIVE_RECORD_ID,
        userId,
        domain: 'sellerfront',
        entityType: 'mock_db',
        entityId: 'live',
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
}
