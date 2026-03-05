import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { CreateMarketplaceListingDto } from './dto/create-marketplace-listing.dto.js';

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  async getMarketplaceFeed() {
    const [listings, sellers, opportunities] = await Promise.all([
      this.prisma.marketplaceListing.findMany({
        where: { status: 'ACTIVE' },
        include: { deal: true },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.seller.findMany({ orderBy: { createdAt: 'desc' } }),
      this.prisma.opportunity.findMany({ orderBy: { createdAt: 'desc' } })
    ]);

    return { listings, sellers, opportunities };
  }

  async listSellers() {
    return this.prisma.seller.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async listOpportunities() {
    return this.prisma.opportunity.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async listListings() {
    return this.prisma.marketplaceListing.findMany({
      include: { deal: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createListing(userId: string, payload: CreateMarketplaceListingDto) {
    return this.prisma.marketplaceListing.create({
      data: {
        userId,
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
