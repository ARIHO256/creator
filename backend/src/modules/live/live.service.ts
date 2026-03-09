import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { PayloadSanitizerOptions, normalizeIdentifier, sanitizePayload } from '../../common/sanitizers/payload-sanitizer.js';

@Injectable()
export class LiveService {
  constructor(private readonly prisma: PrismaService) {}

  // builder
  async builder(id: string, userId: string) {
    const record = await this.getRecord(userId, 'builder', id);
    if (!record) {
      throw new NotFoundException('Builder not found');
    }
    return record.payload;
  }
  saveBuilder(userId: string, payload: any) {
    const sanitized = this.ensureObjectPayload(payload);
    const id = normalizeIdentifier(sanitized.sessionId ?? sanitized.id, randomUUID());
    return this.upsertRecord(userId, 'live', 'builder', id, sanitized);
  }
  async publishBuilder(userId: string, id: string, payload: any) {
    const rec = await this.getRecord(userId, 'builder', id);
    if (!rec) {
      throw new NotFoundException('Builder not found');
    }
    const sanitized = this.ensureObjectPayload(payload);
    return this.updateRecord(userId, 'live', 'builder', id, {
      ...(rec.payload as any),
      ...sanitized,
      published: true
    });
  }

  async campaignGiveaways(campaignId: string) {
    const records = await this.prisma.liveRecord.findMany({
      where: { recordType: 'campaign_giveaway', recordKey: campaignId },
      orderBy: { updatedAt: 'desc' }
    });
    return records.map((record) => record.payload);
  }

  async sessions(userId: string) {
    const records = await this.listRecords(userId, 'session');
    return records.map((record) => ({ id: record.recordKey, ...(record.payload as any) }));
  }
  async session(userId: string, id: string) {
    const record = await this.getRecord(userId, 'session', id);
    if (!record) {
      throw new NotFoundException('Session not found');
    }
    return { id: record.recordKey, ...(record.payload as any) };
  }
  createSession(userId: string, body: any) {
    const sanitized = this.ensureObjectPayload(body);
    const id = normalizeIdentifier(sanitized.id, randomUUID());
    return this.createRecord(userId, 'live', 'session', id, sanitized);
  }
  updateSession(userId: string, id: string, body: any) {
    const sanitized = this.ensureObjectPayload(body);
    return this.updateRecord(userId, 'live', 'session', id, sanitized);
  }

  async studio(userId: string, id: string) {
    const record = await this.prisma.liveRecord.upsert({
      where: { userId_recordType_recordKey: { userId, recordType: 'studio', recordKey: id } },
      update: {},
      create: {
        userId,
        recordType: 'studio',
        recordKey: id,
        payload: { mode: 'builder', sessionId: id } as Prisma.InputJsonValue
      }
    });
    return record.payload;
  }

  async startStudio(userId: string, id: string) {
    const rec = await this.studio(userId, id);
    return this.upsertRecord(userId, 'live', 'studio', id, {
      ...(rec as any),
      status: 'live',
      startedAt: new Date().toISOString()
    });
  }

  async endStudio(userId: string, id: string) {
    const rec = await this.studio(userId, id);
    await this.upsertRecord(userId, 'live', 'studio', id, {
      ...(rec as any),
      status: 'ended',
      endedAt: new Date().toISOString()
    });
    return this.upsertRecord(userId, 'live', 'replay', id, { sessionId: id, published: false });
  }

  async addMoment(userId: string, id: string, payload: any) {
    const rec = (await this.studio(userId, id)) as any;
    const moments = Array.isArray(rec.moments) ? rec.moments : [];
    const sanitized = this.ensureObjectPayload(payload, { maxDepth: 4, maxArrayLength: 50, maxKeys: 50 });
    const nextMoments = [...moments, { id: randomUUID(), ...sanitized, createdAt: new Date().toISOString() }];
    const trimmed = nextMoments.length > 500 ? nextMoments.slice(nextMoments.length - 500) : nextMoments;
    return this.upsertRecord(userId, 'live', 'studio', id, { ...rec, moments: trimmed });
  }

  async replays(userId: string) {
    const records = await this.listRecords(userId, 'replay');
    return records.map((record) => ({ id: record.recordKey, ...(record.payload as any) }));
  }
  async replay(userId: string, id: string) {
    const record = await this.getRecord(userId, 'replay', id);
    if (!record) {
      throw new NotFoundException('Replay not found');
    }
    return { id: record.recordKey, ...(record.payload as any) };
  }
  replayBySession(userId: string, sessionId: string) {
    const id = normalizeIdentifier(sessionId, randomUUID());
    return this.upsertRecord(userId, 'live', 'replay', id, { sessionId: id, published: false });
  }
  updateReplay(userId: string, id: string, body: any) {
    const sanitized = this.ensureObjectPayload(body);
    return this.updateRecord(userId, 'live', 'replay', id, sanitized);
  }

  async publishReplay(userId: string, id: string, body: any) {
    const rec = await this.getRecord(userId, 'replay', id);
    if (!rec) {
      throw new NotFoundException('Replay not found');
    }
    const sanitized = this.ensureObjectPayload(body);
    return this.updateRecord(userId, 'live', 'replay', id, {
      ...(rec.payload as any),
      ...sanitized,
      published: true,
      publishedAt: new Date().toISOString()
    });
  }

  reviews(userId: string) {
    return this.prisma.review.findMany({
      where: { subjectUserId: userId, subjectType: 'SESSION' },
      orderBy: { createdAt: 'desc' }
    });
  }

  toolGet(userId: string, key: string) {
    return this.prisma.liveRecord
      .upsert({
        where: { userId_recordType_recordKey: { userId, recordType: 'tool_config', recordKey: key } },
        update: {},
        create: {
          userId,
          recordType: 'tool_config',
          recordKey: key,
          payload: {} as Prisma.InputJsonValue
        }
      })
      .then((record) => record.payload);
  }

  toolPatch(userId: string, key: string, body: any) {
    const sanitized = this.ensureObjectPayload(body, { maxDepth: 5, maxArrayLength: 100, maxKeys: 100 });
    return this.upsertRecord(userId, 'live', 'tool_config', key, sanitized);
  }

  private ensureObjectPayload(payload: unknown, overrides?: Partial<PayloadSanitizerOptions>) {
    const sanitized = sanitizePayload(payload, { maxDepth: 7, maxArrayLength: 200, maxKeys: 200, ...overrides });
    if (!sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) {
      throw new BadRequestException('Invalid payload');
    }
    return sanitized as Record<string, unknown>;
  }

  private async getRecord(userId: string, recordType: string, recordKey: string) {
    return this.prisma.liveRecord.findUnique({
      where: { userId_recordType_recordKey: { userId, recordType, recordKey } }
    });
  }

  private async listRecords(userId: string, recordType: string) {
    return this.prisma.liveRecord.findMany({
      where: { userId, recordType },
      orderBy: { updatedAt: 'desc' }
    });
  }

  private async createRecord(userId: string, domain: string, recordType: string, recordKey: string, payload: unknown) {
    const record = await this.prisma.liveRecord.create({
      data: {
        userId,
        recordType,
        recordKey,
        payload: payload as Prisma.InputJsonValue
      }
    });
    return this.toAppRecord(record, domain);
  }

  private async updateRecord(userId: string, domain: string, recordType: string, recordKey: string, payload: unknown) {
    const existing = await this.getRecord(userId, recordType, recordKey);
    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    const record = await this.prisma.liveRecord.update({
      where: { id: existing.id },
      data: { payload: payload as Prisma.InputJsonValue }
    });
    return this.toAppRecord(record, domain);
  }

  private async upsertRecord(userId: string, domain: string, recordType: string, recordKey: string, payload: unknown) {
    const record = await this.prisma.liveRecord.upsert({
      where: { userId_recordType_recordKey: { userId, recordType, recordKey } },
      update: { payload: payload as Prisma.InputJsonValue },
      create: {
        userId,
        recordType,
        recordKey,
        payload: payload as Prisma.InputJsonValue
      }
    });
    return this.toAppRecord(record, domain);
  }

  private toAppRecord(
    record: { id: string; userId: string | null; recordType: string; recordKey: string; payload: unknown; createdAt: Date; updatedAt: Date },
    domain: string
  ) {
    return {
      id: record.id,
      domain,
      entityType: record.recordType,
      entityId: record.recordKey,
      userId: record.userId,
      payload: record.payload,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }
}
