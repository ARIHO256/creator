import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AppRecordsService } from '../../platform/app-records.service.js';

@Injectable()
export class WholesaleService {
  constructor(private readonly records: AppRecordsService) {}

  home(userId: string) {
    return this.records.getByEntityId('wholesale', 'home', 'main', userId).then((r) => r.payload).catch(() => ({ summary: {} }));
  }

  priceLists(userId: string) {
    return this.records.getByEntityId('wholesale', 'price_lists', 'main', userId).then((r) => r.payload).catch(() => ({ priceLists: [] }));
  }

  rfqs(userId: string) {
    return this.records.getByEntityId('wholesale', 'rfqs', 'main', userId).then((r) => r.payload).catch(() => ({ rfqs: [] }));
  }

  quotes(userId: string) {
    return this.records.getByEntityId('wholesale', 'quotes', 'main', userId).then((r) => r.payload).catch(() => ({ quotes: [] }));
  }

  async quote(userId: string, id: string) {
    const payload = (await this.quotes(userId)) as any;
    const quote = (payload.quotes ?? []).find((entry: any) => entry.id === id);
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }
    return quote;
  }

  incoterms(userId: string) {
    return this.records.getByEntityId('wholesale', 'incoterms', 'main', userId).then((r) => r.payload).catch(() => ({ terms: [] }));
  }

  createQuote(userId: string, body: any) {
    return this.records.getByEntityId('wholesale', 'quotes', 'main', userId).catch(() => ({ payload: { quotes: [] } } as any)).then((record: any) => {
      const payload = record.payload ?? { quotes: [] };
      const quotes = Array.isArray(payload.quotes) ? payload.quotes : [];
      quotes.unshift({ id: body.id ?? randomUUID(), createdAt: new Date().toISOString(), ...body });
      return this.records.upsert('wholesale', 'quotes', 'main', { ...payload, quotes }, userId);
    });
  }
}
