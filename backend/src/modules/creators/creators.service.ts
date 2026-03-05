import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { UpdateCreatorProfileDto } from './dto/update-creator-profile.dto.js';

@Injectable()
export class CreatorsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProfile(userId: string) {
    const profile = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Creator profile not found');
    }
    return profile;
  }

  async updateMyProfile(userId: string, payload: UpdateCreatorProfileDto) {
    await this.getMyProfile(userId);

    return this.prisma.creatorProfile.update({
      where: { userId },
      data: {
        ...payload,
        categories: payload.categories ? JSON.stringify(payload.categories) : undefined,
        regions: payload.regions ? JSON.stringify(payload.regions) : undefined,
        languages: payload.languages ? JSON.stringify(payload.languages) : undefined
      }
    });
  }

  async getPublicProfile(handle: string) {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { handle },
      include: { user: true }
    });

    if (!profile) {
      throw new NotFoundException('Public creator profile not found');
    }

    return {
      id: profile.id,
      name: profile.name,
      handle: profile.handle,
      tier: profile.tier,
      tagline: profile.tagline,
      bio: profile.bio,
      categories: this.parseJsonArray(profile.categories),
      regions: this.parseJsonArray(profile.regions),
      languages: this.parseJsonArray(profile.languages),
      followers: profile.followers,
      rating: profile.rating,
      totalSalesDriven: profile.totalSalesDriven,
      isKycVerified: profile.isKycVerified
    };
  }

  private parseJsonArray(value: string | null): string[] {
    if (!value) {
      return [];
    }

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((entry) => String(entry)) : [];
    } catch {
      return [];
    }
  }
}
