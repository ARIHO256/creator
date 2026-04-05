import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { PayloadSanitizerOptions, normalizeIdentifier, sanitizePayload } from '../../common/sanitizers/payload-sanitizer.js';
import { CreateLiveMomentDto } from './dto/create-live-moment.dto.js';
import { PublishLiveBuilderDto } from './dto/publish-live-builder.dto.js';
import { PublishLiveReplayDto } from './dto/publish-live-replay.dto.js';
import { SaveLiveBuilderDto } from './dto/save-live-builder.dto.js';
import { UpdateLiveReplayDto } from './dto/update-live-replay.dto.js';
import { UpdateLiveStudioDto } from './dto/update-live-studio.dto.js';
import { UpdateLiveToolDto } from './dto/update-live-tool.dto.js';
import { UpsertLiveSessionDto } from './dto/upsert-live-session.dto.js';

@Injectable()
export class LiveService {
  private readonly logger = new Logger(LiveService.name);

  constructor(private readonly prisma: PrismaService) {}

  // builder
  async builder(id: string, userId: string) {
    const sessionKey = normalizeIdentifier(id, randomUUID());
    const builder = await this.ensureBuilderRecord(userId, sessionKey);
    return this.serializeBuilder(builder);
  }
  async saveBuilder(userId: string, payload: SaveLiveBuilderDto) {
    const sanitized = this.ensureObjectPayload(this.extractPayload(payload));
    const sessionKey = normalizeIdentifier(sanitized.sessionId ?? sanitized.id, randomUUID());
    const status = this.normalizeStatus((sanitized as any).status ?? 'draft', this.builderStatuses(), 'builder');
    await this.ensureBuilderSessionRecord(userId, sessionKey);
    const existing = await this.findBuilderRecord(userId, sessionKey);
    const builder = existing
      ? await this.prisma.liveBuilder.update({
          where: { id: existing.id },
          data: {
            sessionId: sessionKey,
            status,
            data: sanitized as Prisma.InputJsonValue
          }
        })
      : await this.prisma.liveBuilder.create({
          data: {
            userId,
            sessionId: sessionKey,
            status,
            data: sanitized as Prisma.InputJsonValue
          }
        });
    return this.serializeBuilder(builder);
  }
  async publishBuilder(userId: string, id: string, payload: PublishLiveBuilderDto) {
    const sessionKey = normalizeIdentifier(id, randomUUID());
    const existing = await this.findBuilderRecord(userId, sessionKey);
    if (!existing) {
      throw new NotFoundException('Builder not found');
    }
    const sanitized = this.ensureObjectPayload(this.extractPayload(payload));
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
  async scheduleWorkspace(userId: string) {
    const [workspace, config] = await Promise.all([
      this.buildDashboardWorkspace(userId),
      this.readWorkspaceSetting(userId, 'seller_live_schedule')
    ]);

    return {
      sessions: workspace.sessions.map((session) => ({
        id: session.id,
        title: session.title,
        status: session.scheduleStatus,
        campaign: session.campaignName,
        supplier: session.supplierName,
        host: session.hostName,
        hostRole: session.hostRole,
        approvalMode: session.approvalMode,
        creatorUsage: session.creatorUsage,
        collabMode: session.collabMode,
        location: session.location,
        simulcast: session.platforms.join(', '),
        scriptsReady: session.scriptsReady,
        assetsReady: session.assetsReady,
        productsCount: session.productsCount,
        durationMin: session.durationMin,
        workloadScore: session.workloadScore,
        conflict: session.conflict,
        startISO: session.startISO,
        endISO: session.endISO,
        weekday: session.weekday,
        dateLabel: session.dateLabel,
        time: session.timeLabel
      })),
      aiSlots:
        Array.isArray(config?.aiSlots) && config.aiSlots.length > 0
          ? config.aiSlots
          : this.buildAiSlotsFromSessions(workspace.sessions)
    };
  }

  async dashboardWorkspace(userId: string) {
    const workspace = await this.buildDashboardWorkspace(userId);
    return {
      sessions: workspace.sessions.map((session) => ({
        id: session.id,
        title: session.title,
        status: session.dashboardStatus,
        supplierId: session.supplierId,
        campaignId: session.campaignId,
        hostId: session.hostId,
        hostRole: session.hostRole,
        platforms: session.platforms,
        heroImageUrl: session.heroImageUrl,
        heroVideoUrl: session.heroVideoUrl,
        desktopMode: session.desktopMode,
        startISO: session.startISO,
        endISO: session.endISO,
        peakViewers: session.peakViewers,
        avgWatchMin: session.avgWatchMin,
        chatRate: session.chatRate,
        gmv: session.gmv,
        crewConflicts: session.crewConflicts
      })),
      suppliers: workspace.suppliers,
      campaigns: workspace.campaigns,
      hosts: workspace.hosts
    };
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
  createSession(userId: string, body: UpsertLiveSessionDto) {
    const sanitized = this.ensureObjectPayload(this.extractPayload(body));
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
  updateSession(userId: string, id: string, body: UpsertLiveSessionDto) {
    const sanitized = this.ensureObjectPayload(this.extractPayload(body));
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
    const sessionId = await this.resolveStudioSessionId(userId, id);
    const studio = await this.ensureStudioRecord(userId, sessionId);
    return this.serializeStudio(studio);
  }

  async updateStudio(userId: string, id: string, body: UpdateLiveStudioDto) {
    const sessionId = await this.resolveStudioSessionId(userId, id);
    const studio = await this.ensureStudioRecord(userId, sessionId);
    const sanitized = this.ensureObjectPayload(this.extractPayload(body), { maxDepth: 6, maxArrayLength: 250, maxKeys: 250 });
    const patch = { ...sanitized };
    if (patch.data && typeof patch.data === 'object' && !Array.isArray(patch.data)) {
      Object.assign(patch, patch.data as Record<string, unknown>);
      delete patch.data;
    }
    const currentData =
      studio.data && typeof studio.data === 'object' && !Array.isArray(studio.data)
        ? { ...(studio.data as Record<string, unknown>) }
        : {};
    if (currentData.data && typeof currentData.data === 'object' && !Array.isArray(currentData.data)) {
      delete currentData.data;
    }
    const merged = { ...currentData, ...patch };
    const updated = await this.prisma.liveStudio.update({
      where: { id: studio.id },
      data: {
        data: merged as Prisma.InputJsonValue
      }
    });
    return this.serializeStudio(updated);
  }

  async startStudio(userId: string, id: string) {
    const sessionId = await this.resolveStudioSessionId(userId, id);
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
    const sessionId = await this.resolveStudioSessionId(userId, id);
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
      where: { id: sessionId },
      update: {},
      create: {
        id: sessionId,
        userId,
        sessionId: studio.sessionId,
        status: 'draft',
        published: false,
        data: { sessionId: studio.sessionId } as Prisma.InputJsonValue
      }
    });
    return { studio: this.serializeStudio(updated), replay: this.serializeReplay(replay) };
  }

  async addMoment(userId: string, id: string, payload: CreateLiveMomentDto) {
    const sessionId = await this.resolveStudioSessionId(userId, id);
    const studio = await this.ensureStudioRecord(userId, sessionId);
    const sanitized = this.ensureObjectPayload(this.extractPayload(payload), { maxDepth: 4, maxArrayLength: 50, maxKeys: 50 });
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
    try {
      const replays = await this.prisma.liveReplay.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' }
      });
      return replays.map((replay) => this.serializeReplay(replay));
    } catch (error) {
      if (!this.isRecoverableReplayListError(error)) {
        throw error;
      }
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Returning empty replay list for user ${userId} after recoverable storage error: ${detail}`);
      return [];
    }
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
  updateReplay(userId: string, id: string, body: UpdateLiveReplayDto) {
    const sanitized = this.ensureObjectPayload(this.extractPayload(body));
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
        const merged = { ...(replay.data as any), ...sanitized };
        return this.prisma.liveReplay.update({
          where: { id: replay.id },
          data: {
            status: nextStatus,
            data: merged as Prisma.InputJsonValue
          }
        });
      })
      .then((replay) => this.serializeReplay(replay));
  }

  async publishReplay(userId: string, id: string, body: PublishLiveReplayDto) {
    const replay = await this.prisma.liveReplay.findFirst({
      where: { id, userId }
    });
    if (!replay) {
      throw new NotFoundException('Replay not found');
    }
    this.assertTransition(replay.status, 'published', this.replayTransitions(), 'replay');
    const sanitized = this.ensureObjectPayload(this.extractPayload(body));
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

  async toolGet(userId: string, key: string) {
    const existing = await this.prisma.liveToolConfig.findUnique({
      where: { userId_key: { userId, key } }
    });
    const currentData =
      existing?.data && typeof existing.data === 'object' && !Array.isArray(existing.data)
        ? (existing.data as Record<string, unknown>)
        : {};

    if (existing) {
      return currentData;
    }

    const record = await this.prisma.liveToolConfig.create({
      data: {
        userId,
        key,
        data: {} as Prisma.InputJsonValue
      }
    });
    return (record.data as Record<string, unknown>) ?? {};
  }

  toolPatch(userId: string, key: string, body: UpdateLiveToolDto) {
    const sanitized = this.ensureObjectPayload(this.extractPayload(body), { maxDepth: 5, maxArrayLength: 100, maxKeys: 100 });
    return this.prisma.liveToolConfig
      .upsert({
        where: { userId_key: { userId, key } },
        update: { data: sanitized as Prisma.InputJsonValue },
        create: { userId, key, data: sanitized as Prisma.InputJsonValue }
      })
      .then((record) => record.data ?? {});
  }

  private toLocalInputValue(date: Date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-') + `T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  private ensureObjectPayload(payload: unknown, overrides?: Partial<PayloadSanitizerOptions>) {
    const sanitized = sanitizePayload(payload, { maxDepth: 7, maxArrayLength: 200, maxKeys: 200, ...overrides });
    if (!sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) {
      throw new BadRequestException('Invalid payload');
    }
    return sanitized as Record<string, unknown>;
  }

  private extractPayload(input: Record<string, unknown> | { payload?: Record<string, unknown> }) {
    if (
      input &&
      typeof input === 'object' &&
      !Array.isArray(input) &&
      input.payload &&
      typeof input.payload === 'object' &&
      !Array.isArray(input.payload)
    ) {
      return input.payload as Record<string, unknown>;
    }
    return input;
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
    const existingSession = await this.prisma.liveSession.findUnique({
      where: { id: sessionId }
    });
    if (existingSession && existingSession.userId !== userId) {
      throw new NotFoundException('Studio not found');
    }

    const session =
      existingSession ??
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

  private isRecoverableReplayListError(error: unknown) {
    const code = (error as { code?: string } | null)?.code;
    if (code === 'P2021' || code === 'P2022') {
      return true;
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return true;
    }

    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    return (
      message.includes('server has closed the connection') ||
      message.includes("can't reach database server") ||
      message.includes('connection terminated unexpectedly') ||
      message.includes('socket hang up') ||
      message.includes('broken pipe')
    );
  }

  private async resolveStudioSessionId(userId: string, studioIdentifier: string) {
    const normalized = this.resolveSessionId(userId, studioIdentifier);
    const studio = await this.prisma.liveStudio.findFirst({
      where: {
        userId,
        OR: [{ id: normalized }, { sessionId: normalized }]
      },
      select: { sessionId: true }
    });
    return studio?.sessionId ?? normalized;
  }

  private findBuilderRecord(userId: string, identifier: string) {
    return this.prisma.liveBuilder.findFirst({
      where: {
        userId,
        OR: [{ id: identifier }, { sessionId: identifier }]
      }
    });
  }

  private async ensureBuilderRecord(userId: string, sessionKey: string) {
    const existing = await this.findBuilderRecord(userId, sessionKey);
    if (existing) {
      return existing;
    }

    await this.ensureBuilderSessionRecord(userId, sessionKey);

    return this.prisma.liveBuilder.create({
      data: {
        userId,
        sessionId: sessionKey,
        status: 'draft',
        data: {
          id: sessionKey,
          sessionId: sessionKey,
          status: 'draft'
        } as Prisma.InputJsonValue
      }
    });
  }

  private async ensureBuilderSessionRecord(userId: string, sessionKey: string) {
    const existing = await this.prisma.liveSession.findUnique({
      where: { id: sessionKey },
      select: { userId: true }
    });
    if (!existing) {
      await this.prisma.liveSession.create({
        data: {
          id: sessionKey,
          userId,
          status: 'draft',
          data: { sessionId: sessionKey } as Prisma.InputJsonValue
        }
      });
      return;
    }
    if (existing.userId !== userId) {
      throw new BadRequestException('Invalid builder session reference');
    }
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

  private async buildDashboardWorkspace(userId: string) {
    const seller = await this.prisma.seller.findFirst({
      where: { userId },
      include: { storefront: true }
    });
    const sellerId = seller?.id ?? '';
    const sellerName = seller?.displayName || seller?.name || 'Seller workspace';
    const sellerAvatar = seller?.storefront?.logoUrl || seller?.storefront?.coverUrl || '';

    const [campaigns, sessions] = await Promise.all([
      sellerId
        ? this.prisma.campaign.findMany({
            where: { sellerId },
            include: {
              creator: {
                include: {
                  creatorProfile: true
                }
              }
            },
            orderBy: { updatedAt: 'desc' },
            take: 24
          })
        : Promise.resolve([]),
      this.prisma.liveSession.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 24
      })
    ]);

    const supplierRecord = {
      id: sellerId || userId,
      ownerUserId: userId,
      name: sellerName,
      kind: seller?.kind === 'PROVIDER' ? 'Provider' : 'Seller',
      avatarUrl: sellerAvatar
    };

    const creatorHosts = campaigns
      .map((campaign: any) => {
        const profile = campaign.creator?.creatorProfile;
        if (!campaign.creatorId) return null;
        return {
          id: campaign.creatorId,
          name: profile?.name || profile?.handle || 'Creator',
          handle: profile?.handle ? `@${profile.handle.replace(/^@/, '')}` : '@creator',
          role: 'Creator',
          avatarUrl: ''
        };
      })
      .filter(Boolean);

    const supplierHost = {
      id: userId,
      name: sellerName,
      handle: seller?.handle ? `@${seller.handle.replace(/^@/, '')}` : '@supplier',
      role: 'Supplier',
      avatarUrl: sellerAvatar
    };

    const hosts = Array.from(new Map([supplierHost, ...creatorHosts].map((entry: any) => [entry.id, entry])).values());
    const campaignRows = campaigns.map((campaign: any) => ({
      id: campaign.id,
      name: campaign.title,
      supplierId: supplierRecord.id,
      supplierOwnerUserId: userId,
      creatorUsage: this.readString(campaign.metadata, 'creatorUsageDecision') || 'I will use a Creator',
      collabMode: this.readString(campaign.metadata, 'collabMode') || 'Open for Collabs',
      approvalMode: this.readString(campaign.metadata, 'approvalMode') || 'Manual'
    }));

    return {
      sessions: sessions.map((session: any) =>
        this.normalizeDashboardSession({
          session,
          seller: supplierRecord,
          campaigns: campaignRows,
          hosts
        })
      ),
      suppliers: [supplierRecord],
      campaigns: campaignRows,
      hosts
    };
  }

  private normalizeDashboardSession(params: {
    session: any;
    seller: Record<string, unknown>;
    campaigns: Array<Record<string, unknown>>;
    hosts: Array<Record<string, unknown>>;
  }) {
    const data = params.session.data && typeof params.session.data === 'object' && !Array.isArray(params.session.data)
      ? params.session.data as Record<string, unknown>
      : {};
    const scheduledAt = this.parseDate(this.readString(data, 'startISO')) ?? params.session.scheduledAt ?? params.session.createdAt;
    const endAt = this.parseDate(this.readString(data, 'endISO'))
      ?? params.session.endedAt
      ?? new Date(scheduledAt.getTime() + Math.max(30, this.readNumber(data, 'durationMin') || 90) * 60_000);
    const campaignId = this.readString(data, 'campaignId');
    const campaign = params.campaigns.find((entry) => entry.id === campaignId) ?? null;
    const hostRole = this.readString(data, 'hostRole') || (campaign?.creatorUsage === 'I will NOT use a Creator' ? 'Supplier' : 'Creator');
    const hostId = this.readString(data, 'hostId') || (hostRole === 'Supplier' ? String(params.seller.id || '') : this.readString(data, 'creatorId'));
    const host = params.hosts.find((entry) => entry.id === hostId) ?? params.hosts[0] ?? null;
    const dashboardStatus = this.toDashboardStatus(params.session.status, scheduledAt, endAt);
    const scheduleStatus = dashboardStatus === 'Scheduled' || dashboardStatus === 'Ready' ? 'Confirmed' : dashboardStatus === 'Draft' ? 'Draft' : dashboardStatus;
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][scheduledAt.getDay()];
    return {
      id: params.session.id,
      title: params.session.title || this.readString(data, 'title') || (campaign?.name as string | undefined) || 'Live Session',
      dashboardStatus,
      scheduleStatus,
      supplierId: String(params.seller.id || ''),
      supplierName: String(params.seller.name || 'Supplier'),
      campaignId: campaignId || null,
      campaignName: String(campaign?.name || this.readString(data, 'campaignTitle') || 'Campaign'),
      hostId: hostId || String(params.seller.id || ''),
      hostName: this.readString(host, 'name') || String(params.seller.name || 'Supplier'),
      hostRole,
      approvalMode: this.readString(campaign, 'approvalMode') || 'Manual',
      creatorUsage: this.readString(campaign, 'creatorUsage') || 'I will use a Creator',
      collabMode: this.readString(campaign, 'collabMode') || 'Open for Collabs',
      platforms: this.readStringList(data, 'platforms'),
      heroImageUrl: this.readString(data, 'heroImageUrl') || this.readString(params.seller, 'avatarUrl') || '',
      heroVideoUrl: this.readString(data, 'heroVideoUrl') || '',
      desktopMode: this.readString(data, 'desktopMode') || 'modal',
      startISO: scheduledAt.toISOString(),
      endISO: endAt.toISOString(),
      peakViewers: this.readNumber(data, 'peakViewers') || 0,
      avgWatchMin: this.readNumber(data, 'avgWatchMin') || 0,
      chatRate: this.readNumber(data, 'chatRate') || 0,
      gmv: this.readNumber(data, 'gmv') || 0,
      crewConflicts: this.readNumber(data, 'crewConflicts') || 0,
      location: this.readString(data, 'location') || 'MyLiveDealz',
      scriptsReady: this.readBoolean(data, 'scriptsReady'),
      assetsReady: this.readBoolean(data, 'assetsReady'),
      productsCount: this.readNumber(data, 'productsCount') || 0,
      durationMin: Math.max(30, Math.round((endAt.getTime() - scheduledAt.getTime()) / 60_000)),
      workloadScore: this.readNumber(data, 'workloadScore') || (dashboardStatus === 'Live' ? 5 : dashboardStatus === 'Scheduled' ? 3 : 2),
      conflict: this.readBoolean(data, 'conflict') || (this.readNumber(data, 'crewConflicts') || 0) > 0,
      weekday,
      dateLabel: scheduledAt.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }),
      timeLabel: `${scheduledAt.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })}-${endAt.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })}`
    };
  }

  private toDashboardStatus(status: string, start: Date, end: Date) {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'live') return 'Live';
    if (normalized === 'ended') return 'Ended';
    if (normalized === 'ready') return 'Ready';
    if (normalized === 'scheduled') return 'Scheduled';
    if (normalized === 'draft') {
      const now = Date.now();
      if (start.getTime() <= now && end.getTime() > now) return 'Live';
      if (start.getTime() > now) return 'Scheduled';
      if (end.getTime() <= now) return 'Ended';
      return 'Draft';
    }
    return 'Draft';
  }

  private async ensureWorkspaceSetting(userId: string, key: string, payload: Record<string, unknown>) {
    const existing = await this.prisma.workspaceSetting.findUnique({
      where: {
        userId_key: {
          userId,
          key
        }
      }
    });
    if (existing?.payload && typeof existing.payload === 'object' && !Array.isArray(existing.payload)) {
      return existing.payload as Record<string, unknown>;
    }
    const record = await this.prisma.workspaceSetting.upsert({
      where: {
        userId_key: {
          userId,
          key
        }
      },
      update: {
        payload: payload as Prisma.InputJsonValue
      },
      create: {
        userId,
        key,
        payload: payload as Prisma.InputJsonValue
      }
    });
    return (record.payload as Record<string, unknown>) ?? payload;
  }

  private async readWorkspaceSetting(userId: string, key: string) {
    const existing = await this.prisma.workspaceSetting.findUnique({
      where: {
        userId_key: {
          userId,
          key
        }
      }
    });
    return existing?.payload && typeof existing.payload === 'object' && !Array.isArray(existing.payload)
      ? (existing.payload as Record<string, unknown>)
      : null;
  }

  private buildAiSlotsFromSessions(
    sessions: Array<{ weekday?: string; startISO?: string; durationMin?: number; title?: string }>
  ) {
    const upcoming = sessions
      .map((session) => ({
        session,
        start: this.parseDate(session.startISO)
      }))
      .filter((entry) => entry.start && entry.start.getTime() > Date.now())
      .sort((left, right) => left.start!.getTime() - right.start!.getTime())
      .slice(0, 3);

    return upcoming.map((entry, index) => {
      const start = entry.start as Date;
      const end = new Date(start.getTime() + Math.max(30, Number(entry.session.durationMin ?? 90)) * 60_000);
      const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][start.getDay()];
      return {
        id: `slot-${index + 1}`,
        label: `${weekday} ${start.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${end.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })}`,
        reason: `Based on scheduled live session activity already stored for this workspace.`,
        recommendedFor: entry.session.title || 'Scheduled live session'
      };
    });
  }

  private readString(value: unknown, key?: string) {
    const source = key && value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)[key]
      : value;
    return typeof source === 'string' && source.trim() ? source.trim() : '';
  }

  private readStringList(value: unknown, key?: string) {
    const source = key && value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)[key]
      : value;
    if (Array.isArray(source)) {
      return source.map((entry) => String(entry).trim()).filter(Boolean);
    }
    if (typeof source === 'string') {
      return source.split(/[,\n|]/g).map((entry) => entry.trim()).filter(Boolean);
    }
    return [];
  }

  private readNumber(value: unknown, key?: string) {
    const source = key && value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)[key]
      : value;
    const num = typeof source === 'number' ? source : Number(source);
    return Number.isFinite(num) ? num : 0;
  }

  private readBoolean(value: unknown, key?: string) {
    const source = key && value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)[key]
      : value;
    return Boolean(source);
  }
}
