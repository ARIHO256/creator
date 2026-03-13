import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { PayloadSanitizerOptions, normalizeIdentifier, sanitizePayload } from '../../common/sanitizers/payload-sanitizer.js';

@Injectable()
export class AdzService {
  constructor(private readonly prisma: PrismaService) {}

  async builderConfig() {
    const key = 'seller_adz_builder_config';
    const existing = await this.prisma.systemContent.findUnique({ where: { key } });
    if (existing?.payload && typeof existing.payload === 'object' && !Array.isArray(existing.payload)) {
      return existing.payload as Record<string, unknown>;
    }
    const payload = this.defaultBuilderConfig();
    const record = await this.prisma.systemContent.upsert({
      where: { key },
      update: { payload: payload as Prisma.InputJsonValue },
      create: {
        key,
        payload: payload as Prisma.InputJsonValue
      }
    });
    return (record.payload as Record<string, unknown>) ?? payload;
  }

  async builder(id: string, userId: string) {
    const builder = await this.prisma.adzBuilder.findFirst({
      where: { id, userId }
    });
    if (!builder) {
      throw new NotFoundException('Builder not found');
    }
    return this.serializeBuilder(builder);
  }
  saveBuilder(userId: string, payload: Record<string, unknown>) {
    const sanitized = this.ensureObjectPayload(payload);
    const id = normalizeIdentifier(sanitized.adId ?? sanitized.id, randomUUID());
    return this.prisma.adzBuilder
      .upsert({
        where: { id },
        update: {
          status: String((sanitized as any).status ?? 'draft'),
          data: sanitized as Prisma.InputJsonValue
        },
        create: {
          id,
          userId,
          status: String((sanitized as any).status ?? 'draft'),
          data: sanitized as Prisma.InputJsonValue
        }
      })
      .then((builder) => this.serializeBuilder(builder));
  }

  async publishBuilder(userId: string, id: string, payload: Record<string, unknown>) {
    const existing = await this.prisma.adzBuilder.findFirst({
      where: { id, userId }
    });
    if (!existing) {
      throw new NotFoundException('Builder not found');
    }
    const sanitized = this.ensureObjectPayload(payload);
    const merged = {
      ...(existing.data as any),
      ...sanitized,
      published: true,
      publishedAt: new Date().toISOString()
    };
    await this.prisma.adzBuilder.update({
      where: { id: existing.id },
      data: {
        data: merged as Prisma.InputJsonValue,
        published: true,
        publishedAt: new Date(),
        status: String((merged as any).status ?? existing.status ?? 'published')
      }
    });
    const campaign = await this.prisma.adzCampaign.upsert({
      where: { id },
      update: {
        data: merged as Prisma.InputJsonValue,
        status: String((merged as any).status ?? 'published'),
        title: typeof (merged as any).title === 'string' ? (merged as any).title : undefined,
        budget: typeof (merged as any).budget === 'number' ? (merged as any).budget : undefined,
        currency: typeof (merged as any).currency === 'string' ? (merged as any).currency : undefined
      },
      create: {
        id,
        userId,
        status: String((merged as any).status ?? 'published'),
        title: typeof (merged as any).title === 'string' ? (merged as any).title : null,
        budget: typeof (merged as any).budget === 'number' ? (merged as any).budget : null,
        currency: typeof (merged as any).currency === 'string' ? (merged as any).currency : 'USD',
        data: merged as Prisma.InputJsonValue
      }
    });
    return this.serializeCampaign(campaign);
  }

  async campaigns(userId: string) {
    const campaigns = await this.prisma.adzCampaign.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
    return campaigns.map((campaign) => this.serializeCampaign(campaign));
  }
  async campaign(userId: string, id: string) {
    const campaign = await this.prisma.adzCampaign.findFirst({
      where: { id, userId }
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    return this.serializeCampaign(campaign);
  }
  async marketplace(userId: string) {
    const campaigns = await this.prisma.adzCampaign.findMany({
      where: { isMarketplace: true },
      orderBy: { updatedAt: 'desc' }
    });
    return campaigns.map((campaign) => this.serializeCampaign(campaign));
  }
  createCampaign(userId: string, body: Record<string, unknown>) {
    const sanitized = this.ensureObjectPayload(body);
    const id = normalizeIdentifier(sanitized.id, randomUUID());
    return this.prisma.adzCampaign
      .create({
        data: {
          id,
          userId,
          status: String((sanitized as any).status ?? 'draft'),
          title: typeof (sanitized as any).title === 'string' ? (sanitized as any).title : null,
          budget: typeof (sanitized as any).budget === 'number' ? (sanitized as any).budget : null,
          currency: typeof (sanitized as any).currency === 'string' ? (sanitized as any).currency : 'USD',
          isMarketplace: Boolean((sanitized as any).isMarketplace),
          data: sanitized as Prisma.InputJsonValue
        }
      })
      .then((campaign) => this.serializeCampaign(campaign));
  }
  updateCampaign(userId: string, id: string, body: Record<string, unknown>) {
    const sanitized = this.ensureObjectPayload(body);
    return this.prisma.adzCampaign
      .findFirst({ where: { id, userId } })
      .then((campaign) => {
        if (!campaign) {
          throw new NotFoundException('Campaign not found');
        }
        return this.prisma.adzCampaign.update({
          where: { id: campaign.id },
          data: {
            status: String((sanitized as any).status ?? campaign.status),
            title: typeof (sanitized as any).title === 'string' ? (sanitized as any).title : campaign.title,
            budget: typeof (sanitized as any).budget === 'number' ? (sanitized as any).budget : campaign.budget,
            currency: typeof (sanitized as any).currency === 'string' ? (sanitized as any).currency : campaign.currency,
            isMarketplace: typeof (sanitized as any).isMarketplace === 'boolean' ? (sanitized as any).isMarketplace : campaign.isMarketplace,
            data: sanitized as Prisma.InputJsonValue
          }
        });
      })
      .then((campaign) => this.serializeCampaign(campaign));
  }
  async performance(userId: string, id: string) {
    const perf = await this.prisma.adzPerformance.findFirst({
      where: { campaignId: id }
    });
    if (!perf) {
      return { clicks: 0, purchases: 0, earnings: 0 };
    }
    return {
      campaignId: perf.campaignId,
      clicks: perf.clicks,
      purchases: perf.purchases,
      earnings: perf.earnings,
      data: perf.data ?? {}
    };
  }

  async validateSchedule(userId: string, body: Record<string, unknown>) {
    const sanitized = this.ensureObjectPayload(body, { maxDepth: 4, maxArrayLength: 25, maxKeys: 25 });
    const campaignId = typeof sanitized.campaignId === 'string' ? sanitized.campaignId : '';
    const start = this.parseDate(sanitized.startAt);
    const end = this.parseDate(sanitized.endAt);
    if (!campaignId || !start || !end) {
      throw new BadRequestException('campaignId, startAt, and endAt are required');
    }
    if (end.getTime() <= start.getTime()) {
      return { ok: false, error: 'End time must be after start time' };
    }
    const campaign = await this.prisma.adzCampaign.findFirst({ where: { id: campaignId, userId } });
    if (!campaign) {
      return { ok: false, error: 'Invalid campaign selected' };
    }
    const data = campaign.data && typeof campaign.data === 'object' && !Array.isArray(campaign.data)
      ? campaign.data as Record<string, unknown>
      : {};
    const campaignStart = this.parseDate((data as any).startISO) ?? this.parseDate((data as any).startsAtISO);
    const campaignEnd = this.parseDate((data as any).endISO) ?? this.parseDate((data as any).endsAtISO);
    if (campaignStart && start.getTime() < campaignStart.getTime()) {
      return { ok: false, error: 'Ad starts before the selected campaign window' };
    }
    if (campaignEnd && end.getTime() > campaignEnd.getTime()) {
      return { ok: false, error: 'Ad ends after the selected campaign window' };
    }
    return { ok: true };
  }

  async promoAd(userId: string, id: string) {
    const promo = await this.prisma.promoAd.findFirst({
      where: { id, userId }
    });
    if (!promo) {
      return { id, status: 'draft' };
    }
    return this.serializePromo(promo);
  }

  async links(userId: string) {
    const links = await this.prisma.adzLink.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
    return links.map((link) => this.serializeLink(link));
  }
  async link(userId: string, id: string) {
    const link = await this.prisma.adzLink.findFirst({
      where: { id, userId }
    });
    if (!link) {
      throw new NotFoundException('Link not found');
    }
    return this.serializeLink(link);
  }
  createLink(userId: string, body: Record<string, unknown>) {
    const sanitized = this.ensureObjectPayload(body, { maxDepth: 6, maxArrayLength: 100, maxKeys: 150 });
    const id = normalizeIdentifier(sanitized.id, randomUUID());
    return this.prisma.adzLink
      .create({
        data: {
          id,
          userId,
          status: String((sanitized as any).status ?? 'active'),
          url: typeof (sanitized as any).url === 'string' ? (sanitized as any).url : null,
          data: sanitized as Prisma.InputJsonValue
        }
      })
      .then((link) => this.serializeLink(link));
  }
  updateLink(userId: string, id: string, body: Record<string, unknown>) {
    const sanitized = this.ensureObjectPayload(body, { maxDepth: 6, maxArrayLength: 100, maxKeys: 150 });
    return this.prisma.adzLink
      .findFirst({ where: { id, userId } })
      .then((link) => {
        if (!link) {
          throw new NotFoundException('Link not found');
        }
        return this.prisma.adzLink.update({
          where: { id: link.id },
          data: {
            status: String((sanitized as any).status ?? link.status),
            url: typeof (sanitized as any).url === 'string' ? (sanitized as any).url : link.url,
            data: sanitized as Prisma.InputJsonValue
          }
        });
      })
      .then((link) => this.serializeLink(link));
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

  private defaultBuilderConfig() {
    return {
      utmPresets: [
        {
          id: 'utm1',
          name: 'Marketplace default',
          description: 'Standard marketplace attribution for seller-paid traffic.',
          params: {
            utm_source: 'mylivedealz',
            utm_medium: 'shoppable_adz',
            utm_campaign: 'seller_launch',
            utm_content: 'default'
          }
        },
        {
          id: 'utm2',
          name: 'Creator collab',
          description: 'Use when a creator is amplifying the ad.',
          params: {
            utm_source: 'creator',
            utm_medium: 'shoppable_adz',
            utm_campaign: 'creator_collab',
            utm_content: 'cohost'
          }
        },
        {
          id: 'utm3',
          name: 'Flash sale',
          description: 'Short-window promo tagging for countdown drops.',
          params: {
            utm_source: 'mylivedealz',
            utm_medium: 'flash_sale',
            utm_campaign: 'limited_drop',
            utm_content: 'countdown'
          }
        }
      ]
    };
  }

  private serializeBuilder(builder: {
    id: string;
    status: string;
    published: boolean;
    publishedAt: Date | null;
    data: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: builder.id,
      status: builder.status,
      published: builder.published,
      publishedAt: builder.publishedAt?.toISOString() ?? null,
      data: builder.data ?? {},
      createdAt: builder.createdAt.toISOString(),
      updatedAt: builder.updatedAt.toISOString()
    };
  }

  private serializeCampaign(campaign: {
    id: string;
    status: string;
    title: string | null;
    budget: number | null;
    currency: string;
    isMarketplace: boolean;
    data: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: campaign.id,
      status: campaign.status,
      title: campaign.title,
      budget: campaign.budget,
      currency: campaign.currency,
      isMarketplace: campaign.isMarketplace,
      data: campaign.data ?? {},
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString()
    };
  }

  private serializeLink(link: {
    id: string;
    status: string;
    url: string | null;
    data: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: link.id,
      status: link.status,
      url: link.url,
      data: link.data ?? {},
      createdAt: link.createdAt.toISOString(),
      updatedAt: link.updatedAt.toISOString()
    };
  }

  private serializePromo(promo: {
    id: string;
    status: string;
    data: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: promo.id,
      status: promo.status,
      data: promo.data ?? {},
      createdAt: promo.createdAt.toISOString(),
      updatedAt: promo.updatedAt.toISOString()
    };
  }
}
