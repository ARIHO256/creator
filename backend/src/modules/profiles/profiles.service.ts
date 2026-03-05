import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublicProfiles(limit = 20) {
    const profiles = await this.prisma.creatorProfile.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    return profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      handle: profile.handle,
      tier: profile.tier,
      followers: profile.followers,
      rating: profile.rating
    }));
  }
}
