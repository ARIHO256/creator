import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

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
}
