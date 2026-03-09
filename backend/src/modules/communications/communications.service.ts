import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { sanitizePayload } from '../../common/sanitizers/payload-sanitizer.js';

@Injectable()
export class CommunicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async messages(userId: string) {
    return (
      (await this.getPayload(userId, 'messages', 'main')) ?? {
        tagOptions: [],
        threads: [],
        messages: [],
        templates: []
      }
    );
  }

  async messageThread(userId: string, threadId: string) {
    const payload = await this.messages(userId);
    const thread = (payload as any).threads?.find((entry: any) => entry.id === threadId);
    if (!thread) {
      throw new NotFoundException('Thread not found');
    }
    return {
      thread,
      messages: ((payload as any).messages ?? []).filter((entry: any) => entry.threadId === threadId)
    };
  }

  async sendMessage(userId: string, threadId: string, body: { text: string; lang?: string }) {
    const payload = (await this.messages(userId)) as Record<string, unknown>;
    const messages = Array.isArray((payload as any).messages) ? (payload as any).messages : [];
    messages.push({
      id: randomUUID(),
      threadId,
      sender: 'me',
      text: body.text,
      lang: body.lang ?? 'en',
      at: new Date().toISOString()
    });
    const record = await this.upsertPayload(userId, 'messages', 'main', { ...payload, messages });
    return this.toAppRecord(record, 'seller_workspace');
  }

  async notifications(userId: string) {
    return (await this.getPayload(userId, 'notifications_preferences', 'main')) ?? { watches: [] };
  }

  async helpSupport(userId: string) {
    return (
      (await this.getPayload(userId, 'help_support', 'main')) ?? {
        kb: [],
        faq: [],
        status: [],
        tickets: []
      }
    );
  }

  async createTicket(userId: string, body: any) {
    const payload = (await this.helpSupport(userId)) as Record<string, unknown>;
    const tickets = Array.isArray((payload as any).tickets) ? (payload as any).tickets : [];
    tickets.unshift({
      id: body.id ?? randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'Open',
      marketplace: body.marketplace ?? 'General',
      category: body.category ?? 'Support',
      subject: body.subject ?? 'Untitled',
      severity: body.severity ?? 'medium',
      ref: body.ref
    });
    const record = await this.upsertPayload(userId, 'help_support', 'main', { ...payload, tickets });
    return this.toAppRecord(record, 'seller_workspace');
  }

  async systemStatus(userId: string) {
    return (await this.getPayload(userId, 'system_status', 'main')) ?? { services: [] };
  }

  private async getPayload(userId: string, recordType: string, recordKey: string) {
    const record = await this.prisma.communicationRecord.findUnique({
      where: { userId_recordType_recordKey: { userId, recordType, recordKey } }
    });
    return record?.payload as Record<string, unknown> | null;
  }

  private async upsertPayload(userId: string, recordType: string, recordKey: string, payload: unknown) {
    const sanitized = sanitizePayload(payload, { maxDepth: 6, maxArrayLength: 500, maxKeys: 400 });
    if (sanitized === undefined) {
      throw new BadRequestException('Invalid payload');
    }
    return this.prisma.communicationRecord.upsert({
      where: { userId_recordType_recordKey: { userId, recordType, recordKey } },
      update: { payload: sanitized as Prisma.InputJsonValue },
      create: {
        userId,
        recordType,
        recordKey,
        payload: sanitized as Prisma.InputJsonValue
      }
    });
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
