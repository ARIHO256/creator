import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { CreateMarketplaceListingDto } from './dto/create-marketplace-listing.dto.js';

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  async getMarketplaceFeed() {
    const [listings, sellers, opportunities] = await Promise.all([
      this.prisma.marketplaceListing.findMany({
        where: { status: 'ACTIVE' },
        include: { deal: true, seller: true },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.seller.findMany({
        orderBy: [{ isVerified: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }]
      }),
      this.prisma.opportunity.findMany({
        where: { status: { in: ['OPEN', 'INVITE_ONLY'] } },
        include: { seller: true },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return { listings, sellers, opportunities };
  }

  async listSellers() {
    return this.prisma.seller.findMany({
      orderBy: [{ isVerified: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }]
    });
  }

  async listOpportunities() {
    return this.prisma.opportunity.findMany({
      include: { seller: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async listListings() {
    return this.prisma.marketplaceListing.findMany({
      where: { status: 'ACTIVE' },
      include: { deal: true, seller: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createListing(userId: string, payload: CreateMarketplaceListingDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { sellerProfile: true }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.marketplaceListing.create({
      data: {
        userId,
        sellerId: user.sellerProfile?.id,
        title: payload.title,
        description: payload.description,
        dealId: payload.dealId,
        price: payload.price,
        currency: payload.currency ?? 'USD',
        status: 'ACTIVE'
      }
    });
  }
}
