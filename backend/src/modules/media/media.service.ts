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
    const record = await this.prisma.workspaceSetting.findUnique({
      where: {
        userId_key: {
          userId,
          key: 'seller_asset_library_context'
        }
      }
    });

    return (record?.payload as Record<string, unknown>) ?? {
      creators: [],
      suppliers: [],
      campaigns: [],
      deliverables: []
    };
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
}
