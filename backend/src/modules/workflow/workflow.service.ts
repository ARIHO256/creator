import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
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

const DEFAULT_ONBOARDING_LOOKUPS = {
  payoutMethods: [
    {
      value: 'bank_account',
      label: 'Bank account',
      helper: 'Local or international bank settlement.'
    },
    {
      value: 'mobile_money',
      label: 'Mobile money',
      helper: 'MTN, Airtel and other wallet providers.'
    },
    {
      value: 'alipay',
      label: 'Alipay',
      helper: 'For payouts to Mainland China or Hong Kong.'
    },
    {
      value: 'wechat_pay',
      label: 'WeChat Pay (Weixin Pay)',
      helper: 'For payouts to WeChat wallets.'
    },
    {
      value: 'other_local',
      label: 'Other payout method',
      helper: 'Cheque, local wallet or regional solution.'
    }
  ],
  payoutCurrencies: ['USD', 'EUR', 'CNY', 'UGX', 'KES', 'TZS', 'RWF', 'ZAR'],
  payoutRhythms: [
    { value: 'daily', label: 'Daily', helper: 'Payouts generated every business day.' },
    { value: 'weekly', label: 'Weekly', helper: 'Payouts grouped once per week.' },
    { value: 'monthly', label: 'Monthly', helper: 'Payouts grouped at month end.' },
    {
      value: 'on_threshold',
      label: 'When balance reaches a threshold',
      helper: 'We pay out once your balance reaches a minimum amount.'
    }
  ],
  mobileMoneyProviders: [
    { value: 'MTN Mobile Money', label: 'MTN Mobile Money' },
    { value: 'Airtel Money', label: 'Airtel Money' },
    { value: 'M-Pesa', label: 'M-Pesa' },
    { value: 'Safaricom', label: 'Safaricom' },
    { value: 'Orange Money', label: 'Orange Money' },
    { value: 'Wave', label: 'Wave' }
  ],
  mobileIdTypes: [
    { value: 'national_id', label: 'National ID' },
    { value: 'passport', label: 'Passport' },
    { value: 'drivers_license', label: "Driver's License" },
    { value: 'tax_id', label: 'Tax ID' },
    { value: 'residence_permit', label: 'Residence Permit' },
    { value: 'voter_id', label: 'Voter ID' }
  ],
  payoutRegions: {
    alipay: [
      { value: 'mainland', label: 'Mainland China' },
      { value: 'hong_kong', label: 'Hong Kong SAR' },
      { value: 'other', label: 'Other region' }
    ],
    wechat: [
      { value: 'mainland', label: 'Mainland China' },
      { value: 'hong_kong', label: 'Hong Kong SAR' },
      { value: 'other', label: 'Other region' }
    ]
  },
  policyPresets: [
    {
      id: 'standard',
      label: 'Standard',
      desc: 'Balanced defaults for most sellers.',
      patch: { returnsDays: '7', warrantyDays: '90', handlingTimeDays: '2' }
    },
    {
      id: 'fast',
      label: 'Fast',
      desc: 'Optimized for high conversion (quick dispatch).',
      patch: { returnsDays: '7', warrantyDays: '30', handlingTimeDays: '1' }
    },
    {
      id: 'strict',
      label: 'Strict',
      desc: 'Lower returns risk (use carefully by category).',
      patch: { returnsDays: '3', warrantyDays: '0', handlingTimeDays: '3' }
    }
  ]
};

@Injectable()
export class WorkflowService {
  constructor(
    private readonly configService: ConfigService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    private readonly jobsService: JobsService,
    private readonly taxonomyService: TaxonomyService
  ) {}

  async uploads(userId: string) {
    const sessions = await this.prisma.uploadSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return sessions.map((session) => ({
      id: session.id,
      ...this.toUploadPayload(session)
    }));
  }
  async createUpload(userId: string, body: CreateUploadDto) {
    const id = body.id || randomUUID();
    const file = normalizeFileIntake(body);
    const storageProvider = file.storageProvider ?? (this.configService.get<string>('upload.defaultProvider') ?? 'LOCAL');
    const expiresAt = new Date(
      Date.now() + (this.configService.get<number>('upload.sessionTtlMinutes') ?? 20) * 60_000
    );
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
        metadata: {
          ...(body.metadata ?? {}),
          domain: body.domain ?? null,
          entityType: body.entityType ?? null,
          entityId: body.entityId ?? null,
          url: body.url ?? null
        } as Prisma.InputJsonValue
      }
    });
    return { id: session.id, ...this.toUploadPayload(session) };
  }

  async onboarding(userId: string) {
    const profileType = await this.resolveOnboardingProfileType(userId);
    const payload = await this.getRecordPayload(userId, 'onboarding', 'main');
    return payload
      ? normalizeStoredOnboardingState(payload, profileType)
      : createDefaultOnboardingState(profileType);
  }

  async onboardingLookups() {
    const existing = await this.prisma.systemContent.findUnique({
      where: { key: 'onboarding_lookups' }
    });
    const payload =
      existing?.payload && typeof existing.payload === 'object' && !Array.isArray(existing.payload)
        ? (existing.payload as Record<string, unknown>)
        : {};
    const payoutRegions =
      payload.payoutRegions && typeof payload.payoutRegions === 'object' && !Array.isArray(payload.payoutRegions)
        ? (payload.payoutRegions as Record<string, unknown>)
        : {};

    return {
      ...DEFAULT_ONBOARDING_LOOKUPS,
      ...payload,
      payoutMethods: Array.isArray(payload.payoutMethods)
        ? payload.payoutMethods
        : DEFAULT_ONBOARDING_LOOKUPS.payoutMethods,
      payoutCurrencies: Array.isArray(payload.payoutCurrencies)
        ? payload.payoutCurrencies
        : DEFAULT_ONBOARDING_LOOKUPS.payoutCurrencies,
      payoutRhythms: Array.isArray(payload.payoutRhythms)
        ? payload.payoutRhythms
        : DEFAULT_ONBOARDING_LOOKUPS.payoutRhythms,
      mobileMoneyProviders: Array.isArray(payload.mobileMoneyProviders)
        ? payload.mobileMoneyProviders
        : DEFAULT_ONBOARDING_LOOKUPS.mobileMoneyProviders,
      mobileIdTypes: Array.isArray(payload.mobileIdTypes)
        ? payload.mobileIdTypes
        : DEFAULT_ONBOARDING_LOOKUPS.mobileIdTypes,
      payoutRegions: {
        alipay: Array.isArray(payoutRegions.alipay)
          ? payoutRegions.alipay
          : DEFAULT_ONBOARDING_LOOKUPS.payoutRegions.alipay,
        wechat: Array.isArray(payoutRegions.wechat)
          ? payoutRegions.wechat
          : DEFAULT_ONBOARDING_LOOKUPS.payoutRegions.wechat
      },
      policyPresets: Array.isArray(payload.policyPresets)
        ? payload.policyPresets
        : DEFAULT_ONBOARDING_LOOKUPS.policyPresets
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
    await this.upsertRecord(userId, 'onboarding', 'main', merged);
    return merged;
  }

  async resetOnboarding(userId: string) {
    const profileType = await this.resolveOnboardingProfileType(userId);
    const reset = createDefaultOnboardingState(profileType);
    await this.upsertRecord(userId, 'onboarding', 'main', reset);
    return reset;
  }

  async submitOnboarding(userId: string, body: UpdateOnboardingDto) {
    const current = await this.onboarding(userId);
    const merged = mergeOnboardingState(current, body);
    await this.validateOnboardingTaxonomy(merged);
    const submitted = prepareSubmittedOnboarding(merged);
    await this.assertSellerSlugAvailable(userId, submitted.storeSlug);
    await this.upsertRecord(userId, 'onboarding', 'main', submitted);
    await this.syncSellerProfile(userId, submitted);
    await this.syncTaxonomySelections(userId, submitted);
    await this.syncOperationalSetupFromOnboarding(userId, submitted);
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
    return this.getRecordPayload(userId, 'account_approval', 'main').then(
      (payload) =>
        payload ?? { status: 'pending', progressPercent: 0, requiredActions: [], documents: [] }
    );
  }
  async screenState(userId: string, key: string) {
    const payload = await this.getRecordPayload(userId, 'screen_state', key);
    if (payload) return payload;
    if (key === 'provider-new-quote') {
      const record = await this.upsertRecord(userId, 'screen_state', key, this.defaultProviderNewQuoteState());
      return record.payload as Record<string, unknown>;
    }
    return {};
  }
  async patchScreenState(userId: string, key: string, body: PatchScreenStateDto) {
    if (key === 'provider-new-quote' && body.__resetToDefault === true) {
      const record = await this.upsertRecord(userId, 'screen_state', key, this.defaultProviderNewQuoteState());
      return record.payload as Record<string, unknown>;
    }
    const current = (await this.screenState(userId, key)) as Record<string, unknown>;
    const nextPayload = { ...this.extractPayload(body) };
    const next = {
      ...this.deepMerge(current, this.ensureObjectPayload(nextPayload)),
      updatedAt: new Date().toISOString()
    };
    const record = await this.upsertRecord(userId, 'screen_state', key, next);
    return record.payload as Record<string, unknown>;
  }
  async patchAccountApproval(userId: string, body: UpdateAccountApprovalDto) {
    const current = await this.accountApproval(userId);
    const record = await this.upsertRecord(userId, 'account_approval', 'main', {
      ...this.deepMerge(current, this.ensureObjectPayload(body)),
      updatedAt: new Date().toISOString()
    });
    return record.payload as Record<string, unknown>;
  }
  refreshAccountApproval(userId: string) { return this.accountApproval(userId); }
  async resubmitAccountApproval(userId: string, body: UpdateAccountApprovalDto) {
    const current = await this.accountApproval(userId);
    const record = await this.upsertRecord(userId, 'account_approval', 'main', {
      ...this.deepMerge(current, this.ensureObjectPayload(body)),
      status: 'resubmitted',
      reviewedAt: new Date().toISOString()
    });
    return record.payload as Record<string, unknown>;
  }
  async devApprove(userId: string) {
    const record = await this.upsertRecord(userId, 'account_approval', 'main', {
      status: 'approved',
      approvedAt: new Date().toISOString()
    });
    return record.payload as Record<string, unknown>;
  }

  async recordAccountApprovalDecision(deciderUserId: string, body: UpdateAccountApprovalDecisionDto) {
    const current = await this.getRecordPayload(body.userId, 'account_approval', 'main');
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
    const record = await this.upsertRecord(body.userId, 'account_approval', 'main', next);
    return record.payload as Record<string, unknown>;
  }

  async contentApprovals(userId: string) {
    const records = await this.prisma.workflowRecord.findMany({
      where: { userId, recordType: 'content_approval' },
      orderBy: { updatedAt: 'desc' }
    });
    return records.map((record) => ({ id: record.recordKey, ...(record.payload as any) }));
  }
  async contentApproval(userId: string, id: string) {
    const record = await this.getRecord(userId, 'content_approval', id);
    if (!record) {
      throw new NotFoundException('Content approval not found');
    }
    return { id: record.recordKey, ...(record.payload as any) };
  }
  async createContentApproval(userId: string, body: CreateContentApprovalDto) {
    const payload = this.ensurePayload(this.extractPayload(body));
    const id = String((payload as any).id ?? randomUUID());
    await this.createRecord(userId, 'content_approval', id, payload);
    return { id, ...payload };
  }
  async patchContentApproval(userId: string, id: string, body: UpdateContentApprovalDto) {
    const record = await this.getRecord(userId, 'content_approval', id);
    if (!record) {
      throw new NotFoundException('Content approval not found');
    }
    const next = this.deepMerge((record.payload as Record<string, unknown> | null) ?? {}, this.ensureObjectPayload(this.extractPayload(body)));
    await this.updateRecord(userId, 'content_approval', id, next);
    return { id, ...next };
  }

  async nudge(userId: string, id: string) {
    const rec = await this.getRecord(userId, 'content_approval', id);
    if (!rec) {
      throw new NotFoundException('Content approval not found');
    }
    const next = { ...(rec.payload as any), lastNudgedAt: new Date().toISOString() };
    await this.updateRecord(userId, 'content_approval', id, next);
    return { id, ...next };
  }
  async withdraw(userId: string, id: string) {
    const rec = await this.getRecord(userId, 'content_approval', id);
    if (!rec) {
      throw new NotFoundException('Content approval not found');
    }
    const next = { ...(rec.payload as any), status: 'withdrawn' };
    await this.updateRecord(userId, 'content_approval', id, next);
    return { id, ...next };
  }
  async resubmit(userId: string, id: string, body: ResubmitContentApprovalDto) {
    const rec = await this.getRecord(userId, 'content_approval', id);
    if (!rec) {
      throw new NotFoundException('Content approval not found');
    }
    const next = {
      ...this.deepMerge((rec.payload as Record<string, unknown> | null) ?? {}, this.ensureObjectPayload(this.extractPayload(body))),
      status: 'resubmitted'
    };
    await this.updateRecord(userId, 'content_approval', id, next);
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
          coverUrl: onboarding.coverUrl || undefined
        },
        create: {
          sellerId: seller.id,
          slug: storefrontSlug,
          name: onboarding.storeName || seller.storefrontName || seller.displayName || seller.name,
          tagline: onboarding.about || undefined,
          description: onboarding.about || undefined,
          logoUrl: onboarding.logoUrl || undefined,
          coverUrl: onboarding.coverUrl || undefined,
          isPublished: false
        }
      });
    }
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
      onboarding.shipping.handlingTimeDays !== null ||
        onboarding.shipping.expressReady ||
        onboarding.policies.returnsDays !== null ||
        onboarding.policies.warrantyDays !== null ||
        onboarding.shipFrom.country
    );

    if (!shouldPersistShippingProfile) {
      return;
    }

    const shippingData = {
      name: onboarding.shipping.expressReady ? 'Express shipping' : 'Standard shipping',
      description:
        onboarding.policies.policyNotes ||
        (onboarding.shipping.expressReady
          ? 'Shipping profile created from seller onboarding with express fulfillment enabled.'
          : 'Shipping profile created from seller onboarding.'),
      status: 'ACTIVE' as const,
      carrier: null,
      serviceLevel: onboarding.shipping.expressReady ? 'Express' : 'Standard',
      handlingTimeDays: onboarding.shipping.handlingTimeDays,
      regions: Array.from(
        new Set([onboarding.shipFrom.country, onboarding.tax.taxCountry].filter(Boolean))
      ) as Prisma.InputJsonValue,
      isDefault: true,
      metadata: {
        source: 'onboarding',
        profileType: onboarding.profileType,
        expressReady: onboarding.shipping.expressReady,
        returnsDays: onboarding.policies.returnsDays,
        warrantyDays: onboarding.policies.warrantyDays
      } as Prisma.InputJsonValue
    };

    if (matchingProfile) {
      await this.prisma.shippingProfile.update({
        where: { id: matchingProfile.id },
        data: shippingData
      });
      return;
    }

    if (seller.shippingProfiles.length === 0) {
      await this.prisma.shippingProfile.create({
        data: {
          sellerId: seller.id,
          ...shippingData
        }
      });
    }
  }

  private async syncAccountApprovalFromOnboarding(
    userId: string,
    onboarding: Awaited<ReturnType<WorkflowService['onboarding']>>
  ) {
    const autoApproved = this.shouldAutoApproveSubmittedOnboarding(onboarding.profileType);
    const current = await this.getRecordPayload(userId, 'account_approval', 'main');
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
        channels: onboarding.channels,
        languages: onboarding.languages,
        taxonomySelections: onboarding.taxonomySelections,
        submittedAt: onboarding.submittedAt,
        updatedAt: onboarding.updatedAt
      }
    };

    await this.upsertRecord(userId, 'account_approval', 'main', {
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
    return profileType === 'SELLER' || profileType === 'PROVIDER';
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

  private async getRecordPayload(userId: string, recordType: string, recordKey: string) {
    const record = await this.prisma.workflowRecord.findUnique({
      where: { userId_recordType_recordKey: { userId, recordType, recordKey } }
    });
    return record?.payload as Record<string, unknown> | null;
  }

  private async getRecord(userId: string, recordType: string, recordKey: string) {
    return this.prisma.workflowRecord.findUnique({
      where: { userId_recordType_recordKey: { userId, recordType, recordKey } }
    });
  }

  private async createRecord(userId: string, recordType: string, recordKey: string, payload: unknown) {
    const sanitized = this.ensurePayload(payload);
    return this.prisma.workflowRecord.create({
      data: {
        userId,
        recordType,
        recordKey,
        payload: sanitized as Prisma.InputJsonValue
      }
    });
  }

  private async updateRecord(userId: string, recordType: string, recordKey: string, payload: unknown) {
    const existing = await this.getRecord(userId, recordType, recordKey);
    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    const sanitized = this.ensurePayload(payload);
    return this.prisma.workflowRecord.update({
      where: { id: existing.id },
      data: { payload: sanitized as Prisma.InputJsonValue }
    });
  }

  private async upsertRecord(userId: string, recordType: string, recordKey: string, payload: unknown) {
    const sanitized = this.ensurePayload(payload);
    return this.prisma.workflowRecord.upsert({
      where: { userId_recordType_recordKey: { userId, recordType, recordKey } },
      update: { payload: sanitized as Prisma.InputJsonValue },
      create: {
        userId,
        recordType,
        recordKey,
        payload: sanitized as Prisma.InputJsonValue
      }
    });
  }

  private ensurePayload(payload: unknown) {
    const sanitized = sanitizePayload(payload, { maxDepth: 6, maxArrayLength: 300, maxKeys: 300 });
    if (sanitized === undefined || !sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) {
      throw new BadRequestException('Invalid payload');
    }
    return sanitized as Record<string, unknown>;
  }

  private ensureObjectPayload(payload: unknown) {
    const sanitized = this.ensurePayload(payload);
    if (!sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) {
      throw new BadRequestException('Invalid payload');
    }
    return sanitized as Record<string, unknown>;
  }

  private extractPayload(input: Record<string, unknown> | { payload: Record<string, unknown> }) {
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
    storageProvider: string;
    storageKey: string;
    visibility: string;
    purpose: string;
    status: string;
    metadata: unknown;
    createdAt: Date;
  }) {
    const meta = (session.metadata ?? {}) as Record<string, unknown>;
    return {
      name: session.fileName,
      kind: session.kind,
      mimeType: session.mimeType,
      sizeBytes: session.sizeBytes,
      extension: session.extension,
      checksum: session.checksum,
      storageProvider: session.storageProvider,
      storageKey: session.storageKey,
      url: meta.url ?? null,
      visibility: session.visibility,
      purpose: session.purpose,
      domain: meta.domain ?? null,
      entityType: meta.entityType ?? null,
      entityId: meta.entityId ?? null,
      status: session.status,
      metadata: meta,
      createdAt: session.createdAt.toISOString()
    };
  }

}
