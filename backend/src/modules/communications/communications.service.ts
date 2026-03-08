import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AppRecordsService } from '../../platform/app-records.service.js';

@Injectable()
export class CommunicationsService {
  constructor(private readonly records: AppRecordsService) {}

  messages(userId: string) {
    return this.records.getByEntityId('seller_workspace', 'messages', 'main', userId).then((r) => r.payload).catch(() => ({ tagOptions: [], threads: [], messages: [], templates: [] }));
  }

  async messageThread(userId: string, threadId: string) {
    const payload = await this.messages(userId);
    const thread = (payload as any).threads?.find((entry: any) => entry.id === threadId);
    if (!thread) {
      throw new NotFoundException('Thread not found');
    }
    return {
      thread,
      messages: ((payload as any).messages ?? []).filter((entry: any) => entry.threadId === threadId)
    };
  }

  async sendMessage(userId: string, threadId: string, body: { text: string; lang?: string }) {
    const payload = (await this.messages(userId)) as any;
    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    messages.push({
      id: randomUUID(),
      threadId,
      sender: 'me',
      text: body.text,
      lang: body.lang ?? 'en',
      at: new Date().toISOString()
    });
    return this.records.upsert('seller_workspace', 'messages', 'main', { ...payload, messages }, userId);
  }

  notifications(userId: string) {
    return this.records.getByEntityId('seller_workspace', 'notifications_preferences', 'main', userId).then((r) => r.payload).catch(() => ({ watches: [] }));
  }

  helpSupport(userId: string) {
    return this.records.getByEntityId('seller_workspace', 'help_support', 'main', userId).then((r) => r.payload).catch(() => ({ kb: [], faq: [], status: [], tickets: [] }));
  }

  async createTicket(userId: string, body: any) {
    const payload = (await this.helpSupport(userId)) as any;
    const tickets = Array.isArray(payload.tickets) ? payload.tickets : [];
    tickets.unshift({
      id: body.id ?? randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'Open',
      marketplace: body.marketplace ?? 'General',
      category: body.category ?? 'Support',
      subject: body.subject ?? 'Untitled',
      severity: body.severity ?? 'medium',
      ref: body.ref
    });
    return this.records.upsert('seller_workspace', 'help_support', 'main', { ...payload, tickets }, userId);
  }

  systemStatus(userId: string) {
    return this.records.getByEntityId('seller_workspace', 'system_status', 'main', userId).then((r) => r.payload).catch(() => ({ services: [] }));
  }
}
