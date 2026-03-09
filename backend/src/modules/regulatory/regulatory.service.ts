import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { CreateComplianceItemDto } from './dto/create-compliance-item.dto.js';
import { CreateRegulatoryDeskDto } from './dto/create-regulatory-desk.dto.js';
import { CreateRegulatoryDeskItemDto } from './dto/create-regulatory-desk-item.dto.js';
import { UpdateComplianceItemDto } from './dto/update-compliance-item.dto.js';
import { UpdateRegulatoryDeskDto } from './dto/update-regulatory-desk.dto.js';
import { UpdateRegulatoryDeskItemDto } from './dto/update-regulatory-desk-item.dto.js';

@Injectable()
export class RegulatoryService {
  constructor(private readonly prisma: PrismaService) {}

  async compliance(userId: string) {
    const items = await this.prisma.regulatoryComplianceItem.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
    return {
      docs: items.filter((entry) => entry.itemType === 'DOC').map((entry) => this.serializeCompliance(entry)),
      queue: items.filter((entry) => entry.itemType === 'QUEUE').map((entry) => this.serializeCompliance(entry)),
      autoRules: items.filter((entry) => entry.itemType === 'RULE').map((entry) => this.serializeCompliance(entry))
    };
  }

  async desks(userId: string) {
    const desks = await this.prisma.regulatoryDesk.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { updatedAt: 'desc' }
    });
    return {
      desks: desks.map((desk) => ({
        ...this.serializeDesk(desk),
        itemCount: desk.items.length
      }))
    };
  }

  async desk(userId: string, slug: string) {
    const desk = await this.prisma.regulatoryDesk.findFirst({
      where: { userId, slug },
      include: { items: true }
    });
    if (!desk) {
      return { slug, items: [] };
    }
    return {
      ...this.serializeDesk(desk),
      items: desk.items.map((item) => this.serializeDeskItem(item))
    };
  }

  async createDesk(userId: string, payload: CreateRegulatoryDeskDto) {
    const slug = this.normalizeSlug(payload.slug ?? payload.title);
    return this.prisma.regulatoryDesk.create({
      data: {
        userId,
        slug,
        title: payload.title ?? null,
        status: payload.status ?? 'pending',
        metadata: payload.metadata ?? undefined
      }
    });
  }

  async updateDesk(userId: string, id: string, payload: UpdateRegulatoryDeskDto) {
    const desk = await this.prisma.regulatoryDesk.findFirst({ where: { id, userId } });
    if (!desk) {
      throw new NotFoundException('Desk not found');
    }
    if (payload.status) {
      this.assertDeskTransition(desk.status, payload.status);
    }
    return this.prisma.regulatoryDesk.update({
      where: { id: desk.id },
      data: {
        title: payload.title ?? undefined,
        status: payload.status ?? undefined,
        metadata: payload.metadata ?? undefined
      }
    });
  }

  async createDeskItem(userId: string, deskId: string, payload: CreateRegulatoryDeskItemDto) {
    const desk = await this.prisma.regulatoryDesk.findFirst({ where: { id: deskId, userId } });
    if (!desk) {
      throw new NotFoundException('Desk not found');
    }
    return this.prisma.regulatoryDeskItem.create({
      data: {
        deskId: desk.id,
        title: payload.title ?? null,
        status: payload.status ?? 'open',
        severity: payload.severity ?? null,
        metadata: payload.metadata ?? undefined
      }
    });
  }

  async updateDeskItem(userId: string, deskId: string, itemId: string, payload: UpdateRegulatoryDeskItemDto) {
    const item = await this.prisma.regulatoryDeskItem.findFirst({
      where: { id: itemId, deskId, desk: { userId } }
    });
    if (!item) {
      throw new NotFoundException('Desk item not found');
    }
    if (payload.status) {
      this.assertDeskItemTransition(item.status, payload.status);
    }
    return this.prisma.regulatoryDeskItem.update({
      where: { id: item.id },
      data: {
        title: payload.title ?? undefined,
        status: payload.status ?? undefined,
        severity: payload.severity ?? undefined,
        metadata: payload.metadata ?? undefined
      }
    });
  }

  async createComplianceItem(userId: string, payload: CreateComplianceItemDto) {
    return this.prisma.regulatoryComplianceItem.create({
      data: {
        userId,
        itemType: payload.itemType,
        title: payload.title ?? null,
        status: payload.status ?? 'pending',
        metadata: payload.metadata ?? undefined
      }
    });
  }

  async updateComplianceItem(userId: string, id: string, payload: UpdateComplianceItemDto) {
    const item = await this.prisma.regulatoryComplianceItem.findFirst({ where: { id, userId } });
    if (!item) {
      throw new NotFoundException('Compliance item not found');
    }
    if (payload.status) {
      this.assertComplianceTransition(item.status, payload.status);
    }
    return this.prisma.regulatoryComplianceItem.update({
      where: { id: item.id },
      data: {
        title: payload.title ?? undefined,
        status: payload.status ?? undefined,
        metadata: payload.metadata ?? undefined
      }
    });
  }

  private serializeDesk(desk: {
    id: string;
    slug: string;
    title: string | null;
    status: string;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: desk.id,
      slug: desk.slug,
      title: desk.title,
      status: desk.status,
      metadata: desk.metadata ?? {},
      createdAt: desk.createdAt.toISOString(),
      updatedAt: desk.updatedAt.toISOString()
    };
  }

  private serializeDeskItem(item: {
    id: string;
    deskId: string;
    title: string | null;
    status: string;
    severity: string | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: item.id,
      deskId: item.deskId,
      title: item.title,
      status: item.status,
      severity: item.severity,
      metadata: item.metadata ?? {},
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    };
  }

  private serializeCompliance(item: {
    id: string;
    itemType: string;
    title: string | null;
    status: string;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: item.id,
      type: item.itemType,
      title: item.title,
      status: item.status,
      metadata: item.metadata ?? {},
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    };
  }

  private normalizeSlug(value?: string | null) {
    return (
      String(value || 'desk')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'desk'
    );
  }

  private assertDeskTransition(current: string, next: string) {
    const transitions: Record<string, string[]> = {
      pending: ['active', 'closed', 'archived'],
      active: ['closed', 'archived'],
      closed: ['archived'],
      archived: []
    };
    const currentStatus = String(current ?? '').toLowerCase();
    const nextStatus = String(next ?? '').toLowerCase();
    if (currentStatus === nextStatus) {
      return;
    }
    const allowed = transitions[currentStatus] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException('Invalid desk status transition');
    }
  }

  private assertDeskItemTransition(current: string, next: string) {
    const transitions: Record<string, string[]> = {
      open: ['review', 'resolved', 'dismissed'],
      review: ['resolved', 'dismissed'],
      resolved: [],
      dismissed: []
    };
    const currentStatus = String(current ?? '').toLowerCase();
    const nextStatus = String(next ?? '').toLowerCase();
    if (currentStatus === nextStatus) {
      return;
    }
    const allowed = transitions[currentStatus] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException('Invalid desk item status transition');
    }
  }

  private assertComplianceTransition(current: string, next: string) {
    const transitions: Record<string, string[]> = {
      pending: ['active', 'resolved', 'rejected'],
      active: ['resolved', 'rejected'],
      resolved: [],
      rejected: []
    };
    const currentStatus = String(current ?? '').toLowerCase();
    const nextStatus = String(next ?? '').toLowerCase();
    if (currentStatus === nextStatus) {
      return;
    }
    const allowed = transitions[currentStatus] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException('Invalid compliance status transition');
    }
  }
}
