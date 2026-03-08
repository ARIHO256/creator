import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AppRecordsService } from '../../platform/app-records.service.js';
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
    private readonly records: AppRecordsService,
    private readonly jobsService: JobsService
  ) {}

  async home(userId: string) {
    const home = await this.records
      .getByEntityId('wholesale', 'home', 'main', userId)
      .then((record) => normalizeWholesaleHome(record.payload))
      .catch(() => ({ summary: { openRfqs: 0, activeQuotes: 0, priceLists: 0 } }));
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

  priceLists(userId: string) {
    return this.records
      .getByEntityId('wholesale', 'price_lists', 'main', userId)
      .then((record) => normalizeWholesalePriceLists(record.payload))
      .catch(() => ({ priceLists: [] }));
  }

  rfqs(userId: string) {
    return this.records
      .getByEntityId('wholesale', 'rfqs', 'main', userId)
      .then((record) => normalizeWholesaleRfqs(record.payload))
      .catch(() => ({ rfqs: [] }));
  }

  quotes(userId: string) {
    return this.records
      .getByEntityId('wholesale', 'quotes', 'main', userId)
      .then((record) => normalizeWholesaleQuotes(record.payload))
      .catch(() => ({ quotes: [] }));
  }

  async quote(userId: string, id: string) {
    const payload = await this.quotes(userId);
    const quote = payload.quotes.find((entry: any) => entry.id === id);
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }
    return quote;
  }

  incoterms(userId: string) {
    return this.records
      .getByEntityId('wholesale', 'incoterms', 'main', userId)
      .then((record) => normalizeWholesaleIncoterms(record.payload))
      .catch(() => ({ terms: [] }));
  }

  async createQuote(userId: string, body: CreateWholesaleQuoteDto) {
    const quoteRecord = await this.records
      .getByEntityId('wholesale', 'quotes', 'main', userId)
      .catch(() => ({ payload: { quotes: [] } } as any));
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
    const normalized = normalizeWholesaleQuotes(quoteRecord.payload);
    const quotes = [nextQuote, ...normalized.quotes.filter((entry) => entry.id !== nextQuote.id)];
    await this.records.upsert('wholesale', 'quotes', 'main', { quotes }, userId);
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
    const quoteRecord = await this.records.getByEntityId('wholesale', 'quotes', 'main', userId);
    const normalized = normalizeWholesaleQuotes(quoteRecord.payload);
    const existing = normalized.quotes.find((entry) => entry.id === id);

    if (!existing) {
      throw new NotFoundException('Quote not found');
    }

    const updated = updateWholesaleQuote(existing, body);
    const quotes = normalized.quotes.map((entry) => (entry.id === id ? updated : entry));
    await this.records.upsert('wholesale', 'quotes', 'main', { quotes }, userId);
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
}
