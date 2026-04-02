import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { PayloadSanitizerOptions, normalizeIdentifier, sanitizePayload } from '../../common/sanitizers/payload-sanitizer.js';
import { PublishAdzBuilderDto } from './dto/publish-adz-builder.dto.js';
import { SaveAdzBuilderDto } from './dto/save-adz-builder.dto.js';
import { UpsertAdzCampaignDto } from './dto/upsert-adz-campaign.dto.js';
import { UpsertAdzLinkDto } from './dto/upsert-adz-link.dto.js';
import { ValidateAdzScheduleDto } from './dto/validate-adz-schedule.dto.js';

@Injectable()
export class AdzService {
  constructor(private readonly prisma: PrismaService) {}

  async builderConfig() {
    const key = 'seller_adz_builder_config';
    const existing = await this.prisma.systemContent.findUnique({ where: { key } });
    if (existing?.payload && typeof existing.payload === 'object' && !Array.isArray(existing.payload)) {
      return existing.payload as Record<string, unknown>;
    }
    const record = await this.prisma.systemContent.upsert({
      where: { key },
      update: { payload: {} as Prisma.InputJsonValue },
      create: {
        key,
        payload: {} as Prisma.InputJsonValue
      }
    });
    return (record.payload as Record<string, unknown>) ?? {};
  }

  async builder(id: string, userId: string) {
    const publicId = normalizeIdentifier(id, randomUUID());
    const storageId = this.resolveScopedIdentifier(userId, publicId, 'adz-builder');
    const builder = await this.prisma.adzBuilder.upsert({
      where: { id: storageId },
      update: {},
      create: {
        id: storageId,
        userId,
        status: 'draft',
        data: {
          id: publicId,
          status: 'draft'
        } as Prisma.InputJsonValue
      }
    });
    return this.serializeBuilder(builder);
  }
  saveBuilder(userId: string, payload: SaveAdzBuilderDto) {
    const sanitized = this.ensureObjectPayload(this.extractPayload(payload));
    const publicId = normalizeIdentifier(sanitized.adId ?? sanitized.id, randomUUID());
    const storageId = this.resolveScopedIdentifier(userId, publicId, 'adz-builder');
    const storedPayload = {
      ...sanitized,
      id: publicId
    };
    return this.prisma.adzBuilder
      .upsert({
        where: { id: storageId },
        update: {
          status: String((storedPayload as any).status ?? 'draft'),
          data: storedPayload as Prisma.InputJsonValue
        },
        create: {
          id: storageId,
          userId,
          status: String((storedPayload as any).status ?? 'draft'),
          data: storedPayload as Prisma.InputJsonValue
        }
      })
      .then((builder) => this.serializeBuilder(builder));
  }

  async publishBuilder(userId: string, id: string, payload: PublishAdzBuilderDto) {
    const publicId = normalizeIdentifier(id, randomUUID());
    const storageId = this.resolveScopedIdentifier(userId, publicId, 'adz-builder');
    const existing = await this.prisma.adzBuilder.findFirst({
      where: { id: storageId, userId }
    });
    if (!existing) {
      throw new NotFoundException('Builder not found');
    }
    const sanitized = this.ensureObjectPayload(this.extractPayload(payload));
    const merged = {
      ...(existing.data as any),
      ...sanitized,
      id: publicId,
      published: true,
      publishedAt: new Date().toISOString()
    };
    await this.prisma.adzBuilder.update({
      where: { id: storageId },
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
      include: { performance: true },
      orderBy: { updatedAt: 'desc' }
    });
    const context = await this.buildCampaignHydrationContext(campaigns, userId);
    return campaigns.map((campaign) =>
      this.serializeCampaign(this.hydrateCampaignForDashboard(campaign, context))
    );
  }
  async campaign(userId: string, id: string) {
    const campaign = await this.prisma.adzCampaign.findFirst({
      where: { id, userId },
      include: { performance: true }
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    const context = await this.buildCampaignHydrationContext([campaign], userId);
    return this.serializeCampaign(this.hydrateCampaignForDashboard(campaign, context));
  }
  async marketplace(userId: string) {
    const campaigns = await this.prisma.adzCampaign.findMany({
      where: { isMarketplace: true },
      include: { performance: true },
      orderBy: { updatedAt: 'desc' }
    });
    const context = await this.buildCampaignHydrationContext(campaigns, userId);
    return campaigns.map((campaign) =>
      this.serializeCampaign(this.hydrateCampaignForDashboard(campaign, context))
    );
  }
  createCampaign(userId: string, body: UpsertAdzCampaignDto) {
    const sanitized = this.ensureObjectPayload(this.extractPayload(body));
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
  updateCampaign(userId: string, id: string, body: UpsertAdzCampaignDto) {
    const sanitized = this.ensureObjectPayload(this.extractPayload(body));
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

  async validateSchedule(userId: string, body: ValidateAdzScheduleDto) {
    const campaignId = body.campaignId;
    const start = this.parseDate(body.startAt);
    const end = this.parseDate(body.endAt);
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
  createLink(userId: string, body: UpsertAdzLinkDto) {
    const sanitized = this.ensureObjectPayload(this.extractPayload(body), { maxDepth: 6, maxArrayLength: 100, maxKeys: 150 });
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
  updateLink(userId: string, id: string, body: UpsertAdzLinkDto) {
    const sanitized = this.ensureObjectPayload(this.extractPayload(body), { maxDepth: 6, maxArrayLength: 100, maxKeys: 150 });
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

  private parseDate(value?: unknown) {
    if (!value) return null;
    const date = new Date(String(value));
    if (Number.isNaN(date.valueOf())) return null;
    return date;
  }

  private parseJsonObject(value: unknown) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private readString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : '';
  }

  private readStringFrom(source: Record<string, unknown>, ...keys: string[]) {
    for (const key of keys) {
      const value = this.readString(source[key]);
      if (value) return value;
    }
    return '';
  }

  private readStringList(value: unknown) {
    if (Array.isArray(value)) {
      return value.map((entry) => this.readString(entry)).filter(Boolean);
    }
    if (typeof value === 'string') {
      return value
        .split(/[,\n|]/g)
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
    return [];
  }

  private readNumber(value: unknown, fallback = 0) {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  private readBoolean(value: unknown) {
    return Boolean(value);
  }

  private normalizeIso(value: unknown) {
    const parsed = this.parseDate(value);
    return parsed ? parsed.toISOString() : '';
  }

  private parseCategories(raw: unknown) {
    if (typeof raw !== 'string' || !raw.trim()) return [] as string[];
    return raw
      .split(/[,\n|]/g)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  private fallbackSupplierProfile(seller: {
    id: string;
    name: string;
    displayName: string;
    category: string | null;
    categories: string | null;
    storefront: { logoUrl: string | null; coverUrl: string | null } | null;
  } | null) {
    if (!seller) {
      return { name: 'Supplier', category: 'General', logoUrl: '' };
    }
    const categories = this.parseCategories(seller.categories);
    return {
      name: seller.displayName || seller.name || 'Supplier',
      category: seller.category || categories[0] || 'General',
      logoUrl: seller.storefront?.logoUrl || seller.storefront?.coverUrl || ''
    };
  }

  private async buildCampaignHydrationContext(
    campaigns: Array<{
      id: string;
      userId: string;
      data: unknown;
    }>,
    fallbackUserId: string
  ) {
    const sourceCampaignIds = Array.from(
      new Set(
        campaigns
          .map((campaign) => this.parseJsonObject(campaign.data))
          .flatMap((data) => [
            this.readStringFrom(data, 'campaignId', 'sourceCampaignId')
          ])
          .filter(Boolean)
      )
    );

    const [fallbackSeller, sourceCampaigns] = await Promise.all([
      this.prisma.seller.findFirst({
        where: { userId: fallbackUserId },
        include: { storefront: true }
      }),
      sourceCampaignIds.length
        ? this.prisma.campaign.findMany({
            where: { id: { in: sourceCampaignIds } },
            include: {
              seller: { include: { storefront: true } },
              creator: { include: { creatorProfile: true } }
            }
          })
        : Promise.resolve([])
    ]);

    return {
      fallbackSupplier: this.fallbackSupplierProfile(fallbackSeller),
      sourceCampaignMap: new Map(sourceCampaigns.map((campaign) => [campaign.id, campaign]))
    };
  }

  private hydrateCampaignForDashboard(
    campaign: {
      id: string;
      userId: string;
      status: string;
      title: string | null;
      budget: number | null;
      currency: string;
      isMarketplace: boolean;
      data: unknown;
      createdAt: Date;
      updatedAt: Date;
      performance?: {
        clicks: number;
        purchases: number;
        earnings: number;
        data: unknown;
      } | null;
    },
    context: {
      fallbackSupplier: { name: string; category: string; logoUrl: string };
      sourceCampaignMap: Map<string, any>;
    }
  ) {
    const data = this.parseJsonObject(campaign.data);
    const linkedCampaignId = this.readStringFrom(data, 'campaignId', 'sourceCampaignId');
    const linkedCampaign = linkedCampaignId ? context.sourceCampaignMap.get(linkedCampaignId) : null;
    const linkedMeta = this.parseJsonObject(linkedCampaign?.metadata);
    const performanceData = this.parseJsonObject(campaign.performance?.data);

    const supplierData = this.parseJsonObject(data.supplier);
    const linkedSupplier = linkedCampaign?.seller
      ? {
          name: linkedCampaign.seller.displayName || linkedCampaign.seller.name || context.fallbackSupplier.name,
          category:
            linkedCampaign.seller.category ||
            this.parseCategories(linkedCampaign.seller.categories)[0] ||
            context.fallbackSupplier.category,
          logoUrl:
            linkedCampaign.seller.storefront?.logoUrl ||
            linkedCampaign.seller.storefront?.coverUrl ||
            context.fallbackSupplier.logoUrl
        }
      : context.fallbackSupplier;

    const creatorProfile = linkedCampaign?.creator?.creatorProfile || null;
    const creatorData = this.parseJsonObject(data.creator);
    const creator = {
      name: this.readString(creatorData.name) || this.readString(creatorProfile?.name) || 'Creator',
      handle:
        this.readString(creatorData.handle) ||
        (this.readString(creatorProfile?.handle)
          ? `@${this.readString(creatorProfile?.handle).replace(/^@/, '')}`
          : '@creator'),
      avatarUrl: this.readString(creatorData.avatarUrl),
      verified: this.readBoolean(creatorData.verified || creatorProfile?.verified)
    };

    const offers = Array.isArray(data.offers) ? data.offers : [];
    const hasGenerated =
      this.readBoolean(data.generated) ||
      ['generated', 'scheduled', 'live', 'active', 'pending_approval'].includes(
        String(campaign.status || '').toLowerCase()
      );
    const clicks7d = this.readNumber(data.clicks7d, this.readNumber(campaign.performance?.clicks, 0));
    const orders7d = this.readNumber(data.orders7d, this.readNumber(campaign.performance?.purchases, 0));
    const revenue7d = this.readNumber(data.revenue7d, this.readNumber(campaign.performance?.earnings, 0));
    const impressions7d = this.readNumber(
      data.impressions7d,
      this.readNumber(performanceData.impressions7d, Math.max(clicks7d * 12, clicks7d))
    );

    const startISO =
      this.normalizeIso(data.startISO) ||
      this.normalizeIso(data.startsAtISO) ||
      (linkedCampaign?.startAt ? linkedCampaign.startAt.toISOString() : '') ||
      campaign.createdAt.toISOString();
    const endISO =
      this.normalizeIso(data.endISO) ||
      this.normalizeIso(data.endsAtISO) ||
      (linkedCampaign?.endAt ? linkedCampaign.endAt.toISOString() : '') ||
      campaign.updatedAt.toISOString();

    const enrichedData = {
      ...data,
      campaignName:
        this.readStringFrom(data, 'campaignName', 'name', 'title') ||
        this.readString(campaign.title) ||
        this.readString(linkedCampaign?.title) ||
        `Ad ${campaign.id}`,
      campaignSubtitle:
        this.readStringFrom(data, 'campaignSubtitle', 'subtitle') ||
        this.readString(linkedCampaign?.description),
      supplier: {
        name: this.readString(supplierData.name) || linkedSupplier.name,
        category: this.readString(supplierData.category) || linkedSupplier.category,
        logoUrl: this.readString(supplierData.logoUrl) || linkedSupplier.logoUrl
      },
      creator,
      hostRole:
        this.readString(data.hostRole) ||
        (this.readStringFrom(data, 'creatorUsage', 'creatorUsageDecision').toLowerCase() === 'i will not use a creator'
          ? 'Supplier'
          : 'Creator'),
      creatorUsage:
        this.readStringFrom(data, 'creatorUsage', 'creatorUsageDecision') ||
        this.readString(linkedMeta.creatorUsageDecision) ||
        'I will use a Creator',
      collabMode: this.readString(data.collabMode) || this.readString(linkedMeta.collabMode) || 'Open for Collabs',
      approvalMode: this.readString(data.approvalMode) || this.readString(linkedMeta.approvalMode) || 'Manual',
      platforms: this.readStringList(data.platforms),
      startISO,
      endISO,
      timezone: this.readString(data.timezone) || 'Africa/Kampala',
      heroImageUrl: this.readString(data.heroImageUrl),
      heroIntroVideoUrl: this.readString(data.heroIntroVideoUrl),
      compensation:
        this.parseJsonObject(data.compensation).type ||
        this.parseJsonObject(data.compensation).model
          ? this.parseJsonObject(data.compensation)
          : { type: 'Commission', commissionRate: 0, flatFee: 0, currency: campaign.currency || 'USD' },
      offers,
      generated: hasGenerated,
      hasBrokenLink: this.readBoolean(data.hasBrokenLink),
      lowStock:
        this.readBoolean(data.lowStock) ||
        offers.some((offer) => {
          const entry = this.parseJsonObject(offer);
          return (
            String(entry.type || '').toUpperCase() === 'PRODUCT' &&
            this.readNumber(entry.stockLeft, -1) > 0 &&
            this.readNumber(entry.stockLeft, -1) <= 5
          );
        }),
      impressions7d,
      clicks7d,
      orders7d,
      revenue7d,
      currency: this.readString(data.currency) || campaign.currency || 'USD'
    } as Record<string, unknown>;

    return {
      ...campaign,
      data: enrichedData
    };
  }

  private resolveScopedIdentifier(userId: string, publicId: string, prefix: string) {
    return normalizeIdentifier(`${prefix}_${userId}_${publicId}`, randomUUID());
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
    const data =
      builder.data && typeof builder.data === 'object' && !Array.isArray(builder.data)
        ? (builder.data as Record<string, unknown>)
        : {};
    return {
      id: typeof data.id === 'string' && data.id.trim() ? data.id : builder.id,
      status: builder.status,
      published: builder.published,
      publishedAt: builder.publishedAt?.toISOString() ?? null,
      data: data,
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
