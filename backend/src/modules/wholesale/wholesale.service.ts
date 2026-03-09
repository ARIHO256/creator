import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { sanitizePayload } from '../../common/sanitizers/payload-sanitizer.js';
import { JobsService } from '../jobs/jobs.service.js';
import { CreateWholesaleQuoteDto } from './dto/create-wholesale-quote.dto.js';
import { UpdateWholesaleQuoteDto } from './dto/update-wholesale-quote.dto.js';
import {
  createWholesaleQuote,
  normalizeWholesaleHome,
  normalizeWholesaleIncoterms,
  normalizeWholesalePriceLists,
  normalizeWholesaleQuotes,
  normalizeWholesaleRfqs,
  updateWholesaleQuote
} from './wholesale-state.js';

@Injectable()
export class WholesaleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobsService: JobsService
  ) {}

  async home(userId: string) {
    const homePayload = await this.getPayload(userId, 'home', 'main');
    const home = homePayload
      ? normalizeWholesaleHome(homePayload)
      : { summary: { openRfqs: 0, activeQuotes: 0, priceLists: 0 } };
    const rfqs = await this.rfqs(userId);
    const quotes = await this.quotes(userId);
    const priceLists = await this.priceLists(userId);

    return {
      summary: {
        openRfqs: home.summary.openRfqs || rfqs.rfqs.filter((rfq: any) => rfq.status !== 'closed').length,
        activeQuotes:
          home.summary.activeQuotes ||
          quotes.quotes.filter((quote: any) => ['sent', 'negotiating', 'ready_for_review'].includes(quote.status)).length,
        priceLists: home.summary.priceLists || priceLists.priceLists.length
      }
    };
  }

  async priceLists(userId: string) {
    const payload = await this.getPayload(userId, 'price_lists', 'main');
    return payload ? normalizeWholesalePriceLists(payload) : { priceLists: [] };
  }

  async rfqs(userId: string) {
    const payload = await this.getPayload(userId, 'rfqs', 'main');
    return payload ? normalizeWholesaleRfqs(payload) : { rfqs: [] };
  }

  async quotes(userId: string) {
    const payload = await this.getPayload(userId, 'quotes', 'main');
    return payload ? normalizeWholesaleQuotes(payload) : { quotes: [] };
  }

  async quote(userId: string, id: string) {
    const payload = await this.quotes(userId);
    const quote = payload.quotes.find((entry: any) => entry.id === id);
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }
    return quote;
  }

  async incoterms(userId: string) {
    const payload = await this.getPayload(userId, 'incoterms', 'main');
    return payload ? normalizeWholesaleIncoterms(payload) : { terms: [] };
  }

  async createQuote(userId: string, body: CreateWholesaleQuoteDto) {
    const quoteRecord = await this.getPayload(userId, 'quotes', 'main');
    const rfqPayload = body.rfqId
      ? await this.rfqs(userId).then((payload) => payload.rfqs.find((entry: any) => entry.id === body.rfqId) ?? null)
      : null;
    const nextQuote = createWholesaleQuote(
      {
        ...body,
        id: body.id ?? randomUUID()
      },
      rfqPayload
    );
    const normalized = normalizeWholesaleQuotes(quoteRecord ?? { quotes: [] });
    const quotes = [nextQuote, ...normalized.quotes.filter((entry) => entry.id !== nextQuote.id)];
    await this.upsertPayload(userId, 'quotes', 'main', { quotes });
    await this.jobsService.enqueue({
      queue: 'wholesale',
      type: 'WHOLESALE_QUOTE_CREATED',
      userId,
      dedupeKey: `wholesale-quote-created:${nextQuote.id}`,
      correlationId: nextQuote.id,
      payload: {
        quoteId: nextQuote.id,
        rfqId: nextQuote.rfqId,
        buyer: nextQuote.buyer,
        total: nextQuote.totals.total,
        currency: nextQuote.currency,
        status: nextQuote.status
      }
    });
    return nextQuote;
  }

  async updateQuote(userId: string, id: string, body: UpdateWholesaleQuoteDto) {
    const quoteRecord = await this.getPayload(userId, 'quotes', 'main');
    const normalized = normalizeWholesaleQuotes(quoteRecord ?? { quotes: [] });
    const existing = normalized.quotes.find((entry) => entry.id === id);

    if (!existing) {
      throw new NotFoundException('Quote not found');
    }

    const updated = updateWholesaleQuote(existing, body);
    const quotes = normalized.quotes.map((entry) => (entry.id === id ? updated : entry));
    await this.upsertPayload(userId, 'quotes', 'main', { quotes });
    await this.jobsService.enqueue({
      queue: 'wholesale',
      type: 'WHOLESALE_QUOTE_UPDATED',
      userId,
      dedupeKey: `wholesale-quote-updated:${updated.id}:${updated.updatedAt}`,
      correlationId: updated.id,
      payload: {
        quoteId: updated.id,
        total: updated.totals.total,
        status: updated.status,
        approvalsRequired: updated.approvals.required
      }
    });
    return updated;
  }

  private async getPayload(userId: string, recordType: string, recordKey: string) {
    const record = await this.prisma.wholesaleRecord.findUnique({
      where: { userId_recordType_recordKey: { userId, recordType, recordKey } }
    });
    return record?.payload as Record<string, unknown> | null;
  }

  private async upsertPayload(userId: string, recordType: string, recordKey: string, payload: unknown) {
    const sanitized = sanitizePayload(payload, { maxDepth: 6, maxArrayLength: 500, maxKeys: 400 });
    if (sanitized === undefined) {
      throw new BadRequestException('Invalid payload');
    }
    return this.prisma.wholesaleRecord.upsert({
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
}
