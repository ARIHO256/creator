import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { AppRecordsService } from '../../platform/app-records.service.js';

@Injectable()
export class DiscoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly records: AppRecordsService
  ) {}

  async sellers() {
    const sellers = await this.prisma.seller.findMany({
      orderBy: [{ isVerified: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }]
    });

    return sellers.map((seller) => ({
      ...seller,
      categories: this.parseArray(seller.categories),
      languages: this.parseArray(seller.languages)
    }));
  }

  async followSeller(userId: string, sellerId: string, follow: boolean) {
    const seller = await this.prisma.seller.findUnique({ where: { id: sellerId } });
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    if (!follow) {
      return this.records.remove('discovery', 'followed_seller', sellerId, userId).catch(() => ({ deleted: true }));
    }

    return this.records.upsert(
      'discovery',
      'followed_seller',
      sellerId,
      { sellerId, followedAt: new Date().toISOString() },
      userId
    );
  }

  async mySellers(userId: string) {
    const follows = await this.records.list('discovery', 'followed_seller', userId);
    const ids = follows.map((entry) => String((entry.payload as { sellerId?: string }).sellerId)).filter(Boolean);
    const sellers = await this.prisma.seller.findMany({ where: { id: { in: ids } } });
    return sellers.map((seller) => ({
      ...seller,
      categories: this.parseArray(seller.categories),
      languages: this.parseArray(seller.languages)
    }));
  }

  opportunities() {
    return this.prisma.opportunity.findMany({
      include: { seller: true },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }]
    });
  }

  async opportunity(id: string) {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id },
      include: { seller: true }
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    return opportunity;
  }

  async saveOpportunity(userId: string, opportunityId: string, save: boolean) {
    const opportunity = await this.prisma.opportunity.findUnique({ where: { id: opportunityId } });
    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    if (!save) {
      return this.records.remove('discovery', 'saved_opportunity', opportunityId, userId).catch(() => ({ deleted: true }));
    }

    return this.records.upsert(
      'discovery',
      'saved_opportunity',
      opportunityId,
      { opportunityId, savedAt: new Date().toISOString() },
      userId
    );
  }

  async campaignBoard(userId: string) {
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        OR: [{ creatorId: userId }, { createdByUserId: userId }, { seller: { userId } }]
      },
      include: {
        seller: true,
        creator: {
          include: {
            creatorProfile: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    if (campaigns.length > 0) {
      return campaigns.map((campaign) => ({
        id: campaign.id,
        title: campaign.title,
        status: campaign.status,
        seller: campaign.seller.displayName,
        creator: campaign.creator?.creatorProfile?.name ?? null,
        budget: campaign.budget,
        currency: campaign.currency,
        startAt: campaign.startAt,
        endAt: campaign.endAt
      }));
    }

    return this.records.list('discovery', 'campaign_board', userId).then((rows) => rows.map((row) => row.payload));
  }

  async dealzMarketplace(userId: string) {
    const [listings, opportunities] = await Promise.all([
      this.prisma.marketplaceListing.findMany({
        where: { status: 'ACTIVE' },
        include: { seller: true },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      this.prisma.opportunity.findMany({
        where: { status: { in: ['OPEN', 'INVITE_ONLY'] } },
        include: { seller: true },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
    ]);

    if (listings.length > 0 || opportunities.length > 0) {
      return {
        listings,
        opportunities
      };
    }

    const rows = await this.records.list('discovery', 'dealz_marketplace', userId);
    return rows.map((row) => row.payload);
  }

  async invites(userId: string) {
    const invites = await this.prisma.collaborationInvite.findMany({
      where: { recipientUserId: userId },
      include: {
        seller: true,
        sender: {
          include: {
            creatorProfile: true,
            sellerProfile: true
          }
        },
        opportunity: true,
        campaign: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    if (invites.length > 0) {
      return invites.map((invite) => ({
        id: invite.id,
        title: invite.title,
        message: invite.message,
        status: invite.status,
        seller: invite.seller?.displayName ?? null,
        sender:
          invite.sender.creatorProfile?.name ??
          invite.sender.sellerProfile?.displayName ??
          invite.sender.email,
        opportunityId: invite.opportunityId,
        campaignId: invite.campaignId,
        metadata: invite.metadata,
        createdAt: invite.createdAt,
        updatedAt: invite.updatedAt
      }));
    }

    const legacyInvites = await this.records.list('discovery', 'invite', userId);
    return legacyInvites.map((invite) => ({ id: invite.entityId, ...(invite.payload as object) }));
  }

  async respondInvite(userId: string, inviteId: string, status: string) {
    const invite = await this.prisma.collaborationInvite.findFirst({
      where: { id: inviteId, recipientUserId: userId }
    });

    if (invite) {
      return this.prisma.collaborationInvite.update({
        where: { id: inviteId },
        data: { status: this.normalizeInviteStatus(status) }
      });
    }

    const legacyInvite = await this.records.getByEntityId('discovery', 'invite', inviteId, userId);
    return this.records.update(
      'discovery',
      'invite',
      inviteId,
      { ...(legacyInvite.payload as object), status, lastActivity: `Responded: ${status}` },
      userId
    );
  }

  private parseArray(value: string | null) {
    if (!value) {
      return [];
    }

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private normalizeInviteStatus(status: string) {
    const normalized = String(status || '').toUpperCase().replace(/[\s-]+/g, '_');
    if (['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED'].includes(normalized)) {
      return normalized as 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';
    }
    return 'PENDING';
  }
}
