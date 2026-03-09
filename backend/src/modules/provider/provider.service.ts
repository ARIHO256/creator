import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { sanitizePayload } from '../../common/sanitizers/payload-sanitizer.js';
import { SellersService } from '../sellers/sellers.service.js';
import { CreateProviderQuoteDto } from './dto/create-provider-quote.dto.js';

@Injectable()
export class ProviderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sellersService: SellersService
  ) {}

  async serviceCommand(userId: string) {
    const [openQuotes, activeBookings, totalQuotes] = await Promise.all([
      this.prisma.providerQuote.count({ where: { userId, status: { in: ['draft', 'sent', 'negotiating'] } } }),
      this.prisma.providerBooking.count({ where: { userId, status: { in: ['requested', 'confirmed'] } } }),
      this.prisma.providerQuote.count({ where: { userId } })
    ]);
    return {
      queues: [
        { key: 'quotes', label: 'Quotes', count: openQuotes },
        { key: 'bookings', label: 'Bookings', count: activeBookings }
      ],
      kpis: [
        { key: 'quotes_total', label: 'Total Quotes', value: totalQuotes }
      ]
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
  async consultations(userId: string) {
    const consultations = await this.prisma.providerConsultation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
    return { consultations: consultations.map((entry) => this.serializeConsultation(entry)) };
  }
  async bookings(userId: string) {
    const bookings = await this.prisma.providerBooking.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
    return { bookings: bookings.map((entry) => this.serializeBooking(entry)) };
  }
  async booking(userId: string, id: string) {
    const booking = await this.prisma.providerBooking.findFirst({
      where: { id, userId }
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return this.serializeBooking(booking);
  }
  async portfolio(userId: string) {
    const items = await this.prisma.providerPortfolioItem.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
    return { items: items.map((entry) => this.serializePortfolio(entry)) };
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
      updatedAt: booking.updatedAt.toISOString()
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
}
