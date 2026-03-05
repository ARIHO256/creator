import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AppRecordsService } from '../../platform/app-records.service.js';

@Injectable()
export class AdzService {
  constructor(private readonly records: AppRecordsService) {}

  builder(id: string, userId: string) { return this.records.getByEntityId('adz', 'builder', id, userId).then((r) => r.payload); }
  saveBuilder(userId: string, payload: any) { const id = payload.adId || payload.id || randomUUID(); return this.records.upsert('adz', 'builder', id, payload, userId); }

  async publishBuilder(userId: string, id: string, payload: any) {
    const rec = await this.records.getByEntityId('adz', 'builder', id, userId);
    const merged = { ...(rec.payload as any), ...payload, published: true, publishedAt: new Date().toISOString() };
    await this.records.update('adz', 'builder', id, merged, userId);
    return this.records.upsert('adz', 'campaign', id, merged, userId);
  }

  campaigns(userId: string) { return this.records.list('adz', 'campaign', userId).then((rows) => rows.map((r) => ({ id: r.entityId, ...(r.payload as any) }))); }
  campaign(userId: string, id: string) { return this.records.getByEntityId('adz', 'campaign', id, userId).then((r) => ({ id: r.entityId, ...(r.payload as any) })); }
  marketplace(userId: string) { return this.records.list('adz', 'marketplace', userId).then((rows) => rows.map((r) => r.payload)); }
  createCampaign(userId: string, body: any) { const id = body.id || randomUUID(); return this.records.create('adz', 'campaign', body, id, userId); }
  updateCampaign(userId: string, id: string, body: any) { return this.records.update('adz', 'campaign', id, body, userId); }
  performance(userId: string, id: string) { return this.records.getByEntityId('adz', 'performance', id, userId).then((r)=>r.payload).catch(() => ({ clicks: 0, purchases: 0, earnings: 0 })); }

  promoAd(userId: string, id: string) { return this.records.getByEntityId('adz', 'promo_ad', id, userId).then((r)=>r.payload).catch(()=>({ id, status: 'draft' })); }

  links(userId: string) { return this.records.list('adz', 'link', userId).then((rows) => rows.map((r) => ({ id: r.entityId, ...(r.payload as any) }))); }
  link(userId: string, id: string) { return this.records.getByEntityId('adz', 'link', id, userId).then((r) => ({ id: r.entityId, ...(r.payload as any) })); }
  createLink(userId: string, body: any) { const id = body.id || randomUUID(); return this.records.create('adz', 'link', body, id, userId); }
  updateLink(userId: string, id: string, body: any) { return this.records.update('adz', 'link', id, body, userId); }
}
