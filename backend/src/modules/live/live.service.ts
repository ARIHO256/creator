import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AppRecordsService } from '../../platform/app-records.service.js';
import { PayloadSanitizerOptions, normalizeIdentifier, sanitizePayload } from '../../common/sanitizers/payload-sanitizer.js';

@Injectable()
export class LiveService {
  constructor(private readonly records: AppRecordsService) {}

  // builder
  builder(id: string, userId: string) { return this.records.getByEntityId('live', 'builder', id, userId).then((r) => r.payload); }
  saveBuilder(userId: string, payload: any) {
    const sanitized = this.ensureObjectPayload(payload);
    const id = normalizeIdentifier(sanitized.sessionId ?? sanitized.id, randomUUID());
    return this.records.upsert('live', 'builder', id, sanitized, userId);
  }
  async publishBuilder(userId: string, id: string, payload: any) {
    const rec = await this.records.getByEntityId('live', 'builder', id, userId);
    const sanitized = this.ensureObjectPayload(payload);
    return this.records.update(
      'live',
      'builder',
      id,
      { ...(rec.payload as any), ...sanitized, published: true },
      userId
    );
  }

  campaignGiveaways(campaignId: string) {
    return this.records.list('live', 'campaign_giveaway').then((rows) => rows.filter((r) => r.entityId === campaignId).map((r) => r.payload));
  }

  sessions(userId: string) { return this.records.list('live', 'session', userId).then((rows) => rows.map((r) => ({ id: r.entityId, ...(r.payload as any) }))); }
  session(userId: string, id: string) { return this.records.getByEntityId('live', 'session', id, userId).then((r) => ({ id: r.entityId, ...(r.payload as any) })); }
  createSession(userId: string, body: any) {
    const sanitized = this.ensureObjectPayload(body);
    const id = normalizeIdentifier(sanitized.id, randomUUID());
    return this.records.create('live', 'session', sanitized, id, userId);
  }
  updateSession(userId: string, id: string, body: any) {
    const sanitized = this.ensureObjectPayload(body);
    return this.records.update('live', 'session', id, sanitized, userId);
  }

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
    const sanitized = this.ensureObjectPayload(payload, { maxDepth: 4, maxArrayLength: 50, maxKeys: 50 });
    const nextMoments = [...moments, { id: randomUUID(), ...sanitized, createdAt: new Date().toISOString() }];
    const trimmed = nextMoments.length > 500 ? nextMoments.slice(nextMoments.length - 500) : nextMoments;
    return this.records.upsert('live', 'studio', id, { ...rec, moments: trimmed }, userId);
  }

  replays(userId: string) { return this.records.list('live', 'replay', userId).then((rows) => rows.map((r) => ({ id: r.entityId, ...(r.payload as any) }))); }
  replay(userId: string, id: string) { return this.records.getByEntityId('live', 'replay', id, userId).then((r) => ({ id: r.entityId, ...(r.payload as any) })); }
  replayBySession(userId: string, sessionId: string) {
    const id = normalizeIdentifier(sessionId, randomUUID());
    return this.records.upsert('live', 'replay', id, { sessionId: id, published: false }, userId);
  }
  updateReplay(userId: string, id: string, body: any) {
    const sanitized = this.ensureObjectPayload(body);
    return this.records.update('live', 'replay', id, sanitized, userId);
  }

  async publishReplay(userId: string, id: string, body: any) {
    const rec = await this.records.getByEntityId('live', 'replay', id, userId);
    const sanitized = this.ensureObjectPayload(body);
    return this.records.update(
      'live',
      'replay',
      id,
      { ...(rec.payload as any), ...sanitized, published: true, publishedAt: new Date().toISOString() },
      userId
    );
  }

  reviews(userId: string) { return this.records.list('reviews', 'live_review', userId).then((rows) => rows.map((r) => r.payload)); }

  toolGet(userId: string, key: string) {
    return this.records.getByEntityId('live', 'tool_config', key, userId).then((r) => r.payload).catch(() => this.records.create('live', 'tool_config', {}, key, userId).then((r)=>r.payload));
  }

  toolPatch(userId: string, key: string, body: any) {
    const sanitized = this.ensureObjectPayload(body, { maxDepth: 5, maxArrayLength: 100, maxKeys: 100 });
    return this.records.upsert('live', 'tool_config', key, sanitized, userId);
  }

  private ensureObjectPayload(payload: unknown, overrides?: Partial<PayloadSanitizerOptions>) {
    const sanitized = sanitizePayload(payload, { maxDepth: 7, maxArrayLength: 200, maxKeys: 200, ...overrides });
    if (!sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) {
      throw new BadRequestException('Invalid payload');
    }
    return sanitized as Record<string, unknown>;
  }
}
