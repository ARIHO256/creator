import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { CreateTrustContentDto } from './dto/create-trust-content.dto.js';
import { CreateTrustIncidentDto } from './dto/create-trust-incident.dto.js';
import { UpdateTrustContentDto } from './dto/update-trust-content.dto.js';
import { UpdateTrustIncidentDto } from './dto/update-trust-incident.dto.js';

@Injectable()
export class TrustService {
  constructor(private readonly prisma: PrismaService) {}

  async content() {
    const items = await this.prisma.trustContent.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' }
    });
    return { content: items };
  }

  async createContent(body: CreateTrustContentDto) {
    return this.prisma.trustContent.create({
      data: {
        title: body.title.trim(),
        body: body.body ?? null,
        category: body.category ?? null,
        status: body.status ?? 'ACTIVE',
        metadata: (body.metadata ?? {}) as Prisma.InputJsonValue
      }
    });
  }

  async updateContent(id: string, body: UpdateTrustContentDto) {
    const existing = await this.prisma.trustContent.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Trust content not found');
    }
    return this.prisma.trustContent.update({
      where: { id },
      data: {
        title: body.title ? body.title.trim() : undefined,
        body: body.body ?? undefined,
        category: body.category ?? undefined,
        status: body.status ?? undefined,
        metadata: body.metadata ? (body.metadata as Prisma.InputJsonValue) : undefined
      }
    });
  }

  async incidents() {
    const incidents = await this.prisma.trustIncident.findMany({
      orderBy: { startedAt: 'desc' }
    });
    return { incidents };
  }

  async createIncident(body: CreateTrustIncidentDto) {
    return this.prisma.trustIncident.create({
      data: {
        title: body.title.trim(),
        summary: body.summary ?? null,
        impact: body.impact ?? null,
        status: body.status ?? 'INVESTIGATING',
        severity: body.severity ?? 'minor',
        startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
        resolvedAt: body.resolvedAt ? new Date(body.resolvedAt) : null,
        updates: (body.updates ?? {}) as Prisma.InputJsonValue
      }
    });
  }

  async updateIncident(id: string, body: UpdateTrustIncidentDto) {
    const existing = await this.prisma.trustIncident.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Incident not found');
    }
    return this.prisma.trustIncident.update({
      where: { id },
      data: {
        title: body.title ? body.title.trim() : undefined,
        summary: body.summary ?? undefined,
        impact: body.impact ?? undefined,
        status: body.status ?? undefined,
        severity: body.severity ?? undefined,
        startedAt: body.startedAt ? new Date(body.startedAt) : undefined,
        resolvedAt: body.resolvedAt ? new Date(body.resolvedAt) : undefined,
        updates: body.updates ? (body.updates as Prisma.InputJsonValue) : undefined
      }
    });
  }
}
