import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizeListQuery } from '../../common/dto/list-query.dto.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { RealtimeService } from '../../platform/realtime/realtime.service.js';
import { JobsService } from '../jobs/jobs.service.js';
import { AssignSupportTicketDto } from './dto/assign-support-ticket.dto.js';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto.js';
import { EscalateSupportTicketDto } from './dto/escalate-support-ticket.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { SupportTicketQueryDto } from './dto/support-ticket-query.dto.js';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto.js';

const SUPPORT_STATUS_TRANSITIONS: Record<string, string[]> = {
  OPEN: ['IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED', 'ESCALATED'],
  IN_PROGRESS: ['WAITING', 'RESOLVED', 'CLOSED', 'ESCALATED'],
  WAITING: ['IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED'],
  ESCALATED: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  REOPENED: ['IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED', 'ESCALATED'],
  CLOSED: []
};

@Injectable()
export class CommunicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
    private readonly jobsService: JobsService
  ) {}

  async messages(userId: string, role: string) {
    const [threads, templatesRecord] = await Promise.all([
      this.prisma.messageThread.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' }
      }),
      this.prisma.workspaceSetting.findUnique({
        where: { userId_key: { userId, key: this.scopedKey(role, 'messages_page') } }
      })
    ]);
    const scopedThreads = threads.filter((thread) => this.matchesRoleMetadata(thread.metadata, role));

    const templatesPayload =
      ((templatesRecord?.payload as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
    const threadIds = scopedThreads.map((thread) => thread.id);
    const messages = threadIds.length
      ? await this.prisma.message.findMany({
          where: { threadId: { in: threadIds } },
          orderBy: { createdAt: 'asc' }
        })
      : [];

    const mappedThreads = scopedThreads.length
      ? scopedThreads.map((thread) => this.serializeInboxThread(thread, messages))
      : [];
    const mappedMessages = messages.length
      ? messages.map((message) => this.serializeChatMessage(message))
      : [];
    const templates = this.readArray(templatesPayload.templates);
    const tagOptions = this.readStringArray(templatesPayload.tagOptions);

    return {
      tagOptions:
        tagOptions.length > 0
          ? tagOptions
          : Array.from(
              new Set(
                mappedThreads.flatMap((thread) =>
                  Array.isArray((thread as Record<string, unknown>).tags)
                    ? ((thread as Record<string, unknown>).tags as string[])
                    : []
                )
              )
            ),
      threads: mappedThreads,
      messages: mappedMessages,
      templates
    };
  }

  async messageThread(userId: string, role: string, threadId: string) {
    const thread = await this.prisma.messageThread.findFirst({
      where: { id: threadId, userId }
    });
    if (!thread || !this.matchesRoleMetadata(thread.metadata, role)) {
      throw new NotFoundException('Thread not found');
    }
    const messages = await this.prisma.message.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'asc' }
    });
    return { thread: this.serializeThread(thread), messages: messages.map((message) => this.serializeMessage(message)) };
  }

  async sendMessage(userId: string, role: string, threadId: string, body: SendMessageDto) {
    const existingThread = await this.prisma.messageThread.findFirst({ where: { id: threadId, userId } });
    const thread =
      (existingThread && this.matchesRoleMetadata(existingThread.metadata, role) ? existingThread : null) ??
      (await this.prisma.messageThread.create({
        data: {
          id: threadId,
          userId,
          status: 'open',
          metadata: { workspaceRole: String(role || '').toUpperCase() } as Prisma.InputJsonValue
        }
      }));

    const now = new Date();
    const message = await this.prisma.message.create({
      data: {
        threadId: thread.id,
        senderUserId: userId,
        senderRole: 'owner',
        body: body.text,
        lang: body.lang ?? 'en'
      }
    });

    await this.jobsService.enqueue({
      queue: 'moderation',
      type: 'MODERATION_SCAN',
      payload: { targetType: 'message', targetId: message.id }
    });

    await this.prisma.messageThread.update({
      where: { id: thread.id },
      data: {
        lastMessageAt: now,
        lastMessageFromRole: 'owner',
        lastReadAt: now
      }
    });

    await this.realtime.publishUserEvent(userId, {
      type: 'message.created',
      threadId: thread.id,
      messageId: message.id,
      createdAt: message.createdAt.toISOString()
    });

    return this.messageThread(userId, role, thread.id);
  }

  async markThreadRead(userId: string, role: string, threadId: string) {
    const thread = await this.prisma.messageThread.findFirst({
      where: { id: threadId, userId }
    });
    if (!thread || !this.matchesRoleMetadata(thread.metadata, role)) {
      throw new NotFoundException('Thread not found');
    }

    await this.prisma.messageThread.update({
      where: { id: thread.id },
      data: { lastReadAt: new Date() }
    });

    return this.messageThread(userId, role, thread.id);
  }

  async markAllRead(userId: string, role: string) {
    const threads = await this.prisma.messageThread.findMany({
      where: { userId },
      select: { id: true, metadata: true }
    });
    const ids = threads
      .filter((thread) => this.matchesRoleMetadata(thread.metadata, role))
      .map((thread) => thread.id);
    if (ids.length > 0) {
      await this.prisma.messageThread.updateMany({
        where: { id: { in: ids } },
        data: { lastReadAt: new Date() }
      });
    }
    return { updated: true };
  }

  async updateTemplates(userId: string, role: string, templates: unknown[]) {
    const current = await this.prisma.workspaceSetting.findUnique({
      where: { userId_key: { userId, key: this.scopedKey(role, 'messages_page') } }
    });
    const currentPayload = (current?.payload as Record<string, unknown> | null) ?? {};
    const next = {
      tagOptions: this.readStringArray(currentPayload.tagOptions),
      templates
    };

    const record = await this.prisma.workspaceSetting.upsert({
      where: { userId_key: { userId, key: this.scopedKey(role, 'messages_page') } },
      update: { payload: next as Prisma.InputJsonValue },
      create: { userId, key: this.scopedKey(role, 'messages_page'), payload: next as Prisma.InputJsonValue }
    });

    return record.payload as Record<string, unknown>;
  }

  async notifications(userId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { ownerUserId: userId }
    });
    if (workspace) {
      const preferences = await this.prisma.workspaceNotificationPreference.findMany({
        where: { workspaceId: workspace.id, userId },
        include: {
          watches: {
            orderBy: [{ position: 'asc' }, { createdAt: 'asc' }]
          }
        },
        orderBy: { createdAt: 'asc' }
      });
      if (preferences.length > 0) {
        return {
          watches: preferences.flatMap((preference) =>
            preference.watches.map((watch) =>
              watch.payload && typeof watch.payload === 'object' && !Array.isArray(watch.payload)
                ? { id: watch.externalId, ...(watch.payload as Record<string, unknown>) }
                : { id: watch.externalId }
            )
          )
        };
      }
    }
    const legacy = await this.prisma.workspaceSetting.findUnique({
      where: { userId_key: { userId, key: 'notification_preferences' } }
    });
    return (legacy?.payload as Record<string, unknown>) ?? { watches: [] };
  }

  async helpSupport(userId: string, role: string) {
    const [kb, faq, status, updates, tickets] = await Promise.all([
      this.prisma.supportContent.findMany({ where: { contentType: 'KB' }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.supportContent.findMany({ where: { contentType: 'FAQ' }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.supportContent.findMany({ where: { contentType: 'STATUS' }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.supportContent.findMany({ where: { contentType: 'CHANGELOG' }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.supportTicket.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
    ]);
    const scopedTickets = tickets.filter((ticket) => this.matchesRoleMetadata(ticket.metadata, role));

    return {
      kb: kb.map((entry) => this.serializeSupportContent(entry)),
      faq: faq.map((entry) => this.serializeSupportContent(entry)),
      status: status.map((entry) => this.serializeSupportContent(entry)),
      updates: updates.map((entry) => this.serializeSupportContent(entry)),
      tickets: scopedTickets.map((ticket) => this.serializeSupportTicket(ticket))
    };
  }

  async createTicket(userId: string, role: string, body: CreateSupportTicketDto) {
    const ticketId = body.id?.trim() || randomUUID();
    const metadata = { workspaceRole: String(role || '').toUpperCase() } as Prisma.InputJsonValue;
    const ticket = await this.prisma.$transaction(async (tx) => {
      await tx.messageThread.create({
        data: {
          id: ticketId,
          userId,
          subject: body.subject ?? 'Untitled',
          status: 'open',
          priority: body.severity ?? 'medium',
          metadata
        }
      });

      return tx.supportTicket.create({
        data: {
          id: ticketId,
          threadId: ticketId,
          userId,
          status: 'OPEN',
          marketplace: body.marketplace ?? 'General',
          category: body.category ?? 'Support',
          subject: body.subject ?? 'Untitled',
          severity: body.severity ?? 'medium',
          ref: body.ref,
          metadata
        }
      });
    });

    await Promise.all([
      this.audit.log({
        userId,
        action: 'support.ticket_created',
        entityType: 'support_ticket',
        entityId: ticket.id,
        route: '/api/help-support/tickets',
        method: 'POST',
        statusCode: 201,
        metadata: { category: ticket.category, severity: ticket.severity }
      }),
      this.realtime.publishUserEvent(userId, {
        type: 'support.ticket.created',
        ticketId: ticket.id,
        status: ticket.status,
        createdAt: ticket.createdAt.toISOString()
      }),
      this.jobsService.enqueue({
        queue: 'moderation',
        type: 'MODERATION_SCAN',
        payload: { targetType: 'support_ticket', targetId: ticket.id },
        dedupeKey: `moderation:support_ticket:${ticket.id}`
      })
    ]);
    return this.serializeSupportTicket(ticket);
  }

  async supportTicket(userId: string, role: string, id: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, userId }
    });
    if (!ticket || !this.matchesRoleMetadata(ticket.metadata, role)) {
      throw new NotFoundException('Support ticket not found');
    }
    return this.serializeSupportTicket(ticket);
  }

  async supportTicketsForStaff(query?: SupportTicketQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    const status = query?.status ? this.normalizeSupportStatus(query.status) : undefined;
    const where: Prisma.SupportTicketWhereInput = {
      ...(status ? { status } : {}),
      ...(query?.assigneeUserId ? { assignedToUserId: query.assigneeUserId } : {}),
      ...(query?.q
        ? {
            OR: [
              { subject: { contains: query.q } },
              { category: { contains: query.q } },
              { ref: { contains: query.q } }
            ]
          }
        : {})
    };
    const tickets = await this.prisma.supportTicket.findMany({
      where,
      skip,
      take,
      orderBy: { updatedAt: 'desc' }
    });
    return { tickets: tickets.map((ticket) => this.serializeSupportTicket(ticket)) };
  }

  async supportTicketForStaff(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id }
    });
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }
    return this.serializeSupportTicket(ticket);
  }

  async updateSupportTicket(userId: string, id: string, body: UpdateSupportTicketDto) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }
    const nextStatus = body.status ? this.normalizeSupportStatus(body.status) : ticket.status;
    if (body.status) {
      this.assertSupportTransition(ticket.status, nextStatus);
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: nextStatus,
        category: body.category ?? undefined,
        subject: body.subject ?? undefined,
        severity: body.severity ?? undefined,
        ref: body.ref ?? undefined,
        closedAt: nextStatus === 'CLOSED' ? new Date() : ticket.closedAt
      }
    });
    await this.audit.log({
      userId,
      action: 'support.ticket_updated',
      entityType: 'support_ticket',
      entityId: id,
      route: `/api/support/tickets/${id}`,
      method: 'PATCH',
      statusCode: 200,
      metadata: { status: updated.status }
    });
    return this.serializeSupportTicket(updated);
  }

  async updateOwnSupportTicket(userId: string, role: string, id: string, body: UpdateSupportTicketDto) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, userId }
    });
    if (!ticket || !this.matchesRoleMetadata(ticket.metadata, role)) {
      throw new NotFoundException('Support ticket not found');
    }

    const nextStatus = body.status ? this.normalizeSupportStatus(body.status) : ticket.status;
    if (body.status) {
      this.assertSupportTransition(ticket.status, nextStatus);
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: nextStatus,
        category: body.category ?? undefined,
        subject: body.subject ?? undefined,
        severity: body.severity ?? undefined,
        ref: body.ref ?? undefined,
        closedAt: nextStatus === 'CLOSED' ? new Date() : nextStatus === 'RESOLVED' ? ticket.closedAt : null
      }
    });
    await this.audit.log({
      userId,
      action: 'support.ticket_updated_by_owner',
      entityType: 'support_ticket',
      entityId: id,
      route: `/api/help-support/tickets/${id}`,
      method: 'PATCH',
      statusCode: 200,
      metadata: { status: updated.status }
    });
    await this.realtime.publishUserEvent(userId, {
      type: 'support.ticket.updated',
      ticketId: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString()
    });
    return this.serializeSupportTicket(updated);
  }

  async assignSupportTicket(userId: string, id: string, body: AssignSupportTicketDto) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }
    if (body.assigneeUserId) {
      const assignee = await this.prisma.user.findUnique({
        where: { id: body.assigneeUserId },
        select: { role: true, roleAssignments: true }
      });
      if (!assignee) {
        throw new NotFoundException('Assignee not found');
      }
      const roles = new Set(
        assignee.roleAssignments?.map((assignment) => assignment.role) ?? []
      );
      roles.add(assignee.role);
      if (!roles.has('SUPPORT') && !roles.has('ADMIN')) {
        throw new BadRequestException('Assignee must be a support or admin user');
      }
    }
    const updated = await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        assignedToUserId: body.assigneeUserId ?? null,
        assignedAt: body.assigneeUserId ? new Date() : null
      }
    });
    await this.audit.log({
      userId,
      action: 'support.ticket_assigned',
      entityType: 'support_ticket',
      entityId: id,
      route: `/api/support/tickets/${id}/assign`,
      method: 'POST',
      statusCode: 200,
      metadata: { assigneeUserId: updated.assignedToUserId }
    });
    return this.serializeSupportTicket(updated);
  }

  async escalateSupportTicket(userId: string, id: string, body: EscalateSupportTicketDto) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }
    this.assertSupportTransition(ticket.status, 'ESCALATED');
    const updated = await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: 'ESCALATED',
        escalatedAt: new Date(),
        metadata: {
          ...(ticket.metadata as Record<string, unknown>),
          escalation: {
            level: body.level ?? null,
            reason: body.reason ?? null,
            at: new Date().toISOString()
          }
        } as Prisma.InputJsonValue
      }
    });
    await this.audit.log({
      userId,
      action: 'support.ticket_escalated',
      entityType: 'support_ticket',
      entityId: id,
      route: `/api/support/tickets/${id}/escalate`,
      method: 'POST',
      statusCode: 200
    });
    return this.serializeSupportTicket(updated);
  }

  async systemStatus(userId: string) {
    const status = await this.prisma.supportContent.findMany({
      where: { contentType: 'STATUS' },
      orderBy: { updatedAt: 'desc' }
    });
    return { services: status.map((entry) => this.serializeSupportContent(entry)) };
  }

  private scopedKey(role: string, key: string) {
    return `${String(role || 'seller').toLowerCase()}:${key}`;
  }

  private matchesRoleMetadata(metadata: unknown, role: string) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return false;
    }
    const workspaceRole = (metadata as Record<string, unknown>).workspaceRole;
    return String(workspaceRole || '').toUpperCase() === String(role || '').toUpperCase();
  }

  private serializeThread(thread: {
    id: string;
    subject: string | null;
    status: string;
    channel: string | null;
    priority: string | null;
    lastMessageAt: Date | null;
    lastMessageFromRole: string | null;
    lastReadAt: Date | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const hasUnread =
      Boolean(thread.lastMessageAt) &&
      (!thread.lastReadAt || thread.lastMessageAt > thread.lastReadAt) &&
      (thread.lastMessageFromRole ?? 'owner') !== 'owner';
    return {
      id: thread.id,
      subject: thread.subject,
      status: thread.status,
      channel: thread.channel,
      priority: thread.priority,
      lastMessageAt: thread.lastMessageAt?.toISOString() ?? null,
      lastMessageFromRole: thread.lastMessageFromRole ?? null,
      lastReadAt: thread.lastReadAt?.toISOString() ?? null,
      hasUnread,
      metadata: thread.metadata ?? null,
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString()
    };
  }

  private serializeInboxThread(
    thread: {
      id: string;
      subject: string | null;
      status: string;
      channel: string | null;
      priority: string | null;
      lastMessageAt: Date | null;
      lastMessageFromRole: string | null;
      lastReadAt: Date | null;
      metadata: unknown;
      createdAt: Date;
      updatedAt: Date;
    },
    messages: Array<{
      id: string;
      threadId: string;
      senderUserId: string | null;
      senderRole: string | null;
      body: string;
      lang: string | null;
      metadata: unknown;
      createdAt: Date;
    }>
  ) {
    const base = this.serializeThread(thread);
    const meta = (thread.metadata as Record<string, unknown> | null) ?? {};
    const lastMessage =
      messages.filter((entry) => entry.threadId === thread.id).slice(-1)[0]?.body ??
      (typeof meta.lastMessage === 'string' ? meta.lastMessage : '') ??
      '';
    const participants = Array.isArray(meta.participants) ? meta.participants : [];
    const tags = Array.isArray(meta.tags) ? meta.tags.map((entry) => String(entry)) : [];

    return {
      id: thread.id,
      title: typeof meta.title === 'string' ? meta.title : base.subject ?? `Thread ${thread.id}`,
      participants,
      lastMessage,
      lastAt: base.lastMessageAt ?? base.updatedAt,
      unreadCount: base.hasUnread ? 1 : 0,
      tags,
      customerLang: typeof meta.customerLang === 'string' ? meta.customerLang : 'en',
      myLang: typeof meta.myLang === 'string' ? meta.myLang : 'en',
      responseSlaDueAt:
        typeof meta.responseSlaDueAt === 'string' ? meta.responseSlaDueAt : undefined,
      priority:
        base.priority === 'high' || base.priority === 'normal'
          ? base.priority
          : (typeof meta.priority === 'string' ? meta.priority : 'normal')
    };
  }

  private serializeChatMessage(message: {
    id: string;
    threadId: string;
    senderUserId: string | null;
    senderRole: string | null;
    body: string;
    lang: string | null;
    metadata: unknown;
    createdAt: Date;
  }) {
    const base = this.serializeMessage(message);
    const meta = (message.metadata as Record<string, unknown> | null) ?? {};
    return {
      id: base.id,
      threadId: base.threadId,
      sender: base.senderRole === 'owner' ? 'me' : 'other',
      text: base.body,
      lang: base.lang,
      at: base.createdAt,
      attachments: Array.isArray(meta.attachments) ? meta.attachments : undefined
    };
  }

  private readArray(value: unknown) {
    return Array.isArray(value) ? value : [];
  }

  private readStringArray(value: unknown) {
    return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
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
    userId: string;
    status: string;
    marketplace: string | null;
    category: string | null;
    subject: string | null;
    severity: string | null;
    ref: string | null;
    threadId: string | null;
    assignedToUserId: string | null;
    assignedAt: Date | null;
    escalatedAt: Date | null;
    closedAt: Date | null;
    lastResponseAt: Date | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: ticket.id,
      userId: ticket.userId,
      status: ticket.status,
      marketplace: ticket.marketplace ?? null,
      category: ticket.category ?? null,
      subject: ticket.subject ?? null,
      severity: ticket.severity ?? null,
      ref: ticket.ref ?? null,
      threadId: ticket.threadId ?? null,
      assignedToUserId: ticket.assignedToUserId ?? null,
      assignedAt: ticket.assignedAt?.toISOString() ?? null,
      escalatedAt: ticket.escalatedAt?.toISOString() ?? null,
      closedAt: ticket.closedAt?.toISOString() ?? null,
      lastResponseAt: ticket.lastResponseAt?.toISOString() ?? null,
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

  private normalizeSupportStatus(status: string) {
    return String(status || 'OPEN').trim().toUpperCase();
  }

  private assertSupportTransition(current: string, next: string) {
    const from = this.normalizeSupportStatus(current);
    const to = this.normalizeSupportStatus(next);
    if (from === to) {
      return;
    }
    const allowed = SUPPORT_STATUS_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException('Invalid support ticket status transition');
    }
  }
}
