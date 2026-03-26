import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SellerKind } from '@prisma/client';
import { randomUUID } from 'crypto';
import { normalizeFileIntake } from '../../common/files/file-intake.js';
import { Prisma } from '@prisma/client';
import { sanitizePayload } from '../../common/sanitizers/payload-sanitizer.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { JobsService } from '../jobs/jobs.service.js';
import { TaxonomyService } from '../taxonomy/taxonomy.service.js';
import { PROVIDER_SERVICE_TAXONOMY_TREE_SLUG } from '../taxonomy/provider-service-taxonomy.js';
import { SELLER_CATALOG_TAXONOMY_TREE_SLUG } from '../taxonomy/seller-catalog-taxonomy.js';
import { CreateUploadDto } from './dto/create-upload.dto.js';
import { CreateContentApprovalDto } from './dto/create-content-approval.dto.js';
import { PatchScreenStateDto } from './dto/patch-screen-state.dto.js';
import { ResubmitContentApprovalDto } from './dto/resubmit-content-approval.dto.js';
import { UpdateAccountApprovalDto } from './dto/update-account-approval.dto.js';
import { UpdateAccountApprovalDecisionDto } from './dto/update-account-approval-decision.dto.js';
import { UpdateContentApprovalDto } from './dto/update-content-approval.dto.js';
import { ONBOARDING_PROFILE_TYPES, UpdateOnboardingDto } from './dto/update-onboarding.dto.js';
import {
  createDefaultOnboardingState,
  mergeOnboardingState,
  normalizeStoredOnboardingState,
  prepareSubmittedOnboarding,
  RESERVED_SELLER_SLUGS,
  sellerSlugToHandle
} from './onboarding-state.js';

const EMPTY_ONBOARDING_LOOKUPS = {
  languages: [],
  taxpayerTypes: [],
  payoutMethods: [],
  payoutCurrencies: [],
  payoutRhythms: [],
  mobileMoneyProviders: [],
  mobileIdTypes: [],
  payoutRegions: {
    alipay: [],
    wechat: []
  },
  providerRegions: [],
  supplierModels: [],
  supplierTargetRegions: [],
  productCategories: [],
  serviceCategories: [],
  contentFormats: [],
  creatorUsageDecisions: [],
  collabModes: [],
  approvalModes: [],
  payoutMethodCards: [],
  policyPresets: []
};

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    private readonly jobsService: JobsService,
    private readonly taxonomyService: TaxonomyService
  ) {}

  async uploads(userId: string) {
    let sessions: Array<{
      id: string;
      purpose: string | null;
      fileName: string;
      kind: string;
      mimeType: string | null;
      sizeBytes: number | null;
      extension: string | null;
      checksum: string | null;
      storageProvider: string | null;
      storageKey: string | null;
      visibility: string | null;
      status: string | null;
      expiresAt: Date | null;
      metadata: Prisma.JsonValue;
      createdAt: Date;
      updatedAt: Date;
    }> = [];
    try {
      sessions = await this.prisma.uploadSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
    } catch (error) {
      return this.listUploadEntriesWithFallback(userId, error, 'query');
    }
    const uploads: Array<Record<string, unknown>> = [];
    for (const session of sessions) {
      try {
        uploads.push({
          id: session.id,
          ...this.toUploadPayload(session)
        });
      } catch (error) {
        this.logUploadWarning(userId, 'serialize', error, session.id);
      }
    }
    return uploads;
  }
  async createUpload(userId: string, body: CreateUploadDto) {
    const id = body.id || randomUUID();
    const file = normalizeFileIntake(body);
    const storageProvider = file.storageProvider ?? (this.configService.get<string>('upload.defaultProvider') ?? 'LOCAL');
    const expiresAt = new Date(
      Date.now() + (this.configService.get<number>('upload.sessionTtlMinutes') ?? 20) * 60_000
    );
    const uploadPayload = {
      name: file.name,
      kind: file.kind,
      mimeType: file.mimeType ?? null,
      sizeBytes: file.sizeBytes ?? null,
      extension: file.extension ?? null,
      checksum: file.checksum ?? null,
      storageProvider,
      storageKey: file.storageKey ?? `${userId}/${id}/${file.name}`,
      url: body.url ?? null,
      visibility: file.visibility ?? 'PRIVATE',
      purpose: body.purpose ?? 'general',
      domain: body.domain ?? null,
      entityType: body.entityType ?? null,
      entityId: body.entityId ?? null,
      status: body.status ?? 'UPLOADED',
      metadata: {
        ...(body.metadata ?? {}),
        domain: body.domain ?? null,
        entityType: body.entityType ?? null,
        entityId: body.entityId ?? null,
        url: body.url ?? null
      } as Record<string, unknown>,
      createdAt: new Date().toISOString()
    };

    try {
      const session = await this.prisma.uploadSession.create({
        data: {
          id,
          userId,
          purpose: body.purpose ?? 'general',
          fileName: file.name,
          kind: file.kind,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          extension: file.extension,
          checksum: file.checksum,
          storageProvider,
          storageKey: file.storageKey ?? `${userId}/${id}/${file.name}`,
          visibility: file.visibility ?? 'PRIVATE',
          status: body.status ?? 'UPLOADED',
          expiresAt,
          metadata: uploadPayload.metadata as Prisma.InputJsonValue
        }
      });
      return { id: session.id, ...this.toUploadPayload(session) };
    } catch (error) {
      if (!this.isMissingSchemaObjectError(error)) {
        throw error;
      }
      await this.appendUploadFallbackEntry(userId, { id, ...uploadPayload });
      return { id, ...uploadPayload };
    }
  }

  async onboarding(userId: string) {
    const profileType = await this.resolveOnboardingProfileType(userId);
    const payload = await this.getOnboardingPayload(userId, profileType);
    if (payload) {
      return normalizeStoredOnboardingState(payload, profileType);
    }
    const initial = createDefaultOnboardingState(profileType);
    await this.upsertOnboardingPayload(userId, profileType, initial);
    return initial;
  }

  async onboardingLookups() {
    const key = 'onboarding_lookups';
    let record: { payload: Prisma.JsonValue } | null = null;
    try {
      const existing = await this.prisma.systemContent.findUnique({ where: { key } });
      record =
        existing ??
        (await this.prisma.systemContent.create({
          data: {
            key,
            payload: {} as Prisma.InputJsonValue
          }
        }));
    } catch (error) {
      if (this.isMissingSchemaObjectError(error)) {
        return EMPTY_ONBOARDING_LOOKUPS;
      }
      throw error;
    }
    const payload =
      record.payload && typeof record.payload === 'object' && !Array.isArray(record.payload)
        ? (record.payload as Record<string, unknown>)
        : {};
    const payoutRegions =
      payload.payoutRegions && typeof payload.payoutRegions === 'object' && !Array.isArray(payload.payoutRegions)
        ? (payload.payoutRegions as Record<string, unknown>)
        : {};

    return {
      ...EMPTY_ONBOARDING_LOOKUPS,
      ...payload,
      payoutMethods: Array.isArray(payload.payoutMethods)
        ? payload.payoutMethods
        : EMPTY_ONBOARDING_LOOKUPS.payoutMethods,
      payoutCurrencies: Array.isArray(payload.payoutCurrencies)
        ? payload.payoutCurrencies
        : EMPTY_ONBOARDING_LOOKUPS.payoutCurrencies,
      payoutRhythms: Array.isArray(payload.payoutRhythms)
        ? payload.payoutRhythms
        : EMPTY_ONBOARDING_LOOKUPS.payoutRhythms,
      mobileMoneyProviders: Array.isArray(payload.mobileMoneyProviders)
        ? payload.mobileMoneyProviders
        : EMPTY_ONBOARDING_LOOKUPS.mobileMoneyProviders,
      mobileIdTypes: Array.isArray(payload.mobileIdTypes)
        ? payload.mobileIdTypes
        : EMPTY_ONBOARDING_LOOKUPS.mobileIdTypes,
      payoutRegions: {
        alipay: Array.isArray(payoutRegions.alipay)
          ? payoutRegions.alipay
          : EMPTY_ONBOARDING_LOOKUPS.payoutRegions.alipay,
        wechat: Array.isArray(payoutRegions.wechat)
          ? payoutRegions.wechat
          : EMPTY_ONBOARDING_LOOKUPS.payoutRegions.wechat
      },
      policyPresets: Array.isArray(payload.policyPresets)
        ? payload.policyPresets
        : EMPTY_ONBOARDING_LOOKUPS.policyPresets
    };
  }

  async slugAvailability(userId: string, slug: string) {
    const normalizedSlug = sellerSlugToHandle(slug);

    if (!normalizedSlug) {
      return { slug: normalizedSlug, available: false, reason: 'invalid' };
    }

    if (RESERVED_SELLER_SLUGS.has(normalizedSlug)) {
      return { slug: normalizedSlug, available: false, reason: 'reserved' };
    }

    const existingSeller = await this.prisma.seller.findUnique({
      where: { handle: normalizedSlug },
      select: { userId: true }
    });

    return {
      slug: normalizedSlug,
      available: !existingSeller || existingSeller.userId === userId,
      reason: existingSeller && existingSeller.userId !== userId ? 'taken' : 'available'
    };
  }

  async patchOnboarding(userId: string, body: UpdateOnboardingDto) {
    const current = await this.onboarding(userId);
    const merged = mergeOnboardingState(current, body);
    await this.validateOnboardingTaxonomy(merged);
    await this.upsertOnboardingPayload(userId, merged.profileType, merged);
    await this.syncCreatorProfileFromOnboarding(userId, merged);
    return merged;
  }

  async resetOnboarding(userId: string) {
    const profileType = await this.resolveOnboardingProfileType(userId);
    const reset = createDefaultOnboardingState(profileType);
    await this.upsertOnboardingPayload(userId, profileType, reset);
    return reset;
  }

  async submitOnboarding(userId: string, body: UpdateOnboardingDto) {
    const current = await this.onboarding(userId);
    const merged = mergeOnboardingState(current, body);
    await this.validateOnboardingTaxonomy(merged);
    const submitted = prepareSubmittedOnboarding(merged);
    await this.assertSellerSlugAvailable(userId, submitted.storeSlug);
    await this.upsertOnboardingPayload(userId, submitted.profileType, submitted);
    await this.syncCreatorProfileFromOnboarding(userId, submitted);
    await this.syncSellerProfile(userId, submitted);
    await this.syncTaxonomySelections(userId, submitted);
    await this.syncOperationalSetupFromOnboarding(userId, submitted);
    await this.syncWorkspaceSettingsFromOnboarding(userId, submitted);
    await this.syncProviderProfileFromOnboarding(userId, submitted);
    await this.syncUserAccessFromOnboarding(userId, submitted);
    await this.syncAccountApprovalFromOnboarding(userId, submitted);
    await this.jobsService.enqueue({
      queue: 'workflow',
      type: 'ONBOARDING_SUBMITTED',
      userId,
      dedupeKey: `onboarding-submitted:${userId}:${submitted.submittedAt ?? submitted.updatedAt}`,
      correlationId: userId,
      payload: {
        profileType: submitted.profileType,
        storeSlug: submitted.storeSlug,
        submittedAt: submitted.submittedAt,
        status: submitted.status
      }
    });
    return submitted;
  }

  accountApproval(userId: string) {
    return this.getAccountApprovalPayload(userId).then(
      (payload) =>
        payload ?? { status: 'pending', progressPercent: 0, requiredActions: [], documents: [] }
    );
  }
  async screenState(userId: string, key: string) {
    const payload = await this.getScreenStatePayload(userId, key);
    if (payload) return payload;
    if (key === 'provider-new-quote') {
      return this.upsertScreenStatePayload(userId, key, this.defaultProviderNewQuoteState());
    }
    return {};
  }
  async patchScreenState(userId: string, key: string, body: PatchScreenStateDto | Record<string, unknown>) {
    if (key === 'provider-new-quote' && body.__resetToDefault === true) {
      return this.upsertScreenStatePayload(userId, key, this.defaultProviderNewQuoteState());
    }
    const current = (await this.screenState(userId, key)) as Record<string, unknown>;
    const nextPayload = { ...this.extractPayload(body) };
    const next = {
      ...this.deepMerge(current, this.ensureObjectPayload(nextPayload, { maxDepth: 12, maxArrayLength: 500, maxKeys: 500 })),
      updatedAt: new Date().toISOString()
    };
    return this.upsertScreenStatePayload(userId, key, next);
  }
  async patchAccountApproval(userId: string, body: UpdateAccountApprovalDto) {
    const current = await this.accountApproval(userId);
    return this.upsertAccountApprovalPayload(userId, {
      ...this.deepMerge(current, this.ensureObjectPayload(body)),
      updatedAt: new Date().toISOString()
    });
  }
  refreshAccountApproval(userId: string) { return this.accountApproval(userId); }
  async resubmitAccountApproval(userId: string, body: UpdateAccountApprovalDto) {
    const current = await this.accountApproval(userId);
    return this.upsertAccountApprovalPayload(userId, {
      ...this.deepMerge(current, this.ensureObjectPayload(body)),
      status: 'resubmitted',
      reviewedAt: new Date().toISOString()
    });
  }
  async devApprove(userId: string) {
    return this.upsertAccountApprovalPayload(userId, {
      status: 'approved',
      approvedAt: new Date().toISOString()
    });
  }

  async recordAccountApprovalDecision(deciderUserId: string, body: UpdateAccountApprovalDecisionDto) {
    const current = await this.getAccountApprovalPayload(body.userId);
    const history = Array.isArray((current as any)?.history) ? (current as any).history : [];
    const decidedAt = new Date().toISOString();
    const next = {
      ...(current ?? {}),
      status: body.status,
      decisionReason: body.reason ?? (current as any)?.decisionReason ?? null,
      decidedAt,
      history: [
        {
          status: body.status,
          reason: body.reason ?? null,
          decidedBy: deciderUserId,
          decidedAt
        },
        ...history
      ],
      approvedAt: body.status === 'approved' ? decidedAt : (current as any)?.approvedAt ?? null,
      rejectedAt: body.status === 'rejected' ? decidedAt : (current as any)?.rejectedAt ?? null
    };
    return this.upsertAccountApprovalPayload(body.userId, next);
  }

  async contentApprovals(userId: string) {
    const records = await this.listContentApprovalPayloads(userId);
    return records.map(({ id, payload }) => ({ id, ...(payload as any) }));
  }
  async contentApproval(userId: string, id: string) {
    const payload = await this.getContentApprovalPayload(userId, id);
    if (!payload) {
      throw new NotFoundException('Content approval not found');
    }
    return { id, ...(payload as any) };
  }
  async createContentApproval(userId: string, body: CreateContentApprovalDto) {
    const payload = this.ensurePayload(this.extractPayload(body));
    const id = String((payload as any).id ?? randomUUID());
    await this.upsertContentApprovalPayload(userId, id, payload);
    return { id, ...(payload as any) };
  }
  async patchContentApproval(userId: string, id: string, body: UpdateContentApprovalDto) {
    const current = await this.getContentApprovalPayload(userId, id);
    if (!current) {
      throw new NotFoundException('Content approval not found');
    }
    const next = this.deepMerge(current, this.ensureObjectPayload(this.extractPayload(body)));
    await this.upsertContentApprovalPayload(userId, id, next);
    return { id, ...next };
  }

  async nudge(userId: string, id: string) {
    const current = await this.getContentApprovalPayload(userId, id);
    if (!current) {
      throw new NotFoundException('Content approval not found');
    }
    const next = { ...(current as any), lastNudgedAt: new Date().toISOString() };
    await this.upsertContentApprovalPayload(userId, id, next);
    return { id, ...next };
  }
  async withdraw(userId: string, id: string) {
    const current = await this.getContentApprovalPayload(userId, id);
    if (!current) {
      throw new NotFoundException('Content approval not found');
    }
    const next = { ...(current as any), status: 'withdrawn' };
    await this.upsertContentApprovalPayload(userId, id, next);
    return { id, ...next };
  }
  async resubmit(userId: string, id: string, body: ResubmitContentApprovalDto) {
    const current = await this.getContentApprovalPayload(userId, id);
    if (!current) {
      throw new NotFoundException('Content approval not found');
    }
    const next = {
      ...this.deepMerge(current, this.ensureObjectPayload(this.extractPayload(body))),
      status: 'resubmitted'
    };
    await this.upsertContentApprovalPayload(userId, id, next);
    return { id, ...next };
  }

  private async resolveOnboardingProfileType(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    const role = user?.role ?? 'CREATOR';
    return ONBOARDING_PROFILE_TYPES.includes(role as (typeof ONBOARDING_PROFILE_TYPES)[number])
      ? (role as (typeof ONBOARDING_PROFILE_TYPES)[number])
      : 'CREATOR';
  }

  private onboardingRecordKey(profileType: string) {
    return profileType === 'CREATOR' ? 'creator' : 'main';
  }

  private async getOnboardingPayload(userId: string, profileType: string) {
    const specific = await this.getRecordPayload(userId, 'onboarding', this.onboardingRecordKey(profileType));
    if (specific) {
      return specific;
    }

    if (profileType !== 'CREATOR') {
      return this.getRecordPayload(userId, 'onboarding', 'main');
    }

    const legacy = await this.getRecordPayload(userId, 'onboarding', 'main');
    if (!legacy) {
      return null;
    }

    const normalized = normalizeStoredOnboardingState(legacy, 'CREATOR');
    return normalized.profileType === 'CREATOR' ? legacy : null;
  }

  private async upsertOnboardingPayload(userId: string, profileType: string, payload: unknown) {
    return this.upsertRecord(userId, 'onboarding', this.onboardingRecordKey(profileType), payload);
  }

  private normalizeCreatorHandle(value: string) {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/^@+/, '')
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '');
    return normalized || 'creator';
  }

  private async resolveCreatorProfileHandle(userId: string, desiredHandle: string, existingHandle: string | null) {
    if (!desiredHandle) {
      return existingHandle || `creator.${String(userId).slice(-6)}`;
    }

    const conflict = await this.prisma.creatorProfile.findUnique({
      where: { handle: desiredHandle },
      select: { userId: true }
    });

    if (!conflict || conflict.userId === userId) {
      return desiredHandle;
    }

    return existingHandle || `${desiredHandle}.${String(userId).slice(-6)}`;
  }

  private readCreatorProfileField(
    onboarding: Awaited<ReturnType<WorkflowService['onboarding']>>,
    field: 'name' | 'handle' | 'tagline' | 'bio'
  ) {
    const metadata =
      onboarding.metadata && typeof onboarding.metadata === 'object' && !Array.isArray(onboarding.metadata)
        ? (onboarding.metadata as Record<string, unknown>)
        : {};
    const creatorForm =
      metadata.creatorForm && typeof metadata.creatorForm === 'object' && !Array.isArray(metadata.creatorForm)
        ? (metadata.creatorForm as Record<string, unknown>)
        : {};
    const profile =
      creatorForm.profile && typeof creatorForm.profile === 'object' && !Array.isArray(creatorForm.profile)
        ? (creatorForm.profile as Record<string, unknown>)
        : {};
    return this.readStringField(profile[field]);
  }

  private readCreatorPreferenceLines(onboarding: Awaited<ReturnType<WorkflowService['onboarding']>>) {
    const metadata =
      onboarding.metadata && typeof onboarding.metadata === 'object' && !Array.isArray(onboarding.metadata)
        ? (onboarding.metadata as Record<string, unknown>)
        : {};
    const preferences =
      metadata.preferences && typeof metadata.preferences === 'object' && !Array.isArray(metadata.preferences)
        ? (metadata.preferences as Record<string, unknown>)
        : {};
    const creatorForm =
      metadata.creatorForm && typeof metadata.creatorForm === 'object' && !Array.isArray(metadata.creatorForm)
        ? (metadata.creatorForm as Record<string, unknown>)
        : {};
    const creatorPreferences =
      creatorForm.preferences && typeof creatorForm.preferences === 'object' && !Array.isArray(creatorForm.preferences)
        ? (creatorForm.preferences as Record<string, unknown>)
        : {};
    const lines = Array.isArray(creatorPreferences.lines) ? creatorPreferences.lines : preferences.lines;
    return Array.isArray(lines) ? lines.map((entry) => this.readStringField(entry)).filter(Boolean) : [];
  }

  private readCreatorContentLanguages(onboarding: Awaited<ReturnType<WorkflowService['onboarding']>>) {
    const metadata =
      onboarding.metadata && typeof onboarding.metadata === 'object' && !Array.isArray(onboarding.metadata)
        ? (onboarding.metadata as Record<string, unknown>)
        : {};
    const creatorForm =
      metadata.creatorForm && typeof metadata.creatorForm === 'object' && !Array.isArray(metadata.creatorForm)
        ? (metadata.creatorForm as Record<string, unknown>)
        : {};
    const profile =
      creatorForm.profile && typeof creatorForm.profile === 'object' && !Array.isArray(creatorForm.profile)
        ? (creatorForm.profile as Record<string, unknown>)
        : {};
    const contentLanguages = profile.contentLanguages;
    if (Array.isArray(contentLanguages)) {
      const values = contentLanguages.map((entry) => this.readStringField(entry)).filter(Boolean);
      if (values.length > 0) {
        return values;
      }
    }
    return onboarding.languages.filter(Boolean);
  }

  private readCreatorAudienceRegions(onboarding: Awaited<ReturnType<WorkflowService['onboarding']>>) {
    const metadata =
      onboarding.metadata && typeof onboarding.metadata === 'object' && !Array.isArray(onboarding.metadata)
        ? (onboarding.metadata as Record<string, unknown>)
        : {};
    const creatorForm =
      metadata.creatorForm && typeof metadata.creatorForm === 'object' && !Array.isArray(metadata.creatorForm)
        ? (metadata.creatorForm as Record<string, unknown>)
        : {};
    const profile =
      creatorForm.profile && typeof creatorForm.profile === 'object' && !Array.isArray(creatorForm.profile)
        ? (creatorForm.profile as Record<string, unknown>)
        : {};
    const regions = profile.audienceRegions;
    return Array.isArray(regions) ? regions.map((entry) => this.readStringField(entry)).filter(Boolean) : [];
  }

  private readCreatorFollowers(onboarding: Awaited<ReturnType<WorkflowService['onboarding']>>) {
    const metadata =
      onboarding.metadata && typeof onboarding.metadata === 'object' && !Array.isArray(onboarding.metadata)
        ? (onboarding.metadata as Record<string, unknown>)
        : {};
    const creatorForm =
      metadata.creatorForm && typeof metadata.creatorForm === 'object' && !Array.isArray(metadata.creatorForm)
        ? (metadata.creatorForm as Record<string, unknown>)
        : {};
    const socials =
      creatorForm.socials && typeof creatorForm.socials === 'object' && !Array.isArray(creatorForm.socials)
        ? (creatorForm.socials as Record<string, unknown>)
        : {};

    let total = 0;
    const primaryOtherFollowers = Number(String(socials.primaryOtherFollowers ?? '').replace(/[^0-9]/g, ''));
    if (!Number.isNaN(primaryOtherFollowers)) {
      total += primaryOtherFollowers;
    }

    const extra = Array.isArray(socials.extra) ? socials.extra : [];
    for (const entry of extra) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        continue;
      }
      const followers = Number(String((entry as Record<string, unknown>).followers ?? '').replace(/[^0-9]/g, ''));
      if (!Number.isNaN(followers)) {
        total += followers;
      }
    }

    return total;
  }

  private async assertSellerSlugAvailable(userId: string, slug: string) {
    if (!slug) {
      return;
    }

    const availability = await this.slugAvailability(userId, slug);
    if (!availability.available) {
      throw new BadRequestException(`Seller slug "${availability.slug}" is not available`);
    }
  }

  private async syncSellerProfile(userId: string, onboarding: Awaited<ReturnType<WorkflowService['onboarding']>>) {
    if (onboarding.profileType !== 'SELLER' && onboarding.profileType !== 'PROVIDER') {
      return;
    }

    const existing = await this.prisma.seller.findUnique({
      where: { userId }
    });

    const data = {
      handle: onboarding.storeSlug || existing?.handle || null,
      name: onboarding.storeName || existing?.name || onboarding.owner || 'Seller',
      displayName: onboarding.storeName || existing?.displayName || onboarding.owner || 'Seller',
      legalBusinessName: onboarding.tax.legalName || existing?.legalBusinessName || null,
      storefrontName: onboarding.storeName || existing?.storefrontName || null,
      kind: onboarding.profileType === 'PROVIDER' ? SellerKind.PROVIDER : SellerKind.SELLER,
      description: onboarding.about || existing?.description || null,
      languages: onboarding.languages.length ? onboarding.languages.join(',') : existing?.languages || null
    };

    const seller = existing
      ? await this.prisma.seller.update({
          where: { id: existing.id },
          data
        })
      : await this.prisma.seller.create({
          data: {
            user: {
              connect: { id: userId }
            },
            ...data
          }
        });

    const storefrontSlug = sellerSlugToHandle(
      onboarding.storeSlug || seller.handle || seller.storefrontName || seller.name
    );

    if (storefrontSlug) {
      await this.prisma.storefront.upsert({
        where: { sellerId: seller.id },
        update: {
          slug: storefrontSlug,
          name: onboarding.storeName || seller.storefrontName || seller.displayName || seller.name,
          tagline: onboarding.about || undefined,
          description: onboarding.about || undefined,
          logoUrl: onboarding.logoUrl || undefined,
          coverUrl: onboarding.coverUrl || undefined,
          theme: onboarding.brandColor
            ? ({
                primaryColor: onboarding.brandColor,
                accentColor: '#F77F00'
              } as Prisma.InputJsonValue)
            : undefined
        },
        create: {
          sellerId: seller.id,
          slug: storefrontSlug,
          name: onboarding.storeName || seller.storefrontName || seller.displayName || seller.name,
          tagline: onboarding.about || undefined,
          description: onboarding.about || undefined,
          logoUrl: onboarding.logoUrl || undefined,
          coverUrl: onboarding.coverUrl || undefined,
          theme: onboarding.brandColor
            ? ({
                primaryColor: onboarding.brandColor,
                accentColor: '#F77F00'
              } as Prisma.InputJsonValue)
            : undefined,
          isPublished: false
        }
      });
    }
  }

  private async syncCreatorProfileFromOnboarding(
    userId: string,
    onboarding: Awaited<ReturnType<WorkflowService['onboarding']>>
  ) {
    if (onboarding.profileType !== 'CREATOR') {
      return;
    }

    const existing = await this.prisma.creatorProfile.findUnique({
      where: { userId }
    });

    const desiredHandle = this.normalizeCreatorHandle(
      this.readCreatorProfileField(onboarding, 'handle') || onboarding.storeSlug || existing?.handle || userId
    );
    const nextHandle = await this.resolveCreatorProfileHandle(userId, desiredHandle, existing?.handle ?? null);
    const nextName =
      this.readCreatorProfileField(onboarding, 'name') || onboarding.owner || onboarding.storeName || existing?.name || 'Creator';
    const nextTagline = this.readCreatorProfileField(onboarding, 'tagline') || existing?.tagline || null;
    const nextBio = this.readCreatorProfileField(onboarding, 'bio') || onboarding.about || existing?.bio || null;
    const categories = onboarding.providerServices.length ? onboarding.providerServices : this.readCreatorPreferenceLines(onboarding);
    const regions = this.readCreatorAudienceRegions(onboarding);
    const followers = this.readCreatorFollowers(onboarding);
    const languages = this.readCreatorContentLanguages(onboarding);
    const isKycVerified = String(onboarding.verification.kycStatus || '').toUpperCase() === 'VERIFIED';

    if (!existing) {
      await this.prisma.creatorProfile.create({
        data: {
          userId,
          name: nextName,
          handle: nextHandle,
          tier: 'BRONZE',
          tagline: nextTagline,
          bio: nextBio,
          categories: JSON.stringify(categories),
          regions: JSON.stringify(regions),
          languages: JSON.stringify(languages),
          followers,
          isKycVerified
        }
      });
      return;
    }

    await this.prisma.creatorProfile.update({
      where: { userId },
      data: {
        name: nextName,
        handle: nextHandle,
        tagline: nextTagline,
        bio: nextBio,
        categories: JSON.stringify(categories),
        regions: JSON.stringify(regions),
        languages: JSON.stringify(languages),
        followers,
        isKycVerified
      }
    });
  }

  private async validateOnboardingTaxonomy(onboarding: Awaited<ReturnType<WorkflowService['onboarding']>>) {
    if (onboarding.profileType !== 'SELLER' && onboarding.profileType !== 'PROVIDER') {
      return;
    }
    const nodeIds = this.extractTaxonomyNodeIds(onboarding);
    if (nodeIds.length === 0) {
      return;
    }
    const treeIdentifier =
      onboarding.profileType === 'PROVIDER'
        ? PROVIDER_SERVICE_TAXONOMY_TREE_SLUG
        : SELLER_CATALOG_TAXONOMY_TREE_SLUG;
    await this.taxonomyService.assertNodesInTree(treeIdentifier, nodeIds);
  }

  private async syncTaxonomySelections(userId: string, onboarding: Awaited<ReturnType<WorkflowService['onboarding']>>) {
    if (onboarding.profileType !== 'SELLER' && onboarding.profileType !== 'PROVIDER') {
      return;
    }
    const nodeIds = this.extractTaxonomyNodeIds(onboarding);
    if (nodeIds.length === 0) {
      return;
    }
    const selectionNodeId =
      onboarding.taxonomySelection && typeof (onboarding.taxonomySelection as any).nodeId === 'string'
        ? (onboarding.taxonomySelection as any).nodeId
        : null;
    const primaryNodeId = selectionNodeId ?? nodeIds[0];
    const treeIdentifier =
      onboarding.profileType === 'PROVIDER'
        ? PROVIDER_SERVICE_TAXONOMY_TREE_SLUG
        : SELLER_CATALOG_TAXONOMY_TREE_SLUG;
    await this.taxonomyService.syncSellerCoverage(userId, nodeIds, treeIdentifier);
    await this.taxonomyService.syncStorefrontTaxonomy(userId, nodeIds, primaryNodeId, treeIdentifier);
  }

  private async syncOperationalSetupFromOnboarding(
    userId: string,
    onboarding: Awaited<ReturnType<WorkflowService['onboarding']>>
  ) {
    if (onboarding.profileType !== 'SELLER' && onboarding.profileType !== 'PROVIDER') {
      return;
    }

    const seller = await this.prisma.seller.findUnique({
      where: { userId },
      include: {
        warehouses: true,
        shippingProfiles: true
      }
    });

    if (!seller) {
      return;
    }

    const onboardingWarehouse = seller.warehouses.find((warehouse) => {
      const metadata =
        warehouse.metadata && typeof warehouse.metadata === 'object' && !Array.isArray(warehouse.metadata)
          ? (warehouse.metadata as Record<string, unknown>)
          : {};
      return metadata.source === 'onboarding';
    });

    const hasWarehouseAddress = Boolean(
      onboarding.shipFrom.address1 || onboarding.shipFrom.address2 || onboarding.shipFrom.city || onboarding.shipFrom.country
    );

    if (hasWarehouseAddress && (onboardingWarehouse || seller.warehouses.length === 0)) {
      if (onboardingWarehouse) {
        await this.prisma.sellerWarehouse.update({
          where: { id: onboardingWarehouse.id },
          data: {
            name: onboarding.storeName ? `${onboarding.storeName} primary warehouse` : onboardingWarehouse.name,
            isDefault: true,
            address: {
              line1: onboarding.shipFrom.address1 || '',
              line2: onboarding.shipFrom.address2 || '',
              city: onboarding.shipFrom.city || '',
              province: onboarding.shipFrom.province || '',
              country: onboarding.shipFrom.country || '',
              postalCode: onboarding.shipFrom.postalCode || ''
            } as Prisma.InputJsonValue,
            contact: {
              email: onboarding.support.email || onboarding.email || '',
              phone: onboarding.support.phone || onboarding.phone || '',
              whatsapp: onboarding.support.whatsapp || ''
            } as Prisma.InputJsonValue,
            metadata: {
              source: 'onboarding',
              profileType: onboarding.profileType
            } as Prisma.InputJsonValue
          }
        });
      } else {
        await this.prisma.sellerWarehouse.create({
          data: {
            sellerId: seller.id,
            name: onboarding.storeName ? `${onboarding.storeName} primary warehouse` : 'Primary warehouse',
            type: 'WAREHOUSE',
            status: 'ACTIVE',
            isDefault: true,
            address: {
              line1: onboarding.shipFrom.address1 || '',
              line2: onboarding.shipFrom.address2 || '',
              city: onboarding.shipFrom.city || '',
              province: onboarding.shipFrom.province || '',
              country: onboarding.shipFrom.country || '',
              postalCode: onboarding.shipFrom.postalCode || ''
            } as Prisma.InputJsonValue,
            contact: {
              email: onboarding.support.email || onboarding.email || '',
              phone: onboarding.support.phone || onboarding.phone || '',
              whatsapp: onboarding.support.whatsapp || ''
            } as Prisma.InputJsonValue,
            metadata: {
              source: 'onboarding',
              profileType: onboarding.profileType
            } as Prisma.InputJsonValue
          }
        });
      }
    }

    const shippingProfileId = onboarding.shipping.profileId || '';
    const matchingProfile = shippingProfileId
      ? seller.shippingProfiles.find((profile) => profile.id === shippingProfileId)
      : seller.shippingProfiles.find((profile) => {
          const metadata =
            profile.metadata && typeof profile.metadata === 'object' && !Array.isArray(profile.metadata)
              ? (profile.metadata as Record<string, unknown>)
              : {};
          return metadata.source === 'onboarding';
        });
    const shouldPersistShippingProfile = Boolean(
      seller.shippingProfiles.length === 0 ||
        onboarding.shipping.profileId ||
        onboarding.shipping.handlingTimeDays !== null ||
        onboarding.shipping.expressReady ||
        onboarding.policies.returnsDays !== null ||
        onboarding.policies.warrantyDays !== null ||
        onboarding.shipFrom.country ||
        onboarding.storeName
    );

    if (!shouldPersistShippingProfile) {
      return;
    }

    const shippingData = {
      name: 'Default shipping profile',
      description:
        onboarding.policies.policyNotes ||
        'Default shipping profile created from seller onboarding.',
      status: 'ACTIVE' as const,
      carrier: null,
      serviceLevel: onboarding.shipping.expressReady ? 'Express' : 'Standard',
      handlingTimeDays: onboarding.shipping.handlingTimeDays ?? 2,
      regions: Array.from(
        new Set([onboarding.shipFrom.country, onboarding.tax.taxCountry].filter(Boolean))
      ) as Prisma.InputJsonValue,
      isDefault: true,
      metadata: {
        source: 'onboarding',
        profileType: onboarding.profileType,
        onboardingRecordKey: 'main',
        shipFromCountry: onboarding.shipFrom.country || null,
        expressReady: onboarding.shipping.expressReady,
        returnsDays: onboarding.policies.returnsDays,
        warrantyDays: onboarding.policies.warrantyDays
      } as Prisma.InputJsonValue
    };

    await this.prisma.shippingProfile.updateMany({
      where: { sellerId: seller.id },
      data: { isDefault: false }
    });

    if (matchingProfile) {
      const updated = await this.prisma.shippingProfile.update({
        where: { id: matchingProfile.id },
        data: shippingData
      });
      if (!shippingProfileId) {
        await this.upsertOnboardingPayload(userId, onboarding.profileType, {
          ...onboarding,
          shipping: {
            ...onboarding.shipping,
            profileId: updated.id
          }
        });
      }
      return;
    }

    const created = await this.prisma.shippingProfile.create({
      data: {
        sellerId: seller.id,
        ...shippingData
      }
    });

    if (!shippingProfileId) {
      await this.upsertOnboardingPayload(userId, onboarding.profileType, {
        ...onboarding,
        shipping: {
          ...onboarding.shipping,
          profileId: created.id
        }
      });
    }
  }

  private async syncWorkspaceSettingsFromOnboarding(
    userId: string,
    onboarding: Awaited<ReturnType<WorkflowService['onboarding']>>
  ) {
    if (onboarding.profileType !== 'SELLER' && onboarding.profileType !== 'PROVIDER') {
      return;
    }

    const workspace = await this.ensureWorkspaceRow(userId);
    await Promise.all([
      this.syncSettingsProfileFromOnboarding(userId, onboarding),
      this.syncWorkspaceNotificationPreferencesFromOnboarding(workspace.id, userId, onboarding),
      this.syncWorkspacePayoutSettingsFromOnboarding(workspace.id, onboarding),
      this.syncWorkspaceTaxSettingsFromOnboarding(workspace.id, onboarding),
      this.syncWorkspaceKycFromOnboarding(workspace.id, onboarding)
    ]);
  }

  private async syncSettingsProfileFromOnboarding(
    userId: string,
    onboarding: Awaited<ReturnType<WorkflowService['onboarding']>>
  ) {
    const existing = await this.prisma.userSetting.findUnique({
      where: { userId_key: { userId, key: 'profile' } }
    });
    const patch = {
      profile: {
        identity: {
          website: onboarding.website || ''
        },
        branding: {
          primary: onboarding.brandColor || '#03CD8C'
        },
        policies: {
          termsUrl: onboarding.policies.termsUrl || '',
          privacyUrl: onboarding.policies.privacyUrl || '',
          returnsDays: onboarding.policies.returnsDays,
          warrantyDays: onboarding.policies.warrantyDays,
          notes: onboarding.policies.policyNotes || ''
        }
      }
    };
    const payload = existing ? this.deepMerge(existing.payload, patch) : patch;
    await this.prisma.userSetting.upsert({
      where: { userId_key: { userId, key: 'profile' } },
      update: { payload: payload as Prisma.InputJsonValue },
      create: {
        userId,
        key: 'profile',
        payload: payload as Prisma.InputJsonValue
      }
    });
  }

  private async syncWorkspaceNotificationPreferencesFromOnboarding(
    workspaceId: string,
    userId: string,
    onboarding: Awaited<ReturnType<WorkflowService['onboarding']>>
  ) {
    const notificationsEmail = onboarding.payout.notificationsEmail || onboarding.email || '';
    const notificationsWhatsApp = onboarding.payout.notificationsWhatsApp || onboarding.support.whatsapp || '';
    if (!notificationsEmail && !notificationsWhatsApp) {
      return;
    }

    const scopeRole = onboarding.profileType;
    const preference = await this.prisma.workspaceNotificationPreference.upsert({
      where: {
        workspaceId_userId_scopeRole: {
          workspaceId,
          userId,
          scopeRole
        }
      },
      update: {
        metadata: {
          source: 'onboarding',
          payoutNotifications: {
            email: notificationsEmail || null,
            whatsapp: notificationsWhatsApp || null
          }
        } as Prisma.InputJsonValue
      },
      create: {
        workspaceId,
        userId,
        scopeRole,
        metadata: {
          source: 'onboarding',
          payoutNotifications: {
            email: notificationsEmail || null,
            whatsapp: notificationsWhatsApp || null
          }
        } as Prisma.InputJsonValue
      }
    });

    const watches = [
      notificationsEmail
        ? {
            externalId: 'onboarding-payout-email',
            channel: 'email',
            enabled: true,
            payload: {
              id: 'onboarding-payout-email',
              category: 'payouts',
              channel: 'email',
              enabled: true,
              label: 'Payout email notifications',
              destination: notificationsEmail,
              source: 'onboarding'
            }
          }
        : null,
      notificationsWhatsApp
        ? {
            externalId: 'onboarding-payout-whatsapp',
            channel: 'whatsapp',
            enabled: true,
            payload: {
              id: 'onboarding-payout-whatsapp',
              category: 'payouts',
              channel: 'whatsapp',
              enabled: true,
              label: 'Payout WhatsApp notifications',
              destination: notificationsWhatsApp,
              source: 'onboarding'
            }
          }
        : null
    ].filter(Boolean) as Array<{
      externalId: string;
      channel: string;
      enabled: boolean;
      payload: Record<string, unknown>;
    }>;

    for (let index = 0; index < watches.length; index += 1) {
      const watch = watches[index];
      await this.prisma.workspaceNotificationWatch.upsert({
        where: {
          preferenceDbId_externalId: {
            preferenceDbId: preference.dbId,
            externalId: watch.externalId
          }
        },
        update: {
          channel: watch.channel,
          enabled: watch.enabled,
          position: index,
          payload: watch.payload as Prisma.InputJsonValue
        },
        create: {
          preferenceDbId: preference.dbId,
          externalId: watch.externalId,
          channel: watch.channel,
          enabled: watch.enabled,
          position: index,
          payload: watch.payload as Prisma.InputJsonValue
        }
      });
    }
  }

  private async syncWorkspacePayoutSettingsFromOnboarding(
    workspaceId: string,
    onboarding: Awaited<ReturnType<WorkflowService['onboarding']>>
  ) {
    if (!onboarding.payout.method) {
      return;
    }

    const settings = await this.prisma.workspacePayoutSettings.upsert({
      where: { workspaceId },
      update: {
        metadata: {
          source: 'onboarding',
          payoutSchedule: onboarding.payout.rhythm || null,
          minThreshold: onboarding.payout.thresholdAmount,
          notifications: {
            email: onboarding.payout.notificationsEmail || null,
            whatsapp: onboarding.payout.notificationsWhatsApp || null
          },
          confirmDetails: onboarding.payout.confirmDetails
        } as Prisma.InputJsonValue
      },
      create: {
        workspaceId,
        metadata: {
          source: 'onboarding',
          payoutSchedule: onboarding.payout.rhythm || null,
          minThreshold: onboarding.payout.thresholdAmount,
          notifications: {
            email: onboarding.payout.notificationsEmail || null,
            whatsapp: onboarding.payout.notificationsWhatsApp || null
          },
          confirmDetails: onboarding.payout.confirmDetails
        } as Prisma.InputJsonValue
      }
    });

    const methodPayload = {
      id: 'onboarding-primary',
      source: 'onboarding',
      type: onboarding.payout.method,
      label:
        onboarding.payout.accountName ||
        onboarding.payout.bankName ||
        onboarding.payout.mobileProvider ||
        onboarding.payout.otherProvider ||
        onboarding.payout.otherMethod ||
        'Primary payout method',
      currency: onboarding.payout.currency || 'USD',
      country:
        onboarding.payout.bankCountry ||
        onboarding.payout.otherCountry ||
        onboarding.tax.taxCountry ||
        onboarding.shipFrom.country ||
        null,
      isDefault: true,
      details: {
        bankName: onboarding.payout.bankName || null,
        bankBranch: onboarding.payout.bankBranch || null,
        accountName: onboarding.payout.accountName || null,
        accountNoMasked: onboarding.payout.accountNo
          ? `${'*'.repeat(Math.max(0, onboarding.payout.accountNo.length - 4))}${onboarding.payout.accountNo.slice(-4)}`
          : null,
        swiftBic: onboarding.payout.swiftBic || null,
        iban: onboarding.payout.iban || null,
        mobileProvider: onboarding.payout.mobileProvider || null,
        mobileCountryCode: onboarding.payout.mobileCountryCode || null,
        mobileNoMasked: onboarding.payout.mobileNo
          ? `${'*'.repeat(Math.max(0, onboarding.payout.mobileNo.length - 4))}${onboarding.payout.mobileNo.slice(-4)}`
          : null,
        mobileIdType: onboarding.payout.mobileIdType || null,
        mobileIdNumberMasked: onboarding.payout.mobileIdNumber
          ? `${'*'.repeat(Math.max(0, onboarding.payout.mobileIdNumber.length - 4))}${onboarding.payout.mobileIdNumber.slice(-4)}`
          : null,
        alipayRegion: onboarding.payout.alipayRegion || null,
        alipayLogin: onboarding.payout.alipayLogin || null,
        wechatRegion: onboarding.payout.wechatRegion || null,
        wechatId: onboarding.payout.wechatId || null,
        otherNotes: onboarding.payout.otherNotes || null,
        otherDetails: onboarding.payout.otherDetails || null,
        otherDescription: onboarding.payout.otherDescription || null
      }
    };

    await this.prisma.workspacePayoutMethod.upsert({
      where: {
        settingsDbId_externalId: {
          settingsDbId: settings.dbId,
          externalId: 'onboarding-primary'
        }
      },
      update: {
        type: onboarding.payout.method,
        label: String(methodPayload.label),
        currency: onboarding.payout.currency || null,
        isDefault: true,
        position: 0,
        payload: methodPayload as Prisma.InputJsonValue
      },
      create: {
        settingsDbId: settings.dbId,
        externalId: 'onboarding-primary',
        type: onboarding.payout.method,
        label: String(methodPayload.label),
        currency: onboarding.payout.currency || null,
        isDefault: true,
        position: 0,
        payload: methodPayload as Prisma.InputJsonValue
      }
    });
  }

  private async syncWorkspaceTaxSettingsFromOnboarding(
    workspaceId: string,
    onboarding: Awaited<ReturnType<WorkflowService['onboarding']>>
  ) {
    if (!onboarding.tax.legalName && !onboarding.tax.taxCountry && !onboarding.tax.taxId && !onboarding.tax.vatNumber) {
      return;
    }

    const settings = await this.prisma.workspaceTaxSettings.upsert({
      where: { workspaceId },
      update: {
        metadata: {
          source: 'onboarding',
          invoiceCfg: {
            legalName: onboarding.tax.legalName || null,
            legalAddress: onboarding.tax.legalAddress || null,
            taxpayerType: onboarding.tax.taxpayerType || null,
            contact: onboarding.tax.contact || null,
            contactEmail: onboarding.tax.contactEmail || null,
            contactSameAsOwner: onboarding.tax.contactSameAsOwner
          }
        } as Prisma.InputJsonValue
      },
      create: {
        workspaceId,
        metadata: {
          source: 'onboarding',
          invoiceCfg: {
            legalName: onboarding.tax.legalName || null,
            legalAddress: onboarding.tax.legalAddress || null,
            taxpayerType: onboarding.tax.taxpayerType || null,
            contact: onboarding.tax.contact || null,
            contactEmail: onboarding.tax.contactEmail || null,
            contactSameAsOwner: onboarding.tax.contactSameAsOwner
          }
        } as Prisma.InputJsonValue
      }
    });

    await this.prisma.workspaceTaxProfile.upsert({
      where: {
        settingsDbId_externalId: {
          settingsDbId: settings.dbId,
          externalId: 'onboarding-primary'
        }
      },
      update: {
        profileName: onboarding.tax.legalName || null,
        country: onboarding.tax.taxCountry || onboarding.shipFrom.country || null,
        vatId: onboarding.tax.vatNumber || onboarding.tax.taxId || null,
        status: onboarding.status === 'submitted' ? 'In Review' : 'Draft',
        isDefault: true,
        position: 0,
        payload: {
          id: 'onboarding-primary',
          source: 'onboarding',
          profileName: onboarding.tax.legalName || null,
          country: onboarding.tax.taxCountry || onboarding.shipFrom.country || null,
          vatId: onboarding.tax.vatNumber || onboarding.tax.taxId || null,
          status: onboarding.status === 'submitted' ? 'In Review' : 'Draft',
          isDefault: true,
          taxpayerType: onboarding.tax.taxpayerType || null,
          legalAddress: onboarding.tax.legalAddress || null,
          contact: onboarding.tax.contact || null,
          contactEmail: onboarding.tax.contactEmail || null,
          contactSameAsOwner: onboarding.tax.contactSameAsOwner
        } as Prisma.InputJsonValue
      },
      create: {
        settingsDbId: settings.dbId,
        externalId: 'onboarding-primary',
        profileName: onboarding.tax.legalName || null,
        country: onboarding.tax.taxCountry || onboarding.shipFrom.country || null,
        vatId: onboarding.tax.vatNumber || onboarding.tax.taxId || null,
        status: onboarding.status === 'submitted' ? 'In Review' : 'Draft',
        isDefault: true,
        position: 0,
        payload: {
          id: 'onboarding-primary',
          source: 'onboarding',
          profileName: onboarding.tax.legalName || null,
          country: onboarding.tax.taxCountry || onboarding.shipFrom.country || null,
          vatId: onboarding.tax.vatNumber || onboarding.tax.taxId || null,
          status: onboarding.status === 'submitted' ? 'In Review' : 'Draft',
          isDefault: true,
          taxpayerType: onboarding.tax.taxpayerType || null,
          legalAddress: onboarding.tax.legalAddress || null,
          contact: onboarding.tax.contact || null,
          contactEmail: onboarding.tax.contactEmail || null,
          contactSameAsOwner: onboarding.tax.contactSameAsOwner
        } as Prisma.InputJsonValue
      }
    });
  }

  private async syncWorkspaceKycFromOnboarding(
    workspaceId: string,
    onboarding: Awaited<ReturnType<WorkflowService['onboarding']>>
  ) {
    const profile = await this.prisma.workspaceKycProfile.upsert({
      where: { workspaceId },
      update: {
        status: String(onboarding.verification.kycStatus || 'PENDING').toLowerCase(),
        metadata: {
          source: 'onboarding',
          emailVerified: onboarding.verification.emailVerified,
          phoneVerified: onboarding.verification.phoneVerified,
          verificationEmail: onboarding.verification.verificationEmail || onboarding.email || null,
          verificationPhone: onboarding.verification.verificationPhone || onboarding.phone || null,
          otpStatus: onboarding.verification.otpStatus,
          kycReference: onboarding.verification.kycReference || null
        } as Prisma.InputJsonValue
      },
      create: {
        workspaceId,
        status: String(onboarding.verification.kycStatus || 'PENDING').toLowerCase(),
        metadata: {
          source: 'onboarding',
          emailVerified: onboarding.verification.emailVerified,
          phoneVerified: onboarding.verification.phoneVerified,
          verificationEmail: onboarding.verification.verificationEmail || onboarding.email || null,
          verificationPhone: onboarding.verification.verificationPhone || onboarding.phone || null,
          otpStatus: onboarding.verification.otpStatus,
          kycReference: onboarding.verification.kycReference || null
        } as Prisma.InputJsonValue
      }
    });

    const documents = Array.isArray(onboarding.docs?.list) ? onboarding.docs.list : [];
    for (let index = 0; index < documents.length; index += 1) {
      const document = documents[index] as Record<string, unknown>;
      const externalId = String(document.id ?? `onboarding-doc-${index + 1}`);
      await this.prisma.workspaceKycDocument.upsert({
        where: {
          kycProfileDbId_externalId: {
            kycProfileDbId: profile.dbId,
            externalId
          }
        },
        update: {
          title: typeof document.name === 'string' ? document.name : typeof document.type === 'string' ? document.type : null,
          status: typeof document.status === 'string' ? document.status : 'submitted',
          uploadedAt: this.readDateField(document.uploadedAt),
          expiresAt: this.readDateField(document.expiry),
          position: index,
          payload: {
            ...document,
            id: externalId,
            source: 'onboarding'
          } as Prisma.InputJsonValue
        },
        create: {
          kycProfileDbId: profile.dbId,
          externalId,
          title: typeof document.name === 'string' ? document.name : typeof document.type === 'string' ? document.type : null,
          status: typeof document.status === 'string' ? document.status : 'submitted',
          uploadedAt: this.readDateField(document.uploadedAt),
          expiresAt: this.readDateField(document.expiry),
          position: index,
          payload: {
            ...document,
            id: externalId,
            source: 'onboarding'
          } as Prisma.InputJsonValue
        }
      });
    }
  }

  private async syncProviderProfileFromOnboarding(
    userId: string,
    onboarding: Awaited<ReturnType<WorkflowService['onboarding']>>
  ) {
    if (onboarding.profileType !== 'PROVIDER') {
      return;
    }

    await this.prisma.providerRecord.upsert({
      where: {
        userId_recordType_recordKey: {
          userId,
          recordType: 'onboarding_profile',
          recordKey: 'main'
        }
      },
      update: {
        payload: {
          source: 'onboarding',
          profileType: onboarding.profileType,
          storeName: onboarding.storeName,
          storeSlug: onboarding.storeSlug,
          website: onboarding.website || null,
          brandColor: onboarding.brandColor || null,
          providerServices: onboarding.providerServices,
          bookingModes: onboarding.bookingModes,
          support: onboarding.support,
          taxonomySelections: onboarding.taxonomySelections
        } as Prisma.InputJsonValue
      },
      create: {
        userId,
        recordType: 'onboarding_profile',
        recordKey: 'main',
        payload: {
          source: 'onboarding',
          profileType: onboarding.profileType,
          storeName: onboarding.storeName,
          storeSlug: onboarding.storeSlug,
          website: onboarding.website || null,
          brandColor: onboarding.brandColor || null,
          providerServices: onboarding.providerServices,
          bookingModes: onboarding.bookingModes,
          support: onboarding.support,
          taxonomySelections: onboarding.taxonomySelections
        } as Prisma.InputJsonValue
      }
    });
  }

  private async syncAccountApprovalFromOnboarding(
    userId: string,
    onboarding: Awaited<ReturnType<WorkflowService['onboarding']>>
  ) {
    const autoApproved = this.shouldAutoApproveSubmittedOnboarding(onboarding.profileType);
    const current = await this.getAccountApprovalPayload(userId);
    const documents = Array.isArray(onboarding.docs?.list)
      ? onboarding.docs.list.map((doc: Record<string, unknown>, index: number) => ({
          id: String(doc.id ?? `onboarding-doc-${index + 1}`),
          type: String(doc.type ?? 'document'),
          status: String(doc.status ?? 'submitted'),
          note: typeof doc.notes === 'string' ? doc.notes : undefined
        }))
      : [];
    const requiredActions = Array.isArray(current?.requiredActions)
      ? (current?.requiredActions as Array<Record<string, unknown>>)
      : [];
    const metadata = {
      ...((current?.metadata as Record<string, unknown> | undefined) ?? {}),
      source: 'onboarding',
      uiStatus:
        current?.status === 'approved' || autoApproved
          ? 'Approved'
          : current?.status === 'rejected'
            ? 'Rejected'
            : 'Submitted',
      profileType: onboarding.profileType,
      submissionSnapshot: {
        owner: onboarding.owner,
        storeName: onboarding.storeName,
        storeSlug: onboarding.storeSlug,
        email: onboarding.email,
        phone: onboarding.phone,
        website: onboarding.website,
        brandColor: onboarding.brandColor,
        support: onboarding.support,
        shipFrom: onboarding.shipFrom,
        channels: onboarding.channels,
        languages: onboarding.languages,
        taxonomySelections: onboarding.taxonomySelections,
        shipping: onboarding.shipping,
        policies: onboarding.policies,
        payout: {
          method: onboarding.payout.method,
          currency: onboarding.payout.currency,
          rhythm: onboarding.payout.rhythm,
          thresholdAmount: onboarding.payout.thresholdAmount,
          notificationsEmail: onboarding.payout.notificationsEmail,
          notificationsWhatsApp: onboarding.payout.notificationsWhatsApp,
          confirmDetails: onboarding.payout.confirmDetails
        },
        tax: onboarding.tax,
        verification: onboarding.verification,
        providerServices: onboarding.providerServices,
        bookingModes: onboarding.bookingModes,
        submittedAt: onboarding.submittedAt,
        updatedAt: onboarding.updatedAt
      }
    };

    await this.upsertAccountApprovalPayload(userId, {
      ...(current ?? {}),
      status: autoApproved
        ? 'approved'
        : current?.status === 'approved'
          ? 'approved'
          : current?.status === 'rejected'
            ? 'rejected'
            : 'pending',
      progressPercent: autoApproved
        ? 100
        : typeof current?.progressPercent === 'number'
          ? current.progressPercent
          : onboarding.status === 'submitted'
            ? 15
            : 5,
      submittedAt:
        typeof current?.submittedAt === 'string' && current.submittedAt ? current.submittedAt : onboarding.submittedAt ?? new Date().toISOString(),
      reviewNotes: typeof current?.reviewNotes === 'string' ? current.reviewNotes : '',
      requiredActions,
      documents,
      approvedAt: autoApproved
        ? (typeof current?.approvedAt === 'string' && current.approvedAt
            ? current.approvedAt
            : onboarding.submittedAt ?? new Date().toISOString())
        : (current?.approvedAt ?? null),
      metadata
    });
  }

  private shouldAutoApproveSubmittedOnboarding(profileType: string) {
    return profileType === 'CREATOR' || profileType === 'SELLER' || profileType === 'PROVIDER';
  }

  private async syncUserAccessFromOnboarding(
    userId: string,
    onboarding: Awaited<ReturnType<WorkflowService['onboarding']>>
  ) {
    if (!this.shouldAutoApproveSubmittedOnboarding(onboarding.profileType)) {
      return;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        approvalStatus: 'APPROVED',
        onboardingCompleted: true
      }
    });
  }

  private extractTaxonomyNodeIds(onboarding: Awaited<ReturnType<WorkflowService['onboarding']>>) {
    const nodeIds = new Set<string>();
    const selectionNodeId =
      onboarding.taxonomySelection && typeof (onboarding.taxonomySelection as any).nodeId === 'string'
        ? (onboarding.taxonomySelection as any).nodeId
        : null;
    if (selectionNodeId) {
      nodeIds.add(selectionNodeId);
    }
    if (Array.isArray(onboarding.taxonomySelections)) {
      onboarding.taxonomySelections.forEach((selection: { nodeId?: string }) => {
        if (selection?.nodeId) {
          nodeIds.add(String(selection.nodeId));
        }
      });
    }
    return Array.from(nodeIds);
  }

  private async ensureWorkspaceRow(userId: string) {
    const existing = await this.prisma.workspace.findUnique({
      where: { ownerUserId: userId }
    });
    if (existing) {
      return existing;
    }
    return this.prisma.workspace.create({
      data: {
        ownerUserId: userId,
        inviteDomainAllowlist: ['creator.com', 'studio.com', 'mylivedealz.com', 'studio.test'] as Prisma.InputJsonValue
      }
    });
  }

  private async getAccountApprovalPayload(userId: string) {
    try {
      const record = await this.prisma.accountApproval.findUnique({
        where: { userId }
      });
      if (record) {
        return this.readStoredObjectPayload(record.payload);
      }
    } catch (error) {
      if (!this.isMissingSchemaObjectError(error)) {
        throw error;
      }
    }

    let legacy: { payload: Prisma.JsonValue } | null = null;
    try {
      legacy = await this.prisma.workflowRecord.findUnique({
        where: { userId_recordType_recordKey: { userId, recordType: 'account_approval', recordKey: 'main' } }
      });
    } catch (error) {
      if (this.isMissingSchemaObjectError(error)) {
        return this.getUserSettingWorkflowFallback(userId, 'account_approval', 'main');
      }
      throw error;
    }
    if (!legacy) {
      return null;
    }

    const payload = legacy.payload as Record<string, unknown>;
    await this.upsertAccountApprovalPayload(userId, payload);
    return payload;
  }

  private async upsertAccountApprovalPayload(userId: string, payload: unknown) {
    const sanitized = this.ensurePayload(payload);
    try {
      const record = await this.prisma.accountApproval.upsert({
        where: { userId },
        update: {
          status: this.readStringField(sanitized.status) || 'pending',
          payload: sanitized as Prisma.InputJsonValue,
          submittedAt: this.readDateField(sanitized.submittedAt),
          approvedAt: this.readDateField(sanitized.approvedAt),
          rejectedAt: this.readDateField(sanitized.rejectedAt),
          decidedAt: this.readDateField(sanitized.decidedAt)
        },
        create: {
          userId,
          status: this.readStringField(sanitized.status) || 'pending',
          payload: sanitized as Prisma.InputJsonValue,
          submittedAt: this.readDateField(sanitized.submittedAt),
          approvedAt: this.readDateField(sanitized.approvedAt),
          rejectedAt: this.readDateField(sanitized.rejectedAt),
          decidedAt: this.readDateField(sanitized.decidedAt)
        }
      });
      return this.readStoredObjectPayload(record.payload);
    } catch (error) {
      if (!this.isMissingSchemaObjectError(error)) {
        throw error;
      }
      await this.upsertRecord(userId, 'account_approval', 'main', sanitized);
      return sanitized;
    }
  }

  private async getScreenStatePayload(userId: string, key: string) {
    try {
      const record = await this.prisma.workflowScreenState.findUnique({
        where: { userId_key: { userId, key } }
      });
      if (record) {
        return this.readStoredObjectPayload(record.payload);
      }
    } catch (error) {
      if (!this.isMissingSchemaObjectError(error)) {
        throw error;
      }
    }

    let legacy: { payload: Prisma.JsonValue } | null = null;
    try {
      legacy = await this.prisma.workflowRecord.findUnique({
        where: { userId_recordType_recordKey: { userId, recordType: 'screen_state', recordKey: key } }
      });
    } catch (error) {
      if (this.isMissingSchemaObjectError(error)) {
        return this.getUserSettingWorkflowFallback(userId, 'screen_state', key);
      }
      throw error;
    }
    if (!legacy) {
      return null;
    }

    const payload = legacy.payload as Record<string, unknown>;
    await this.upsertScreenStatePayload(userId, key, payload);
    return payload;
  }

  private async upsertScreenStatePayload(userId: string, key: string, payload: unknown) {
    const sanitized = this.ensurePayload(payload, { maxDepth: 12, maxArrayLength: 500, maxKeys: 500 });
    try {
      const record = await this.prisma.workflowScreenState.upsert({
        where: { userId_key: { userId, key } },
        update: { payload: sanitized as Prisma.InputJsonValue },
        create: {
          userId,
          key,
          payload: sanitized as Prisma.InputJsonValue
        }
      });
      return this.readStoredObjectPayload(record.payload);
    } catch (error) {
      if (!this.isMissingSchemaObjectError(error)) {
        throw error;
      }
      await this.upsertRecord(userId, 'screen_state', key, sanitized);
      return sanitized;
    }
  }

  private async listContentApprovalPayloads(userId: string) {
    const [current, legacy] = await Promise.all([
      this.prisma.contentApproval.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' }
      }),
      this.prisma.workflowRecord
        .findMany({
          where: { userId, recordType: 'content_approval' },
          orderBy: { updatedAt: 'desc' }
        })
        .catch((error) => {
          if (this.isMissingSchemaObjectError(error)) {
            return [];
          }
          throw error;
        })
    ]);

    const merged = new Map<string, { id: string; payload: Record<string, unknown> }>();
    for (const record of current) {
      merged.set(record.id, { id: record.id, payload: record.payload as Record<string, unknown> });
    }
    for (const record of legacy) {
      if (!merged.has(record.recordKey)) {
        merged.set(record.recordKey, { id: record.recordKey, payload: record.payload as Record<string, unknown> });
      }
    }

    return Array.from(merged.values());
  }

  private async getContentApprovalPayload(userId: string, id: string) {
    const record = await this.prisma.contentApproval.findUnique({
      where: { id }
    });
    if (record && record.userId === userId) {
      return record.payload as Record<string, unknown>;
    }

    let legacy: { payload: Prisma.JsonValue } | null = null;
    try {
      legacy = await this.prisma.workflowRecord.findUnique({
        where: { userId_recordType_recordKey: { userId, recordType: 'content_approval', recordKey: id } }
      });
    } catch (error) {
      if (this.isMissingSchemaObjectError(error)) {
        return this.getUserSettingWorkflowFallback(userId, 'content_approval', id);
      }
      throw error;
    }
    if (!legacy) {
      return null;
    }

    const payload = legacy.payload as Record<string, unknown>;
    await this.upsertContentApprovalPayload(userId, id, payload);
    return payload;
  }

  private async upsertContentApprovalPayload(userId: string, id: string, payload: unknown) {
    const sanitized = this.ensurePayload(payload);
    const existing = await this.prisma.contentApproval.findUnique({
      where: { id }
    });
    if (existing && existing.userId !== userId) {
      throw new NotFoundException('Content approval not found');
    }
    const record = await this.prisma.contentApproval.upsert({
      where: { id },
      update: {
        userId,
        status: this.readStringField(sanitized.status) || 'draft',
        title: this.readNullableStringField(sanitized.title),
        payload: sanitized as Prisma.InputJsonValue,
        submittedAt: this.readDateField(sanitized.submittedAt),
        lastNudgedAt: this.readDateField(sanitized.lastNudgedAt)
      },
      create: {
        id,
        userId,
        status: this.readStringField(sanitized.status) || 'draft',
        title: this.readNullableStringField(sanitized.title),
        payload: sanitized as Prisma.InputJsonValue,
        submittedAt: this.readDateField(sanitized.submittedAt),
        lastNudgedAt: this.readDateField(sanitized.lastNudgedAt)
      }
    });
    return record.payload as Record<string, unknown>;
  }

  private async getRecordPayload(userId: string, recordType: string, recordKey: string) {
    try {
      const record = await this.prisma.workflowRecord.findUnique({
        where: { userId_recordType_recordKey: { userId, recordType, recordKey } }
      });
      return record?.payload as Record<string, unknown> | null;
    } catch (error) {
      if (this.isMissingSchemaObjectError(error)) {
        return this.getUserSettingWorkflowFallback(userId, recordType, recordKey);
      }
      throw error;
    }
  }

  private async getRecord(userId: string, recordType: string, recordKey: string) {
    try {
      return await this.prisma.workflowRecord.findUnique({
        where: { userId_recordType_recordKey: { userId, recordType, recordKey } }
      });
    } catch (error) {
      if (this.isMissingSchemaObjectError(error)) {
        const payload = await this.getUserSettingWorkflowFallback(userId, recordType, recordKey);
        return payload
          ? {
              id: `${userId}:${recordType}:${recordKey}`,
              userId,
              recordType,
              recordKey,
              payload: payload as Prisma.InputJsonValue
            }
          : null;
      }
      throw error;
    }
  }

  private async createRecord(userId: string, recordType: string, recordKey: string, payload: unknown) {
    const sanitized = this.ensurePayload(payload);
    try {
      return await this.prisma.workflowRecord.create({
        data: {
          userId,
          recordType,
          recordKey,
          payload: sanitized as Prisma.InputJsonValue
        }
      });
    } catch (error) {
      if (this.isMissingSchemaObjectError(error)) {
        await this.upsertUserSettingWorkflowFallback(userId, recordType, recordKey, sanitized);
        return {
          id: `${userId}:${recordType}:${recordKey}`,
          userId,
          recordType,
          recordKey,
          payload: sanitized as Prisma.InputJsonValue
        };
      }
      throw error;
    }
  }

  private async updateRecord(userId: string, recordType: string, recordKey: string, payload: unknown) {
    const existing = await this.getRecord(userId, recordType, recordKey);
    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    const sanitized = this.ensurePayload(payload);
    try {
      return await this.prisma.workflowRecord.update({
        where: { id: existing.id },
        data: { payload: sanitized as Prisma.InputJsonValue }
      });
    } catch (error) {
      if (this.isMissingSchemaObjectError(error)) {
        await this.upsertUserSettingWorkflowFallback(userId, recordType, recordKey, sanitized);
        return {
          ...existing,
          payload: sanitized as Prisma.InputJsonValue
        };
      }
      throw error;
    }
  }

  private async upsertRecord(userId: string, recordType: string, recordKey: string, payload: unknown) {
    const sanitized = this.ensurePayload(payload);
    try {
      return await this.prisma.workflowRecord.upsert({
        where: { userId_recordType_recordKey: { userId, recordType, recordKey } },
        update: { payload: sanitized as Prisma.InputJsonValue },
        create: {
          userId,
          recordType,
          recordKey,
          payload: sanitized as Prisma.InputJsonValue
        }
      });
    } catch (error) {
      if (this.isMissingSchemaObjectError(error)) {
        await this.upsertUserSettingWorkflowFallback(userId, recordType, recordKey, sanitized);
        return {
          id: `${userId}:${recordType}:${recordKey}`,
          userId,
          recordType,
          recordKey,
          payload: sanitized as Prisma.InputJsonValue
        };
      }
      throw error;
    }
  }

  private ensurePayload(
    payload: unknown,
    limits: { maxDepth?: number; maxArrayLength?: number; maxKeys?: number } = {}
  ) {
    const sanitized = sanitizePayload(payload, {
      maxDepth: limits.maxDepth ?? 6,
      maxArrayLength: limits.maxArrayLength ?? 300,
      maxKeys: limits.maxKeys ?? 300
    });
    if (sanitized === undefined || !sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) {
      throw new BadRequestException('Invalid payload');
    }
    return sanitized as Record<string, unknown>;
  }

  private ensureObjectPayload(
    payload: unknown,
    limits: { maxDepth?: number; maxArrayLength?: number; maxKeys?: number } = {}
  ) {
    const sanitized = this.ensurePayload(payload, limits);
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

  private isMissingSchemaObjectError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2021' || error.code === 'P2022')
    );
  }

  private workflowFallbackUserSettingKey(recordType: string, recordKey: string) {
    return `workflow_fallback:${recordType}:${recordKey}`;
  }

  private uploadFallbackUserSettingKey() {
    return 'workflow_fallback:uploads';
  }

  private async getUserSettingWorkflowFallback(userId: string, recordType: string, recordKey: string) {
    if (!('userSetting' in this.prisma) || !this.prisma.userSetting) {
      return null;
    }
    try {
      const record = await this.prisma.userSetting.findUnique({
        where: {
          userId_key: {
            userId,
            key: this.workflowFallbackUserSettingKey(recordType, recordKey)
          }
        }
      });
      return record ? this.readStoredObjectPayload(record.payload) : null;
    } catch (error) {
      if (this.isMissingSchemaObjectError(error)) {
        return null;
      }
      throw error;
    }
  }

  private async upsertUserSettingWorkflowFallback(
    userId: string,
    recordType: string,
    recordKey: string,
    payload: Record<string, unknown>
  ) {
    if (!('userSetting' in this.prisma) || !this.prisma.userSetting) {
      return;
    }
    try {
      await this.prisma.userSetting.upsert({
        where: {
          userId_key: {
            userId,
            key: this.workflowFallbackUserSettingKey(recordType, recordKey)
          }
        },
        update: { payload: payload as Prisma.InputJsonValue },
        create: {
          userId,
          key: this.workflowFallbackUserSettingKey(recordType, recordKey),
          payload: payload as Prisma.InputJsonValue
        }
      });
    } catch (error) {
      if (!this.isMissingSchemaObjectError(error)) {
        throw error;
      }
    }
  }

  private async listUploadFallbackEntries(userId: string) {
    if (!('userSetting' in this.prisma) || !this.prisma.userSetting) {
      return [];
    }
    try {
      const record = await this.prisma.userSetting.findUnique({
        where: { userId_key: { userId, key: this.uploadFallbackUserSettingKey() } }
      });
      const payload =
        record?.payload && typeof record.payload === 'object' && !Array.isArray(record.payload)
          ? (record.payload as Record<string, unknown>)
          : {};
      const uploads = Array.isArray(payload.entries) ? payload.entries : [];
      return uploads
        .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object' && !Array.isArray(entry)))
        .map((entry) => ({
          id: String(entry.id || randomUUID()),
          ...this.readStoredObjectPayload(entry)
        }));
    } catch (error) {
      if (this.isMissingSchemaObjectError(error)) {
        return [];
      }
      throw error;
    }
  }

  private async listUploadEntriesWithFallback(userId: string, error: unknown, stage: string) {
    if (!this.isMissingSchemaObjectError(error)) {
      this.logUploadWarning(userId, stage, error);
    }
    try {
      return await this.listUploadFallbackEntries(userId);
    } catch (fallbackError) {
      this.logUploadWarning(userId, `${stage}:fallback`, fallbackError);
      return [];
    }
  }

  private logUploadWarning(userId: string, stage: string, error: unknown, sessionId?: string) {
    const detail = error instanceof Error ? error.message : String(error);
    const sessionSuffix = sessionId ? ` session ${sessionId}` : '';
    this.logger.warn(`Uploads fallback for user ${userId}${sessionSuffix} at ${stage}: ${detail}`);
  }

  private async appendUploadFallbackEntry(userId: string, entry: Record<string, unknown>) {
    if (!('userSetting' in this.prisma) || !this.prisma.userSetting) {
      return;
    }
    try {
      const existing = await this.prisma.userSetting.findUnique({
        where: { userId_key: { userId, key: this.uploadFallbackUserSettingKey() } }
      });
      const payload =
        existing?.payload && typeof existing.payload === 'object' && !Array.isArray(existing.payload)
          ? (existing.payload as Record<string, unknown>)
          : {};
      const entries = Array.isArray(payload.entries) ? payload.entries : [];
      const nextEntries = [
        entry,
        ...entries.filter((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
          return String((item as Record<string, unknown>).id || '') !== String(entry.id || '');
        })
      ].slice(0, 50);
      await this.prisma.userSetting.upsert({
        where: { userId_key: { userId, key: this.uploadFallbackUserSettingKey() } },
        update: { payload: { entries: nextEntries } as Prisma.InputJsonValue },
        create: {
          userId,
          key: this.uploadFallbackUserSettingKey(),
          payload: { entries: nextEntries } as Prisma.InputJsonValue
        }
      });
    } catch (error) {
      if (!this.isMissingSchemaObjectError(error)) {
        throw error;
      }
    }
  }

  private readStoredObjectPayload(payload: unknown) {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      return payload as Record<string, unknown>;
    }
    return {};
  }

  private readStringField(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
  }

  private readNullableStringField(value: unknown) {
    const normalized = this.readStringField(value);
    return normalized || null;
  }

  private readDateField(value: unknown) {
    if (value instanceof Date && !Number.isNaN(value.valueOf())) {
      return value;
    }
    if (typeof value !== 'string' || !value.trim()) {
      return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.valueOf()) ? null : parsed;
  }

  private deepMerge(base: unknown, patch: unknown): Record<string, unknown> {
    if (!base || typeof base !== 'object' || Array.isArray(base)) {
      return this.ensureObjectPayload(patch);
    }
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      return base as Record<string, unknown>;
    }

    const output: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
      const current = output[key];
      if (
        current &&
        typeof current === 'object' &&
        !Array.isArray(current) &&
        value &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        output[key] = this.deepMerge(current, value);
        continue;
      }
      output[key] = value;
    }
    return output;
  }

  private defaultProviderNewQuoteState() {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const makeId = (prefix: string) => `${prefix}_${randomUUID().slice(0, 12)}`;
    return {
      meta: {
        quoteId: `Q-${randomUUID().slice(0, 8).toUpperCase()}`,
        title: 'Service quote',
        currency: 'USD',
        language: 'en',
        status: 'Draft',
        createdAt: now.toISOString()
      },
      client: {
        name: '',
        org: '',
        email: '',
        phone: '',
        channel: 'EVzone Messages',
        referenceId: ''
      },
      scope: {
        summary: '',
        deliverables: [
          { id: makeId('del'), title: 'Discovery and requirements', detail: 'Clarify scope, constraints, and success metrics.' },
          { id: makeId('del'), title: 'Execution', detail: 'Deliver service with progress updates.' }
        ],
        attachments: []
      },
      pricingPolicy: {
        enforceGuardrails: true,
        minMarginPct: 18,
        allowOverride: true,
        overrideReason: ''
      },
      lines: [
        {
          id: makeId('ln'),
          name: 'Service package',
          qty: 1,
          unitCost: 120,
          priceMode: 'markup',
          markupPct: 40,
          unitPrice: 0,
          notes: ''
        }
      ],
      discount: { type: 'none', value: 0 },
      taxPct: 0,
      timeline: {
        startDate: today,
        durationDays: 14,
        milestones: [
          { id: makeId('ms'), title: 'Kickoff', dueInDays: 1, percent: 20 },
          { id: makeId('ms'), title: 'Delivery', dueInDays: 14, percent: 80 }
        ],
        notes: ''
      },
      terms: {
        payment: {
          model: 'milestones',
          upfrontPct: 30,
          netDays: 3,
          acceptedMethods: ['EVzone Pay Wallet', 'Bank Transfer']
        },
        revisions: { included: 2, windowDays: 7 },
        support: { included: true, windowDays: 14 },
        confidentiality: true,
        ip: 'client',
        cancellation: 'If the client cancels after kickoff, the kickoff milestone is non-refundable.',
        additional: ''
      },
      premium: {
        templateId: 'tpl_standard',
        autoConvertToContract: true,
        contractType: 'Standard Service Contract'
      },
      updatedAt: now.toISOString()
    };
  }

  private toUploadPayload(session: {
    fileName: string;
    kind: string;
    mimeType: string | null;
    sizeBytes: number | null;
    extension: string | null;
    checksum: string | null;
    storageProvider: string | null;
    storageKey: string | null;
    visibility: string | null;
    purpose: string | null;
    status: string | null;
    metadata: unknown;
    createdAt: Date | string | null;
  }) {
    const meta =
      session.metadata && typeof session.metadata === 'object' && !Array.isArray(session.metadata)
        ? (session.metadata as Record<string, unknown>)
        : {};
    const createdAt = this.readDateField(session.createdAt)?.toISOString() ?? new Date(0).toISOString();
    return {
      name: this.readStringField(session.fileName),
      kind: this.readStringField(session.kind),
      mimeType: this.readNullableStringField(session.mimeType),
      sizeBytes: typeof session.sizeBytes === 'number' && Number.isFinite(session.sizeBytes) ? session.sizeBytes : null,
      extension: this.readNullableStringField(session.extension),
      checksum: this.readNullableStringField(session.checksum),
      storageProvider: this.readStringField(session.storageProvider) || 'LOCAL',
      storageKey: this.readStringField(session.storageKey),
      url: meta.url ?? null,
      visibility: this.readStringField(session.visibility) || 'PRIVATE',
      purpose: this.readStringField(session.purpose) || 'general',
      domain: meta.domain ?? null,
      entityType: meta.entityType ?? null,
      entityId: meta.entityId ?? null,
      status: this.readStringField(session.status) || 'UNKNOWN',
      metadata: meta,
      createdAt
    };
  }

}
