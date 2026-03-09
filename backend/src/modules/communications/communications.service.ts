import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';

@Injectable()
export class CommunicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async messages(userId: string) {
    const threads = await this.prisma.messageThread.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
    const threadIds = threads.map((thread) => thread.id);
    const messages = threadIds.length
      ? await this.prisma.message.findMany({
          where: { threadId: { in: threadIds } },
          orderBy: { createdAt: 'desc' },
          take: 200
        })
      : [];

    return {
      tagOptions: [],
      threads: threads.map((thread) => this.serializeThread(thread)),
      messages: messages.map((message) => this.serializeMessage(message)),
      templates: []
    };
  }

  async messageThread(userId: string, threadId: string) {
    const thread = await this.prisma.messageThread.findFirst({
      where: { id: threadId, userId }
    });
    if (!thread) {
      throw new NotFoundException('Thread not found');
    }
    const messages = await this.prisma.message.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'asc' }
    });
    return { thread: this.serializeThread(thread), messages: messages.map((message) => this.serializeMessage(message)) };
  }

  async sendMessage(userId: string, threadId: string, body: SendMessageDto) {
    const thread =
      (await this.prisma.messageThread.findFirst({ where: { id: threadId, userId } })) ??
      (await this.prisma.messageThread.create({
        data: {
          id: threadId,
          userId,
          status: 'open'
        }
      }));

    await this.prisma.message.create({
      data: {
        threadId: thread.id,
        senderUserId: userId,
        senderRole: 'owner',
        body: body.text,
        lang: body.lang ?? 'en'
      }
    });

    await this.prisma.messageThread.update({
      where: { id: thread.id },
      data: { lastMessageAt: new Date() }
    });

    return this.messageThread(userId, thread.id);
  }

  async notifications(userId: string) {
    const preferences = await this.prisma.workspaceSetting.findUnique({
      where: { userId_key: { userId, key: 'notification_preferences' } }
    });
    return (preferences?.payload as Record<string, unknown>) ?? { watches: [] };
  }

  async helpSupport(userId: string) {
    const [kb, faq, status, tickets] = await Promise.all([
      this.prisma.supportContent.findMany({ where: { contentType: 'KB' }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.supportContent.findMany({ where: { contentType: 'FAQ' }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.supportContent.findMany({ where: { contentType: 'STATUS' }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.supportTicket.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
    ]);

    return {
      kb: kb.map((entry) => this.serializeSupportContent(entry)),
      faq: faq.map((entry) => this.serializeSupportContent(entry)),
      status: status.map((entry) => this.serializeSupportContent(entry)),
      tickets: tickets.map((ticket) => this.serializeSupportTicket(ticket))
    };
  }

  async createTicket(userId: string, body: CreateSupportTicketDto) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        id: body.id,
        userId,
        status: 'Open',
        marketplace: body.marketplace ?? 'General',
        category: body.category ?? 'Support',
        subject: body.subject ?? 'Untitled',
        severity: body.severity ?? 'medium',
        ref: body.ref
      }
    });
    return this.serializeSupportTicket(ticket);
  }

  async systemStatus(userId: string) {
    const status = await this.prisma.supportContent.findMany({
      where: { contentType: 'STATUS' },
      orderBy: { updatedAt: 'desc' }
    });
    return { services: status.map((entry) => this.serializeSupportContent(entry)) };
  }

  private serializeThread(thread: {
    id: string;
    subject: string | null;
    status: string;
    channel: string | null;
    priority: string | null;
    lastMessageAt: Date | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: thread.id,
      subject: thread.subject,
      status: thread.status,
      channel: thread.channel,
      priority: thread.priority,
      lastMessageAt: thread.lastMessageAt?.toISOString() ?? null,
      metadata: thread.metadata ?? null,
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString()
    };
  }

  private serializeMessage(message: {
    id: string;
    threadId: string;
    senderUserId: string | null;
    senderRole: string | null;
    body: string;
    lang: string | null;
    metadata: unknown;
    createdAt: Date;
  }) {
    return {
      id: message.id,
      threadId: message.threadId,
      senderUserId: message.senderUserId,
      senderRole: message.senderRole,
      body: message.body,
      lang: message.lang ?? 'en',
      metadata: message.metadata ?? null,
      createdAt: message.createdAt.toISOString()
    };
  }

  private serializeSupportTicket(ticket: {
    id: string;
    status: string;
    marketplace: string | null;
    category: string | null;
    subject: string | null;
    severity: string | null;
    ref: string | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: ticket.id,
      status: ticket.status,
      marketplace: ticket.marketplace ?? null,
      category: ticket.category ?? null,
      subject: ticket.subject ?? null,
      severity: ticket.severity ?? null,
      ref: ticket.ref ?? null,
      metadata: ticket.metadata ?? null,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString()
    };
  }

  private serializeSupportContent(entry: {
    id: string;
    contentType: string;
    title: string;
    body: string | null;
    status: string | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: entry.id,
      type: entry.contentType,
      title: entry.title,
      body: entry.body,
      status: entry.status,
      metadata: entry.metadata ?? null,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString()
    };
  }
}
