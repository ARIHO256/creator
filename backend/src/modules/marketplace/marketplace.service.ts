import { Injectable, NotFoundException } from '@nestjs/common';
import { serializeListingPublic } from '../../common/serializers/listing.serializer.js';
import { serializePublicSeller } from '../../common/serializers/seller.serializer.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { ListQueryDto, normalizeListQuery } from '../../common/dto/list-query.dto.js';
import { CreateMarketplaceListingDto } from './dto/create-marketplace-listing.dto.js';

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  async getMarketplaceFeed(query?: ListQueryDto) {
    const { take } = normalizeListQuery(query, { limit: 24 });
    const [listings, sellers, opportunities] = await Promise.all([
      this.prisma.marketplaceListing.findMany({
        where: { status: 'ACTIVE' },
        include: { deal: true, seller: true, taxonomyLinks: true },
        orderBy: { createdAt: 'desc' },
        take
      }),
      this.prisma.seller.findMany({
        orderBy: [{ isVerified: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }],
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
      sellers: sellers.map((seller) => serializePublicSeller(seller)),
      opportunities
    };
  }

  async listSellers(query?: ListQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    const sellers = await this.prisma.seller.findMany({
      skip,
      take,
      orderBy: [{ isVerified: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }]
    });
    return sellers.map((seller) => serializePublicSeller(seller));
  }

  async listOpportunities(query?: ListQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    const opportunities = await this.prisma.opportunity.findMany({
      skip,
      take,
      include: { seller: true },
      orderBy: { createdAt: 'desc' }
    });
    return opportunities.map((opportunity) => ({
      ...opportunity,
      seller: opportunity.seller ? serializePublicSeller(opportunity.seller as any) : null
    }));
  }

  async listListings(query?: ListQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    const listings = await this.prisma.marketplaceListing.findMany({
      where: { status: 'ACTIVE' },
      skip,
      take,
      include: { deal: true, seller: true, taxonomyLinks: true },
      orderBy: { createdAt: 'desc' }
    });
    return listings.map((listing) => serializeListingPublic(listing as any));
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
