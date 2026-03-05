import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AppRecordsService } from '../../platform/app-records.service.js';

@Injectable()
export class CollaborationService {
  constructor(private readonly records: AppRecordsService) {}

  campaigns(userId: string) {
    return this.records.list('collaboration', 'campaign', userId).then((rows) => rows.map((r) => ({ id: r.entityId, ...(r.payload as any) })));
  }

  proposals(userId: string) {
    return this.records.list('collaboration', 'proposal', userId).then((rows) => rows.map((r) => ({ id: r.entityId, ...(r.payload as any) })));
  }

  createProposal(userId: string, payload: any) {
    const id = payload.id || randomUUID();
    return this.records.create('collaboration', 'proposal', payload, id, userId);
  }

  async proposal(userId: string, id: string) {
    const rec = await this.records.getByEntityId('collaboration', 'proposal', id, userId);
    return { id: rec.entityId, ...(rec.payload as any) };
  }

  updateProposal(userId: string, id: string, payload: any) {
    return this.records.update('collaboration', 'proposal', id, payload, userId);
  }

  async proposalMessage(userId: string, id: string, payload: any) {
    const rec = await this.records.getByEntityId('collaboration', 'proposal', id, userId);
    const current = rec.payload as any;
    const messages = Array.isArray(current.messages) ? current.messages : [];
    messages.push({ id: randomUUID(), ...payload, createdAt: new Date().toISOString() });
    return this.records.update('collaboration', 'proposal', id, { ...current, messages }, userId);
  }

  async proposalTransition(userId: string, id: string, payload: any) {
    const rec = await this.records.getByEntityId('collaboration', 'proposal', id, userId);
    return this.records.update('collaboration', 'proposal', id, { ...(rec.payload as any), status: payload.status }, userId);
  }

  contracts(userId: string) {
    return this.records.list('collaboration', 'contract', userId).then((rows) => rows.map((r) => ({ id: r.entityId, ...(r.payload as any) })));
  }

  async contract(userId: string, id: string) {
    const rec = await this.records.getByEntityId('collaboration', 'contract', id, userId);
    return { id: rec.entityId, ...(rec.payload as any) };
  }

  async terminateContract(userId: string, id: string, payload: any) {
    const rec = await this.records.getByEntityId('collaboration', 'contract', id, userId);
    return this.records.update('collaboration', 'contract', id, { ...(rec.payload as any), termination: payload, status: 'termination_requested' }, userId);
  }

  tasks(userId: string) {
    return this.records.list('collaboration', 'task', userId).then((rows) => rows.map((r) => ({ id: r.entityId, ...(r.payload as any) })));
  }

  async task(userId: string, id: string) {
    const rec = await this.records.getByEntityId('collaboration', 'task', id, userId);
    return { id: rec.entityId, ...(rec.payload as any) };
  }

  createTask(userId: string, payload: any) {
    const id = payload.id || randomUUID();
    return this.records.create('collaboration', 'task', payload, id, userId);
  }

  updateTask(userId: string, id: string, payload: any) {
    return this.records.update('collaboration', 'task', id, payload, userId);
  }

  async taskComment(userId: string, id: string, payload: any) {
    const rec = await this.records.getByEntityId('collaboration', 'task', id, userId);
    const current = rec.payload as any;
    const comments = Array.isArray(current.comments) ? current.comments : [];
    comments.push({ id: randomUUID(), ...payload, createdAt: new Date().toISOString() });
    return this.records.update('collaboration', 'task', id, { ...current, comments }, userId);
  }

  async taskAttachment(userId: string, id: string, payload: any) {
    const rec = await this.records.getByEntityId('collaboration', 'task', id, userId);
    const current = rec.payload as any;
    const attachments = Array.isArray(current.attachments) ? current.attachments : [];
    attachments.push({ id: randomUUID(), ...payload, createdAt: new Date().toISOString() });
    return this.records.update('collaboration', 'task', id, { ...current, attachments }, userId);
  }

  assets(userId: string) {
    return this.records.list('collaboration', 'asset', userId).then((rows) => rows.map((r) => ({ id: r.entityId, ...(r.payload as any) })));
  }

  async asset(userId: string, id: string) {
    const rec = await this.records.getByEntityId('collaboration', 'asset', id, userId);
    return { id: rec.entityId, ...(rec.payload as any) };
  }

  createAsset(userId: string, payload: any) {
    const id = payload.id || randomUUID();
    return this.records.create('collaboration', 'asset', payload, id, userId);
  }

  async reviewAsset(userId: string, id: string, payload: any) {
    const rec = await this.records.getByEntityId('collaboration', 'asset', id, userId);
    return this.records.update('collaboration', 'asset', id, { ...(rec.payload as any), review: payload }, userId);
  }
}
