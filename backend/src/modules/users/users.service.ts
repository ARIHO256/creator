import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        creatorProfile: true,
        sellerProfile: true,
        roleAssignments: true
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      activeRole: user.role,
      roles: user.roleAssignments.map((assignment) => assignment.role),
      approvalStatus: user.approvalStatus,
      onboardingCompleted: user.onboardingCompleted,
      createdAt: user.createdAt,
      creatorProfile: user.creatorProfile,
      sellerProfile: user.sellerProfile
    };
  }
}
