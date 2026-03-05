import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { creatorProfile: true }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      approvalStatus: user.approvalStatus,
      onboardingCompleted: user.onboardingCompleted,
      createdAt: user.createdAt,
      creatorProfile: user.creatorProfile
    };
  }
}
