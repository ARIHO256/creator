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
import { createCipheriv, createDecipheriv, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'crypto';
import type { SignOptions } from 'jsonwebtoken';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { JobsService } from '../jobs/jobs.service.js';
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

type QueuedRegisterPayload = Omit<RegisterDto, 'password'> & {
  email?: string;
  phone?: string;
  encryptedPassword: string;
};

type RegistrationJobRecord = {
  id: string;
  queue: string;
  type: string;
  status: string;
  lastError?: string | null;
};

type NormalizedRegisterPayload = RegisterDto & {
  email?: string;
  phone?: string;
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    private readonly jobsService: JobsService
  ) {}

  async register(payload: RegisterDto) {
    const normalized = this.normalizeRegisterPayload(payload);
    const requestedRoles = this.resolveRequestedRoles(normalized);
    if (!this.shouldQueueRegistration()) {
      return this.registerSynchronously(normalized);
    }

    await this.assertRegistrationPermitted(normalized, requestedRoles);

    const dedupeKey = `auth:register:${this.registrationDedupeKey(normalized.email, normalized.phone, requestedRoles)}`;
    const existingJob = await this.prisma.backgroundJob.findUnique({
      where: { dedupeKey }
    });
    if (existingJob) {
      if (existingJob.status === 'COMPLETED') {
        return this.registerSynchronously(normalized);
      }

      if (['FAILED', 'DEAD_LETTER', 'CANCELLED'].includes(existingJob.status)) {
        const retried = await this.prisma.backgroundJob.update({
          where: { id: existingJob.id },
          data: {
            status: 'PENDING',
            attempts: 0,
            lockedAt: null,
            lockedBy: null,
            lastError: null,
            runAfter: new Date(),
            payload: this.buildQueuedRegisterPayload(normalized) as Prisma.InputJsonValue
          }
        });
        return this.serializeRegistrationJob(retried as RegistrationJobRecord);
      }

      return this.serializeRegistrationJob(existingJob as RegistrationJobRecord);
    }

    const job = await this.jobsService.enqueue({
      queue: 'auth',
      type: 'AUTH_REGISTER',
      dedupeKey,
      payload: this.buildQueuedRegisterPayload(normalized)
    });

    return this.serializeRegistrationJob(job as RegistrationJobRecord);
  }

  async registrationStatus(requestId: string) {
    const job = await this.jobsService.get(requestId);
    if (job.type !== 'AUTH_REGISTER' || job.queue !== 'auth') {
      throw new NotFoundException('Registration request not found');
    }
    return this.serializeRegistrationJob(job as RegistrationJobRecord);
  }

  async completeQueuedRegistration(payload: QueuedRegisterPayload) {
    const registerPayload: RegisterDto = {
      ...payload,
      password: this.decryptRegistrationPassword(payload.encryptedPassword)
    };
    await this.registerSynchronously(registerPayload, { issueTokens: false });
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

  private async registerSynchronously(
    payload: RegisterDto,
    options: { issueTokens?: boolean } = {}
  ) {
    const normalized = this.normalizeRegisterPayload(payload);
    const requestedRoles = this.resolveRequestedRoles(normalized);
    const existingUser = await this.findUserByIdentityWithRelations(normalized.email, normalized.phone);
    if (existingUser) {
      return this.extendExistingUserRegistration(existingUser, normalized, requestedRoles, options);
    }

    const creatorHandle = requestedRoles.includes('CREATOR')
      ? await this.generateUniqueCreatorHandle(normalized.handle || normalized.name)
      : null;
    const sellerHandle = this.requiresSellerProfile(requestedRoles)
      ? await this.generateUniqueSellerHandle(normalized.sellerHandle || normalized.handle || normalized.name)
      : null;
    const passwordHash = await hash(normalized.password, 12);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: normalized.email,
          phone: normalized.phone,
          passwordHash,
          role: (normalized.role as UserRole | undefined) ?? requestedRoles[0],
          roleAssignments: {
            create: requestedRoles.map((role) => ({ role }))
          },
          creatorProfile: requestedRoles.includes('CREATOR')
            ? {
                create: {
                  name: normalized.name,
                  handle: creatorHandle!,
                  tier: 'BRONZE'
                }
              }
            : undefined,
          sellerProfile: this.requiresSellerProfile(requestedRoles)
            ? {
                create: {
                  handle: sellerHandle!,
                  name: normalized.sellerDisplayName ?? normalized.name,
                  displayName: normalized.sellerDisplayName ?? normalized.name,
                  storefrontName: normalized.sellerDisplayName ?? normalized.name,
                  type: normalized.sellerKind === 'PROVIDER' ? 'Provider' : 'Seller',
                  kind:
                    (normalized.sellerKind as 'SELLER' | 'PROVIDER' | 'BRAND' | undefined) ??
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

      if (options.issueTokens === false) {
        return {
          userId: user.id,
          role: user.role
        };
      }

      return this.issueTokens(user.id, user.email, user.role, this.getAssignedRoles(user));
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('User with this email or phone already exists');
      }
      throw error;
    }
  }

  private async extendExistingUserRegistration(
    existingUser: AuthUserRecord,
    payload: NormalizedRegisterPayload,
    requestedRoles: UserRole[],
    options: { issueTokens?: boolean } = {}
  ) {
    const assignedRoles = new Set(this.getAssignedRoles(existingUser));
    const rolesToAdd = requestedRoles.filter((role) => !assignedRoles.has(role));

    if (rolesToAdd.length === 0) {
      await this.assertExistingUserPasswordMatches(existingUser, payload.password);
      const targetRole = ((payload.role as UserRole | undefined) ?? requestedRoles[0] ?? existingUser.role) as UserRole;
      const userForTokens =
        existingUser.role === targetRole
          ? existingUser
          : await this.prisma.user.update({
              where: { id: existingUser.id },
              data: { role: targetRole },
              include: {
                creatorProfile: true,
                sellerProfile: true,
                roleAssignments: true
              }
            });

      if (options.issueTokens === false) {
        return {
          userId: userForTokens.id,
          role: userForTokens.role
        };
      }

      return this.issueTokens(
        userForTokens.id,
        userForTokens.email,
        userForTokens.role,
        this.getAssignedRoles(userForTokens)
      );
    }

    const shouldUpgradeLegacyHash = await this.assertExistingUserPasswordMatches(existingUser, payload.password);
    const creatorHandle =
      rolesToAdd.includes(UserRole.CREATOR) && !existingUser.creatorProfile
        ? await this.generateUniqueCreatorHandle(payload.handle || payload.name)
        : null;
    const sellerHandle =
      this.requiresSellerProfile(rolesToAdd) && !existingUser.sellerProfile
        ? await this.generateUniqueSellerHandle(payload.sellerHandle || payload.handle || payload.name)
        : null;

    const updatedUser = await this.prisma.user.update({
      where: { id: existingUser.id },
      data: {
        email: existingUser.email || payload.email || undefined,
        phone: existingUser.phone || payload.phone || undefined,
        passwordHash: shouldUpgradeLegacyHash ? await hash(payload.password, 12) : undefined,
        role: ((payload.role as UserRole | undefined) ?? requestedRoles[0] ?? existingUser.role) as UserRole,
        roleAssignments: rolesToAdd.length
          ? {
              create: rolesToAdd.map((role) => ({ role }))
            }
          : undefined,
        creatorProfile:
          rolesToAdd.includes(UserRole.CREATOR) && !existingUser.creatorProfile
            ? {
                create: {
                  name: payload.name,
                  handle: creatorHandle!,
                  tier: 'BRONZE'
                }
              }
            : undefined,
        sellerProfile:
          this.requiresSellerProfile(rolesToAdd) && !existingUser.sellerProfile
            ? {
                create: {
                  handle: sellerHandle!,
                  name: payload.sellerDisplayName ?? payload.name,
                  displayName: payload.sellerDisplayName ?? payload.name,
                  storefrontName: payload.sellerDisplayName ?? payload.name,
                  type: payload.sellerKind === 'PROVIDER' ? 'Provider' : 'Seller',
                  kind:
                    (payload.sellerKind as 'SELLER' | 'PROVIDER' | 'BRAND' | undefined) ??
                    (rolesToAdd.includes(UserRole.PROVIDER) ? 'PROVIDER' : 'SELLER'),
                  category: rolesToAdd.includes(UserRole.PROVIDER) ? 'Services' : 'General Merchandise'
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

    if (options.issueTokens === false) {
      return {
        userId: updatedUser.id,
        role: updatedUser.role
      };
    }

    return this.issueTokens(
      updatedUser.id,
      updatedUser.email,
      updatedUser.role,
      this.getAssignedRoles(updatedUser)
    );
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
    const approvalPayload = {
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
    } as Prisma.InputJsonValue;

    try {
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: user.id },
          data: {
            approvalStatus: 'APPROVED',
            onboardingCompleted: true
          }
        }),
        this.prisma.accountApproval.upsert({
          where: { userId: user.id },
          update: {
            status: 'approved',
            submittedAt: new Date(approvedAt),
            approvedAt: new Date(approvedAt),
            payload: approvalPayload
          },
          create: {
            userId: user.id,
            status: 'approved',
            submittedAt: new Date(approvedAt),
            approvedAt: new Date(approvedAt),
            payload: approvalPayload
          }
        })
      ]);
    } catch (error) {
      if (!this.isMissingSchemaObjectError(error)) {
        throw error;
      }

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
            payload: approvalPayload
          },
          create: {
            userId: user.id,
            recordType: 'account_approval',
            recordKey: 'main',
            payload: approvalPayload
          }
        })
      ]);
    }

    return this.findUserOrThrow(user.id);
  }

  private isMissingSchemaObjectError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2021' || error.code === 'P2022')
    );
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

  private async assertRegistrationPermitted(payload: NormalizedRegisterPayload, requestedRoles: UserRole[]) {
    const existingUser = await this.findUserByIdentityWithRelations(payload.email, payload.phone);
    if (!existingUser) {
      return null;
    }

    const rolesToAdd = this.resolveRolesToAdd(existingUser, requestedRoles);
    if (rolesToAdd.length === 0) {
      await this.assertExistingUserPasswordMatches(existingUser, payload.password);
      return existingUser;
    }

    await this.assertExistingUserPasswordMatches(existingUser, payload.password);
    return existingUser;
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

  private normalizeRegisterPayload(payload: RegisterDto): NormalizedRegisterPayload {
    if (!payload.email && !payload.phone) {
      throw new BadRequestException('Either email or phone is required');
    }

    return {
      ...payload,
      email: payload.email?.toLowerCase().trim(),
      phone: payload.phone?.trim(),
      name: String(payload.name || '').trim()
    };
  }

  private buildQueuedRegisterPayload(payload: NormalizedRegisterPayload): QueuedRegisterPayload {
    const { password, ...rest } = payload;
    return {
      ...rest,
      encryptedPassword: this.encryptRegistrationPassword(password)
    };
  }

  private resolveRolesToAdd(user: AuthUserRecord, requestedRoles: UserRole[]) {
    const assignedRoles = new Set(this.getAssignedRoles(user));
    return requestedRoles.filter((role) => !assignedRoles.has(role));
  }

  private async findUserByIdentityWithRelations(email?: string, phone?: string) {
    const matches = await this.prisma.user.findMany({
      where: {
        OR: [{ email: email ?? undefined }, { phone: phone ?? undefined }]
      },
      include: {
        creatorProfile: true,
        sellerProfile: true,
        roleAssignments: true
      }
    });

    const uniqueMatches = Array.from(new Map(matches.map((user) => [user.id, user])).values());
    if (uniqueMatches.length > 1) {
      throw new BadRequestException('Email and phone belong to different existing accounts');
    }

    return uniqueMatches[0] ?? null;
  }

  private shouldQueueRegistration() {
    const queueEnabled = this.configService.get<boolean>('auth.registerQueueEnabled');
    const workerEnabled = this.configService.get<boolean>('jobs.workerEnabled');
    return (queueEnabled ?? true) && (workerEnabled ?? true);
  }

  private registrationDedupeKey(email?: string, phone?: string, roles?: UserRole[]) {
    const identity = email || phone || randomUUID();
    const roleKey = (roles ?? []).slice().sort().join(',');
    return `${identity}:${roleKey || 'default'}`;
  }

  private serializeRegistrationJob(job: RegistrationJobRecord) {
    const statusMap = {
      PENDING: 'PENDING',
      PROCESSING: 'PROCESSING',
      COMPLETED: 'READY',
      FAILED: 'FAILED',
      DEAD_LETTER: 'FAILED',
      CANCELLED: 'FAILED'
    } as const;
    const status = statusMap[job.status as keyof typeof statusMap] ?? 'PENDING';
    const failed = status === 'FAILED';

    return {
      registrationQueued: true,
      requestId: job.id,
      status,
      readyToLogin: status === 'READY',
      failed,
      pollAfterMs: Number(this.configService.get('auth.registrationPollAfterMs') ?? 1000),
      ...(failed ? { errorMessage: job.lastError ?? 'Registration failed' } : {})
    };
  }

  private encryptRegistrationPassword(password: string) {
    const secret = String(this.configService.get('auth.registrationQueueSecret') ?? '');
    const key = scryptSync(secret, 'mldz-auth-register', 32);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
  }

  private decryptRegistrationPassword(payload: string) {
    const [ivRaw, tagRaw, encryptedRaw] = String(payload || '').split('.');
    if (!ivRaw || !tagRaw || !encryptedRaw) {
      throw new BadRequestException('Queued registration payload is invalid');
    }

    const secret = String(this.configService.get('auth.registrationQueueSecret') ?? '');
    const key = scryptSync(secret, 'mldz-auth-register', 32);
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivRaw, 'base64url')
    );
    decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedRaw, 'base64url')),
      decipher.final()
    ]).toString('utf8');
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

  private async assertExistingUserPasswordMatches(user: AuthUserRecord, password: string) {
    let passwordOk = false;
    let shouldUpgradeLegacyHash = false;

    try {
      passwordOk = await compare(password, user.passwordHash);
    } catch {
      passwordOk = false;
    }

    if (!passwordOk) {
      passwordOk = this.verifyLegacyPassword(password, user.passwordHash);
      shouldUpgradeLegacyHash = passwordOk;
    }

    if (!passwordOk) {
      throw new BadRequestException(
        'This email or phone already belongs to an existing account. Use the same password to add another role.'
      );
    }

    return shouldUpgradeLegacyHash;
  }

  private buildDuplicateRoleMessage(requestedRoles: UserRole[]) {
    const labels = requestedRoles.map((role) => role.toLowerCase());
    if (labels.length === 1) {
      return `This email or phone is already registered for ${labels[0]}.`;
    }
    return `This email or phone already has these roles: ${labels.join(', ')}.`;
  }
}
