import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { sanitizePayload } from '../../common/sanitizers/payload-sanitizer.js';

@Injectable()
export class ProviderService {
  constructor(private readonly prisma: PrismaService) {}

  async serviceCommand(userId: string) {
    return (await this.getPayload(userId, 'service_command', 'main')) ?? { queues: [], kpis: [] };
  }
  async quotes(userId: string) {
    return (await this.getPayload(userId, 'quotes', 'main')) ?? { quotes: [] };
  }
  async quote(userId: string, id: string) {
    const payload = (await this.quotes(userId)) as any;
    const quote = (payload.quotes ?? []).find((entry: any) => entry.id === id);
    if (!quote) throw new NotFoundException('Provider quote not found');
    return quote;
  }
  async createQuote(userId: string, body: any) {
    const payload = (await this.getPayload(userId, 'quotes', 'main')) ?? { quotes: [] };
    const quotes = Array.isArray((payload as any).quotes) ? (payload as any).quotes : [];
    const sanitized = this.ensurePayload(body);
    const nextQuote = {
      id: (sanitized as any).id ?? randomUUID(),
      createdAt: new Date().toISOString(),
      ...sanitized
    };
    const nextQuotes = [nextQuote, ...quotes.filter((entry: any) => entry.id !== nextQuote.id)];
    const record = await this.upsertPayload(userId, 'quotes', 'main', { ...payload, quotes: nextQuotes });
    return this.toAppRecord(record, 'provider');
  }
  async jointQuotes(userId: string) {
    return (await this.getPayload(userId, 'joint_quotes', 'main')) ?? { jointQuotes: [] };
  }
  async consultations(userId: string) {
    return (await this.getPayload(userId, 'consultations', 'main')) ?? { consultations: [] };
  }
  async bookings(userId: string) {
    return (await this.getPayload(userId, 'bookings', 'main')) ?? { bookings: [] };
  }
  async booking(userId: string, id: string) {
    const payload = (await this.bookings(userId)) as any;
    const booking = (payload.bookings ?? []).find((entry: any) => entry.id === id);
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }
  async portfolio(userId: string) {
    return (await this.getPayload(userId, 'portfolio', 'main')) ?? { items: [] };
  }
  async reviews(userId: string) {
    return (await this.getPayload(userId, 'reviews', 'main')) ?? { reviews: [] };
  }
  async disputes(userId: string) {
    return (await this.getPayload(userId, 'disputes', 'main')) ?? { disputes: [] };
  }

  private async getPayload(userId: string, recordType: string, recordKey: string) {
    const record = await this.prisma.providerRecord.findUnique({
      where: { userId_recordType_recordKey: { userId, recordType, recordKey } }
    });
    return record?.payload as Record<string, unknown> | null;
  }

  private async upsertPayload(userId: string, recordType: string, recordKey: string, payload: unknown) {
    const sanitized = sanitizePayload(payload, { maxDepth: 6, maxArrayLength: 300, maxKeys: 300 });
    if (sanitized === undefined) {
      throw new BadRequestException('Invalid payload');
    }
    return this.prisma.providerRecord.upsert({
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

  private ensurePayload(payload: unknown) {
    const sanitized = sanitizePayload(payload, { maxDepth: 6, maxArrayLength: 200, maxKeys: 200 });
    if (sanitized === undefined) {
      throw new BadRequestException('Invalid payload');
    }
    return sanitized as Record<string, unknown>;
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
