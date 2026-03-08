import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AppRecordsService } from '../../platform/app-records.service.js';

@Injectable()
export class ProviderService {
  constructor(private readonly records: AppRecordsService) {}

  serviceCommand(userId: string) { return this.records.getByEntityId('provider', 'service_command', 'main', userId).then((r)=>r.payload).catch(()=>({ queues: [], kpis: [] })); }
  quotes(userId: string) { return this.records.getByEntityId('provider', 'quotes', 'main', userId).then((r)=>r.payload).catch(()=>({ quotes: [] })); }
  async quote(userId: string, id: string) {
    const payload = await this.quotes(userId) as any;
    const quote = (payload.quotes ?? []).find((entry: any) => entry.id === id);
    if (!quote) throw new NotFoundException('Provider quote not found');
    return quote;
  }
  createQuote(userId: string, body: any) {
    return this.records.getByEntityId('provider', 'quotes', 'main', userId).catch(()=>({payload:{quotes:[]}} as any)).then((record:any)=>{
      const payload = record.payload ?? { quotes: [] };
      const quotes = Array.isArray(payload.quotes) ? payload.quotes : [];
      quotes.unshift({ id: body.id ?? randomUUID(), createdAt: new Date().toISOString(), ...body });
      return this.records.upsert('provider', 'quotes', 'main', { ...payload, quotes }, userId);
    });
  }
  jointQuotes(userId: string) { return this.records.getByEntityId('provider', 'joint_quotes', 'main', userId).then((r)=>r.payload).catch(()=>({ jointQuotes: [] })); }
  consultations(userId: string) { return this.records.getByEntityId('provider', 'consultations', 'main', userId).then((r)=>r.payload).catch(()=>({ consultations: [] })); }
  bookings(userId: string) { return this.records.getByEntityId('provider', 'bookings', 'main', userId).then((r)=>r.payload).catch(()=>({ bookings: [] })); }
  async booking(userId: string, id: string) {
    const payload = await this.bookings(userId) as any;
    const booking = (payload.bookings ?? []).find((entry: any) => entry.id === id);
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }
  portfolio(userId: string) { return this.records.getByEntityId('provider', 'portfolio', 'main', userId).then((r)=>r.payload).catch(()=>({ items: [] })); }
  reviews(userId: string) { return this.records.getByEntityId('provider', 'reviews', 'main', userId).then((r)=>r.payload).catch(()=>({ reviews: [] })); }
  disputes(userId: string) { return this.records.getByEntityId('provider', 'disputes', 'main', userId).then((r)=>r.payload).catch(()=>({ disputes: [] })); }
}
