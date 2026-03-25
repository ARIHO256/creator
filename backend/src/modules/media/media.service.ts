import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { normalizeFileIntake } from '../../common/files/file-intake.js';
import { StorageService } from '../../platform/storage/storage.service.js';
import { JobsService } from '../jobs/jobs.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { CompleteUploadSessionDto } from './dto/complete-upload-session.dto.js';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto.js';
import { CreateUploadSessionDto } from './dto/create-upload-session.dto.js';
import { UploadMediaFileDto } from './dto/upload-media-file.dto.js';
import { UpdateMediaAssetDto } from './dto/update-media-asset.dto.js';

type MediaFallbackAsset = {
  id: string;
  userId: string;
  name: string;
  kind?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  extension?: string | null;
  checksum?: string | null;
  storageProvider?: string | null;
  storageKey?: string | null;
  url?: string | null;
  isPublic: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jobsService: JobsService,
    private readonly storage: StorageService
  ) {}

  async list(userId: string) {
    try {
      return await this.prisma.mediaAsset.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    } catch (error) {
      if (!this.isMissingSchemaObjectError(error)) {
        throw error;
      }
      return this.listFallbackAssets(userId);
    }
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
      }).catch((error) => {
        if (this.isMissingSchemaObjectError(error)) {
          return this.listFallbackAssets(userId);
        }
        throw error;
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

  async uploadFile(userId: string, payload: UploadMediaFileDto) {
    const decoded = this.decodeDataUrl(payload.dataUrl);
    const checksum = createHash('sha256').update(decoded.buffer).digest('hex');
    const storageProvider = this.configService.get<string>('upload.defaultProvider') ?? 'LOCAL';
    const file = normalizeFileIntake(
      {
        name: payload.name,
        kind: payload.kind,
        mimeType: payload.mimeType ?? decoded.mimeType ?? undefined,
        sizeBytes: payload.sizeBytes ?? decoded.buffer.byteLength,
        extension: payload.extension,
        checksum,
        storageProvider,
        storageKey: this.buildStorageKey(userId, payload.name, payload.extension ?? this.inferExtension(payload.name, payload.mimeType ?? decoded.mimeType)),
        visibility: payload.visibility ?? (payload.isPublic ? 'PUBLIC' : 'PRIVATE'),
        metadata: payload.metadata
      },
      { requireLocator: false, defaultKind: 'other' }
    );

    if (!file.storageKey) {
      throw new BadRequestException('Upload storage key could not be generated');
    }

    const stored = await this.writeFileBuffer(
      file.storageKey,
      decoded.buffer,
      file.mimeType ?? 'application/octet-stream'
    );

    const metadata = {
      visibility: file.visibility,
      purpose: payload.purpose ?? 'general',
      ...(payload.metadata ?? {})
    } as Record<string, unknown>;

    try {
      const asset = await this.prisma.mediaAsset.create({
        data: {
          userId,
          name: file.name,
          kind: file.kind,
          mimeType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
          extension: file.extension,
          checksum: file.checksum,
          storageProvider: file.storageProvider,
          storageKey: stored.storageKey,
          isPublic: payload.isPublic ?? file.visibility === 'PUBLIC',
          metadata: metadata as Prisma.InputJsonValue
        }
      });

      const urls = this.buildAssetUrls(asset.id, asset.isPublic);
      return this.prisma.mediaAsset.update({
        where: { id: asset.id },
        data: {
          url: urls.url
        }
      }).then((updated) => ({
        ...updated,
        url: urls.url,
        publicUrl: urls.publicUrl
      }));
    } catch (error) {
      if (!this.isMissingSchemaObjectError(error)) {
        throw error;
      }

      const fallbackId = randomUUID();
      const urls = this.buildAssetUrls(fallbackId, payload.isPublic ?? file.visibility === 'PUBLIC');
      const fallbackAsset: MediaFallbackAsset = {
        id: fallbackId,
        userId,
        name: file.name,
        kind: file.kind,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        extension: file.extension,
        checksum: file.checksum,
        storageProvider: file.storageProvider,
        storageKey: stored.storageKey,
        url: urls.url,
        isPublic: payload.isPublic ?? file.visibility === 'PUBLIC',
        metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await this.upsertFallbackAsset(fallbackAsset);
      return {
        ...fallbackAsset,
        publicUrl: urls.publicUrl
      };
    }
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
    try {
      return await this.prisma.mediaAsset.create({
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
    } catch (error) {
      if (!this.isMissingSchemaObjectError(error)) {
        throw error;
      }
      const fallbackId = randomUUID();
      const urls = this.buildAssetUrls(fallbackId, payload.isPublic ?? file.visibility === 'PUBLIC');
      const fallbackAsset: MediaFallbackAsset = {
        id: fallbackId,
        userId,
        name: file.name,
        kind: file.kind,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        extension: file.extension,
        checksum: file.checksum,
        storageProvider: file.storageProvider,
        storageKey: file.storageKey,
        url: file.url || urls.url,
        isPublic: payload.isPublic ?? file.visibility === 'PUBLIC',
        metadata: {
          visibility: file.visibility,
          ...(file.metadata ?? {})
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await this.upsertFallbackAsset(fallbackAsset);
      return fallbackAsset;
    }
  }

  async update(userId: string, id: string, payload: UpdateMediaAssetDto) {
    try {
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
    } catch (error) {
      if (!this.isMissingSchemaObjectError(error)) {
        throw error;
      }
      const asset = await this.getFallbackAsset(userId, id);
      if (!asset) {
        throw new NotFoundException('Media asset not found');
      }
      const next: MediaFallbackAsset = {
        ...asset,
        name: typeof payload.name === 'string' ? payload.name : asset.name,
        kind: typeof payload.kind === 'string' ? payload.kind : asset.kind,
        url: typeof payload.url === 'string' ? payload.url : asset.url,
        metadata:
          payload.metadata && typeof payload.metadata === 'object' && !Array.isArray(payload.metadata)
            ? (payload.metadata as Record<string, unknown>)
            : asset.metadata,
        updatedAt: new Date().toISOString()
      };
      await this.upsertFallbackAsset(next);
      return next;
    }
  }

  async remove(userId: string, id: string) {
    try {
      const asset = await this.prisma.mediaAsset.findFirst({
        where: { id, userId }
      });
      if (!asset) {
        throw new NotFoundException('Media asset not found');
      }
      await this.prisma.mediaAsset.delete({ where: { id: asset.id } });
      return { deleted: true };
    } catch (error) {
      if (!this.isMissingSchemaObjectError(error)) {
        throw error;
      }
      const asset = await this.getFallbackAsset(userId, id);
      if (!asset) {
        throw new NotFoundException('Media asset not found');
      }
      await this.deleteFallbackAsset(userId, id);
      return { deleted: true };
    }
  }

  async openAssetContent(userId: string, id: string) {
    let asset: { storageKey?: string | null; mimeType?: string | null; name?: string | null } | MediaFallbackAsset | null = null;
    try {
      asset = await this.prisma.mediaAsset.findFirst({
        where: { id, userId }
      });
    } catch (error) {
      if (!this.isMissingSchemaObjectError(error)) {
        throw error;
      }
      asset = await this.getFallbackAsset(userId, id);
    }
    if (!asset) {
      throw new NotFoundException('Media asset not found');
    }
    if (!asset.storageKey) {
      throw new NotFoundException('Media asset file not found');
    }
    return { asset, stream: this.storage.createReadStream(asset.storageKey) };
  }

  async openPublicAssetContent(id: string) {
    let asset: { storageKey?: string | null; mimeType?: string | null; name?: string | null } | MediaFallbackAsset | null = null;
    try {
      asset = await this.prisma.mediaAsset.findFirst({
        where: { id, isPublic: true }
      });
    } catch (error) {
      if (!this.isMissingSchemaObjectError(error)) {
        throw error;
      }
      asset = await this.getPublicFallbackAsset(id);
    }
    if (!asset) {
      throw new NotFoundException('Media asset not found');
    }
    if (!asset.storageKey) {
      throw new NotFoundException('Media asset file not found');
    }
    return { asset, stream: this.storage.createReadStream(asset.storageKey) };
  }

  private isMissingSchemaObjectError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2021' || error.code === 'P2022')
    );
  }

  private fallbackAssetUserSettingKey(id: string) {
    return `media_asset_fallback:${id}`;
  }

  private async listFallbackAssets(userId: string) {
    if (!('userSetting' in this.prisma) || !this.prisma.userSetting) {
      return [];
    }
    try {
      const rows = await this.prisma.userSetting.findMany({
        where: {
          userId,
          key: {
            startsWith: 'media_asset_fallback:'
          }
        },
        orderBy: { updatedAt: 'desc' }
      });
      return rows
        .map((row) => this.readFallbackAsset(row.payload))
        .filter((asset): asset is MediaFallbackAsset => Boolean(asset));
    } catch (error) {
      if (this.isMissingSchemaObjectError(error)) {
        return [];
      }
      throw error;
    }
  }

  private async getFallbackAsset(userId: string, id: string) {
    if (!('userSetting' in this.prisma) || !this.prisma.userSetting) {
      return null;
    }
    try {
      const row = await this.prisma.userSetting.findUnique({
        where: {
          userId_key: {
            userId,
            key: this.fallbackAssetUserSettingKey(id)
          }
        }
      });
      return row ? this.readFallbackAsset(row.payload) : null;
    } catch (error) {
      if (this.isMissingSchemaObjectError(error)) {
        return null;
      }
      throw error;
    }
  }

  private async getPublicFallbackAsset(id: string) {
    if (!('userSetting' in this.prisma) || !this.prisma.userSetting) {
      return null;
    }
    try {
      const row = await this.prisma.userSetting.findFirst({
        where: {
          key: this.fallbackAssetUserSettingKey(id)
        }
      });
      const asset = row ? this.readFallbackAsset(row.payload) : null;
      return asset?.isPublic ? asset : null;
    } catch (error) {
      if (this.isMissingSchemaObjectError(error)) {
        return null;
      }
      throw error;
    }
  }

  private async upsertFallbackAsset(asset: MediaFallbackAsset) {
    if (!('userSetting' in this.prisma) || !this.prisma.userSetting) {
      return;
    }
    try {
      await this.prisma.userSetting.upsert({
        where: {
          userId_key: {
            userId: asset.userId,
            key: this.fallbackAssetUserSettingKey(asset.id)
          }
        },
        update: {
          payload: asset as Prisma.InputJsonValue
        },
        create: {
          userId: asset.userId,
          key: this.fallbackAssetUserSettingKey(asset.id),
          payload: asset as Prisma.InputJsonValue
        }
      });
    } catch (error) {
      if (!this.isMissingSchemaObjectError(error)) {
        throw error;
      }
    }
  }

  private async deleteFallbackAsset(userId: string, id: string) {
    if (!('userSetting' in this.prisma) || !this.prisma.userSetting) {
      return;
    }
    try {
      await this.prisma.userSetting.delete({
        where: {
          userId_key: {
            userId,
            key: this.fallbackAssetUserSettingKey(id)
          }
        }
      });
    } catch (error) {
      if (!this.isMissingSchemaObjectError(error)) {
        throw error;
      }
    }
  }

  private readFallbackAsset(payload: Prisma.JsonValue | null | undefined): MediaFallbackAsset | null {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return null;
    }
    const row = payload as Record<string, unknown>;
    const id = typeof row.id === 'string' ? row.id : '';
    const userId = typeof row.userId === 'string' ? row.userId : '';
    const name = typeof row.name === 'string' ? row.name : '';
    if (!id || !userId || !name) {
      return null;
    }
    return {
      id,
      userId,
      name,
      kind: typeof row.kind === 'string' ? row.kind : null,
      mimeType: typeof row.mimeType === 'string' ? row.mimeType : null,
      sizeBytes: typeof row.sizeBytes === 'number' ? row.sizeBytes : null,
      extension: typeof row.extension === 'string' ? row.extension : null,
      checksum: typeof row.checksum === 'string' ? row.checksum : null,
      storageProvider: typeof row.storageProvider === 'string' ? row.storageProvider : null,
      storageKey: typeof row.storageKey === 'string' ? row.storageKey : null,
      url: typeof row.url === 'string' ? row.url : null,
      isPublic: Boolean(row.isPublic),
      metadata:
        row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : null,
      createdAt: typeof row.createdAt === 'string' ? row.createdAt : null,
      updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : null
    };
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

  private buildAssetUrls(id: string, isPublic: boolean) {
    return {
      url: isPublic ? `/api/media/public/${id}` : `/api/media/assets/${id}/content`,
      publicUrl: isPublic ? `/api/media/public/${id}` : null
    };
  }

  private async writeFileBuffer(storageKey: string, buffer: Buffer, mimeType: string) {
    const segments = storageKey.split('/').filter(Boolean);
    const fileName = segments.pop();
    if (!fileName) {
      throw new BadRequestException('Invalid storage key');
    }
    const namespace = segments.join('/');
    return this.storage.writeBuffer(namespace, fileName, buffer, mimeType);
  }

  private decodeDataUrl(value: string) {
    const raw = String(value || '').trim();
    const match = raw.match(/^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,([a-z0-9+/=\r\n]+)$/i);
    if (!match) {
      throw new BadRequestException('Upload file must be a base64 data URL');
    }
    return {
      mimeType: match[1] ? match[1].toLowerCase() : null,
      buffer: Buffer.from(match[2], 'base64')
    };
  }

  private inferExtension(name: string, mimeType?: string | null) {
    const fromName = String(name || '').match(/\.([a-z0-9]{1,12})$/i)?.[1];
    if (fromName) {
      return fromName.toLowerCase();
    }

    const type = String(mimeType || '').toLowerCase();
    if (type === 'image/jpeg') return 'jpg';
    if (type === 'image/png') return 'png';
    if (type === 'image/webp') return 'webp';
    if (type === 'application/pdf') return 'pdf';
    return undefined;
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
