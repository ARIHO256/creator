import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, ExportFileStatus, ExportJobStatus } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { StorageService } from '../../platform/storage/storage.service.js';
import { JobsService } from '../jobs/jobs.service.js';

type ExportDataRow = Record<string, string | number | null | undefined>;

@Injectable()
export class ExportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly jobsService: JobsService,
    private readonly configService: ConfigService
  ) {}

  async createJob(sellerId: string, payload: { type: string; format?: string; filters?: Record<string, unknown>; metadata?: Record<string, unknown> }) {
    const format = (payload.format ?? 'CSV').toUpperCase();
    const job = await this.prisma.sellerExportJob.create({
      data: {
        sellerId,
        type: payload.type,
        format,
        status: ExportJobStatus.QUEUED,
        filters: (payload.filters ?? {}) as Prisma.InputJsonValue,
        metadata: (payload.metadata ?? {}) as Prisma.InputJsonValue
      }
    });
    await this.jobsService.enqueue({
      queue: 'exports',
      type: 'EXPORTS_GENERATE',
      payload: { jobId: job.id },
      dedupeKey: `exports:job:${job.id}`
    });
    return job;
  }

  async jobForSeller(sellerId: string, jobId: string) {
    const job = await this.prisma.sellerExportJob.findFirst({
      where: { id: jobId, sellerId },
      include: { exportFiles: true }
    });
    if (!job) {
      throw new NotFoundException('Export job not found');
    }
    return job;
  }

  async jobForStaff(jobId: string) {
    const job = await this.prisma.sellerExportJob.findUnique({
      where: { id: jobId },
      include: { exportFiles: true }
    });
    if (!job) {
      throw new NotFoundException('Export job not found');
    }
    return job;
  }

  async downloadFile(sellerId: string, jobId: string, fileId?: string) {
    const job = await this.jobForSeller(sellerId, jobId);
    const file = fileId
      ? job.exportFiles.find((entry) => entry.id === fileId)
      : job.exportFiles[0];
    if (!file) {
      throw new NotFoundException('Export file not found');
    }
    return file;
  }

  async openFileForSeller(sellerId: string, jobId: string, fileId?: string) {
    const file = await this.downloadFile(sellerId, jobId, fileId);
    return { file, stream: this.storage.createReadStream(file.storageKey) };
  }

  async generate(jobId: string) {
    const job = await this.prisma.sellerExportJob.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Export job not found');
    }
    if (![ExportJobStatus.QUEUED, ExportJobStatus.RUNNING].includes(job.status)) {
      return job;
    }

    await this.prisma.sellerExportJob.update({
      where: { id: job.id },
      data: { status: ExportJobStatus.RUNNING }
    });

    const format = String(job.format ?? 'CSV').toUpperCase();
    if (format !== 'CSV' && format !== 'PDF') {
      await this.failJob(job, `Unsupported export format: ${format}`);
      return job;
    }

    let rows: ExportDataRow[] = [];
    try {
      rows = await this.resolveRows(job);
    } catch (error: any) {
      await this.failJob(job, error?.message ?? 'Export generation failed');
      return job;
    }
    if (!rows.length) {
      await this.failJob(job, 'No exportable data found');
      return job;
    }

    const ttlDays = Number(this.configService.get('exports.fileTtlDays') ?? 7);
    const storageNamespace = String(this.configService.get('exports.storageNamespace') ?? 'exports');
    const fileName = `${job.type}-${job.id}.${format === 'PDF' ? 'pdf' : 'csv'}`;
    const buffer = format === 'PDF' ? this.renderPdf(rows) : this.renderCsv(rows);
    const stored = await this.storage.writeBuffer(storageNamespace, fileName, buffer, format === 'PDF' ? 'application/pdf' : 'text/csv', ttlDays);

    const file = await this.prisma.exportFile.create({
      data: {
        jobId: job.id,
        status: ExportFileStatus.READY,
        storageKey: stored.storageKey,
        fileUrl: `/api/seller/exports/${job.id}/download?fileId=`,
        format,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        expiresAt: stored.expiresAt ?? undefined
      }
    });

    await this.prisma.exportFile.update({
      where: { id: file.id },
      data: { fileUrl: `/api/seller/exports/${job.id}/download?fileId=${file.id}` }
    });

    await this.prisma.sellerExportJob.update({
      where: { id: job.id },
      data: {
        status: ExportJobStatus.COMPLETED,
        completedAt: new Date(),
        fileUrl: file.fileUrl
      }
    });

    return job;
  }

  private async resolveRows(job: { sellerId: string; type: string; filters: Prisma.JsonValue | null }) {
    const filters = (job.filters ?? {}) as Record<string, any>;
    const from = filters.from ? new Date(String(filters.from)) : undefined;
    const to = filters.to ? new Date(String(filters.to)) : undefined;
    const dateRange = from || to ? { gte: from ?? undefined, lte: to ?? undefined } : undefined;
    const take = Math.min(Number(filters.take ?? 5000), 10_000);

    switch (String(job.type).toLowerCase()) {
      case 'orders':
        return this.prisma.order.findMany({
          where: {
            sellerId: job.sellerId,
            ...(filters.status ? { status: filters.status } : {}),
            ...(filters.channel ? { channel: filters.channel } : {}),
            ...(dateRange ? { createdAt: dateRange } : {})
          },
          take,
          orderBy: { createdAt: 'desc' }
        }).then((rows) => rows.map((row) => ({
          id: row.id,
          status: row.status,
          channel: row.channel,
          total: row.total,
          currency: row.currency,
          itemCount: row.itemCount,
          createdAt: row.createdAt.toISOString()
        })));
      case 'listings':
        return this.prisma.marketplaceListing.findMany({
          where: {
            sellerId: job.sellerId,
            ...(filters.status ? { status: filters.status } : {}),
            ...(filters.marketplace ? { marketplace: filters.marketplace } : {}),
            ...(dateRange ? { createdAt: dateRange } : {})
          },
          take,
          orderBy: { createdAt: 'desc' }
        }).then((rows) => rows.map((row) => ({
          id: row.id,
          title: row.title,
          sku: row.sku,
          status: row.status,
          price: row.price,
          currency: row.currency,
          inventoryCount: row.inventoryCount,
          createdAt: row.createdAt.toISOString()
        })));
      case 'returns':
        return this.prisma.sellerReturn.findMany({
          where: {
            sellerId: job.sellerId,
            ...(filters.status ? { status: filters.status } : {}),
            ...(dateRange ? { requestedAt: dateRange } : {})
          },
          take,
          orderBy: { requestedAt: 'desc' }
        }).then((rows) => rows.map((row) => ({
          id: row.id,
          orderId: row.orderId,
          status: row.status,
          reason: row.reason,
          requestedAt: row.requestedAt?.toISOString()
        })));
      case 'disputes':
        return this.prisma.sellerDispute.findMany({
          where: {
            sellerId: job.sellerId,
            ...(filters.status ? { status: filters.status } : {}),
            ...(dateRange ? { openedAt: dateRange } : {})
          },
          take,
          orderBy: { openedAt: 'desc' }
        }).then((rows) => rows.map((row) => ({
          id: row.id,
          orderId: row.orderId,
          status: row.status,
          reason: row.reason,
          openedAt: row.openedAt?.toISOString()
        })));
      case 'documents':
        return this.prisma.sellerDocument.findMany({
          where: {
            sellerId: job.sellerId,
            ...(filters.type ? { type: filters.type } : {}),
            ...(dateRange ? { uploadedAt: dateRange } : {})
          },
          take,
          orderBy: { uploadedAt: 'desc' }
        }).then((rows) => rows.map((row) => ({
          id: row.id,
          type: row.type,
          channel: row.channel,
          fileName: row.fileName,
          status: row.status,
          uploadedAt: row.uploadedAt?.toISOString()
        })));
      case 'inventory':
        return this.prisma.listingInventorySlot.findMany({
          where: { listing: { sellerId: job.sellerId } },
          take,
          include: { listing: true, warehouse: true },
          orderBy: { updatedAt: 'desc' }
        }).then((rows) => rows.map((row) => ({
          listingId: row.listingId,
          sku: row.listing?.sku ?? null,
          warehouse: row.warehouse?.name ?? null,
          onHand: row.onHand,
          reserved: row.reserved,
          safetyStock: row.safetyStock,
          updatedAt: row.updatedAt?.toISOString()
        })));
      default:
        throw new BadRequestException(`Unsupported export type: ${job.type}`);
    }
  }

  private renderCsv(rows: ExportDataRow[]) {
    const headers = Object.keys(rows[0] ?? {});
    const escape = (value: unknown) => {
      if (value === null || value === undefined) return '';
      const text = String(value);
      if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };
    const lines = [
      headers.join(',')
    ];
    for (const row of rows) {
      lines.push(headers.map((key) => escape(row[key])).join(','));
    }
    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  private renderPdf(rows: ExportDataRow[]) {
    const headers = Object.keys(rows[0] ?? {});
    const lines = [
      headers.join(' | '),
      ...rows.map((row) => headers.map((key) => `${row[key] ?? ''}`).join(' | '))
    ];
    return buildSimplePdf(lines);
  }

  private async failJob(job: { id: string }, reason: string) {
    await this.prisma.sellerExportJob.update({
      where: { id: job.id },
      data: {
        status: ExportJobStatus.FAILED,
        metadata: { reason } as Prisma.InputJsonValue,
        completedAt: new Date()
      }
    });
  }
}

function buildSimplePdf(lines: string[]) {
  const sanitize = (value: string) =>
    value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const content = ['BT', '/F1 10 Tf', '50 780 Td']
    .concat(lines.map((line) => `(${sanitize(line)}) Tj T*`))
    .join('\n')
    .concat('\nET');

  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
    `4 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj'
  ];

  let buffer = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(buffer.length);
    buffer += `${obj}\n`;
  }
  const xrefStart = buffer.length;
  buffer += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets.slice(1)) {
    buffer += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  buffer += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(buffer, 'utf-8');
}
