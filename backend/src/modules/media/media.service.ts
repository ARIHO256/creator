import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import { normalizeFileIntake } from '../../common/files/file-intake.js';
import { JobsService } from '../jobs/jobs.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { CompleteUploadSessionDto } from './dto/complete-upload-session.dto.js';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto.js';
import { CreateUploadSessionDto } from './dto/create-upload-session.dto.js';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jobsService: JobsService
  ) {}

  async list(userId: string) {
    return this.prisma.mediaAsset.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async workspace(userId: string) {
    const [record, seller, assets] = await Promise.all([
      this.prisma.workspaceSetting.findUnique({
        where: {
          userId_key: {
            userId,
            key: 'seller_asset_library_context'
          }
        }
      }),
      this.prisma.seller.findFirst({
        where: { userId },
        include: { storefront: true }
      }),
      this.prisma.mediaAsset.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const campaigns = seller
      ? await this.prisma.campaign.findMany({
          where: { sellerId: seller.id },
          include: {
            creator: {
              include: {
                creatorProfile: true
              }
            },
            contracts: true
          },
          orderBy: { updatedAt: 'desc' }
        })
      : [];

    const stored = record?.payload && typeof record.payload === 'object' && !Array.isArray(record.payload)
      ? (record.payload as Record<string, unknown>)
      : {};

    const derived = {
      creators: this.mergeWorkspaceRows(
        this.readWorkspaceArray(stored.creators),
        this.buildWorkspaceCreators(campaigns)
      ),
      suppliers: this.mergeWorkspaceRows(
        this.readWorkspaceArray(stored.suppliers),
        this.buildWorkspaceSuppliers(seller)
      ),
      campaigns: this.mergeWorkspaceRows(
        this.readWorkspaceArray(stored.campaigns),
        this.buildWorkspaceCampaigns(campaigns, seller)
      ),
      deliverables: this.mergeWorkspaceRows(
        this.readWorkspaceArray(stored.deliverables),
        this.buildWorkspaceDeliverables(campaigns)
      ),
      collections: this.buildWorkspaceCollections(assets),
      activity: this.buildWorkspaceActivity(assets)
    };

    return derived;
  }

  async listUploadSessions(userId: string) {
    return this.prisma.uploadSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
  }

  async createUploadSession(userId: string, payload: CreateUploadSessionDto) {
    const storageProvider = this.configService.get<string>('upload.defaultProvider') ?? 'LOCAL';
    const provisionalStorageKey = this.buildStorageKey(userId, payload.name, payload.extension);
    const file = normalizeFileIntake(
      {
        ...payload,
        storageProvider,
        storageKey: provisionalStorageKey
      },
      { requireLocator: false, defaultKind: 'other' }
    );
    const expiresAt = new Date(
      Date.now() + (this.configService.get<number>('upload.sessionTtlMinutes') ?? 20) * 60_000
    );

    const session = await this.prisma.uploadSession.create({
      data: {
        userId,
        purpose: payload.purpose ?? 'media_asset',
        fileName: file.name,
        kind: file.kind,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        extension: file.extension,
        checksum: file.checksum,
        storageProvider: file.storageProvider ?? storageProvider,
        storageKey: file.storageKey ?? provisionalStorageKey,
        visibility: file.visibility,
        status: 'PENDING',
        expiresAt,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });

    return {
      id: session.id,
      status: session.status,
      purpose: session.purpose,
      expiresAt: session.expiresAt,
      file: {
        name: session.fileName,
        kind: session.kind,
        mimeType: session.mimeType,
        sizeBytes: session.sizeBytes,
        extension: session.extension,
        checksum: session.checksum,
        visibility: session.visibility
      },
      upload: {
        provider: session.storageProvider,
        storageKey: session.storageKey,
        completionToken: this.signUploadSession(
          session.id,
          userId,
          session.storageKey,
          session.expiresAt.toISOString()
        )
      }
    };
  }

  async completeUploadSession(userId: string, id: string, payload: CompleteUploadSessionDto) {
    const session = await this.prisma.uploadSession.findFirst({
      where: { id, userId }
    });

    if (!session) {
      throw new NotFoundException('Upload session not found');
    }

    if (session.status === 'COMPLETED') {
      throw new BadRequestException('Upload session already completed');
    }

    if (session.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Upload session has expired');
    }

    const expectedToken = this.signUploadSession(
      session.id,
      userId,
      session.storageKey,
      session.expiresAt.toISOString()
    );

    if (!this.tokensMatch(expectedToken, payload.completionToken)) {
      throw new BadRequestException('Invalid upload completion token');
    }

    if (session.checksum && payload.checksum && session.checksum !== payload.checksum.toLowerCase()) {
      throw new BadRequestException('Upload checksum does not match the initiated upload session');
    }

    const file = normalizeFileIntake({
      name: session.fileName,
      kind: session.kind,
      mimeType: payload.mimeType ?? session.mimeType ?? undefined,
      sizeBytes: payload.sizeBytes ?? session.sizeBytes ?? undefined,
      extension: payload.extension ?? session.extension ?? undefined,
      checksum: payload.checksum ?? session.checksum ?? undefined,
      storageProvider: session.storageProvider,
      storageKey: session.storageKey,
      url: payload.url,
      visibility: payload.visibility ?? session.visibility,
      metadata: payload.metadata
    });

    const createAsset = payload.createAsset ?? true;
    const completed = await this.prisma.$transaction(async (tx) => {
      const asset = createAsset
        ? await tx.mediaAsset.create({
            data: {
              userId,
              name: file.name,
              kind: file.kind,
              mimeType: file.mimeType,
              sizeBytes: file.sizeBytes,
              extension: file.extension,
              checksum: file.checksum,
              storageProvider: file.storageProvider,
              storageKey: file.storageKey,
              url: file.url,
              isPublic: payload.isPublic ?? file.visibility === 'PUBLIC',
              metadata: {
                visibility: file.visibility,
                uploadSessionId: session.id,
                ...(file.metadata ?? {})
              } as Prisma.InputJsonValue
            }
          })
        : null;

      const updatedSession = await tx.uploadSession.update({
        where: { id: session.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          metadata: {
            ...(session.metadata as Record<string, unknown> | null),
            completedWithUrl: file.url,
            mediaAssetId: asset?.id ?? null,
            ...(payload.metadata ?? {})
          } as Prisma.InputJsonValue
        }
      });

      return { session: updatedSession, asset };
    });

    await this.jobsService.enqueue({
      queue: 'media',
      type: 'MEDIA_UPLOAD_COMPLETED',
      userId,
      dedupeKey: `media-upload-completed:${session.id}`,
      correlationId: session.id,
      payload: {
        uploadSessionId: session.id,
        mediaAssetId: completed.asset?.id ?? null,
        storageKey: session.storageKey,
        purpose: session.purpose,
        createAsset
      }
    });

    return completed;
  }

  async create(userId: string, payload: CreateMediaAssetDto) {
    const file = normalizeFileIntake(payload, { defaultKind: 'other' });

    return this.prisma.mediaAsset.create({
      data: {
        userId,
        name: file.name,
        kind: file.kind,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        extension: file.extension,
        checksum: file.checksum,
        storageProvider: file.storageProvider,
        storageKey: file.storageKey,
        url: file.url,
        isPublic: payload.isPublic ?? file.visibility === 'PUBLIC',
        metadata: {
          visibility: file.visibility,
          ...(file.metadata ?? {})
        } as Prisma.InputJsonValue
      }
    });
  }

  async update(userId: string, id: string, payload: Record<string, unknown>) {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id, userId }
    });
    if (!asset) {
      throw new NotFoundException('Media asset not found');
    }
    return this.prisma.mediaAsset.update({
      where: { id: asset.id },
      data: {
        name: typeof payload.name === 'string' ? payload.name : undefined,
        kind: typeof payload.kind === 'string' ? payload.kind : undefined,
        url: typeof payload.url === 'string' ? payload.url : undefined,
        metadata:
          payload.metadata && typeof payload.metadata === 'object' && !Array.isArray(payload.metadata)
            ? (payload.metadata as Prisma.InputJsonValue)
            : undefined
      }
    });
  }

  async remove(userId: string, id: string) {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id, userId }
    });
    if (!asset) {
      throw new NotFoundException('Media asset not found');
    }
    await this.prisma.mediaAsset.delete({ where: { id: asset.id } });
    return { deleted: true };
  }

  private buildStorageKey(userId: string, name: string, extension?: string) {
    const now = new Date();
    const safeName =
      String(name || 'file')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'file';
    const suffix = Math.random().toString(36).slice(2, 10);
    const ext = extension
      ? `.${String(extension).trim().toLowerCase().replace(/^\./, '')}`
      : '';

    return [
      'uploads',
      userId,
      String(now.getUTCFullYear()),
      String(now.getUTCMonth() + 1).padStart(2, '0'),
      `${safeName}-${suffix}${ext}`
    ].join('/');
  }

  private signUploadSession(id: string, userId: string, storageKey: string, expiresAt: string) {
    const secret = this.configService.get<string>('upload.signingSecret') ?? 'change-me-upload-secret';
    return createHmac('sha256', secret)
      .update(`${id}:${userId}:${storageKey}:${expiresAt}`)
      .digest('hex');
  }

  private tokensMatch(expected: string, received: string) {
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(String(received || ''));

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  private readWorkspaceArray(value: unknown) {
    return Array.isArray(value)
      ? value.filter((entry) => entry && typeof entry === 'object') as Array<Record<string, unknown>>
      : [];
  }

  private mergeWorkspaceRows(
    current: Array<Record<string, unknown>>,
    fallback: Array<Record<string, unknown>>
  ) {
    const rows = [...current];
    const seen = new Set(
      rows.map((row) => String(row.id ?? '').trim()).filter(Boolean)
    );

    for (const entry of fallback) {
      const id = String(entry.id ?? '').trim();
      if (id && seen.has(id)) {
        continue;
      }
      if (id) {
        seen.add(id);
      }
      rows.push(entry);
    }

    return rows;
  }

  private buildWorkspaceSuppliers(seller: any) {
    if (!seller) {
      return [];
    }

    return [
      {
        id: seller.id,
        name: seller.displayName || seller.storefrontName || seller.name,
        kind: seller.kind ?? seller.type ?? 'Seller',
        brand: seller.storefrontName || seller.displayName || seller.name,
        logoUrl: seller.storefront?.logoUrl || seller.storefront?.coverUrl || ''
      }
    ];
  }

  private buildWorkspaceCreators(campaigns: any[]) {
    const rows = new Map<string, Record<string, unknown>>();

    for (const campaign of campaigns) {
      const creator = campaign.creator;
      if (!creator?.id) {
        continue;
      }
      rows.set(creator.id, {
        id: creator.id,
        name: creator.creatorProfile?.name ?? creator.email ?? 'Creator',
        handle: creator.creatorProfile?.handle ? `@${String(creator.creatorProfile.handle).replace(/^@/, '')}` : '@creator',
        avatarUrl: '',
      });
    }

    return Array.from(rows.values());
  }

  private buildWorkspaceCampaigns(campaigns: any[], seller: any) {
    return campaigns.map((campaign) => {
      const metadata =
        campaign.metadata && typeof campaign.metadata === 'object' && !Array.isArray(campaign.metadata)
          ? campaign.metadata as Record<string, unknown>
          : {};
      const reviewModeRaw =
        typeof metadata.supplierReviewMode === 'string'
          ? metadata.supplierReviewMode
          : typeof metadata.approvalMode === 'string'
            ? metadata.approvalMode
            : 'Manual';

      return {
        id: campaign.id,
        supplierId: seller?.id ?? '',
        name: campaign.title,
        brand:
          typeof metadata.brand === 'string' && metadata.brand.trim()
            ? metadata.brand.trim()
            : seller?.storefrontName || seller?.displayName || seller?.name || 'Seller',
        status: this.labelCampaignStatus(campaign.status),
        supplierReviewMode: /^auto$/i.test(String(reviewModeRaw)) ? 'Auto' : 'Manual'
      };
    });
  }

  private buildWorkspaceDeliverables(campaigns: any[]) {
    const rows: Array<Record<string, unknown>> = [];

    for (const campaign of campaigns) {
      for (const contract of campaign.contracts ?? []) {
        const metadata =
          contract.metadata && typeof contract.metadata === 'object' && !Array.isArray(contract.metadata)
            ? contract.metadata as Record<string, unknown>
            : {};
        const deliverables = Array.isArray(metadata.deliverablesList)
          ? metadata.deliverablesList
          : Array.isArray(metadata.deliverables)
            ? metadata.deliverables
            : [];

        deliverables.forEach((deliverable, index) => {
          const label = this.readDeliverableLabel(deliverable, index);
          rows.push({
            id: `${contract.id}:${index}`,
            campaignId: campaign.id,
            label,
            dueDateLabel: contract.endAt ? this.labelDueDate(contract.endAt) : 'No due date'
          });
        });
      }
    }

    return rows;
  }

  private buildWorkspaceCollections(assets: any[]) {
    const normalized = assets.map((asset) => this.readAssetState(asset));
    const starterCandidates = normalized.filter((asset) =>
      asset.status === 'approved' && ['hero', 'item_poster', 'overlay'].includes(asset.role)
    );
    const overlayAssets = normalized.filter((asset) =>
      asset.kind === 'overlay' || asset.role === 'overlay' || asset.tags.includes('overlay')
    );
    const overlayReady = overlayAssets.length > 0 && overlayAssets.every((asset) => asset.status === 'approved');

    return {
      starterPack: {
        assetCount: Math.min(2, starterCandidates.length),
        status: starterCandidates.length >= 2 ? 'ready' : 'needs_review'
      },
      priceDropOverlays: {
        assetCount: overlayAssets.length,
        status: overlayReady ? 'ready' : 'needs_review'
      }
    };
  }

  private buildWorkspaceActivity(assets: any[]) {
    const normalized = assets.map((asset) => this.readAssetState(asset));
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 13);

    const points = Array.from({ length: 14 }, () => 0);
    let newCount = 0;
    let approvedCount = 0;

    for (const asset of normalized) {
      if (asset.createdAt >= start) {
        const index = this.diffInDays(start, asset.createdAt);
        if (index >= 0 && index < points.length) {
          points[index] += 1;
          newCount += 1;
        }
      }

      if (asset.status === 'approved' && asset.updatedAt >= start) {
        approvedCount += 1;
      }
    }

    return {
      points,
      newCount,
      approvedCount,
      pendingCount: normalized.filter((asset) => asset.status === 'pending_supplier' || asset.status === 'pending_admin').length
    };
  }

  private readAssetState(asset: any) {
    const metadata =
      asset?.metadata && typeof asset.metadata === 'object' && !Array.isArray(asset.metadata)
        ? asset.metadata as Record<string, unknown>
        : {};
    const tags = Array.isArray(metadata.tags) ? metadata.tags.map((tag) => String(tag).toLowerCase()) : [];
    return {
      status: String(metadata.status || 'draft').toLowerCase(),
      role: typeof metadata.role === 'string' ? metadata.role : '',
      kind: String(asset.kind || metadata.mediaType || 'image').toLowerCase(),
      tags,
      createdAt: asset.createdAt instanceof Date ? asset.createdAt : new Date(asset.createdAt ?? Date.now()),
      updatedAt: asset.updatedAt instanceof Date ? asset.updatedAt : new Date(asset.updatedAt ?? asset.createdAt ?? Date.now())
    };
  }

  private labelCampaignStatus(status: string) {
    const raw = String(status || '').toLowerCase();
    if (!raw) {
      return 'Draft';
    }
    return raw
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private readDeliverableLabel(value: unknown, index: number) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const row = value as Record<string, unknown>;
      for (const key of ['label', 'title', 'name']) {
        if (typeof row[key] === 'string' && String(row[key]).trim()) {
          return String(row[key]).trim();
        }
      }
    }

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    return `Deliverable ${index + 1}`;
  }

  private labelDueDate(value: Date) {
    return `Due ${value.toISOString().slice(0, 10)}`;
  }

  private diffInDays(from: Date, to: Date) {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(0, 0, 0, 0);
    return Math.round((end.getTime() - start.getTime()) / 86_400_000);
  }
}
