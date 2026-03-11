import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma, ProviderFulfillmentStatus } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { sanitizePayload } from '../../common/sanitizers/payload-sanitizer.js';
import { SellersService } from '../sellers/sellers.service.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { CreateProviderQuoteDto } from './dto/create-provider-quote.dto.js';
import { ProviderTransitionDto } from './dto/provider-transition.dto.js';
import { ProviderFulfillmentTransitionDto } from './dto/provider-fulfillment-transition.dto.js';

@Injectable()
export class ProviderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sellersService: SellersService,
    private readonly audit: AuditService
  ) {}

  async serviceCommand(userId: string) {
    const [openQuotes, activeBookings, totalQuotes, extras] = await Promise.all([
      this.prisma.providerQuote.count({ where: { userId, status: { in: ['draft', 'sent', 'negotiating'] } } }),
      this.prisma.providerBooking.count({ where: { userId, status: { in: ['requested', 'confirmed'] } } }),
      this.prisma.providerQuote.count({ where: { userId } }),
      this.loadSetting(userId, 'provider_service_command')
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
        : []
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
  async consultations(userId: string) {
    const consultations = await this.prisma.providerConsultation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
    return { consultations: consultations.map((entry) => this.serializeConsultation(entry)) };
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
    const [items, caseStudies] = await Promise.all([
      this.prisma.providerPortfolioItem.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' }
      }),
      this.loadSetting(userId, 'provider_portfolio_case_studies')
    ]);
    return {
      items: items.map((entry) => this.serializePortfolio(entry)),
      caseStudies: Array.isArray((caseStudies as Record<string, unknown> | null)?.caseStudies)
        ? ((caseStudies as Record<string, unknown>).caseStudies as unknown[])
        : []
    };
  }
  async reviews(userId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { subjectUserId: userId, subjectType: { in: ['SELLER', 'PROVIDER'] } },
      orderBy: { createdAt: 'desc' }
    });
    return { reviews };
  }
  async disputes(userId: string) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const disputes = await this.prisma.sellerDispute.findMany({
      where: { sellerId: seller.id },
      orderBy: { openedAt: 'desc' }
    });
    return { disputes };
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
