import { Injectable, NotFoundException } from '@nestjs/common';
import { serializeListingPublic } from '../../common/serializers/listing.serializer.js';
import { serializePublicSeller } from '../../common/serializers/seller.serializer.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { ListQueryDto, normalizeListQuery } from '../../common/dto/list-query.dto.js';

@Injectable()
export class DiscoveryService {
  constructor(private readonly prisma: PrismaService) {}

  async sellers(query?: ListQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    const sellers = await this.prisma.seller.findMany({
      skip,
      take,
      orderBy: [{ isVerified: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }]
    });

    return sellers.map((seller) => serializePublicSeller(seller));
  }

  async followSeller(userId: string, sellerId: string, follow: boolean) {
    const seller = await this.prisma.seller.findUnique({ where: { id: sellerId } });
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    if (!follow) {
      await this.prisma.sellerFollow.deleteMany({ where: { userId, sellerId } });
      return { deleted: true };
    }

    return this.prisma.sellerFollow.upsert({
      where: { userId_sellerId: { userId, sellerId } },
      update: {},
      create: {
        userId,
        sellerId
      }
    });
  }

  async mySellers(userId: string, query?: ListQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    const follows = await this.prisma.sellerFollow.findMany({
      where: { userId },
      skip,
      take,
      orderBy: { createdAt: 'desc' }
    });
    const ids = follows.map((entry) => entry.sellerId);
    const sellers = await this.prisma.seller.findMany({ where: { id: { in: ids } } });
    return sellers.map((seller) => serializePublicSeller(seller));
  }

  async opportunities(query?: ListQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    const opportunities = await this.prisma.opportunity.findMany({
      skip,
      take,
      include: { seller: true },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }]
    });
    return opportunities.map((opportunity) => ({
      ...opportunity,
      seller: opportunity.seller ? serializePublicSeller(opportunity.seller as any) : null
    }));
  }

  async opportunity(id: string) {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id },
      include: { seller: true }
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    return {
      ...opportunity,
      seller: opportunity.seller ? serializePublicSeller(opportunity.seller as any) : null
    };
  }

  async saveOpportunity(userId: string, opportunityId: string, save: boolean) {
    const opportunity = await this.prisma.opportunity.findUnique({ where: { id: opportunityId } });
    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    if (!save) {
      await this.prisma.savedOpportunity.deleteMany({ where: { userId, opportunityId } });
      return { deleted: true };
    }

    return this.prisma.savedOpportunity.upsert({
      where: { userId_opportunityId: { userId, opportunityId } },
      update: {},
      create: { userId, opportunityId }
    });
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

  async dealzMarketplace(userId: string, query?: ListQueryDto) {
    const { take } = normalizeListQuery(query);
    const [listings, opportunities] = await Promise.all([
      this.prisma.marketplaceListing.findMany({
        where: { status: 'ACTIVE' },
        include: { seller: true, taxonomyLinks: true },
        orderBy: { createdAt: 'desc' },
        take
      }),
      this.prisma.opportunity.findMany({
        where: { status: { in: ['OPEN', 'INVITE_ONLY'] } },
        include: { seller: true },
        orderBy: { createdAt: 'desc' },
        take
      })
    ]);

    return {
      listings: listings.map((listing) => serializeListingPublic(listing as any)),
      opportunities: opportunities.map((opportunity) => ({
        ...opportunity,
        seller: opportunity.seller ? serializePublicSeller(opportunity.seller as any) : null
      }))
    };
  }

  async invites(userId: string, query?: ListQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    const invites = await this.prisma.collaborationInvite.findMany({
      where: { recipientUserId: userId },
      skip,
      take,
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

  async respondInvite(userId: string, inviteId: string, status: string) {
    const invite = await this.prisma.collaborationInvite.findFirst({
      where: { id: inviteId, recipientUserId: userId }
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    return this.prisma.collaborationInvite.update({
      where: { id: inviteId },
      data: { status: this.normalizeInviteStatus(status) }
    });
  }

  private normalizeInviteStatus(status: string) {
    const normalized = String(status || '').toUpperCase().replace(/[\s-]+/g, '_');
    if (['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED'].includes(normalized)) {
      return normalized as 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';
    }
    return 'PENDING';
  }
}
