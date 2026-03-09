import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublicProfiles(limit = 20) {
    const [creators, sellers] = await Promise.all([
      this.prisma.creatorProfile.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.seller.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return [
      ...creators.map((profile) => ({
        id: profile.id,
        type: 'CREATOR',
        name: profile.name,
        handle: profile.handle,
        tier: profile.tier,
        followers: profile.followers,
        rating: profile.rating
      })),
      ...sellers.map((profile) => ({
        id: profile.id,
        type: profile.kind,
        name: profile.displayName,
        handle: profile.handle,
        tier: null,
        followers: null,
        rating: profile.rating
      }))
    ].slice(0, limit);
  }
}
