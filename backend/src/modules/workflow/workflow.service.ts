import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { SellerKind } from '@prisma/client';
import { randomUUID } from 'crypto';
import { normalizeFileIntake } from '../../common/files/file-intake.js';
import { AppRecordsService } from '../../platform/app-records.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { CreateUploadDto } from './dto/create-upload.dto.js';
import { UpdateAccountApprovalDto } from './dto/update-account-approval.dto.js';
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
    private readonly records: AppRecordsService,
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  uploads(userId: string) { return this.records.list('workflow','upload',userId).then((rows)=>rows.map((r)=>({id:r.entityId,...(r.payload as any)}))); }
  createUpload(userId: string, body: CreateUploadDto) {
    const id = body.id || randomUUID();
    const file = normalizeFileIntake(body);
    return this.records.create(
      'workflow',
      'upload',
      {
        name: file.name,
        kind: file.kind,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        extension: file.extension,
        checksum: file.checksum,
        storageProvider: file.storageProvider,
        storageKey: file.storageKey,
        url: file.url,
        visibility: file.visibility,
        purpose: body.purpose ?? 'general',
        domain: body.domain ?? null,
        entityType: body.entityType ?? null,
        entityId: body.entityId ?? null,
        status: body.status ?? 'UPLOADED',
        metadata: body.metadata ?? {},
        createdAt: new Date().toISOString()
      },
      id,
      userId
    );
  }

  async onboarding(userId: string) {
    const profileType = await this.resolveOnboardingProfileType(userId);
    return this.records
      .getByEntityId('workflow', 'onboarding', 'main', userId)
      .then((record) => normalizeStoredOnboardingState(record.payload, profileType))
      .catch(() => createDefaultOnboardingState(profileType));
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
    await this.records.upsert('workflow', 'onboarding', 'main', merged, userId);
    return merged;
  }

  async resetOnboarding(userId: string) {
    const profileType = await this.resolveOnboardingProfileType(userId);
    const reset = createDefaultOnboardingState(profileType);
    await this.records.upsert('workflow', 'onboarding', 'main', reset, userId);
    return reset;
  }

  async submitOnboarding(userId: string, body: UpdateOnboardingDto) {
    const current = await this.onboarding(userId);
    const merged = mergeOnboardingState(current, body);
    const submitted = prepareSubmittedOnboarding(merged);
    await this.assertSellerSlugAvailable(userId, submitted.storeSlug);
    await this.records.upsert('workflow', 'onboarding', 'main', submitted, userId);
    await this.syncSellerProfile(userId, submitted);
    return submitted;
  }

  accountApproval(userId: string) {
    return this.records
      .getByEntityId('workflow', 'account_approval', 'main', userId)
      .then((record) => record.payload)
      .catch(() => ({ status: 'pending', progressPercent: 0, requiredActions: [], documents: [] }));
  }
  patchAccountApproval(userId: string, body: UpdateAccountApprovalDto) { return this.records.upsert('workflow','account_approval','main',{ ...body, updatedAt: new Date().toISOString() },userId); }
  refreshAccountApproval(userId: string) { return this.accountApproval(userId); }
  resubmitAccountApproval(userId: string, body: UpdateAccountApprovalDto) { return this.records.upsert('workflow','account_approval','main',{...body,status:'resubmitted', reviewedAt: new Date().toISOString()},userId); }
  devApprove(userId: string) { return this.records.upsert('workflow','account_approval','main',{status:'approved',approvedAt:new Date().toISOString()},userId); }

  contentApprovals(userId: string) { return this.records.list('workflow','content_approval',userId).then((rows)=>rows.map((r)=>({id:r.entityId,...(r.payload as any)}))); }
  contentApproval(userId: string, id: string) { return this.records.getByEntityId('workflow','content_approval',id,userId).then((r)=>({id:r.entityId,...(r.payload as any)})); }
  createContentApproval(userId: string, body: any) { const id = body.id || randomUUID(); return this.records.create('workflow','content_approval',body,id,userId); }
  patchContentApproval(userId: string, id: string, body: any) { return this.records.update('workflow','content_approval',id,body,userId); }

  async nudge(userId: string, id: string) { const rec = await this.records.getByEntityId('workflow','content_approval',id,userId); return this.records.update('workflow','content_approval',id,{...(rec.payload as any),lastNudgedAt:new Date().toISOString()},userId); }
  async withdraw(userId: string, id: string) { const rec = await this.records.getByEntityId('workflow','content_approval',id,userId); return this.records.update('workflow','content_approval',id,{...(rec.payload as any),status:'withdrawn'},userId); }
  async resubmit(userId: string, id: string, body: any) { const rec = await this.records.getByEntityId('workflow','content_approval',id,userId); return this.records.update('workflow','content_approval',id,{...(rec.payload as any),...body,status:'resubmitted'},userId); }

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

    if (existing) {
      await this.prisma.seller.update({
        where: { id: existing.id },
        data
      });
      return;
    }

    await this.prisma.seller.create({
      data: {
        user: {
          connect: { id: userId }
        },
        ...data
      }
    });
  }
}
