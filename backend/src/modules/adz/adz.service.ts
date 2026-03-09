import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { PayloadSanitizerOptions, normalizeIdentifier, sanitizePayload } from '../../common/sanitizers/payload-sanitizer.js';

@Injectable()
export class AdzService {
  constructor(private readonly prisma: PrismaService) {}

  async builder(id: string, userId: string) {
    const record = await this.getRecord(userId, 'builder', id);
    if (!record) {
      throw new NotFoundException('Builder not found');
    }
    return record.payload;
  }
  saveBuilder(userId: string, payload: any) {
    const sanitized = this.ensureObjectPayload(payload);
    const id = normalizeIdentifier(sanitized.adId ?? sanitized.id, randomUUID());
    return this.upsertRecord(userId, 'adz', 'builder', id, sanitized);
  }

  async publishBuilder(userId: string, id: string, payload: any) {
    const rec = await this.getRecord(userId, 'builder', id);
    if (!rec) {
      throw new NotFoundException('Builder not found');
    }
    const sanitized = this.ensureObjectPayload(payload);
    const merged = {
      ...(rec.payload as any),
      ...sanitized,
      published: true,
      publishedAt: new Date().toISOString()
    };
    await this.upsertRecord(userId, 'adz', 'builder', id, merged);
    return this.upsertRecord(userId, 'adz', 'campaign', id, merged);
  }

  async campaigns(userId: string) {
    const records = await this.listRecords(userId, 'campaign');
    return records.map((record) => ({ id: record.recordKey, ...(record.payload as any) }));
  }
  async campaign(userId: string, id: string) {
    const record = await this.getRecord(userId, 'campaign', id);
    if (!record) {
      throw new NotFoundException('Campaign not found');
    }
    return { id: record.recordKey, ...(record.payload as any) };
  }
  async marketplace(userId: string) {
    const records = await this.listRecords(userId, 'marketplace');
    return records.map((record) => record.payload);
  }
  createCampaign(userId: string, body: any) {
    const sanitized = this.ensureObjectPayload(body);
    const id = normalizeIdentifier(sanitized.id, randomUUID());
    return this.createRecord(userId, 'adz', 'campaign', id, sanitized);
  }
  updateCampaign(userId: string, id: string, body: any) {
    const sanitized = this.ensureObjectPayload(body);
    return this.updateRecord(userId, 'adz', 'campaign', id, sanitized);
  }
  async performance(userId: string, id: string) {
    const record = await this.getRecord(userId, 'performance', id);
    return record?.payload ?? { clicks: 0, purchases: 0, earnings: 0 };
  }

  async promoAd(userId: string, id: string) {
    const record = await this.getRecord(userId, 'promo_ad', id);
    return record?.payload ?? { id, status: 'draft' };
  }

  async links(userId: string) {
    const records = await this.listRecords(userId, 'link');
    return records.map((record) => ({ id: record.recordKey, ...(record.payload as any) }));
  }
  async link(userId: string, id: string) {
    const record = await this.getRecord(userId, 'link', id);
    if (!record) {
      throw new NotFoundException('Link not found');
    }
    return { id: record.recordKey, ...(record.payload as any) };
  }
  createLink(userId: string, body: any) {
    const sanitized = this.ensureObjectPayload(body, { maxDepth: 6, maxArrayLength: 100, maxKeys: 150 });
    const id = normalizeIdentifier(sanitized.id, randomUUID());
    return this.createRecord(userId, 'adz', 'link', id, sanitized);
  }
  updateLink(userId: string, id: string, body: any) {
    const sanitized = this.ensureObjectPayload(body, { maxDepth: 6, maxArrayLength: 100, maxKeys: 150 });
    return this.updateRecord(userId, 'adz', 'link', id, sanitized);
  }

  private ensureObjectPayload(payload: unknown, overrides?: Partial<PayloadSanitizerOptions>) {
    const sanitized = sanitizePayload(payload, { maxDepth: 7, maxArrayLength: 200, maxKeys: 200, ...overrides });
    if (!sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) {
      throw new BadRequestException('Invalid payload');
    }
    return sanitized as Record<string, unknown>;
  }

  private async getRecord(userId: string, recordType: string, recordKey: string) {
    return this.prisma.adzRecord.findUnique({
      where: { userId_recordType_recordKey: { userId, recordType, recordKey } }
    });
  }

  private async listRecords(userId: string, recordType: string) {
    return this.prisma.adzRecord.findMany({
      where: { userId, recordType },
      orderBy: { updatedAt: 'desc' }
    });
  }

  private async createRecord(userId: string, domain: string, recordType: string, recordKey: string, payload: unknown) {
    const record = await this.prisma.adzRecord.create({
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
    const record = await this.prisma.adzRecord.update({
      where: { id: existing.id },
      data: { payload: payload as Prisma.InputJsonValue }
    });
    return this.toAppRecord(record, domain);
  }

  private async upsertRecord(userId: string, domain: string, recordType: string, recordKey: string, payload: unknown) {
    const record = await this.prisma.adzRecord.upsert({
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
    record: { id: string; userId: string; recordType: string; recordKey: string; payload: unknown; createdAt: Date; updatedAt: Date },
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
