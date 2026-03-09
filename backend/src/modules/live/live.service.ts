import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { PayloadSanitizerOptions, normalizeIdentifier, sanitizePayload } from '../../common/sanitizers/payload-sanitizer.js';

@Injectable()
export class LiveService {
  constructor(private readonly prisma: PrismaService) {}

  // builder
  async builder(id: string, userId: string) {
    const builder = await this.prisma.liveBuilder.findFirst({
      where: { id, userId }
    });
    if (!builder) {
      throw new NotFoundException('Builder not found');
    }
    return this.serializeBuilder(builder);
  }
  saveBuilder(userId: string, payload: Record<string, unknown>) {
    const sanitized = this.ensureObjectPayload(payload);
    const id = normalizeIdentifier(sanitized.sessionId ?? sanitized.id, randomUUID());
    const status = this.normalizeStatus((sanitized as any).status ?? 'draft', this.builderStatuses(), 'builder');
    return this.prisma.liveBuilder
      .upsert({
        where: { id },
        update: {
          sessionId: String(sanitized.sessionId ?? sanitized.id ?? id),
          status,
          data: sanitized as Prisma.InputJsonValue
        },
        create: {
          id,
          userId,
          sessionId: String(sanitized.sessionId ?? sanitized.id ?? id),
          status,
          data: sanitized as Prisma.InputJsonValue
        }
      })
      .then((builder) => this.serializeBuilder(builder));
  }
  async publishBuilder(userId: string, id: string, payload: Record<string, unknown>) {
    const existing = await this.prisma.liveBuilder.findFirst({
      where: { id, userId }
    });
    if (!existing) {
      throw new NotFoundException('Builder not found');
    }
    const sanitized = this.ensureObjectPayload(payload);
    const merged = { ...(existing.data as any), ...sanitized };
    const status = this.normalizeStatus((merged as any).status ?? existing.status ?? 'published', this.builderStatuses(), 'builder');
    const updated = await this.prisma.liveBuilder.update({
      where: { id: existing.id },
      data: {
        data: merged as Prisma.InputJsonValue,
        published: true,
        publishedAt: new Date(),
        status
      }
    });
    return this.serializeBuilder(updated);
  }

  async campaignGiveaways(userId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        OR: [{ createdByUserId: userId }, { creatorId: userId }, { seller: { userId } }]
      }
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    const giveaways = await this.prisma.liveCampaignGiveaway.findMany({
      where: { campaignId },
      orderBy: { updatedAt: 'desc' }
    });
    return giveaways.map((giveaway) => this.serializeGiveaway(giveaway));
  }

  async sessions(userId: string) {
    const sessions = await this.prisma.liveSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
    return sessions.map((session) => this.serializeSession(session));
  }
  async session(userId: string, id: string) {
    const sessionId = this.resolveSessionId(userId, id);
    const session = await this.prisma.liveSession.findFirst({
      where: { id: sessionId, userId }
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return this.serializeSession(session);
  }
  createSession(userId: string, body: Record<string, unknown>) {
    const sanitized = this.ensureObjectPayload(body);
    const statusInput = (sanitized as any).status ?? (sanitized as any).scheduledAt ? 'scheduled' : 'draft';
    const status = this.normalizeStatus(statusInput, this.sessionStatuses(), 'session');
    const id = this.resolveSessionId(userId, String(sanitized.id ?? randomUUID()));
    return this.prisma.liveSession
      .create({
        data: {
          id,
          userId,
          status,
          title: typeof (sanitized as any).title === 'string' ? (sanitized as any).title : null,
          scheduledAt: this.parseDate((sanitized as any).scheduledAt),
          data: sanitized as Prisma.InputJsonValue
        }
      })
      .then((session) => this.serializeSession(session));
  }
  updateSession(userId: string, id: string, body: Record<string, unknown>) {
    const sanitized = this.ensureObjectPayload(body);
    const sessionId = this.resolveSessionId(userId, id);
    return this.prisma.liveSession
      .findFirst({ where: { id: sessionId, userId } })
      .then((session) => {
        if (!session) {
          throw new NotFoundException('Session not found');
        }
        const nextStatus = sanitized.status
          ? this.normalizeStatus((sanitized as any).status, this.sessionStatuses(), 'session')
          : session.status;
        this.assertTransition(session.status, nextStatus, this.sessionTransitions(), 'session');
        return this.prisma.liveSession.update({
          where: { id: session.id },
          data: {
            status: nextStatus,
            title: typeof (sanitized as any).title === 'string' ? (sanitized as any).title : session.title,
            scheduledAt: this.parseDate((sanitized as any).scheduledAt) ?? session.scheduledAt,
            startedAt:
              nextStatus === 'live'
                ? this.parseDate((sanitized as any).startedAt) ?? session.startedAt ?? new Date()
                : this.parseDate((sanitized as any).startedAt) ?? session.startedAt,
            endedAt:
              nextStatus === 'ended'
                ? this.parseDate((sanitized as any).endedAt) ?? session.endedAt ?? new Date()
                : this.parseDate((sanitized as any).endedAt) ?? session.endedAt,
            data: sanitized as Prisma.InputJsonValue
          }
        });
      })
      .then((session) => this.serializeSession(session));
  }

  async studio(userId: string, id: string) {
    const sessionId = this.resolveSessionId(userId, id);
    const studio = await this.ensureStudioRecord(userId, sessionId);
    return this.serializeStudio(studio);
  }

  async startStudio(userId: string, id: string) {
    const sessionId = this.resolveSessionId(userId, id);
    const studio = await this.ensureStudioRecord(userId, sessionId);
    this.assertTransition(studio.status, 'live', this.studioTransitions(), 'studio');
    const updated = await this.prisma.liveStudio.update({
      where: { id: studio.id },
      data: {
        status: 'live',
        startedAt: new Date(),
        data: { ...(studio.data as any), status: 'live', startedAt: new Date().toISOString() } as Prisma.InputJsonValue
      }
    });
    await this.prisma.liveSession.update({
      where: { id: studio.sessionId },
      data: {
        status: 'live',
        startedAt: new Date()
      }
    });
    return this.serializeStudio(updated);
  }

  async endStudio(userId: string, id: string) {
    const sessionId = this.resolveSessionId(userId, id);
    const studio = await this.ensureStudioRecord(userId, sessionId);
    this.assertTransition(studio.status, 'ended', this.studioTransitions(), 'studio');
    const updated = await this.prisma.liveStudio.update({
      where: { id: studio.id },
      data: {
        status: 'ended',
        endedAt: new Date(),
        data: { ...(studio.data as any), status: 'ended', endedAt: new Date().toISOString() } as Prisma.InputJsonValue
      }
    });
    await this.prisma.liveSession.update({
      where: { id: studio.sessionId },
      data: {
        status: 'ended',
        endedAt: new Date()
      }
    });
    const replay = await this.prisma.liveReplay.upsert({
      where: { id },
      update: {},
      create: {
        id,
        userId,
        sessionId: studio.sessionId,
        status: 'draft',
        published: false,
        data: { sessionId: studio.sessionId } as Prisma.InputJsonValue
      }
    });
    return { studio: this.serializeStudio(updated), replay: this.serializeReplay(replay) };
  }

  async addMoment(userId: string, id: string, payload: Record<string, unknown>) {
    const sessionId = this.resolveSessionId(userId, id);
    const studio = await this.ensureStudioRecord(userId, sessionId);
    const sanitized = this.ensureObjectPayload(payload, { maxDepth: 4, maxArrayLength: 50, maxKeys: 50 });
    const moment = await this.prisma.liveMoment.create({
      data: {
        studioId: studio.id,
        kind: typeof (sanitized as any).kind === 'string' ? (sanitized as any).kind : null,
        data: sanitized as Prisma.InputJsonValue
      }
    });
    const moments = await this.prisma.liveMoment.findMany({
      where: { studioId: studio.id },
      orderBy: { createdAt: 'desc' },
      take: 500
    });
    return {
      studio: this.serializeStudio(studio),
      moment: this.serializeMoment(moment),
      moments: moments.map((entry) => this.serializeMoment(entry))
    };
  }

  async replays(userId: string) {
    const replays = await this.prisma.liveReplay.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
    return replays.map((replay) => this.serializeReplay(replay));
  }
  async replay(userId: string, id: string) {
    const replay = await this.prisma.liveReplay.findFirst({
      where: { id, userId }
    });
    if (!replay) {
      throw new NotFoundException('Replay not found');
    }
    return this.serializeReplay(replay);
  }
  replayBySession(userId: string, sessionId: string) {
    const id = this.resolveSessionId(userId, sessionId);
    return this.prisma.liveSession
      .findFirst({ where: { id, userId } })
      .then((session) => {
        if (!session) {
          throw new NotFoundException('Session not found');
        }
        return this.prisma.liveReplay.upsert({
          where: { id },
          update: {},
          create: {
            id,
            userId,
            sessionId: id,
            status: 'draft',
            published: false,
            data: { sessionId: id } as Prisma.InputJsonValue
          }
        });
      })
      .then((replay) => this.serializeReplay(replay));
  }
  updateReplay(userId: string, id: string, body: Record<string, unknown>) {
    const sanitized = this.ensureObjectPayload(body);
    return this.prisma.liveReplay
      .findFirst({ where: { id, userId } })
      .then((replay) => {
        if (!replay) {
          throw new NotFoundException('Replay not found');
        }
        const nextStatus = sanitized.status
          ? this.normalizeStatus((sanitized as any).status, this.replayStatuses(), 'replay')
          : replay.status;
        this.assertTransition(replay.status, nextStatus, this.replayTransitions(), 'replay');
        return this.prisma.liveReplay.update({
          where: { id: replay.id },
          data: {
            status: nextStatus,
            data: sanitized as Prisma.InputJsonValue
          }
        });
      })
      .then((replay) => this.serializeReplay(replay));
  }

  async publishReplay(userId: string, id: string, body: Record<string, unknown>) {
    const replay = await this.prisma.liveReplay.findFirst({
      where: { id, userId }
    });
    if (!replay) {
      throw new NotFoundException('Replay not found');
    }
    this.assertTransition(replay.status, 'published', this.replayTransitions(), 'replay');
    const sanitized = this.ensureObjectPayload(body);
    const merged = { ...(replay.data as any), ...sanitized };
    const status = this.normalizeStatus((merged as any).status ?? 'published', this.replayStatuses(), 'replay');
    const updated = await this.prisma.liveReplay.update({
      where: { id: replay.id },
      data: {
        data: merged as Prisma.InputJsonValue,
        published: true,
        publishedAt: new Date(),
        status
      }
    });
    return this.serializeReplay(updated);
  }

  reviews(userId: string) {
    return this.prisma.review.findMany({
      where: { subjectUserId: userId, subjectType: 'SESSION' },
      orderBy: { createdAt: 'desc' }
    });
  }

  toolGet(userId: string, key: string) {
    return this.prisma.liveToolConfig
      .upsert({
        where: { userId_key: { userId, key } },
        update: {},
        create: {
          userId,
          key,
          data: {} as Prisma.InputJsonValue
        }
      })
      .then((record) => record.data ?? {});
  }

  toolPatch(userId: string, key: string, body: Record<string, unknown>) {
    const sanitized = this.ensureObjectPayload(body, { maxDepth: 5, maxArrayLength: 100, maxKeys: 100 });
    return this.prisma.liveToolConfig
      .upsert({
        where: { userId_key: { userId, key } },
        update: { data: sanitized as Prisma.InputJsonValue },
        create: { userId, key, data: sanitized as Prisma.InputJsonValue }
      })
      .then((record) => record.data ?? {});
  }

  private ensureObjectPayload(payload: unknown, overrides?: Partial<PayloadSanitizerOptions>) {
    const sanitized = sanitizePayload(payload, { maxDepth: 7, maxArrayLength: 200, maxKeys: 200, ...overrides });
    if (!sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) {
      throw new BadRequestException('Invalid payload');
    }
    return sanitized as Record<string, unknown>;
  }

  private normalizeStatus(value: unknown, allowed: readonly string[], label: string) {
    const status = String(value ?? '').trim().toLowerCase();
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Invalid ${label} status`);
    }
    return status;
  }

  private assertTransition(current: string, next: string, transitions: Record<string, string[]>, label: string) {
    const currentStatus = String(current ?? '').toLowerCase();
    const nextStatus = String(next ?? '').toLowerCase();
    if (currentStatus === nextStatus) {
      return;
    }
    const allowed = transitions[currentStatus] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(`Invalid ${label} status transition`);
    }
  }

  private sessionStatuses() {
    return ['draft', 'scheduled', 'live', 'ended', 'archived'] as const;
  }

  private sessionTransitions() {
    return {
      draft: ['scheduled', 'live', 'archived'],
      scheduled: ['live', 'archived'],
      live: ['ended'],
      ended: ['archived'],
      archived: []
    };
  }

  private studioTransitions() {
    return {
      idle: ['live'],
      live: ['ended'],
      ended: []
    };
  }

  private replayStatuses() {
    return ['draft', 'processing', 'published', 'archived'] as const;
  }

  private replayTransitions() {
    return {
      draft: ['processing', 'published', 'archived'],
      processing: ['published', 'archived'],
      published: ['archived'],
      archived: []
    };
  }

  private builderStatuses() {
    return ['draft', 'published'] as const;
  }

  private parseDate(value?: unknown) {
    if (!value) return null;
    const date = new Date(String(value));
    if (Number.isNaN(date.valueOf())) return null;
    return date;
  }

  private async ensureStudioRecord(userId: string, sessionId: string) {
    const session =
      (await this.prisma.liveSession.findFirst({ where: { id: sessionId, userId } })) ??
      (await this.prisma.liveSession.create({
        data: {
          id: sessionId,
          userId,
          status: 'draft',
          data: { sessionId } as Prisma.InputJsonValue
        }
      }));

    return this.prisma.liveStudio.upsert({
      where: { sessionId: session.id },
      update: {},
      create: {
        userId,
        sessionId: session.id,
        status: 'idle',
        data: { mode: 'builder', sessionId: session.id } as Prisma.InputJsonValue
      }
    });
  }

  private resolveSessionId(userId: string, sessionId: string) {
    const normalized = normalizeIdentifier(sessionId, randomUUID());
    if (sessionId === 'default') {
      return `default-${userId}`;
    }
    return normalized;
  }

  private serializeBuilder(builder: {
    id: string;
    sessionId: string | null;
    status: string;
    published: boolean;
    publishedAt: Date | null;
    data: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: builder.id,
      sessionId: builder.sessionId,
      status: builder.status,
      published: builder.published,
      publishedAt: builder.publishedAt?.toISOString() ?? null,
      data: builder.data ?? {},
      createdAt: builder.createdAt.toISOString(),
      updatedAt: builder.updatedAt.toISOString()
    };
  }

  private serializeSession(session: {
    id: string;
    status: string;
    title: string | null;
    scheduledAt: Date | null;
    startedAt: Date | null;
    endedAt: Date | null;
    data: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: session.id,
      status: session.status,
      title: session.title,
      scheduledAt: session.scheduledAt?.toISOString() ?? null,
      startedAt: session.startedAt?.toISOString() ?? null,
      endedAt: session.endedAt?.toISOString() ?? null,
      data: session.data ?? {},
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString()
    };
  }

  private serializeStudio(studio: {
    id: string;
    sessionId: string;
    status: string;
    startedAt: Date | null;
    endedAt: Date | null;
    data: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: studio.id,
      sessionId: studio.sessionId,
      status: studio.status,
      startedAt: studio.startedAt?.toISOString() ?? null,
      endedAt: studio.endedAt?.toISOString() ?? null,
      data: studio.data ?? {},
      createdAt: studio.createdAt.toISOString(),
      updatedAt: studio.updatedAt.toISOString()
    };
  }

  private serializeMoment(moment: {
    id: string;
    studioId: string;
    kind: string | null;
    data: unknown;
    createdAt: Date;
  }) {
    return {
      id: moment.id,
      studioId: moment.studioId,
      kind: moment.kind,
      data: moment.data ?? {},
      createdAt: moment.createdAt.toISOString()
    };
  }

  private serializeReplay(replay: {
    id: string;
    sessionId: string | null;
    status: string;
    published: boolean;
    publishedAt: Date | null;
    data: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: replay.id,
      sessionId: replay.sessionId,
      status: replay.status,
      published: replay.published,
      publishedAt: replay.publishedAt?.toISOString() ?? null,
      data: replay.data ?? {},
      createdAt: replay.createdAt.toISOString(),
      updatedAt: replay.updatedAt.toISOString()
    };
  }

  private serializeGiveaway(giveaway: {
    id: string;
    campaignId: string;
    status: string;
    title: string | null;
    data: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: giveaway.id,
      campaignId: giveaway.campaignId,
      status: giveaway.status,
      title: giveaway.title,
      data: giveaway.data ?? {},
      createdAt: giveaway.createdAt.toISOString(),
      updatedAt: giveaway.updatedAt.toISOString()
    };
  }
}
