import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

@Injectable()
export class RegulatoryService {
  constructor(private readonly prisma: PrismaService) {}

  async compliance(userId: string) {
    return (
      (await this.getPayload(userId, 'compliance', 'main')) ?? { docs: [], queue: [], autoRules: [] }
    );
  }

  async desks(userId: string) {
    return (await this.getPayload(userId, 'desks', 'main')) ?? { desks: [] };
  }

  async desk(userId: string, slug: string) {
    return (await this.getPayload(userId, 'desk', slug)) ?? { slug, items: [] };
  }

  private async getPayload(userId: string, recordType: string, recordKey: string) {
    const record = await this.prisma.regulatoryRecord.findUnique({
      where: { userId_recordType_recordKey: { userId, recordType, recordKey } }
    });
    return record?.payload as Record<string, unknown> | null;
  }
}
