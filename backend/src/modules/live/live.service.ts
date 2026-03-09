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
    return this.prisma.liveBuilder
      .upsert({
        where: { id },
        update: {
          sessionId: String(sanitized.sessionId ?? sanitized.id ?? id),
          status: String((sanitized as any).status ?? 'draft'),
          data: sanitized as Prisma.InputJsonValue
        },
        create: {
          id,
          userId,
          sessionId: String(sanitized.sessionId ?? sanitized.id ?? id),
          status: String((sanitized as any).status ?? 'draft'),
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
    const updated = await this.prisma.liveBuilder.update({
      where: { id: existing.id },
      data: {
        data: merged as Prisma.InputJsonValue,
        published: true,
        publishedAt: new Date(),
        status: String((merged as any).status ?? existing.status ?? 'published')
      }
    });
    return this.serializeBuilder(updated);
  }

  async campaignGiveaways(campaignId: string) {
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
    const session = await this.prisma.liveSession.findFirst({
      where: { id, userId }
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return this.serializeSession(session);
  }
  createSession(userId: string, body: Record<string, unknown>) {
    const sanitized = this.ensureObjectPayload(body);
    const id = normalizeIdentifier(sanitized.id, randomUUID());
    return this.prisma.liveSession
      .create({
        data: {
          id,
          userId,
          status: String((sanitized as any).status ?? 'draft'),
          title: typeof (sanitized as any).title === 'string' ? (sanitized as any).title : null,
          scheduledAt: this.parseDate((sanitized as any).scheduledAt),
          data: sanitized as Prisma.InputJsonValue
        }
      })
      .then((session) => this.serializeSession(session));
  }
  updateSession(userId: string, id: string, body: Record<string, unknown>) {
    const sanitized = this.ensureObjectPayload(body);
    return this.prisma.liveSession
      .findFirst({ where: { id, userId } })
      .then((session) => {
        if (!session) {
          throw new NotFoundException('Session not found');
        }
        return this.prisma.liveSession.update({
          where: { id: session.id },
          data: {
            status: String((sanitized as any).status ?? session.status),
            title: typeof (sanitized as any).title === 'string' ? (sanitized as any).title : session.title,
            scheduledAt: this.parseDate((sanitized as any).scheduledAt) ?? session.scheduledAt,
            startedAt: this.parseDate((sanitized as any).startedAt) ?? session.startedAt,
            endedAt: this.parseDate((sanitized as any).endedAt) ?? session.endedAt,
            data: sanitized as Prisma.InputJsonValue
          }
        });
      })
      .then((session) => this.serializeSession(session));
  }

  async studio(userId: string, id: string) {
    const session =
      (await this.prisma.liveSession.findFirst({ where: { id, userId } })) ??
      (await this.prisma.liveSession.create({
        data: {
          id,
          userId,
          status: 'draft',
          data: { sessionId: id } as Prisma.InputJsonValue
        }
      }));

    const studio = await this.prisma.liveStudio.upsert({
      where: { userId_sessionId: { userId, sessionId: session.id } },
      update: {},
      create: {
        userId,
        sessionId: session.id,
        status: 'idle',
        data: { mode: 'builder', sessionId: session.id } as Prisma.InputJsonValue
      }
    });
    return this.serializeStudio(studio);
  }

  async startStudio(userId: string, id: string) {
    const studio = await this.studio(userId, id);
    const updated = await this.prisma.liveStudio.update({
      where: { id: studio.id },
      data: {
        status: 'live',
        startedAt: new Date(),
        data: { ...(studio.data as any), status: 'live', startedAt: new Date().toISOString() } as Prisma.InputJsonValue
      }
    });
    return this.serializeStudio(updated);
  }

  async endStudio(userId: string, id: string) {
    const studio = await this.studio(userId, id);
    const updated = await this.prisma.liveStudio.update({
      where: { id: studio.id },
      data: {
        status: 'ended',
        endedAt: new Date(),
        data: { ...(studio.data as any), status: 'ended', endedAt: new Date().toISOString() } as Prisma.InputJsonValue
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
    const studio = await this.studio(userId, id);
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
    const id = normalizeIdentifier(sessionId, randomUUID());
    return this.prisma.liveReplay
      .upsert({
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
        return this.prisma.liveReplay.update({
          where: { id: replay.id },
          data: {
            status: String((sanitized as any).status ?? replay.status),
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
    const sanitized = this.ensureObjectPayload(body);
    const merged = { ...(replay.data as any), ...sanitized };
    const updated = await this.prisma.liveReplay.update({
      where: { id: replay.id },
      data: {
        data: merged as Prisma.InputJsonValue,
        published: true,
        publishedAt: new Date(),
        status: String((merged as any).status ?? replay.status ?? 'published')
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

  private parseDate(value?: unknown) {
    if (!value) return null;
    const date = new Date(String(value));
    if (Number.isNaN(date.valueOf())) return null;
    return date;
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
