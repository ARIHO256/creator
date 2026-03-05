import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { AppRecordsService } from '../../platform/app-records.service.js';

@Injectable()
export class DiscoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly records: AppRecordsService
  ) {}

  sellers() {
    return this.prisma.seller.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async followSeller(userId: string, sellerId: string, follow: boolean) {
    const seller = await this.prisma.seller.findUnique({ where: { id: sellerId } });
    if (!seller) throw new NotFoundException('Seller not found');

    if (!follow) {
      return this.records.remove('discovery', 'followed_seller', sellerId, userId).catch(() => ({ deleted: true }));
    }

    return this.records.upsert('discovery', 'followed_seller', sellerId, { sellerId, followedAt: new Date().toISOString() }, userId);
  }

  async mySellers(userId: string) {
    const follows = await this.records.list('discovery', 'followed_seller', userId);
    const ids = follows.map((f) => String((f.payload as any).sellerId));
    return this.prisma.seller.findMany({ where: { id: { in: ids } } });
  }

  opportunities() {
    return this.prisma.opportunity.findMany({ include: { seller: true }, orderBy: { createdAt: 'desc' } });
  }

  async opportunity(id: string) {
    const opp = await this.prisma.opportunity.findUnique({ where: { id }, include: { seller: true } });
    if (!opp) throw new NotFoundException('Opportunity not found');
    return opp;
  }

  async saveOpportunity(userId: string, opportunityId: string, save: boolean) {
    if (!save) {
      return this.records.remove('discovery', 'saved_opportunity', opportunityId, userId).catch(() => ({ deleted: true }));
    }

    return this.records.upsert('discovery', 'saved_opportunity', opportunityId, { opportunityId, savedAt: new Date().toISOString() }, userId);
  }

  campaignBoard(userId: string) {
    return this.records.list('discovery', 'campaign_board', userId).then((rows) => rows.map((row) => row.payload));
  }

  async dealzMarketplace(userId: string) {
    const rows = await this.records.list('discovery', 'dealz_marketplace', userId);
    return rows.map((row) => row.payload);
  }

  async invites(userId: string) {
    const invites = await this.records.list('discovery', 'invite', userId);
    return invites.map((invite) => ({ id: invite.entityId, ...(invite.payload as any) }));
  }

  async respondInvite(userId: string, inviteId: string, status: string) {
    const invite = await this.records.getByEntityId('discovery', 'invite', inviteId, userId);
    return this.records.update(
      'discovery',
      'invite',
      inviteId,
      { ...(invite.payload as any), status, lastActivity: `Responded: ${status}` },
      userId
    );
  }
}
