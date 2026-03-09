import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, AutoCheckStatus, EvidenceBundleStatus } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { StorageService } from '../../platform/storage/storage.service.js';
import { JobsService } from '../jobs/jobs.service.js';

@Injectable()
export class RegulatoryAutomationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobsService: JobsService,
    private readonly configService: ConfigService,
    private readonly storage: StorageService
  ) {}

  async enqueueAutoReview(userId?: string, deskId?: string) {
    const dedupe = `regulatory:auto-review:${userId ?? 'all'}:${deskId ?? 'all'}`;
    return this.jobsService.enqueue({
      queue: 'regulatory',
      type: 'REGULATORY_AUTO_REVIEW',
      payload: { userId, deskId },
      dedupeKey: dedupe
    });
  }

  async enqueueEvidenceBundle(userId: string, deskId?: string, complianceItemIds?: string[]) {
    const bundle = await this.prisma.evidenceBundle.create({
      data: {
        userId,
        status: EvidenceBundleStatus.QUEUED,
        metadata: {
          deskId: deskId ?? null,
          complianceItemIds: complianceItemIds ?? []
        } as Prisma.InputJsonValue
      }
    });
    await this.jobsService.enqueue({
      queue: 'regulatory',
      type: 'REGULATORY_EVIDENCE_BUNDLE',
      payload: { bundleId: bundle.id, deskId, complianceItemIds },
      dedupeKey: `regulatory:evidence:${bundle.id}`
    });
    return bundle;
  }

  async evidenceBundle(userId: string, id: string, allowAdmin: boolean) {
    const bundle = await this.prisma.evidenceBundle.findUnique({ where: { id } });
    if (!bundle) {
      throw new NotFoundException('Evidence bundle not found');
    }
    if (!allowAdmin && bundle.userId !== userId) {
      throw new NotFoundException('Evidence bundle not found');
    }
    return bundle;
  }

  async generateEvidenceBundle(bundleId: string) {
    const bundle = await this.prisma.evidenceBundle.findUnique({ where: { id: bundleId } });
    if (!bundle) {
      throw new NotFoundException('Evidence bundle not found');
    }
    if (bundle.status === EvidenceBundleStatus.READY) {
      return bundle;
    }

    await this.prisma.evidenceBundle.update({
      where: { id: bundle.id },
      data: { status: EvidenceBundleStatus.GENERATING }
    });

    try {
      const metadata = (bundle.metadata ?? {}) as Record<string, any>;
      const complianceItemIds = Array.isArray(metadata.complianceItemIds) ? metadata.complianceItemIds : [];
      const items = await this.prisma.regulatoryComplianceItem.findMany({
        where: {
          userId: bundle.userId,
          ...(complianceItemIds.length ? { id: { in: complianceItemIds } } : {})
        }
      });

      const payload = {
        userId: bundle.userId,
        deskId: metadata.deskId ?? null,
        generatedAt: new Date().toISOString(),
        items: items.map((item) => ({
          id: item.id,
          itemType: item.itemType,
          title: item.title,
          status: item.status,
          metadata: item.metadata ?? {}
        }))
      };

      const fileBuffer = Buffer.from(JSON.stringify(payload, null, 2), 'utf-8');
      const ttlDays = Number(this.configService.get('regulatory.evidenceTtlDays') ?? 14);
      const namespace = String(this.configService.get('regulatory.storageNamespace') ?? 'evidence');
      const stored = await this.storage.writeBuffer(
        namespace,
        `evidence-${bundle.id}.json`,
        fileBuffer,
        'application/json',
        ttlDays
      );

      return this.prisma.evidenceBundle.update({
        where: { id: bundle.id },
        data: {
          status: EvidenceBundleStatus.READY,
          storageKey: stored.storageKey,
          fileUrl: `/api/regulatory/evidence/${bundle.id}/download`,
          mimeType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
          expiresAt: stored.expiresAt ?? undefined
        }
      });
    } catch (error: any) {
      await this.prisma.evidenceBundle.update({
        where: { id: bundle.id },
        data: {
          status: EvidenceBundleStatus.FAILED,
          metadata: { ...(bundle.metadata as any), error: String(error?.message ?? error) } as Prisma.InputJsonValue
        }
      });
      throw error;
    }
  }

  async runAutoReview(userId?: string, deskId?: string) {
    const now = new Date();
    const items = await this.prisma.regulatoryComplianceItem.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(deskId ? { user: { regulatoryDesks: { some: { id: deskId } } } } : {})
      }
    });

    for (const item of items) {
      const metadata = (item.metadata ?? {}) as Record<string, unknown>;
      const expiresAt = metadata.expiresAt ? new Date(String(metadata.expiresAt)) : null;
      let status: AutoCheckStatus = AutoCheckStatus.PASSED;
      let nextComplianceStatus: string | null = null;
      let reason = 'ok';
      if (expiresAt && expiresAt <= now) {
        status = AutoCheckStatus.FAILED;
        nextComplianceStatus = 'rejected';
        reason = 'expired';
      }
      const required = Boolean(metadata.required);
      const hasFile = Boolean(metadata.fileUrl || metadata.fileName);
      if (required && !hasFile) {
        status = AutoCheckStatus.NEEDS_REVIEW;
        reason = 'missing_required_file';
      }
      await this.prisma.regulatoryAutoCheck.create({
        data: {
          userId: item.userId,
          complianceItemId: item.id,
          ruleKey: 'basic-compliance',
          status,
          result: { reason, expiresAt: expiresAt?.toISOString() ?? null } as Prisma.InputJsonValue
        }
      });
      if (nextComplianceStatus) {
        await this.prisma.regulatoryComplianceItem.update({
          where: { id: item.id },
          data: { status: nextComplianceStatus }
    });
  }

  openEvidenceStream(storageKey: string) {
    return this.storage.createReadStream(storageKey);
  }
}
    return { processed: items.length };
  }
}
