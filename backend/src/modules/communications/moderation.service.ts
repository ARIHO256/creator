import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, ContentScanVerdict, ModerationFlagStatus, ModerationSeverity } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { ModerationFlagDto } from './dto/moderation-flag.dto.js';
import { ModerationActionDto } from './dto/moderation-action.dto.js';
import { ModerationFlagsQueryDto } from './dto/moderation-flags-query.dto.js';
import { normalizeListQuery } from '../../common/dto/list-query.dto.js';

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly configService: ConfigService
  ) {}

  async createFlag(userId: string, body: ModerationFlagDto) {
    const flag = await this.prisma.moderationFlag.create({
      data: {
        targetType: body.targetType,
        targetId: body.targetId,
        status: ModerationFlagStatus.OPEN,
        severity: (body.severity ?? 'MEDIUM') as ModerationSeverity,
        reason: body.reason ?? null,
        metadata: (body.metadata ?? {}) as Prisma.InputJsonValue
      }
    });
    await this.audit.log({
      userId,
      action: 'moderation.flag_created',
      entityType: 'moderation_flag',
      entityId: flag.id,
      route: '/api/support/moderation/flags',
      method: 'POST',
      statusCode: 201
    });
    return flag;
  }

  async updateFlag(userId: string, id: string, body: ModerationActionDto) {
    const existing = await this.prisma.moderationFlag.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Moderation flag not found');
    }
    const updated = await this.prisma.moderationFlag.update({
      where: { id },
      data: {
        status: body.status ? (body.status as ModerationFlagStatus) : existing.status,
        resolvedByUserId: body.status === 'RESOLVED' ? userId : existing.resolvedByUserId,
        resolvedAt: body.status === 'RESOLVED' ? new Date() : existing.resolvedAt,
        metadata: body.note
          ? ({ ...(existing.metadata as Record<string, unknown>), note: body.note } as Prisma.InputJsonValue)
          : undefined
      }
    });
    await this.audit.log({
      userId,
      action: 'moderation.flag_updated',
      entityType: 'moderation_flag',
      entityId: updated.id,
      route: `/api/support/moderation/flags/${id}`,
      method: 'PATCH',
      statusCode: 200
    });
    return updated;
  }

  async flags(query?: ModerationFlagsQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    const flags = await this.prisma.moderationFlag.findMany({
      where: {
        ...(query?.targetType ? { targetType: query.targetType } : {}),
        ...(query?.status ? { status: query.status as ModerationFlagStatus } : {}),
        ...(query?.severity ? { severity: query.severity as ModerationSeverity } : {})
      },
      skip,
      take,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }]
    });
    return { flags };
  }

  async flag(id: string) {
    const flag = await this.prisma.moderationFlag.findUnique({ where: { id } });
    if (!flag) {
      throw new NotFoundException('Moderation flag not found');
    }
    return flag;
  }

  async scanText(targetType: string, targetId: string, text: string) {
    const banned = String(this.configService.get('moderation.bannedPhrases') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const hits = banned.filter((phrase) => text.toLowerCase().includes(phrase.toLowerCase()));
    const verdict = hits.length ? ContentScanVerdict.FLAGGED : ContentScanVerdict.CLEAN;
    const scan = await this.prisma.contentScanResult.create({
      data: {
        targetType,
        targetId,
        scanner: 'keyword',
        verdict,
        score: hits.length ? Math.min(1, hits.length / Math.max(1, banned.length)) : 0,
        metadata: { hits } as Prisma.InputJsonValue
      }
    });
    if (verdict !== ContentScanVerdict.CLEAN) {
      await this.prisma.moderationFlag.create({
        data: {
          targetType,
          targetId,
          status: ModerationFlagStatus.OPEN,
          severity: ModerationSeverity.MEDIUM,
          reason: `Matched banned phrases: ${hits.join(', ')}`.slice(0, 180),
          metadata: { scanId: scan.id, hits } as Prisma.InputJsonValue
        }
      });
    }
    return scan;
  }

  async scanAttachment(targetType: string, targetId: string, fileName?: string | null, mimeType?: string | null, sizeBytes?: number | null) {
    const blocked = String(this.configService.get('moderation.blockedExtensions') ?? '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    const maxSizeMb = Number(this.configService.get('moderation.maxFileSizeMb') ?? 25);
    const ext = fileName?.includes('.') ? `.${fileName.split('.').pop()}`.toLowerCase() : '';
    let verdict = ContentScanVerdict.CLEAN;
    const reasons: string[] = [];
    if (ext && blocked.includes(ext)) {
      verdict = ContentScanVerdict.FLAGGED;
      reasons.push(`blocked_extension:${ext}`);
    }
    if (sizeBytes && sizeBytes > maxSizeMb * 1024 * 1024) {
      verdict = ContentScanVerdict.FLAGGED;
      reasons.push('file_too_large');
    }
    const scan = await this.prisma.contentScanResult.create({
      data: {
        targetType,
        targetId,
        scanner: 'attachment',
        verdict,
        score: verdict === ContentScanVerdict.CLEAN ? 0 : 1,
        metadata: { fileName, mimeType, sizeBytes, reasons } as Prisma.InputJsonValue
      }
    });
    if (verdict !== ContentScanVerdict.CLEAN) {
      await this.prisma.moderationFlag.create({
        data: {
          targetType,
          targetId,
          status: ModerationFlagStatus.OPEN,
          severity: ModerationSeverity.HIGH,
          reason: reasons.join(', ').slice(0, 180),
          metadata: { scanId: scan.id, reasons } as Prisma.InputJsonValue
        }
      });
    }
    return scan;
  }
}
