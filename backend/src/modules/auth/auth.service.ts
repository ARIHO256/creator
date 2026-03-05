import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { randomUUID } from 'crypto';
import type { SignOptions } from 'jsonwebtoken';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { SwitchRoleDto } from './dto/switch-role.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async register(payload: RegisterDto) {
    if (!payload.email && !payload.phone) {
      throw new BadRequestException('Either email or phone is required');
    }

    const email = payload.email?.toLowerCase().trim();
    const phone = payload.phone?.trim();
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: email ?? undefined }, { phone: phone ?? undefined }]
      }
    });

    if (existing) {
      throw new BadRequestException('User with this email or phone already exists');
    }

    const passwordHash = await hash(payload.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email,
        phone,
        passwordHash,
        role: 'CREATOR',
        creatorProfile: {
          create: {
            name: payload.name,
            handle: (payload.handle || payload.name).toLowerCase().replace(/\s+/g, '.'),
            tier: 'BRONZE'
          }
        }
      },
      include: { creatorProfile: true }
    });

    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(payload: LoginDto) {
    const email = payload.email?.toLowerCase().trim();
    const phone = payload.phone?.trim();

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: email ?? undefined }, { phone: phone ?? undefined }]
      },
      include: { creatorProfile: true }
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordOk = await compare(payload.password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  async me(userId: string) {
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
      creatorProfile: user.creatorProfile
    };
  }

  async refresh(payload: RefreshTokenDto) {
    const refreshSecret = this.configService.get<string>('auth.refreshSecret')!;
    let decoded: { sub: string; tokenId: string };

    try {
      decoded = this.jwtService.verify(payload.refreshToken, { secret: refreshSecret });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { id: decoded.tokenId },
      include: { user: true }
    });

    if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    const matches = await compare(payload.refreshToken, tokenRecord.tokenHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() }
    });

    return this.issueTokens(tokenRecord.user.id, tokenRecord.user.email, tokenRecord.user.role, tokenRecord.family);
  }

  async logout(userId: string, payload: RefreshTokenDto) {
    const records = await this.prisma.refreshToken.findMany({ where: { userId, revokedAt: null } });

    for (const record of records) {
      const match = await compare(payload.refreshToken, record.tokenHash).catch(() => false);
      if (match) {
        await this.prisma.refreshToken.update({
          where: { id: record.id },
          data: { revokedAt: new Date() }
        });
        return { loggedOut: true };
      }
    }

    return { loggedOut: true };
  }

  async switchRole(userId: string, payload: SwitchRoleDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { role: payload.role }
    });

    return {
      id: user.id,
      role: user.role
    };
  }

  private async issueTokens(userId: string, email: string | null, role: string, family?: string) {
    const accessSecret = this.configService.get<string>('auth.accessSecret')!;
    const accessExpiresIn = this.configService.get<string>('auth.accessTtl') as SignOptions['expiresIn'];
    const refreshSecret = this.configService.get<string>('auth.refreshSecret')!;
    const refreshDays = this.configService.get<number>('auth.refreshTtlDays')!;
    const refreshExpiresIn = `${refreshDays}d` as SignOptions['expiresIn'];

    const tokenFamily = family ?? randomUUID();
    const refreshTokenId = randomUUID();

    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email, role },
      { secret: accessSecret, expiresIn: accessExpiresIn }
    );

    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, tokenId: refreshTokenId, family: tokenFamily },
      { secret: refreshSecret, expiresIn: refreshExpiresIn }
    );

    const refreshHash = await hash(refreshToken, 12);
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        id: refreshTokenId,
        userId,
        tokenHash: refreshHash,
        family: tokenFamily,
        expiresAt
      }
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: accessExpiresIn
    };
  }
}
