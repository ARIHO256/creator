import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { serializeListingPublic } from '../../common/serializers/listing.serializer.js';
import { serializePublicSeller } from '../../common/serializers/seller.serializer.js';

@Injectable()
export class FavouritesService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll(userId: string) {
    const [listingFavorites, sellerFollows, savedOpportunities] = await Promise.all([
      this.prisma.listingFavorite.findMany({
        where: { userId },
        include: {
          listing: {
            include: { seller: true, taxonomyLinks: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.sellerFollow.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.savedOpportunity.findMany({
        where: { userId },
        include: { opportunity: { include: { seller: true } } },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const sellerIds = sellerFollows.map((entry) => entry.sellerId);
    const sellers = sellerIds.length
      ? await this.prisma.seller.findMany({ where: { id: { in: sellerIds } } })
      : [];

    return {
      listings: listingFavorites.map((favorite) => serializeListingPublic(favorite.listing as any)),
      sellers: sellers.map((seller) => serializePublicSeller(seller)),
      opportunities: savedOpportunities.map((entry) => ({
        ...entry.opportunity,
        seller: entry.opportunity.seller ? serializePublicSeller(entry.opportunity.seller as any) : null
      }))
    };
  }

  async listListings(userId: string) {
    const favorites = await this.prisma.listingFavorite.findMany({
      where: { userId },
      include: { listing: { include: { seller: true, taxonomyLinks: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return {
      listings: favorites.map((favorite) => serializeListingPublic(favorite.listing as any))
    };
  }

  async addListing(userId: string, listingId: string) {
    const listing = await this.prisma.marketplaceListing.findFirst({
      where: { id: listingId, status: 'ACTIVE' },
      include: { seller: true, taxonomyLinks: true }
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    await this.prisma.listingFavorite.upsert({
      where: { userId_listingId: { userId, listingId } },
      update: {},
      create: { userId, listingId }
    });

    return { listing: serializeListingPublic(listing as any) };
  }

  async removeListing(userId: string, listingId: string) {
    await this.prisma.listingFavorite.deleteMany({
      where: { userId, listingId }
    });
    return { deleted: true };
  }
}
