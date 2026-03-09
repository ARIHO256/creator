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
import { CreateUploadDto } from './dto/create-upload.dto.js';
import { UpdateAccountApprovalDto } from './dto/update-account-approval.dto.js';
import { UpdateAccountApprovalDecisionDto } from './dto/update-account-approval-decision.dto.js';
import { ONBOARDING_PROFILE_TYPES, UpdateOnboardingDto } from './dto/update-onboarding.dto.js';
import {
  createDefaultOnboardingState,
  mergeOnboardingState,
  normalizeStoredOnboardingState,
  prepareSubmittedOnboarding,
  RESERVED_SELLER_SLUGS,
  sellerSlugToHandle
} from './onboarding-state.js';

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
  async patchAccountApproval(userId: string, body: UpdateAccountApprovalDto) {
    const record = await this.upsertRecord(userId, 'account_approval', 'main', {
      ...body,
      updatedAt: new Date().toISOString()
    });
    return record.payload as Record<string, unknown>;
  }
  refreshAccountApproval(userId: string) { return this.accountApproval(userId); }
  async resubmitAccountApproval(userId: string, body: UpdateAccountApprovalDto) {
    const record = await this.upsertRecord(userId, 'account_approval', 'main', {
      ...body,
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
  async createContentApproval(userId: string, body: Record<string, unknown>) {
    const payload = this.ensurePayload(body);
    const id = String((payload as any).id ?? randomUUID());
    await this.createRecord(userId, 'content_approval', id, payload);
    return { id, ...payload };
  }
  async patchContentApproval(userId: string, id: string, body: Record<string, unknown>) {
    const payload = this.ensurePayload(body);
    await this.updateRecord(userId, 'content_approval', id, payload);
    return { id, ...payload };
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
  async resubmit(userId: string, id: string, body: Record<string, unknown>) {
    const rec = await this.getRecord(userId, 'content_approval', id);
    if (!rec) {
      throw new NotFoundException('Content approval not found');
    }
    const next = { ...(rec.payload as any), ...this.ensureObjectPayload(body), status: 'resubmitted' };
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
    await this.taxonomyService.assertNodesInActiveTree(nodeIds);
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
    await this.taxonomyService.syncSellerCoverage(userId, nodeIds);
    await this.taxonomyService.syncStorefrontTaxonomy(userId, nodeIds, primaryNodeId);
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
