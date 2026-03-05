import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AppRecordsService } from '../../platform/app-records.service.js';

@Injectable()
export class LiveService {
  constructor(private readonly records: AppRecordsService) {}

  // builder
  builder(id: string, userId: string) { return this.records.getByEntityId('live', 'builder', id, userId).then((r) => r.payload); }
  saveBuilder(userId: string, payload: any) { const id = payload.sessionId || payload.id || randomUUID(); return this.records.upsert('live', 'builder', id, payload, userId); }
  async publishBuilder(userId: string, id: string, payload: any) {
    const rec = await this.records.getByEntityId('live', 'builder', id, userId);
    return this.records.update('live', 'builder', id, { ...(rec.payload as any), ...payload, published: true }, userId);
  }

  campaignGiveaways(campaignId: string) {
    return this.records.list('live', 'campaign_giveaway').then((rows) => rows.filter((r) => r.entityId === campaignId).map((r) => r.payload));
  }

  sessions(userId: string) { return this.records.list('live', 'session', userId).then((rows) => rows.map((r) => ({ id: r.entityId, ...(r.payload as any) }))); }
  session(userId: string, id: string) { return this.records.getByEntityId('live', 'session', id, userId).then((r) => ({ id: r.entityId, ...(r.payload as any) })); }
  createSession(userId: string, body: any) { const id = body.id || randomUUID(); return this.records.create('live', 'session', body, id, userId); }
  updateSession(userId: string, id: string, body: any) { return this.records.update('live', 'session', id, body, userId); }

  async studio(userId: string, id: string) {
    return this.records.getByEntityId('live', 'studio', id, userId).then((r) => r.payload).catch(() => this.records.create('live', 'studio', { mode: 'builder', sessionId: id }, id, userId).then((r)=>r.payload));
  }

  async startStudio(userId: string, id: string) {
    const rec = await this.studio(userId, id);
    return this.records.upsert('live', 'studio', id, { ...(rec as any), status: 'live', startedAt: new Date().toISOString() }, userId);
  }

  async endStudio(userId: string, id: string) {
    const rec = await this.studio(userId, id);
    await this.records.upsert('live', 'studio', id, { ...(rec as any), status: 'ended', endedAt: new Date().toISOString() }, userId);
    return this.records.upsert('live', 'replay', id, { sessionId: id, published: false }, userId);
  }

  async addMoment(userId: string, id: string, payload: any) {
    const rec = (await this.studio(userId, id)) as any;
    const moments = Array.isArray(rec.moments) ? rec.moments : [];
    moments.push({ id: randomUUID(), ...payload, createdAt: new Date().toISOString() });
    return this.records.upsert('live', 'studio', id, { ...rec, moments }, userId);
  }

  replays(userId: string) { return this.records.list('live', 'replay', userId).then((rows) => rows.map((r) => ({ id: r.entityId, ...(r.payload as any) }))); }
  replay(userId: string, id: string) { return this.records.getByEntityId('live', 'replay', id, userId).then((r) => ({ id: r.entityId, ...(r.payload as any) })); }
  replayBySession(userId: string, sessionId: string) { return this.records.upsert('live', 'replay', sessionId, { sessionId, published: false }, userId); }
  updateReplay(userId: string, id: string, body: any) { return this.records.update('live', 'replay', id, body, userId); }

  async publishReplay(userId: string, id: string, body: any) {
    const rec = await this.records.getByEntityId('live', 'replay', id, userId);
    return this.records.update('live', 'replay', id, { ...(rec.payload as any), ...body, published: true, publishedAt: new Date().toISOString() }, userId);
  }

  reviews(userId: string) { return this.records.list('reviews', 'live_review', userId).then((rows) => rows.map((r) => r.payload)); }

  toolGet(userId: string, key: string) {
    return this.records.getByEntityId('live', 'tool_config', key, userId).then((r) => r.payload).catch(() => this.records.create('live', 'tool_config', {}, key, userId).then((r)=>r.payload));
  }

  toolPatch(userId: string, key: string, body: any) {
    return this.records.upsert('live', 'tool_config', key, body, userId);
  }
}
