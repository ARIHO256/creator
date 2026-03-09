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
  normalizeWholesaleIncoterms,
  updateWholesaleQuote
} from './wholesale-state.js';

@Injectable()
export class WholesaleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobsService: JobsService
  ) {}

  async home(userId: string) {
    const [openRfqs, activeQuotes, priceLists] = await Promise.all([
      this.prisma.wholesaleRfq.count({
        where: { userId, status: { not: 'closed' } }
      }),
      this.prisma.wholesaleQuote.count({
        where: { userId, status: { in: ['sent', 'negotiating', 'ready_for_review'] } }
      }),
      this.prisma.wholesalePriceList.count({ where: { userId } })
    ]);

    return {
      summary: {
        openRfqs,
        activeQuotes,
        priceLists
      }
    };
  }

  async priceLists(userId: string) {
    const priceLists = await this.prisma.wholesalePriceList.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
    return { priceLists: priceLists.map((entry) => this.serializePriceList(entry)) };
  }

  async rfqs(userId: string) {
    const rfqs = await this.prisma.wholesaleRfq.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
    return { rfqs: rfqs.map((entry) => this.serializeRfq(entry)) };
  }

  async quotes(userId: string) {
    const quotes = await this.prisma.wholesaleQuote.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
    return { quotes: quotes.map((entry) => this.serializeQuote(entry)) };
  }

  async quote(userId: string, id: string) {
    const quote = await this.prisma.wholesaleQuote.findFirst({
      where: { id, userId }
    });
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }
    return this.serializeQuote(quote);
  }

  async incoterms(userId: string) {
    const terms = await this.prisma.wholesaleIncoterm.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' }
    });
    if (terms.length === 0) {
      return normalizeWholesaleIncoterms({
        terms: [
          { code: 'EXW', description: 'Ex Works' },
          { code: 'FOB', description: 'Free On Board' },
          { code: 'CIF', description: 'Cost, Insurance & Freight' },
          { code: 'DAP', description: 'Delivered At Place' }
        ]
      });
    }
    return {
      terms: terms.map((term) => ({
        code: term.code,
        description: term.description ?? '',
        riskTransferPoint: term.riskTransferPoint ?? '',
        sellerObligation: term.sellerObligation ?? '',
        buyerObligation: term.buyerObligation ?? ''
      }))
    };
  }

  async createQuote(userId: string, body: CreateWholesaleQuoteDto) {
    const rfqPayload = body.rfqId
      ? await this.prisma.wholesaleRfq.findFirst({ where: { id: body.rfqId, userId } }).then((rfq) => rfq?.data ?? null)
      : null;
    const nextQuote = createWholesaleQuote(
      {
        ...body,
        id: body.id ?? randomUUID()
      },
      rfqPayload
    );
    await this.prisma.wholesaleQuote.upsert({
      where: { id: nextQuote.id },
      update: {
        status: nextQuote.status,
        title: nextQuote.title,
        buyer: nextQuote.buyer,
        buyerType: nextQuote.buyerType,
        currency: nextQuote.currency,
        total: nextQuote.totals.total,
        approvalsRequired: nextQuote.approvals.required,
        rfqId: nextQuote.rfqId,
        data: nextQuote as Prisma.InputJsonValue
      },
      create: {
        id: nextQuote.id,
        userId,
        status: nextQuote.status,
        title: nextQuote.title,
        buyer: nextQuote.buyer,
        buyerType: nextQuote.buyerType,
        currency: nextQuote.currency,
        total: nextQuote.totals.total,
        approvalsRequired: nextQuote.approvals.required,
        rfqId: nextQuote.rfqId,
        data: nextQuote as Prisma.InputJsonValue
      }
    });
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
    const existingRecord = await this.prisma.wholesaleQuote.findFirst({
      where: { id, userId }
    });

    if (!existingRecord) {
      throw new NotFoundException('Quote not found');
    }

    const updated = updateWholesaleQuote((existingRecord.data ?? {}) as any, body);
    await this.prisma.wholesaleQuote.update({
      where: { id: existingRecord.id },
      data: {
        status: updated.status,
        title: updated.title,
        buyer: updated.buyer,
        buyerType: updated.buyerType,
        currency: updated.currency,
        total: updated.totals.total,
        approvalsRequired: updated.approvals.required,
        data: updated as Prisma.InputJsonValue
      }
    });
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

  private serializeQuote(quote: {
    id: string;
    data: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const payload = (quote.data ?? {}) as Record<string, unknown>;
    return {
      ...(payload as Record<string, unknown>),
      id: payload.id ?? quote.id,
      createdAt: payload.createdAt ?? quote.createdAt.toISOString(),
      updatedAt: payload.updatedAt ?? quote.updatedAt.toISOString()
    };
  }

  private serializeRfq(rfq: {
    id: string;
    status: string;
    title: string | null;
    buyerName: string | null;
    buyerType: string | null;
    urgency: string | null;
    origin: string | null;
    destination: string | null;
    paymentRail: string | null;
    approvalRequired: boolean;
    dueAt: Date | null;
    data: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: rfq.id,
      status: rfq.status,
      title: rfq.title,
      buyerName: rfq.buyerName,
      buyerType: rfq.buyerType,
      urgency: rfq.urgency,
      origin: rfq.origin,
      destination: rfq.destination,
      paymentRail: rfq.paymentRail,
      approvalRequired: rfq.approvalRequired,
      dueAt: rfq.dueAt?.toISOString() ?? null,
      data: rfq.data ?? {},
      createdAt: rfq.createdAt.toISOString(),
      updatedAt: rfq.updatedAt.toISOString()
    };
  }

  private serializePriceList(priceList: {
    id: string;
    name: string;
    currency: string;
    status: string;
    data: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const payload = (priceList.data ?? {}) as Record<string, unknown>;
    return {
      id: priceList.id,
      name: priceList.name,
      currency: priceList.currency,
      status: priceList.status,
      data: payload,
      createdAt: priceList.createdAt.toISOString(),
      updatedAt: priceList.updatedAt.toISOString()
    };
  }
}
