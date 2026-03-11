import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { Prisma, UserRole } from '@prisma/client';
import { randomUUID, scryptSync, timingSafeEqual } from 'crypto';
import type { SignOptions } from 'jsonwebtoken';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RecoverAccountDto } from './dto/recover-account.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { SwitchRoleDto } from './dto/switch-role.dto.js';

type AuthUserRecord = Prisma.UserGetPayload<{
  include: {
    creatorProfile: true;
    sellerProfile: true;
    roleAssignments: true;
  };
}>;

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(ConfigService) private readonly configService: ConfigService
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

    const requestedRoles = this.resolveRequestedRoles(payload);
    const creatorHandle = requestedRoles.includes('CREATOR')
      ? await this.generateUniqueCreatorHandle(payload.handle || payload.name)
      : null;
    const sellerHandle = this.requiresSellerProfile(requestedRoles)
      ? await this.generateUniqueSellerHandle(payload.sellerHandle || payload.handle || payload.name)
      : null;
    const passwordHash = await hash(payload.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email,
        phone,
        passwordHash,
        role: (payload.role as UserRole | undefined) ?? requestedRoles[0],
        roleAssignments: {
          create: requestedRoles.map((role) => ({ role }))
        },
        creatorProfile: requestedRoles.includes('CREATOR')
          ? {
              create: {
                name: payload.name,
                handle: creatorHandle!,
                tier: 'BRONZE'
              }
            }
          : undefined,
        sellerProfile: this.requiresSellerProfile(requestedRoles)
          ? {
              create: {
                handle: sellerHandle!,
                name: payload.sellerDisplayName ?? payload.name,
                displayName: payload.sellerDisplayName ?? payload.name,
                storefrontName: payload.sellerDisplayName ?? payload.name,
                type: payload.sellerKind === 'PROVIDER' ? 'Provider' : 'Seller',
                kind:
                  (payload.sellerKind as 'SELLER' | 'PROVIDER' | 'BRAND' | undefined) ??
                  (requestedRoles.includes(UserRole.PROVIDER) ? 'PROVIDER' : 'SELLER'),
                category: requestedRoles.includes(UserRole.PROVIDER) ? 'Services' : 'General Merchandise'
              }
            }
          : undefined
      },
      include: {
        creatorProfile: true,
        sellerProfile: true,
        roleAssignments: true
      }
    });

    return this.issueTokens(user.id, user.email, user.role, this.getAssignedRoles(user));
  }

  async login(payload: LoginDto) {
    const email = payload.email?.toLowerCase().trim();
    const phone = payload.phone?.trim();

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: email ?? undefined }, { phone: phone ?? undefined }]
      },
      include: {
        creatorProfile: true,
        sellerProfile: true,
        roleAssignments: true
      }
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    let passwordOk = false;
    let shouldUpgradeLegacyHash = false;

    try {
      passwordOk = await compare(payload.password, user.passwordHash);
    } catch {
      passwordOk = false;
    }

    if (!passwordOk) {
      passwordOk = this.verifyLegacyPassword(payload.password, user.passwordHash);
      shouldUpgradeLegacyHash = passwordOk;
    }

    if (!passwordOk) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (shouldUpgradeLegacyHash) {
      const upgradedPasswordHash = await hash(payload.password, 12);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: upgradedPasswordHash }
      });
    }

    const normalizedUser = await this.autoApproveSubmittedSellerProvider(user);

    return this.issueTokens(
      normalizedUser.id,
      normalizedUser.email,
      normalizedUser.role,
      this.getAssignedRoles(normalizedUser)
    );
  }

  async me(userId: string) {
    const user = await this.findUserOrThrow(userId);
    const normalizedUser = await this.autoApproveSubmittedSellerProvider(user);
    return this.serializeUser(normalizedUser);
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
      include: {
        user: {
          include: {
            roleAssignments: true
          }
        }
      }
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

    return this.issueTokens(
      tokenRecord.user.id,
      tokenRecord.user.email,
      tokenRecord.user.role,
      tokenRecord.user.roleAssignments.map((assignment) => assignment.role),
      tokenRecord.family
    );
  }

  async recovery(payload: RecoverAccountDto) {
    const email = payload.email?.toLowerCase().trim();
    const phone = payload.phone?.trim();

    if (!email && !phone) {
      throw new BadRequestException('Either email or phone is required');
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: email ?? undefined }, { phone: phone ?? undefined }]
      },
      select: { id: true }
    });

    if (!existing) {
      throw new NotFoundException('Account not found');
    }

    return { ok: true };
  }

  async logout(payload: RefreshTokenDto) {
    const refreshToken = payload.refreshToken?.trim();
    if (!refreshToken) {
      return { loggedOut: true };
    }

    const refreshSecret = this.configService.get<string>('auth.refreshSecret')!;
    let decoded: { sub: string; tokenId: string };

    try {
      decoded = this.jwtService.verify(refreshToken, { secret: refreshSecret });
    } catch {
      return { loggedOut: true };
    }

    const record = await this.prisma.refreshToken.findUnique({
      where: { id: decoded.tokenId }
    });

    if (!record || record.revokedAt) {
      return { loggedOut: true };
    }

    const match = await compare(refreshToken, record.tokenHash).catch(() => false);
    if (match) {
      await this.prisma.refreshToken.update({
        where: { id: record.id },
        data: { revokedAt: new Date() }
      });
    }

    return { loggedOut: true };
  }

  async switchRole(userId: string, payload: SwitchRoleDto) {
    const user = await this.findUserOrThrow(userId);
    const roles = this.getAssignedRoles(user);

    if (!roles.includes(payload.role as UserRole)) {
      throw new ForbiddenException('Requested role is not assigned to this user');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: payload.role as UserRole }
    });

    return this.issueTokens(updated.id, user.email, updated.role, roles);
  }

  private async issueTokens(
    userId: string,
    email: string | null,
    role: UserRole,
    roles: UserRole[],
    family?: string
  ) {
    const accessSecret = this.configService.get<string>('auth.accessSecret')!;
    const accessExpiresIn = this.configService.get<string>('auth.accessTtl') as SignOptions['expiresIn'];
    const refreshSecret = this.configService.get<string>('auth.refreshSecret')!;
    const refreshDays = this.configService.get<number>('auth.refreshTtlDays')!;
    const refreshExpiresIn = `${refreshDays}d` as SignOptions['expiresIn'];

    const tokenFamily = family ?? randomUUID();
    const refreshTokenId = randomUUID();

    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email, role, roles },
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
      expiresIn: accessExpiresIn,
      role,
      roles
    };
  }

  private async findUserOrThrow(userId: string) {
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

    return user;
  }

  private async autoApproveSubmittedSellerProvider(user: AuthUserRecord) {
    if (user.approvalStatus === 'APPROVED' && user.onboardingCompleted) {
      return user;
    }

    const assignedRoles = this.getAssignedRoles(user);
    const sellerSide = assignedRoles.includes(UserRole.SELLER) || assignedRoles.includes(UserRole.PROVIDER);
    if (!sellerSide) {
      return user;
    }

    const onboardingRecord = await this.prisma.workflowRecord.findUnique({
      where: {
        userId_recordType_recordKey: {
          userId: user.id,
          recordType: 'onboarding',
          recordKey: 'main'
        }
      }
    });

    const onboarding = onboardingRecord?.payload as Record<string, unknown> | null;
    const profileType = String(onboarding?.profileType || '').toUpperCase();
    const onboardingStatus = String(onboarding?.status || '').toLowerCase();
    const submitted = onboardingStatus === 'submitted';
    const sellerOrProvider = profileType === 'SELLER' || profileType === 'PROVIDER';

    if (!submitted || !sellerOrProvider) {
      return user;
    }

    const approvedAt = String(onboarding?.submittedAt || new Date().toISOString());

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          approvalStatus: 'APPROVED',
          onboardingCompleted: true
        }
      }),
      this.prisma.workflowRecord.upsert({
        where: {
          userId_recordType_recordKey: {
            userId: user.id,
            recordType: 'account_approval',
            recordKey: 'main'
          }
        },
        update: {
          payload: {
            status: 'approved',
            progressPercent: 100,
            requiredActions: [],
            documents: [],
            submittedAt: approvedAt,
            approvedAt,
            reviewNotes: '',
            metadata: {
              source: 'onboarding',
              uiStatus: 'Approved',
              profileType
            }
          } as Prisma.InputJsonValue
        },
        create: {
          userId: user.id,
          recordType: 'account_approval',
          recordKey: 'main',
          payload: {
            status: 'approved',
            progressPercent: 100,
            requiredActions: [],
            documents: [],
            submittedAt: approvedAt,
            approvedAt,
            reviewNotes: '',
            metadata: {
              source: 'onboarding',
              uiStatus: 'Approved',
              profileType
            }
          } as Prisma.InputJsonValue
        }
      })
    ]);

    return this.findUserOrThrow(user.id);
  }

  private serializeUser(user: AuthUserRecord) {
    const roles = this.getAssignedRoles(user);

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      activeRole: user.role,
      roles,
      approvalStatus: user.approvalStatus,
      onboardingCompleted: user.onboardingCompleted,
      creatorProfile: user.creatorProfile,
      sellerProfile: user.sellerProfile
    };
  }

  private getAssignedRoles(user: { roleAssignments: Array<{ role: UserRole }> }) {
    const roles = user.roleAssignments.map((assignment) => assignment.role);
    return roles.length > 0 ? roles : [UserRole.CREATOR];
  }

  private resolveRequestedRoles(payload: RegisterDto): UserRole[] {
    const requested = new Set<UserRole>();

    for (const role of payload.roles ?? []) {
      requested.add(role as UserRole);
    }

    if (payload.role) {
      requested.add(payload.role as UserRole);
    }

    if (payload.sellerKind === 'PROVIDER') {
      requested.add(UserRole.PROVIDER);
    }

    if (requested.size === 0) {
      requested.add(UserRole.CREATOR);
    }

    if (requested.has(UserRole.PROVIDER) && !requested.has(UserRole.SELLER)) {
      requested.add(UserRole.SELLER);
    }

    return Array.from(requested);
  }

  private requiresSellerProfile(roles: UserRole[]) {
    return roles.includes(UserRole.SELLER) || roles.includes(UserRole.PROVIDER);
  }

  private async generateUniqueCreatorHandle(source: string) {
    return this.generateUniqueHandle(source, (handle) =>
      this.prisma.creatorProfile.findUnique({ where: { handle } })
    );
  }

  private async generateUniqueSellerHandle(source: string) {
    return this.generateUniqueHandle(source, (handle) =>
      this.prisma.seller.findUnique({ where: { handle } })
    );
  }

  private async generateUniqueHandle(source: string, findExisting: (handle: string) => Promise<unknown>) {
    const base = this.slugify(source);

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = attempt === 0 ? base : `${base}.${attempt + 1}`;
      const existing = await findExisting(candidate);
      if (!existing) {
        return candidate;
      }
    }

    return `${base}.${Date.now()}`;
  }

  private slugify(value: string) {
    const normalized = String(value || 'workspace')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '');

    return normalized || 'workspace';
  }

  private verifyLegacyPassword(password: string, storedHash: string) {
    const [salt, originalHash] = String(storedHash || '').split(':');
    if (!salt || !originalHash) {
      return false;
    }

    try {
      const candidateHash = scryptSync(password, salt, 64).toString('hex');
      if (candidateHash.length !== originalHash.length) {
        return false;
      }
      return timingSafeEqual(Buffer.from(candidateHash, 'hex'), Buffer.from(originalHash, 'hex'));
    } catch {
      return false;
    }
  }
}
