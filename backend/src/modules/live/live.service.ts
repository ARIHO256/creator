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
    const sessionKey = normalizeIdentifier(id, randomUUID());
    const builder = await this.ensureBuilderRecord(userId, sessionKey);
    return this.serializeBuilder(builder);
  }
  saveBuilder(userId: string, payload: Record<string, unknown>) {
    const sanitized = this.ensureObjectPayload(payload);
    const sessionKey = normalizeIdentifier(sanitized.sessionId ?? sanitized.id, randomUUID());
    const status = this.normalizeStatus((sanitized as any).status ?? 'draft', this.builderStatuses(), 'builder');
    return this.findBuilderRecord(userId, sessionKey)
      .then((existing) =>
        existing
          ? this.prisma.liveBuilder.update({
              where: { id: existing.id },
              data: {
                sessionId: sessionKey,
                status,
                data: sanitized as Prisma.InputJsonValue
              }
            })
          : this.prisma.liveBuilder.create({
              data: {
                userId,
                sessionId: sessionKey,
                status,
                data: sanitized as Prisma.InputJsonValue
              }
            })
      )
      .then((builder) => this.serializeBuilder(builder));
  }
  async publishBuilder(userId: string, id: string, payload: Record<string, unknown>) {
    const sessionKey = normalizeIdentifier(id, randomUUID());
    const existing = await this.findBuilderRecord(userId, sessionKey);
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

  async updateStudio(userId: string, id: string, body: Record<string, unknown>) {
    const sessionId = this.resolveSessionId(userId, id);
    const studio = await this.ensureStudioRecord(userId, sessionId);
    const sanitized = this.ensureObjectPayload(body, { maxDepth: 6, maxArrayLength: 250, maxKeys: 250 });
    const merged = { ...(studio.data as any), ...sanitized };
    const updated = await this.prisma.liveStudio.update({
      where: { id: studio.id },
      data: {
        data: merged as Prisma.InputJsonValue
      }
    });
    return this.serializeStudio(updated);
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

    const record = await this.prisma.liveToolConfig.upsert({
      where: { userId_key: { userId, key } },
      update: { data: {} as Prisma.InputJsonValue },
      create: {
        userId,
        key,
        data: {} as Prisma.InputJsonValue
      }
    });
    return (record.data as Record<string, unknown>) ?? {};
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

  private defaultToolPayload(key: string) {
    if (key === 'overlays') {
      return this.defaultOverlaysToolPayload();
    }
    if (key === 'audience-notifications') {
      return this.defaultAudienceNotificationsPayload();
    }
    if (key === 'live-alerts') {
      return this.defaultLiveAlertsPayload();
    }
    if (key === 'streaming') {
      return this.defaultStreamingPayload();
    }
    if (key === 'post-live') {
      return this.defaultPostLivePayload();
    }
    return {};
  }

  private defaultOverlaysToolPayload() {
    const start = new Date();
    start.setMinutes(start.getMinutes() + 40, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 90);
    return {
      isPro: true,
      executionMode: 'use_creator',
      sharedToCreator: false,
      session: {
        id: 'LS-20418',
        title: 'Autumn Beauty Flash',
        status: 'Scheduled',
        startISO: start.toISOString(),
        endISO: end.toISOString()
      },
      products: [
        {
          id: 'p1',
          name: 'GlowUp Serum Bundle',
          price: '$29.99',
          stock: 18,
          posterUrl: 'https://images.unsplash.com/photo-1585232351009-aa87416fca90?auto=format&fit=crop&w=500&q=60'
        },
        {
          id: 'p2',
          name: 'Vitamin C Glow Kit',
          price: '$24.50',
          stock: 6,
          posterUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=500&q=60'
        },
        {
          id: 'p3',
          name: 'Hydration Night Mask',
          price: '$19.00',
          stock: 0,
          posterUrl: 'https://images.unsplash.com/photo-1585386959984-a41552231691?auto=format&fit=crop&w=500&q=60'
        }
      ],
      tab: 'qr',
      variant: 'A',
      qrEnabled: true,
      qrLabel: 'Scan to shop',
      qrUrl: 'https://mylivedealz.com/live/LS-20418',
      qrCorner: 'tr',
      qrSize: 180,
      destUrl: 'https://mylivedealz.com/dealz/autumn-flash',
      utmSource: 'whatsapp',
      utmMedium: 'msg',
      utmCampaign: 'autumn_beauty_flash',
      utmContent: 'reminder_t10m',
      shortDomain: 'go.mylivedealz.com',
      shortSlug: 'autumn7',
      timerEnabled: true,
      timerStyle: 'pill',
      timerText: 'Deal ends in',
      dealEndISO: end.toISOString(),
      lowerEnabled: true,
      lowerPlacement: 'bottom',
      lowerProductId: 'p1',
      ctaText: 'Buy now',
      abEnabled: true,
      notesA: 'Variant A: QR top-right + lower-third.',
      notesB: 'Variant B: Countdown bar + shorter CTA.'
    };
  }

  private defaultAudienceNotificationsPayload() {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(18, 0, 0, 0);
    const end = new Date(start);
    end.setHours(19, 0, 0, 0);
    const startLocal = this.toLocalInputValue(start);
    const endLocal = this.toLocalInputValue(end);
    return {
      creatorInvolvement: 'use_creator',
      plan: 'Pro',
      sessionStatus: 'Scheduled',
      sessionTitle: 'Autumn Beauty Flash',
      startLocal,
      endLocal,
      bufferMinutes: 15,
      waNumber: '+256 700 000 000',
      sessionUrl: 'https://mylivedealz.com/live/LS-20418',
      templatePacks: [
        {
          id: 'pack_default_v3',
          name: 'Default Reminders',
          version: 'v3.2',
          approved: true,
          channels: ['whatsapp', 'telegram', 'rcs'],
          notes: 'Short, compliance-safe copy. Works well across Africa & SEA.',
          templates: {
            initiationPrompt: 'Tap to get Live Session reminders for {{title}}.\nWe’ll only message you after you start the chat.',
            t24h: '⏰ Reminder: {{title}} starts soon.\nTap here to join + shop: {{link}}',
            t1h: '⏳ 1 hour to go: {{title}}\nJoin + shop: {{link}}',
            t10m: '🔥 10 minutes! {{title}}\nTap to join: {{link}}',
            live_now: '🔴 We are LIVE: {{title}}\nTap to join: {{link}}',
            deal_drop: '⚡ Deal drop! New offers are live now.\nTap: {{link}}',
            replay_ready: '🎬 Replay ready: {{title}}\nWatch + shop: {{link}}'
          }
        },
        {
          id: 'pack_flash_v5',
          name: 'Flash Sales Pack',
          version: 'v5.0',
          approved: true,
          channels: ['whatsapp', 'telegram', 'line', 'viber', 'rcs'],
          notes: 'Higher urgency language + deal-drop emphasis.',
          proOnly: true,
          templates: {
            initiationPrompt: 'Tap to unlock Flash Deal alerts for {{title}}.\nStart chat to opt in.',
            t24h: '⚡ Flash Deal soon: {{title}}.\nTap to opt in + join: {{link}}',
            t1h: '🚀 1 hour: {{title}} starts.\nTap: {{link}}',
            t10m: '🔥 10 min! Dealz dropping soon.\nJoin: {{link}}',
            live_now: '🔴 LIVE NOW: {{title}}.\nTap to enter: {{link}}',
            deal_drop: '💥 Deal Drop: limited stock.\nTap to shop: {{link}}',
            replay_ready: '🎬 Replay + last chance dealz: {{title}}.\nTap: {{link}}'
          }
        },
        {
          id: 'pack_vip_v2',
          name: 'VIP Tone Pack',
          version: 'v2.4',
          approved: true,
          channels: ['whatsapp', 'telegram', 'line'],
          notes: 'More premium tone, softer urgency, higher trust.',
          templates: {
            initiationPrompt: 'Tap to receive VIP reminders for {{title}}.\nYou’ll only be messaged after you start the chat.',
            t24h: 'Reminder: {{title}} is coming up.\nTap to join when ready: {{link}}',
            t1h: 'Starting in 1 hour: {{title}}.\nTap to join: {{link}}',
            t10m: 'Starting in 10 minutes: {{title}}.\nTap: {{link}}',
            live_now: 'We’re live: {{title}}.\nTap to join: {{link}}',
            deal_drop: 'Deal drop is live.\nTap to shop: {{link}}',
            replay_ready: 'Replay is ready.\nTap to watch: {{link}}'
          }
        }
      ],
      selectedPackId: 'pack_default_v3',
      channels: [
        {
          key: 'whatsapp',
          name: 'WhatsApp',
          short: 'WA',
          connected: 'Connected',
          supportsQr: true,
          supportsButtons: true,
          note: '24h window rules apply. Uses initiation prompt + in-window reminders only.'
        },
        {
          key: 'telegram',
          name: 'Telegram',
          short: 'TG',
          connected: 'Connected',
          supportsQr: true,
          supportsButtons: true,
          note: 'Recommended for high engagement and low delivery friction.'
        },
        {
          key: 'line',
          name: 'LINE',
          short: 'LINE',
          connected: 'Needs re-auth',
          supportsQr: true,
          supportsButtons: true,
          proOnly: true,
          note: 'Pro: unlock advanced templates and per-channel formatting.'
        },
        {
          key: 'viber',
          name: 'Viber',
          short: 'Viber',
          connected: 'Connected',
          supportsQr: true,
          supportsButtons: true,
          proOnly: true,
          note: 'Pro: unlock deep links and rich buttons (where supported).'
        },
        {
          key: 'rcs',
          name: 'RCS',
          short: 'RCS',
          connected: 'Connected',
          supportsQr: false,
          supportsButtons: false,
          proOnly: true,
          note: 'Pro: RCS/SMS fallback. Buttons vary by device; keep copy short.'
        }
      ],
      enabledChannels: {
        whatsapp: true,
        telegram: true,
        line: false,
        viber: false,
        rcs: false
      },
      reminders: [
        {
          key: 't24h',
          label: 'T-24h (WA-adjusted)',
          description: 'Initiation prompt goes live (time computed from WhatsApp 24h window).'
        },
        { key: 't1h', label: 'T-1h', description: 'Reminder message to opted-in users.' },
        { key: 't10m', label: 'T-10m', description: 'Reminder message to opted-in users.' },
        { key: 'live_now', label: 'Live Now', description: 'Sends when the session starts.' },
        { key: 'deal_drop', label: 'Deal Drop', description: 'Manual or scheduled alert when dealz go live.' },
        { key: 'replay_ready', label: 'Replay Ready', description: 'Sends after replay is published.' }
      ],
      enabledReminders: {
        t24h: true,
        t1h: true,
        t10m: true,
        live_now: true,
        deal_drop: false,
        replay_ready: true
      },
      replayDelayMinutes: 20,
      dealDropMode: 'manual',
      dealDropAtOffsetMin: 12
    };
  }

  private defaultLiveAlertsPayload() {
    const started = new Date(Date.now() - 9 * 60_000);
    const ends = new Date(Date.now() + 51 * 60_000);
    return {
      session: {
        id: 'LS-20418',
        title: 'Autumn Beauty Flash',
        status: 'Live',
        startedISO: started.toISOString(),
        endsISO: ends.toISOString()
      },
      campaign: {
        id: 'S-201',
        name: 'Beauty Flash Week (Combo)',
        creatorUsageDecision: 'I will use a Creator',
        creators: [
          { id: 'CR-01', name: 'Amina K', handle: 'amina_live' },
          { id: 'CR-02', name: 'Kofi Mensah', handle: 'kofi_live' }
        ]
      },
      alsoRequestCreator: true,
      selectedCreatorIds: ['CR-01', 'CR-02'],
      channels: [
        {
          key: 'whatsapp',
          name: 'WhatsApp',
          short: 'WA',
          status: 'Connected',
          supportsPin: true,
          pinHint: 'Pin the live link message so late joiners can tap it quickly.'
        },
        {
          key: 'telegram',
          name: 'Telegram',
          short: 'TG',
          status: 'Connected',
          supportsPin: true,
          pinHint: 'Pin the latest message in the channel/group to keep the link visible.'
        },
        {
          key: 'line',
          name: 'LINE',
          short: 'LINE',
          status: 'Needs re-auth',
          supportsPin: true,
          pinHint: 'Reconnect your LINE account, then pin the live link message.'
        },
        {
          key: 'viber',
          name: 'Viber',
          short: 'Viber',
          status: 'Connected',
          supportsPin: true,
          pinHint: 'Pin one live link message so it stays visible while you’re live.'
        },
        {
          key: 'rcs',
          name: 'RCS',
          short: 'RCS',
          status: 'Connected',
          supportsPin: false,
          pinHint: 'Pinning varies by device. Keep alerts spaced out and resend sparingly.'
        }
      ],
      templates: [
        {
          key: 'were_live',
          title: 'We’re live',
          subtitle: 'Kick off attendance fast.',
          minIntervalMinutes: 8,
          template: '🔴 We’re LIVE: {{sessionTitle}}\nTap to join: {{link}}'
        },
        {
          key: 'flash_deal',
          title: 'Flash deal',
          subtitle: 'Announce a drop (with caps).',
          minIntervalMinutes: 10,
          template: '⚡ Flash deal: {{dealName}}\nLive in: {{sessionTitle}}\nEnds in {{endsIn}} • Tap: {{link}}'
        },
        {
          key: 'last_chance',
          title: 'Last chance',
          subtitle: 'Final push before end.',
          minIntervalMinutes: 12,
          template: '⏳ Last chance!\n{{sessionTitle}}\nEnding in {{endsIn}} • Join: {{link}}'
        }
      ],
      enabledDest: {
        whatsapp: true,
        telegram: true,
        line: false,
        viber: false,
        rcs: false
      },
      dealName: 'GlowUp Serum Bundle',
      dealEndsMinutes: 10,
      lastSent: {
        were_live: Date.now() - 11 * 60_000,
        flash_deal: Date.now() - 20 * 60_000,
        last_chance: Date.now() - 40 * 60_000
      }
    };
  }

  private defaultStreamingPayload() {
    return {
      executionOwner: 'Supplier-hosted',
      isPro: true,
      sessionStatus: 'Draft',
      profile: {
        orientation: 'Auto',
        quality: 'High',
        advancedOpen: false,
        resolution: '1080p',
        bitrateKbps: 4500,
        audio: 'Stereo',
        gainDb: 0,
        latency: 'Low',
        adaptiveBitrate: true
      },
      degradeMode: 'Reduce quality, keep all destinations',
      recordMaster: true,
      autoReplay: true,
      autoHighlights: false,
      downloadMasterAllowed: false,
      estimatedUploadMbps: 12.4,
      pendingRequests: {},
      destinations: [
        {
          id: 'yt',
          name: 'YouTube Live',
          kind: 'Video Live',
          status: 'Connected',
          enabled: true,
          accountLabel: 'Supplier Brand Channel',
          supportsStreamKey: true,
          supportsPrivacy: true,
          supportsCategory: true,
          supportsTags: true,
          supportsDelay: true,
          supportsAutoReconnect: true,
          proAdvanced: false,
          ownership: 'Supplier',
          settings: {
            title: 'GlowUp Hub: Autumn Beauty Flash Live',
            description: 'Serum benefits, fit checks, and instant buy links.',
            privacy: 'Public',
            category: 'Beauty',
            tags: ['beauty', 'serum', 'flash'],
            delaySec: 0,
            autoReconnect: true
          },
          health: { framesDropped: 0, reconnects: 0, lastAckSec: 2, outBitrateKbps: 4300 }
        },
        {
          id: 'fb',
          name: 'Facebook Live',
          kind: 'Community Live',
          status: 'Needs re-auth',
          enabled: false,
          accountLabel: 'Supplier Page',
          supportsStreamKey: true,
          supportsPrivacy: true,
          supportsCategory: false,
          supportsTags: false,
          supportsDelay: false,
          supportsAutoReconnect: true,
          proAdvanced: false,
          ownership: 'Supplier',
          errorTitle: 'Your session expired',
          errorNext: 'Re-authenticate the connected account to restore posting permissions.',
          settings: {
            title: 'GlowUp Hub: Autumn Beauty Flash Live',
            description: 'Live promo. Products pinned for instant checkout.',
            privacy: 'Public',
            tags: ['live'],
            delaySec: 0,
            autoReconnect: true
          },
          health: { framesDropped: 0, reconnects: 0, lastAckSec: 0, outBitrateKbps: 0 }
        },
        {
          id: 'tt',
          name: 'TikTok Live',
          kind: 'Video Live',
          status: 'Stream key missing',
          enabled: false,
          accountLabel: 'Creator account',
          supportsStreamKey: true,
          supportsPrivacy: false,
          supportsCategory: false,
          supportsTags: false,
          supportsDelay: true,
          supportsAutoReconnect: true,
          proAdvanced: true,
          ownership: 'Creator',
          errorTitle: 'Stream key required',
          errorNext: 'Add a stream key or connect via OAuth if supported in your region.',
          settings: {
            title: 'GlowUp Hub: Autumn Beauty Flash Live',
            description: 'Live now. Limited stock.',
            tags: ['tiktok'],
            delaySec: 0,
            autoReconnect: true
          },
          health: { framesDropped: 0, reconnects: 0, lastAckSec: 0, outBitrateKbps: 0 }
        },
        {
          id: 'ig',
          name: 'Instagram Live',
          kind: 'Video Live',
          status: 'Connected',
          enabled: true,
          accountLabel: 'Creator Studio',
          supportsStreamKey: false,
          supportsPrivacy: false,
          supportsCategory: false,
          supportsTags: false,
          supportsDelay: false,
          supportsAutoReconnect: true,
          proAdvanced: false,
          ownership: 'Creator',
          settings: {
            title: 'GlowUp Hub: Autumn Beauty Flash Live',
            description: 'Quick demo + price breakdown + instant buy.',
            tags: ['beauty', 'live'],
            delaySec: 0,
            autoReconnect: true
          },
          health: { framesDropped: 1, reconnects: 0, lastAckSec: 3, outBitrateKbps: 3800 }
        },
        {
          id: 'tw',
          name: 'Twitch',
          kind: 'Video Live',
          status: 'Blocked',
          enabled: false,
          accountLabel: 'Channel under review',
          supportsStreamKey: true,
          supportsPrivacy: false,
          supportsCategory: true,
          supportsTags: false,
          supportsDelay: true,
          supportsAutoReconnect: true,
          proAdvanced: false,
          ownership: 'Supplier',
          errorTitle: 'Destination blocked',
          errorNext: 'Account flagged by platform policy. Contact support or switch destination.',
          settings: {
            title: 'GlowUp Hub: Autumn Beauty Flash Live',
            description: 'Live commerce stream.',
            category: 'Just Chatting',
            tags: ['commerce'],
            delaySec: 0,
            autoReconnect: true
          },
          health: { framesDropped: 0, reconnects: 0, lastAckSec: 0, outBitrateKbps: 0 }
        }
      ]
    };
  }

  private defaultPostLivePayload() {
    const publishAt = new Date(Date.now() + 30 * 60_000);
    return {
      session: {
        id: 'LS-20418',
        title: 'Autumn Beauty Flash',
        status: 'Ended',
        endedISO: new Date(Date.now() - 33 * 60_000).toISOString(),
        replayUrl: 'https://mylivedealz.com/replay/LS-20418',
        coverUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=70'
      },
      plan: 'Pro',
      executionMode: 'creator_hosted',
      adminReviewRequired: true,
      published: false,
      schedulePublish: false,
      publishAt: publishAt.toISOString(),
      allowComments: true,
      showProductStrip: true,
      supplierApproved: false,
      submittedToAdmin: false,
      adminApproved: false,
      adminRejected: false,
      creatorPublishRequested: false,
      clips: [
        { id: 'c1', title: 'GlowUp Bundle – Key benefits', startSec: 140, endSec: 210, format: '9:16', status: 'Exported' },
        { id: 'c2', title: 'Price drop moment', startSec: 520, endSec: 560, format: '9:16', status: 'Queued' },
        { id: 'c3', title: 'Buyer Q&A – shipping', startSec: 760, endSec: 840, format: '16:9', status: 'Draft' }
      ],
      channels: [
        { key: 'whatsapp', name: 'WhatsApp', short: 'WA', connected: 'Connected', supportsRich: true, costPerMessageUSD: 0.002 },
        { key: 'telegram', name: 'Telegram', short: 'TG', connected: 'Connected', supportsRich: true, costPerMessageUSD: 0 },
        { key: 'line', name: 'LINE', short: 'LINE', connected: 'Needs re-auth', supportsRich: true, costPerMessageUSD: 0.003 },
        { key: 'viber', name: 'Viber', short: 'Viber', connected: 'Connected', supportsRich: false, costPerMessageUSD: 0.0015 },
        { key: 'rcs', name: 'RCS', short: 'RCS', connected: 'Connected', supportsRich: false, costPerMessageUSD: 0.008 }
      ],
      enabledChannels: {
        whatsapp: true,
        telegram: true,
        line: false,
        viber: false,
        rcs: false
      },
      audience: 'past_buyers',
      scheduleSends: true,
      sendNow: false,
      templatePack: 'Default',
      requestCreatorAmplify: true,
      cartRecovery: true,
      priceDrop: false,
      restock: true,
      metrics: {
        viewers: 18420,
        clicks: 3120,
        orders: 284,
        gmv: 9210,
        addToCart: 740,
        cartAbandon: 310,
        ctr: 0.169,
        conv: 0.091,
        ordersSeries: [4, 6, 8, 10, 9, 12, 15, 14, 18, 17, 16, 19, 21, 18, 16]
      }
    };
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
