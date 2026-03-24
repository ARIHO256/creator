import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma, ProviderFulfillmentStatus } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { sanitizePayload } from '../../common/sanitizers/payload-sanitizer.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { CreateProviderBookingRequestDto } from './dto/create-provider-booking-request.dto.js';
import { CreateProviderConsultationRequestDto } from './dto/create-provider-consultation-request.dto.js';
import { CreateProviderQuoteDto } from './dto/create-provider-quote.dto.js';
import { ProviderTransitionDto } from './dto/provider-transition.dto.js';
import { ProviderFulfillmentTransitionDto } from './dto/provider-fulfillment-transition.dto.js';

@Injectable()
export class ProviderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async serviceCommand(userId: string) {
    const [openQuotes, activeBookings, totalQuotes, extras, providerProfile] = await Promise.all([
      this.prisma.providerQuote.count({ where: { userId, status: { in: ['draft', 'sent', 'negotiating'] } } }),
      this.prisma.providerBooking.count({ where: { userId, status: { in: ['requested', 'confirmed'] } } }),
      this.prisma.providerQuote.count({ where: { userId } }),
      this.loadSetting(userId, 'provider_service_command'),
      this.loadProviderProfile(userId)
    ]);
    return {
      queues: [
        { key: 'quotes', label: 'Quotes', count: openQuotes },
        { key: 'bookings', label: 'Bookings', count: activeBookings }
      ],
      kpis: [
        { key: 'quotes_total', label: 'Total Quotes', value: totalQuotes }
      ],
      schedule: Array.isArray((extras as Record<string, unknown> | null)?.schedule)
        ? ((extras as Record<string, unknown>).schedule as unknown[])
        : [],
      queue: Array.isArray((extras as Record<string, unknown> | null)?.queue)
        ? ((extras as Record<string, unknown>).queue as unknown[])
        : [],
      capabilities: this.resolveCapabilities(providerProfile),
      profile:
        providerProfile && typeof providerProfile === 'object' && !Array.isArray(providerProfile)
          ? providerProfile
          : undefined
    };
  }
  async quotes(userId: string) {
    const quotes = await this.prisma.providerQuote.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
    return { quotes: quotes.map((quote) => this.serializeQuote(quote)) };
  }
  async quote(userId: string, id: string) {
    const quote = await this.prisma.providerQuote.findFirst({
      where: { id, userId }
    });
    if (!quote) throw new NotFoundException('Provider quote not found');
    return this.serializeQuote(quote);
  }
  async createQuote(userId: string, body: CreateProviderQuoteDto) {
    await this.assertProviderSupports(userId, 'quotes');
    const sanitized = this.ensurePayload(body);
    const data = (sanitized as any).data && typeof (sanitized as any).data === 'object' ? (sanitized as any).data : sanitized;
    const id = String((sanitized as any).id ?? randomUUID());
    const quote = await this.prisma.providerQuote.create({
      data: {
        id,
        userId,
        status: String((sanitized as any).status ?? 'draft'),
        title: typeof (sanitized as any).title === 'string' ? (sanitized as any).title : null,
        buyer: typeof (sanitized as any).buyer === 'string' ? (sanitized as any).buyer : null,
        amount: typeof (sanitized as any).amount === 'number' ? (sanitized as any).amount : null,
        currency: typeof (sanitized as any).currency === 'string' ? (sanitized as any).currency : 'USD',
        data: data as Prisma.InputJsonValue
      }
    });
    return this.serializeQuote(quote);
  }
  async jointQuotes(userId: string) {
    const quotes = await this.prisma.providerQuote.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
    const jointQuotes = quotes.filter((quote) => Boolean((quote.data as any)?.isJoint));
    return { jointQuotes: jointQuotes.map((quote) => this.serializeQuote(quote)) };
  }

  async jointQuote(userId: string, id: string) {
    const quote = await this.prisma.providerQuote.findFirst({
      where: { id, userId }
    });
    if (!quote || !(quote.data as any)?.isJoint) {
      throw new NotFoundException('Joint quote not found');
    }
    return this.serializeQuote(quote);
  }

  async createJointQuote(userId: string, body: CreateProviderQuoteDto) {
    await this.assertProviderSupports(userId, 'quotes');
    const sanitized = this.ensurePayload(body);
    const data = (sanitized as any).data && typeof (sanitized as any).data === 'object' ? (sanitized as any).data : sanitized;
    const id = String((sanitized as any).id ?? randomUUID());
    const quote = await this.prisma.providerQuote.create({
      data: {
        id,
        userId,
        status: String((sanitized as any).status ?? 'draft'),
        title: typeof (sanitized as any).title === 'string' ? (sanitized as any).title : null,
        buyer: typeof (sanitized as any).buyer === 'string' ? (sanitized as any).buyer : null,
        amount: typeof (sanitized as any).amount === 'number' ? (sanitized as any).amount : null,
        currency: typeof (sanitized as any).currency === 'string' ? (sanitized as any).currency : 'USD',
        data: { ...(data as Record<string, unknown>), isJoint: true } as Prisma.InputJsonValue
      }
    });
    return this.serializeQuote(quote);
  }
  async updateJointQuote(userId: string, id: string, body: CreateProviderQuoteDto) {
    const quote = await this.prisma.providerQuote.findFirst({
      where: { id, userId }
    });
    if (!quote || !(quote.data as any)?.isJoint) {
      throw new NotFoundException('Joint quote not found');
    }
    const sanitized = this.ensurePayload(body);
    const data = sanitized.data && typeof sanitized.data === 'object' ? sanitized.data : sanitized;
    const updated = await this.prisma.providerQuote.update({
      where: { id: quote.id },
      data: {
        status: typeof sanitized.status === 'string' ? sanitized.status : undefined,
        title: typeof sanitized.title === 'string' ? sanitized.title : undefined,
        buyer: typeof sanitized.buyer === 'string' ? sanitized.buyer : undefined,
        amount: typeof sanitized.amount === 'number' ? sanitized.amount : undefined,
        currency: typeof sanitized.currency === 'string' ? sanitized.currency : undefined,
        data: { ...(quote.data as Record<string, unknown>), ...(data as Record<string, unknown>), isJoint: true } as Prisma.InputJsonValue
      }
    });
    await this.audit.log({
      userId,
      action: 'provider.joint_quote_updated',
      entityType: 'provider_quote',
      entityId: updated.id,
      route: `/api/provider/joint-quotes/${id}`,
      method: 'PATCH',
      statusCode: 200
    });
    return this.serializeQuote(updated);
  }
  async consultations(userId: string) {
    const consultations = await this.prisma.providerConsultation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
    return { consultations: consultations.map((entry) => this.serializeConsultation(entry)) };
  }
  async requestConsultation(requester: RequestUser, body: CreateProviderConsultationRequestDto) {
    const provider = await this.resolveProviderTarget(body);
    await this.assertProviderSupports(provider.userId, 'consultations');
    const consultation = await this.prisma.providerConsultation.create({
      data: {
        userId: provider.userId,
        status: 'open',
        scheduledAt: this.parseDateOrNull(body.scheduledAt),
        data: {
          source: 'provider_request',
          title: this.trimOrNull(body.title),
          note: this.trimOrNull(body.note),
          requester: {
            userId: requester.sub,
            email: requester.email,
            role: requester.role
          },
          provider: {
            sellerId: provider.id,
            handle: provider.handle ?? null
          },
          ...(body.data && typeof body.data === 'object' && !Array.isArray(body.data) ? body.data : {})
        } as Prisma.InputJsonValue
      }
    });
    await this.audit.log({
      userId: requester.sub,
      action: 'provider.consultation_requested',
      entityType: 'provider_consultation',
      entityId: consultation.id,
      route: '/api/provider/consultations',
      method: 'POST',
      statusCode: 201,
      metadata: {
        providerUserId: provider.userId,
        providerHandle: provider.handle ?? null
      }
    });
    return this.serializeConsultation(consultation);
  }
  async bookings(userId: string) {
    const [bookings, templates] = await Promise.all([
      this.prisma.providerBooking.findMany({
        where: { userId },
        include: { fulfillment: true },
        orderBy: { updatedAt: 'desc' }
      }),
      this.loadSetting(userId, 'provider_booking_templates')
    ]);
    return {
      bookings: bookings.map((entry) => this.serializeBooking(entry)),
      templates: Array.isArray((templates as Record<string, unknown> | null)?.templates)
        ? ((templates as Record<string, unknown>).templates as unknown[])
        : []
    };
  }
  async requestBooking(requester: RequestUser, body: CreateProviderBookingRequestDto) {
    const provider = await this.resolveProviderTarget(body);
    await this.assertProviderSupports(provider.userId, 'bookings');
    const booking = await this.prisma.providerBooking.create({
      data: {
        userId: provider.userId,
        status: 'requested',
        scheduledAt: this.parseDateOrNull(body.scheduledAt),
        durationMinutes: body.durationMinutes ?? null,
        amount: body.amount ?? null,
        currency: this.trimOrNull(body.currency) ?? 'USD',
        data: {
          source: 'provider_request',
          title: this.trimOrNull(body.title),
          note: this.trimOrNull(body.note),
          requester: {
            userId: requester.sub,
            email: requester.email,
            role: requester.role
          },
          provider: {
            sellerId: provider.id,
            handle: provider.handle ?? null
          },
          ...(body.data && typeof body.data === 'object' && !Array.isArray(body.data) ? body.data : {})
        } as Prisma.InputJsonValue
      },
      include: { fulfillment: true }
    });
    await this.audit.log({
      userId: requester.sub,
      action: 'provider.booking_requested',
      entityType: 'provider_booking',
      entityId: booking.id,
      route: '/api/provider/bookings',
      method: 'POST',
      statusCode: 201,
      metadata: {
        providerUserId: provider.userId,
        providerHandle: provider.handle ?? null
      }
    });
    return this.serializeBooking(booking);
  }
  async booking(userId: string, id: string) {
    const booking = await this.prisma.providerBooking.findFirst({
      where: { id, userId },
      include: { fulfillment: true }
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return this.serializeBooking(booking);
  }

  async transitionQuote(userId: string, id: string, body: ProviderTransitionDto) {
    const quote = await this.prisma.providerQuote.findFirst({ where: { id, userId } });
    if (!quote) {
      throw new NotFoundException('Provider quote not found');
    }
    const nextKey = this.normalizeStatus(body.status);
    this.assertQuoteTransition(quote.status, nextKey);
    const next = nextKey.toLowerCase();
    const updated = await this.prisma.providerQuote.update({
      where: { id: quote.id },
      data: {
        status: next,
        data: body.note ? ({ ...(quote.data as Record<string, unknown>), note: body.note } as Prisma.InputJsonValue) : undefined
      }
    });
    await this.audit.log({
      userId,
      action: 'provider.quote_transition',
      entityType: 'provider_quote',
      entityId: updated.id,
      route: `/api/provider/quotes/${id}/transition`,
      method: 'POST',
      statusCode: 200,
      metadata: { from: quote.status, to: next }
    });
    return this.serializeQuote(updated);
  }

  async transitionBooking(userId: string, id: string, body: ProviderTransitionDto) {
    const booking = await this.prisma.providerBooking.findFirst({ where: { id, userId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    const nextKey = this.normalizeStatus(body.status);
    this.assertBookingTransition(booking.status, nextKey);
    const next = nextKey.toLowerCase();
    const updated = await this.prisma.providerBooking.update({
      where: { id: booking.id },
      data: {
        status: next,
        data: body.note ? ({ ...(booking.data as Record<string, unknown>), note: body.note } as Prisma.InputJsonValue) : undefined
      },
      include: { fulfillment: true }
    });
    if (['CONFIRMED', 'IN_PROGRESS'].includes(nextKey)) {
      await this.ensureFulfillment(
        updated.id,
        (nextKey === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'OPEN') as ProviderFulfillmentStatus
      );
    }
    await this.audit.log({
      userId,
      action: 'provider.booking_transition',
      entityType: 'provider_booking',
      entityId: updated.id,
      route: `/api/provider/bookings/${id}/transition`,
      method: 'POST',
      statusCode: 200,
      metadata: { from: booking.status, to: next }
    });
    return this.serializeBooking(updated);
  }

  async transitionFulfillment(userId: string, id: string, body: ProviderFulfillmentTransitionDto) {
    const fulfillment = await this.prisma.providerFulfillment.findUnique({ where: { id }, include: { booking: true } });
    if (!fulfillment || fulfillment.booking.userId !== userId) {
      throw new NotFoundException('Fulfillment not found');
    }
    const next = this.normalizeStatus(body.status);
    this.assertFulfillmentTransition(fulfillment.status, next);
    const updated = await this.prisma.providerFulfillment.update({
      where: { id: fulfillment.id },
      data: {
        status: next as ProviderFulfillmentStatus,
        startedAt: next === 'IN_PROGRESS' ? new Date() : fulfillment.startedAt,
        completedAt: next === 'COMPLETED' ? new Date() : fulfillment.completedAt,
        metadata: body.note
          ? ({ ...(fulfillment.metadata as Record<string, unknown>), note: body.note } as Prisma.InputJsonValue)
          : undefined
      }
    });
    await this.audit.log({
      userId,
      action: 'provider.fulfillment_transition',
      entityType: 'provider_fulfillment',
      entityId: updated.id,
      route: `/api/provider/fulfillments/${id}/transition`,
      method: 'POST',
      statusCode: 200,
      metadata: { from: fulfillment.status, to: next }
    });
    return updated;
  }
  async portfolio(userId: string) {
    const [items, caseStudies, settings] = await Promise.all([
      this.prisma.providerPortfolioItem.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' }
      }),
      this.loadSetting(userId, 'provider_portfolio_case_studies'),
      this.loadSetting(userId, 'provider_portfolio_settings')
    ]);
    return {
      items: items.map((entry) => this.serializePortfolio(entry)),
      caseStudies: Array.isArray((caseStudies as Record<string, unknown> | null)?.caseStudies)
        ? ((caseStudies as Record<string, unknown>).caseStudies as unknown[])
        : [],
      settings: this.serializePortfolioSettings(settings)
    };
  }
  async updatePortfolio(userId: string, body: Record<string, unknown>) {
    const sanitized = this.ensurePayload(body);
    const hasItems = Array.isArray(sanitized.items);
    const hasCaseStudies = Array.isArray(sanitized.caseStudies);
    const hasSettings = sanitized.settings && typeof sanitized.settings === 'object' && !Array.isArray(sanitized.settings);

    await this.prisma.$transaction(async (tx) => {
      if (hasItems) {
        const items = this.normalizePortfolioItems(sanitized.items as unknown[]);
        await tx.providerPortfolioItem.deleteMany({ where: { userId } });
        if (items.length) {
          await tx.providerPortfolioItem.createMany({
            data: items.map((item) => ({
              id: item.id,
              userId,
              title: item.title,
              description: item.description,
              mediaUrl: item.mediaUrl,
              status: item.status,
              data: item.data as Prisma.InputJsonValue
            }))
          });
        }
      }

      if (hasCaseStudies) {
        await this.upsertSettingTx(tx, userId, 'provider_portfolio_case_studies', {
          caseStudies: this.normalizeCaseStudies(sanitized.caseStudies as unknown[])
        });
      }

      if (hasSettings) {
        await this.upsertSettingTx(
          tx,
          userId,
          'provider_portfolio_settings',
          this.normalizePortfolioSettings(sanitized.settings as Record<string, unknown>)
        );
      }
    });

    await this.audit.log({
      userId,
      action: 'provider.portfolio_updated',
      entityType: 'provider_portfolio',
      entityId: userId,
      route: '/api/provider/portfolio',
      method: 'PATCH',
      statusCode: 200
    });

    return this.portfolio(userId);
  }
  async quoteTemplates(userId: string) {
    const existing = await this.loadSetting(userId, 'provider_quote_templates');
    const templates = Array.isArray((existing as Record<string, unknown> | null)?.templates)
      ? ((existing as Record<string, unknown>).templates as unknown[])
      : null;

    if (templates) {
      return { templates };
    }

    const defaultsRecord = await this.prisma.systemContent.findUnique({
      where: { key: 'provider_quote_templates_default' }
    });
    const defaultTemplates =
      defaultsRecord?.payload &&
      typeof defaultsRecord.payload === 'object' &&
      !Array.isArray(defaultsRecord.payload) &&
      Array.isArray((defaultsRecord.payload as Record<string, unknown>).templates)
        ? (((defaultsRecord.payload as Record<string, unknown>).templates as unknown[]) ?? [])
        : [];
    const payload = {
      templates: defaultTemplates
    };
    await this.upsertSetting(userId, 'provider_quote_templates', payload);
    return payload;
  }
  async reviews(userId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { subjectUserId: userId, subjectType: 'PROVIDER' },
      orderBy: { createdAt: 'desc' }
    });
    return { reviews };
  }
  async disputes(userId: string) {
    const disputes = await this.prisma.providerDispute.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
    return {
      disputes: disputes.map((dispute) => ({
        id: dispute.id,
        status: dispute.status,
        title: dispute.title,
        priority: dispute.priority,
        subjectType: dispute.subjectType,
        subjectId: dispute.subjectId,
        openedAt: dispute.openedAt.toISOString(),
        resolvedAt: dispute.resolvedAt?.toISOString() ?? null,
        createdAt: dispute.createdAt.toISOString(),
        updatedAt: dispute.updatedAt.toISOString(),
        ...(dispute.payload && typeof dispute.payload === 'object' && !Array.isArray(dispute.payload)
          ? (dispute.payload as Record<string, unknown>)
          : {})
      }))
    };
  }

  private ensurePayload(payload: unknown) {
    const sanitized = sanitizePayload(payload, { maxDepth: 6, maxArrayLength: 200, maxKeys: 200 });
    if (sanitized === undefined || !sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) {
      throw new BadRequestException('Invalid payload');
    }
    return sanitized as Record<string, unknown>;
  }

  private serializeQuote(quote: {
    id: string;
    status: string;
    title: string | null;
    buyer: string | null;
    amount: number | null;
    currency: string;
    data: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: quote.id,
      status: quote.status,
      title: quote.title,
      buyer: quote.buyer,
      amount: quote.amount,
      currency: quote.currency,
      data: quote.data ?? {},
      createdAt: quote.createdAt.toISOString(),
      updatedAt: quote.updatedAt.toISOString()
    };
  }

  private serializeBooking(booking: {
    id: string;
    status: string;
    scheduledAt: Date | null;
    durationMinutes: number | null;
    amount: number | null;
    currency: string;
    data: unknown;
    createdAt: Date;
    updatedAt: Date;
    fulfillment?: { id: string; status: string } | null;
  }) {
    return {
      id: booking.id,
      status: booking.status,
      scheduledAt: booking.scheduledAt?.toISOString() ?? null,
      durationMinutes: booking.durationMinutes,
      amount: booking.amount,
      currency: booking.currency,
      data: booking.data ?? {},
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
      fulfillment: booking.fulfillment ?? null
    };
  }

  private serializeConsultation(consultation: {
    id: string;
    status: string;
    scheduledAt: Date | null;
    data: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: consultation.id,
      status: consultation.status,
      scheduledAt: consultation.scheduledAt?.toISOString() ?? null,
      data: consultation.data ?? {},
      createdAt: consultation.createdAt.toISOString(),
      updatedAt: consultation.updatedAt.toISOString()
    };
  }

  private serializePortfolio(item: {
    id: string;
    title: string;
    description: string | null;
    mediaUrl: string | null;
    status: string;
    data: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      mediaUrl: item.mediaUrl,
      status: item.status,
      data: item.data ?? {},
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    };
  }

  private serializePortfolioSettings(payload: Record<string, unknown> | null) {
    const normalized = this.normalizePortfolioSettings(payload ?? {});
    return {
      customTags: normalized.customTags,
      isPublic: normalized.isPublic,
      handle: normalized.handle
    };
  }

  private async loadSetting(userId: string, key: string) {
    const setting = await this.prisma.workspaceSetting.findUnique({
      where: {
        userId_key: {
          userId,
          key
        }
      }
    });
    return (setting?.payload as Record<string, unknown> | null) ?? null;
  }

  private async loadProviderProfile(userId: string) {
    const record = await this.prisma.providerRecord.findUnique({
      where: {
        userId_recordType_recordKey: {
          userId,
          recordType: 'onboarding_profile',
          recordKey: 'main'
        }
      }
    });
    return (record?.payload as Record<string, unknown> | null) ?? null;
  }

  private async resolveProviderTarget(body: {
    providerUserId?: string;
    providerHandle?: string;
  }) {
    const providerUserId = this.trimOrNull(body.providerUserId);
    const providerHandle = this.normalizeHandle(body.providerHandle);

    if (!providerUserId && !providerHandle) {
      throw new BadRequestException('Provider userId or handle is required');
    }

    const provider = await this.prisma.seller.findFirst({
      where: {
        kind: 'PROVIDER',
        OR: [
          ...(providerUserId ? [{ userId: providerUserId }] : []),
          ...(providerHandle ? [{ handle: providerHandle }] : [])
        ]
      },
      select: {
        id: true,
        userId: true,
        handle: true
      }
    });

    if (!provider?.userId) {
      throw new NotFoundException('Provider not found');
    }

    return provider;
  }

  private async assertProviderSupports(
    userId: string,
    capability: 'quotes' | 'bookings' | 'consultations'
  ) {
    const profile = await this.loadProviderProfile(userId);
    const capabilities = this.resolveCapabilities(profile);
    if (capabilities[capability]) {
      return;
    }
    throw new BadRequestException(`Provider onboarding does not currently allow ${capability}`);
  }

  private parseDateOrNull(value: string | null | undefined) {
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid scheduledAt value');
    }
    return parsed;
  }

  private trimOrNull(value: unknown) {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed || null;
  }

  private normalizeHandle(value: unknown) {
    const trimmed = this.trimOrNull(value);
    if (!trimmed) {
      return null;
    }
    return trimmed.replace(/^@/, '').toLowerCase();
  }

  private resolveCapabilities(profile: Record<string, unknown> | null) {
    const rawModes = Array.isArray(profile?.bookingModes) ? profile.bookingModes : [];
    const modes = new Set(
      rawModes
        .map((entry) => String(entry || '').trim().toLowerCase())
        .filter(Boolean)
    );

    if (modes.size === 0 || modes.has('all') || modes.has('any')) {
      return {
        quotes: true,
        bookings: true,
        consultations: true
      };
    }

    const hasAny = (...aliases: string[]) => aliases.some((alias) => modes.has(alias));
    return {
      quotes: hasAny('quote', 'quotes', 'proposal', 'proposals', 'request_quote', 'request_quotes'),
      bookings: hasAny('booking', 'bookings', 'instant', 'request', 'requests'),
      consultations: hasAny('consultation', 'consultations', 'call', 'calls')
    };
  }

  private async upsertSetting(userId: string, key: string, payload: Record<string, unknown>) {
    await this.prisma.workspaceSetting.upsert({
      where: {
        userId_key: {
          userId,
          key
        }
      },
      create: {
        userId,
        key,
        payload: payload as Prisma.InputJsonValue
      },
      update: {
        payload: payload as Prisma.InputJsonValue
      }
    });
  }

  private async upsertSettingTx(
    tx: Prisma.TransactionClient,
    userId: string,
    key: string,
    payload: Record<string, unknown>
  ) {
    await tx.workspaceSetting.upsert({
      where: {
        userId_key: {
          userId,
          key
        }
      },
      create: {
        userId,
        key,
        payload: payload as Prisma.InputJsonValue
      },
      update: {
        payload: payload as Prisma.InputJsonValue
      }
    });
  }

  private normalizePortfolioItems(items: unknown[]) {
    return items
      .map((item) => this.normalizePortfolioItem(item))
      .filter((item): item is ReturnType<ProviderService['normalizePortfolioItem']> => Boolean(item));
  }

  private normalizePortfolioItem(item: unknown) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const entry = item as Record<string, unknown>;
    const dataValue = entry.data && typeof entry.data === 'object' && !Array.isArray(entry.data) ? entry.data : {};
    const data = dataValue as Record<string, unknown>;
    const title = String(entry.title ?? data.title ?? 'Portfolio item').trim() || 'Portfolio item';
    const descriptionValue = entry.description ?? data.description;
    const mediaUrlValue = entry.mediaUrl ?? data.thumb;
    const createdAt = String(data.createdAt ?? entry.createdAt ?? new Date().toISOString());
    return {
      id: String(entry.id ?? randomUUID()),
      title,
      description: typeof descriptionValue === 'string' ? descriptionValue : null,
      mediaUrl: typeof mediaUrlValue === 'string' ? mediaUrlValue : null,
      status: typeof entry.status === 'string' && entry.status.trim() ? entry.status : 'active',
      data: {
        type: typeof data.type === 'string' ? data.type : 'image',
        tags: Array.isArray(data.tags) ? data.tags.map((tag) => String(tag)) : [],
        featured: Boolean(data.featured),
        usedAsCover: Boolean(data.usedAsCover),
        thumb: typeof data.thumb === 'string' ? data.thumb : typeof mediaUrlValue === 'string' ? mediaUrlValue : '',
        createdAt
      }
    };
  }

  private normalizeCaseStudies(caseStudies: unknown[]) {
    return caseStudies
      .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry))
      .map((entry) => ({
        id: String(entry.id ?? randomUUID()),
        title: String(entry.title ?? 'Case study'),
        client: String(entry.client ?? 'Client'),
        scope: String(entry.scope ?? ''),
        tags: Array.isArray(entry.tags) ? entry.tags.map((tag) => String(tag)) : [],
        featured: Boolean(entry.featured),
        createdAt: String(entry.createdAt ?? new Date().toISOString()),
        summary: String(entry.summary ?? ''),
        highlights: Array.isArray(entry.highlights)
          ? entry.highlights
              .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
              .map((item) => ({
                k: String(item.k ?? ''),
                v: String(item.v ?? '')
              }))
          : []
      }));
  }

  private normalizePortfolioSettings(payload: Record<string, unknown>) {
    const customTags = Array.isArray(payload.customTags)
      ? payload.customTags
          .map((tag) => String(tag || '').trim().toLowerCase())
          .filter(Boolean)
      : [];
    const handle = (typeof payload.handle === 'string' ? payload.handle : '')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return {
      customTags: Array.from(new Set(customTags)),
      isPublic: payload.isPublic === undefined ? true : Boolean(payload.isPublic),
      handle
    };
  }

  private normalizeStatus(status: string) {
    return String(status || '').trim().toUpperCase();
  }

  private assertQuoteTransition(current: string, next: string) {
    const transitions: Record<string, string[]> = {
      DRAFT: ['SENT', 'CANCELLED'],
      SENT: ['NEGOTIATING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED'],
      NEGOTIATING: ['ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED'],
      ACCEPTED: ['BOOKED', 'CANCELLED'],
      REJECTED: [],
      CANCELLED: [],
      EXPIRED: [],
      BOOKED: []
    };
    const currentKey = this.normalizeStatus(current);
    const allowed = transitions[currentKey] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(`Quote status cannot transition from ${current} to ${next}`);
    }
  }

  private assertBookingTransition(current: string, next: string) {
    const transitions: Record<string, string[]> = {
      REQUESTED: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED', 'DISPUTED'],
      COMPLETED: [],
      CANCELLED: [],
      NO_SHOW: [],
      DISPUTED: []
    };
    const currentKey = this.normalizeStatus(current);
    const allowed = transitions[currentKey] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(`Booking status cannot transition from ${current} to ${next}`);
    }
  }

  private async ensureFulfillment(bookingId: string, status: ProviderFulfillmentStatus) {
    const existing = await this.prisma.providerFulfillment.findUnique({ where: { bookingId } });
    if (existing) {
      if (existing.status !== status) {
        await this.prisma.providerFulfillment.update({
          where: { id: existing.id },
          data: { status }
        });
      }
      return existing;
    }
    return this.prisma.providerFulfillment.create({
      data: { bookingId, status }
    });
  }

  private assertFulfillmentTransition(current: string, next: string) {
    const transitions: Record<string, string[]> = {
      OPEN: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'DISPUTED', 'CANCELLED'],
      COMPLETED: [],
      DISPUTED: [],
      CANCELLED: []
    };
    const currentKey = this.normalizeStatus(current);
    const allowed = transitions[currentKey] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(`Fulfillment status cannot transition from ${current} to ${next}`);
    }
  }
}
