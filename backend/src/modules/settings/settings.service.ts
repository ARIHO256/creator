import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { sanitizePayload } from '../../common/sanitizers/payload-sanitizer.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { CreateInviteDto } from './dto/create-invite.dto.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { SendPayoutCodeDto } from './dto/send-payout-code.dto.js';
import { SendTestNotificationDto } from './dto/send-test-notification.dto.js';
import { UpdateCrewSessionDto } from './dto/update-crew-session.dto.js';
import { UpdateIntegrationsDto } from './dto/update-integrations.dto.js';
import { UpdateKycDto } from './dto/update-kyc.dto.js';
import { UpdateMemberDto } from './dto/update-member.dto.js';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto.js';
import { UpdatePayoutMethodsDto } from './dto/update-payout-methods.dto.js';
import { UpdatePreferencesDto } from './dto/update-preferences.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { UpdateRolesSecurityDto } from './dto/update-roles-security.dto.js';
import { UpdateSavedViewsDto } from './dto/update-saved-views.dto.js';
import { UpdateSecuritySettingsDto } from './dto/update-security-settings.dto.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';
import { UpdateTaxDto } from './dto/update-tax.dto.js';
import { VerifyPayoutDto } from './dto/verify-payout.dto.js';

const DEFAULT_INVITE_DOMAIN_ALLOWLIST = [
  'creator.com',
  'studio.com',
  'mylivedealz.com',
  'studio.test'
];
const DEFAULT_WORKSPACE_SECURITY = {
  require2FA: true,
  allowExternalInvites: false,
  supplierGuestExpiryHours: 24,
  inviteDomainAllowlist: DEFAULT_INVITE_DOMAIN_ALLOWLIST,
  requireApprovalForPayouts: true,
  payoutApprovalThresholdUsd: 500,
  restrictSensitiveExports: true,
  sessionTimeoutMins: 60
};
const DEFAULT_SECURITY_SETTINGS = {
  twoFactor: false,
  twoFactorMethod: 'authenticator',
  twoFactorConfig: {
    enabled: false,
    verified: false,
    secret: null
  },
  passkeys: [],
  sessions: [],
  trustedDevices: [],
  alerts: []
};

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async settings(userId: string) {
    const [record, derived] = await Promise.all([
      this.getUserSetting(userId, 'profile', {}),
      this.deriveSettings(userId)
    ]);
    return this.normalizeSettingsRecord(this.deepMerge(derived, record));
  }
  async updateSettings(userId: string, body: UpdateSettingsDto) {
    const current = await this.settings(userId);
    const patch = this.normalizeSettingsPatch(body);
    const merged = this.deepMerge(current, patch);
    merged.updatedAt = new Date().toISOString();
    const record = await this.upsertUserSetting(userId, 'profile', merged);
    await this.audit.log({
      userId,
      action: 'settings.updated',
      entityType: 'workspace_setting',
      entityId: 'profile',
      route: '/api/settings',
      method: 'PATCH',
      statusCode: 200,
      metadata: { keys: Object.keys(patch) }
    });
    return record.payload as Record<string, unknown>;
  }
  async sendPayoutCode(userId: string, body: SendPayoutCodeDto) {
    const channel = typeof body.channel === 'string' ? body.channel : 'email';
    const method = typeof body.method === 'string' ? body.method : null;
    const payload = {
      status: 'code_sent',
      channel,
      method,
      codeId: randomUUID(),
      sentAt: new Date().toISOString()
    };
    const record = await this.upsertUserSetting(userId, 'payout_verification', payload);
    await this.audit.log({
      userId,
      action: 'settings.payout_code_sent',
      entityType: 'payout_verification',
      entityId: record.id,
      route: '/api/settings/payout/send-code',
      method: 'POST',
      statusCode: 200,
      metadata: { channel, method }
    });
    return record.payload as Record<string, unknown>;
  }
  async verifyPayout(userId: string, body: VerifyPayoutDto) {
    const payload = {
      status: 'verified',
      method: body.method ?? null,
      channel: body.channel ?? null,
      code: body.code ?? null,
      verifiedAt: new Date().toISOString()
    };
    const record = await this.upsertUserSetting(userId, 'payout_verification', payload);
    await this.audit.log({
      userId,
      action: 'settings.payout_verified',
      entityType: 'payout_verification',
      entityId: record.id,
      route: '/api/settings/payout/verify',
      method: 'POST',
      statusCode: 200
    });
    return record.payload as Record<string, unknown>;
  }
  async signOutDevice(userId: string, id: string) {
    const profile = await this.ensureUserSecurityProfile(userId);
    await this.prisma.$transaction([
      this.prisma.userRememberedDevice.deleteMany({ where: { profileDbId: profile.dbId, externalId: id } }),
      this.prisma.userSecuritySession.deleteMany({ where: { profileDbId: profile.dbId, externalId: id } }),
      this.prisma.userSecurityTrustedDevice.deleteMany({ where: { profileDbId: profile.dbId, externalId: id } })
    ]);
    return { deleted: true };
  }
  async signOutAll(userId: string) {
    const profile = await this.ensureUserSecurityProfile(userId);
    await this.prisma.$transaction([
      this.prisma.userRememberedDevice.deleteMany({ where: { profileDbId: profile.dbId } }),
      this.prisma.userSecuritySession.deleteMany({ where: { profileDbId: profile.dbId } }),
      this.prisma.userSecurityTrustedDevice.deleteMany({ where: { profileDbId: profile.dbId } })
    ]);
    return { signedOutAll: true };
  }

  notifications(userId: string, role: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    }).then((rows) =>
      rows
        .filter((row) => this.matchesRoleMetadata(row.metadata, role))
        .map((row) => {
        const metadata =
          row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
            ? (row.metadata as Record<string, unknown>)
            : {};
        return {
          id: row.id,
          type: typeof metadata.type === 'string'
            ? metadata.type
            : row.kind === 'collaboration_invite'
              ? 'invite'
              : row.kind === 'collaboration_invite_response'
                ? 'proposal'
                : 'system',
          title: row.title,
          message: row.body,
          kind: row.kind,
          read: Boolean(row.readAt),
          readAt: row.readAt,
          brand: typeof metadata.sellerName === 'string' ? metadata.sellerName : typeof metadata.brand === 'string' ? metadata.brand : null,
          campaign: typeof metadata.campaignTitle === 'string' ? metadata.campaignTitle : null,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          metadata
        };
        })
    );
  }
  async notificationRead(userId: string, role: string, id: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id, userId }
    });
    if (!existing || !this.matchesRoleMetadata(existing.metadata, role)) {
      throw new NotFoundException('Notification not found');
    }
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() }
    });
  }
  async notificationUnread(userId: string, role: string, id: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id, userId }
    });
    if (!existing || !this.matchesRoleMetadata(existing.metadata, role)) {
      throw new NotFoundException('Notification not found');
    }
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: null }
    });
  }
  async notificationReadAll(userId: string, role: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId, readAt: null },
      select: { id: true, metadata: true }
    });
    const ids = notifications
      .filter((row) => this.matchesRoleMetadata(row.metadata, role))
      .map((row) => row.id);
    if (ids.length === 0) {
      return { count: 0 };
    }
    return this.prisma.notification.updateMany({
      where: { id: { in: ids } },
      data: { readAt: new Date() }
    });
  }
  async sendTestNotification(userId: string, role: string, body: SendTestNotificationDto) {
    const scopeRole = this.workspaceScopeRole(role);
    const channels = Array.isArray(body.channels)
      ? body.channels
          .map((entry) => this.readString(entry).toLowerCase())
          .filter(Boolean)
      : [];
    const created = await this.prisma.notification.create({
      data: {
        userId,
        title: this.readString(body.title) || 'Test notification',
        body:
          this.readString(body.message) ||
          `Notification channels checked: ${channels.length ? channels.join(', ') : 'in-app only'}.`,
        kind: 'settings_test',
        metadata: this.ensurePayload({
          type: 'system',
          workspaceRole: scopeRole,
          channels,
          isTest: true,
          source: 'notification_preferences',
          ...(this.isPlainObject(body.metadata) ? body.metadata : {})
        }) as Prisma.InputJsonValue
      }
    });
    await this.audit.log({
      userId,
      action: 'settings.notification_test_sent',
      entityType: 'notification',
      entityId: created.id,
      route: '/api/settings/notification-preferences/test',
      method: 'POST',
      statusCode: 200,
      metadata: { channels, workspaceRole: scopeRole }
    });
    return {
      id: created.id,
      title: created.title,
      message: created.body,
      channels,
      createdAt: created.createdAt
    };
  }

  async roles(userId: string) {
    try {
      const workspace = await this.ensureWorkspaceSeed(userId);
      return workspace;
    } catch (error) {
      if (!this.isMissingSchemaObjectError(error)) {
        throw error;
      }
      return this.buildLegacyWorkspaceResponse(userId);
    }
  }

  async security(userId: string, body: UpdateRolesSecurityDto) {
    const workspace = await this.ensureWorkspaceSeed(userId);
    this.ensureWorkspaceRoleManager(workspace);

    const nextSecurity = {
      ...workspace.workspaceSecurity,
      ...(body.require2FA !== undefined ? { require2FA: body.require2FA } : {}),
      ...(body.allowExternalInvites !== undefined ? { allowExternalInvites: body.allowExternalInvites } : {}),
      ...(body.supplierGuestExpiryHours !== undefined
        ? { supplierGuestExpiryHours: Math.max(1, Math.min(168, Math.round(body.supplierGuestExpiryHours))) }
        : {}),
      ...(body.requireApprovalForPayouts !== undefined ? { requireApprovalForPayouts: body.requireApprovalForPayouts } : {}),
      ...(body.payoutApprovalThresholdUsd !== undefined
        ? { payoutApprovalThresholdUsd: Math.max(0, Math.round(body.payoutApprovalThresholdUsd)) }
        : {}),
      ...(body.restrictSensitiveExports !== undefined ? { restrictSensitiveExports: body.restrictSensitiveExports } : {}),
      ...(body.sessionTimeoutMins !== undefined
        ? { sessionTimeoutMins: Math.max(5, Math.min(1440, Math.round(body.sessionTimeoutMins))) }
        : {}),
      ...(body.inviteDomainAllowlist !== undefined
        ? { inviteDomainAllowlist: body.inviteDomainAllowlist.map((entry) => entry.trim().toLowerCase()).filter(Boolean) }
        : {})
    };

    const record = await this.prisma.workspace.update({
      where: { id: workspace.workspace.id },
      data: {
        require2FA: nextSecurity.require2FA,
        allowExternalInvites: nextSecurity.allowExternalInvites,
        supplierGuestExpiryHours: nextSecurity.supplierGuestExpiryHours,
        inviteDomainAllowlist: nextSecurity.inviteDomainAllowlist as Prisma.InputJsonValue,
        requireApprovalForPayouts: nextSecurity.requireApprovalForPayouts,
        payoutApprovalThresholdUsd: nextSecurity.payoutApprovalThresholdUsd,
        restrictSensitiveExports: nextSecurity.restrictSensitiveExports,
        sessionTimeoutMins: nextSecurity.sessionTimeoutMins
      }
    });
    await this.audit.log({
      userId,
      action: 'workspace.security_updated',
      entityType: 'workspace',
      entityId: workspace.workspace.id,
      route: '/api/roles/security',
      method: 'PATCH',
      statusCode: 200
    });
    return this.serializeWorkspaceSecurity(record);
  }
  async createRole(userId: string, body: CreateRoleDto) {
    const workspace = await this.ensureWorkspaceSeed(userId);
    this.ensureWorkspaceRoleManager(workspace);

    const roleId = String(body.id ?? randomUUID());
    const nextName = body.name.trim();
    if (workspace.roles.some((role) => role.id === roleId)) {
      throw new BadRequestException('Role id already exists');
    }
    if (
      workspace.roles.some(
        (role) => String(role.name || '').trim().toLowerCase() === nextName.toLowerCase()
      )
    ) {
      throw new BadRequestException('Role name already exists');
    }

    const role = await this.prisma.workspaceRole.create({
      data: {
        workspaceId: workspace.workspace.id,
        key: roleId,
        name: nextName,
        badge: body.badge ?? 'Custom',
        description: body.description ?? 'Custom workspace role.',
        permissions: this.normalizePerms(body.perms) as Prisma.InputJsonValue
      }
    });
    await this.audit.log({
      userId,
      action: 'workspace.role_created',
      entityType: 'workspace_role',
      entityId: role.key,
      route: '/api/roles',
      method: 'POST',
      statusCode: 201,
      metadata: { name: role.name }
    });
    return this.serializeWorkspaceRole(role);
  }
  async updateRole(userId: string, id: string, body: UpdateRoleDto) {
    const workspace = await this.ensureWorkspaceSeed(userId);
    this.ensureWorkspaceRoleManager(workspace);
    const existing = workspace.roleRecords.find((entry) => entry.key === id);
    if (!existing) {
      throw new NotFoundException('Role not found');
    }

    if (body.name) {
      const nextName = body.name.trim();
      if (
        workspace.roles.some(
          (role) => role.id !== id && String(role.name || '').trim().toLowerCase() === nextName.toLowerCase()
        )
      ) {
        throw new BadRequestException('Role name already exists');
      }
    }

    const updated = await this.prisma.workspaceRole.update({
      where: { dbId: existing.dbId },
      data: {
        ...(body.name ? { name: body.name.trim() } : {}),
        ...(body.badge ? { badge: body.badge.trim() } : {}),
        ...(body.description ? { description: body.description.trim() } : {}),
        ...(body.perms
          ? {
              permissions: {
                ...this.readPermissionPayload(existing.permissions),
                ...this.normalizePerms(body.perms)
              } as Prisma.InputJsonValue
            }
          : {})
      }
    });
    await this.audit.log({
      userId,
      action: 'workspace.role_updated',
      entityType: 'workspace_role',
      entityId: id,
      route: `/api/roles/${id}`,
      method: 'PATCH',
      statusCode: 200
    });
    return this.serializeWorkspaceRole(updated);
  }
  async deleteRole(userId: string, id: string) {
    const workspace = await this.ensureWorkspaceSeed(userId);
    this.ensureWorkspaceRoleManager(workspace);
    const role = workspace.roleRecords.find((entry) => entry.key === id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (role.isSystem || String(role.badge || '').toLowerCase() === 'system') {
      throw new BadRequestException('System roles cannot be deleted');
    }
    if (workspace.memberRecords.some((member) => member.roleDbId === role.dbId)) {
      throw new BadRequestException('Role is still assigned to a workspace member');
    }

    await this.prisma.workspaceRole.delete({ where: { dbId: role.dbId } });
    await this.audit.log({
      userId,
      action: 'workspace.role_deleted',
      entityType: 'workspace_role',
      entityId: id,
      route: `/api/roles/${id}`,
      method: 'DELETE',
      statusCode: 200,
      metadata: { name: role.name }
    });
    return { deleted: true };
  }
  async createInvite(userId: string, body: CreateInviteDto) {
    const workspace = await this.ensureWorkspaceSeed(userId);
    this.ensureWorkspaceRoleManager(workspace);
    const role = workspace.roleRecords.find((entry) => entry.key === body.roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const normalizedEmail = body.email.trim().toLowerCase();
    if (workspace.members.some((member) => String(member.email || '').toLowerCase() === normalizedEmail)) {
      throw new BadRequestException('A workspace member with that email already exists');
    }

    const allowlist = Array.isArray(workspace.workspaceSecurity.inviteDomainAllowlist)
      ? workspace.workspaceSecurity.inviteDomainAllowlist
      : DEFAULT_INVITE_DOMAIN_ALLOWLIST;
    const domain = normalizedEmail.split('@')[1] || '';
    const isExternal = domain ? !allowlist.includes(domain) : true;
    if (!workspace.workspaceSecurity.allowExternalInvites && isExternal) {
      throw new ForbiddenException('External invites are blocked by workspace policy');
    }

    const invite = await this.prisma.$transaction(async (tx) => {
      const member = await tx.workspaceMember.create({
        data: {
          externalId: body.id ?? randomUUID(),
          workspaceId: workspace.workspace.id,
          userId: normalizedEmail === (workspace.ownerEmail ?? '') ? workspace.workspace.ownerUserId : null,
          roleDbId: role.dbId,
          name: body.name,
          email: normalizedEmail,
          status: 'invited',
          seat: body.seat ?? 'Team',
          invitedAt: new Date()
        },
        include: { role: true }
      });

      const inviteRow = await tx.workspaceInvite.create({
        data: {
          workspaceId: workspace.workspace.id,
          roleDbId: role.dbId,
          memberDbId: member.dbId,
          invitedByUserId: userId,
          name: body.name,
          email: normalizedEmail,
          status: 'invited',
          seat: body.seat ?? 'Team'
        },
        include: { role: true, member: { include: { role: true } } }
      });

      return { inviteRow, member };
    });
    await this.audit.log({
      userId,
      action: 'workspace.member_invited',
      entityType: 'workspace_member',
      entityId: invite.member.externalId,
      route: '/api/roles/invites',
      method: 'POST',
      statusCode: 201,
      metadata: { email: invite.member.email }
    });
    return this.serializeWorkspaceMember(invite.member);
  }
  async updateMember(userId: string, id: string, body: UpdateMemberDto) {
    const workspace = await this.ensureWorkspaceSeed(userId);
    this.ensureWorkspaceRoleManager(workspace);

    const existing = workspace.memberRecords.find((entry) => entry.externalId === id);
    if (!existing) {
      throw new NotFoundException('Member not found');
    }
    const nextRole = body.roleId
      ? workspace.roleRecords.find((role) => role.key === body.roleId) ?? null
      : null;
    if (body.roleId && !nextRole) {
      throw new NotFoundException('Role not found');
    }

    const updated = await this.prisma.workspaceMember.update({
      where: { dbId: existing.dbId },
      data: {
        ...(nextRole ? { roleDbId: nextRole.dbId } : {}),
        ...(body.status ? { status: body.status.trim().toLowerCase() } : {}),
        ...(body.seat ? { seat: body.seat.trim() || existing.seat } : {})
      },
      include: { role: true }
    });
    await this.audit.log({
      userId,
      action: 'workspace.member_updated',
      entityType: 'workspace_member',
      entityId: id,
      route: `/api/roles/members/${id}`,
      method: 'PATCH',
      statusCode: 200,
      metadata: { email: updated.email }
    });
    return this.serializeWorkspaceMember(updated);
  }

  async deleteMember(userId: string, id: string) {
    const workspace = await this.ensureWorkspaceSeed(userId);
    this.ensureWorkspaceRoleManager(workspace);

    const existing = workspace.memberRecords.find((entry) => entry.externalId === id);
    if (!existing) {
      throw new NotFoundException('Member not found');
    }

    await this.prisma.$transaction([
      this.prisma.workspaceInvite.deleteMany({ where: { workspaceId: workspace.workspace.id, OR: [{ memberDbId: existing.dbId }, { email: existing.email }] } }),
      this.prisma.workspaceCrewAssignment.deleteMany({ where: { memberDbId: existing.dbId } }),
      this.prisma.workspaceMember.delete({ where: { dbId: existing.dbId } })
    ]);
    await this.audit.log({
      userId,
      action: 'workspace.member_deleted',
      entityType: 'workspace_member',
      entityId: id,
      route: `/api/roles/members/${id}`,
      method: 'DELETE',
      statusCode: 200,
      metadata: { email: existing.email }
    });
    return { deleted: true };
  }

  async crew(userId: string) {
    const workspace = await this.ensureWorkspaceSeed(userId);
    await this.migrateLegacyCrewSessions(userId, workspace.workspace.id);
    const sessions = await this.prisma.workspaceCrewSession.findMany({
      where: { workspaceId: workspace.workspace.id },
      include: {
        assignments: {
          include: {
            member: {
              include: { role: true }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    return sessions.map((session) => this.serializeCrewSession(session));
  }
  async crewSession(userId: string, id: string, body: UpdateCrewSessionDto) {
    const workspace = await this.ensureWorkspaceSeed(userId);
    this.ensureWorkspaceRoleManager(workspace);
    const session = await this.prisma.workspaceCrewSession.upsert({
      where: { workspaceId_sessionKey: { workspaceId: workspace.workspace.id, sessionKey: id } },
      update: {
        payload: { updatedAt: new Date().toISOString() } as Prisma.InputJsonValue
      },
      create: {
        workspaceId: workspace.workspace.id,
        sessionKey: id,
        payload: { updatedAt: new Date().toISOString() } as Prisma.InputJsonValue
      }
    });
    if (body.assignments) {
      await this.prisma.workspaceCrewAssignment.deleteMany({ where: { crewSessionDbId: session.dbId } });
      if (body.assignments.length > 0) {
        await this.prisma.workspaceCrewAssignment.createMany({
          data: body.assignments.map((assignment) => ({
            crewSessionDbId: session.dbId,
            memberDbId: this.resolveCrewAssignmentMemberDbId(assignment, workspace.memberRecords),
            assignmentRole: this.resolveCrewAssignmentRole(assignment),
            payload: this.ensurePayload(assignment) as Prisma.InputJsonValue
          }))
        });
      }
    }
    const updated = await this.prisma.workspaceCrewSession.findUniqueOrThrow({
      where: { dbId: session.dbId },
      include: {
        assignments: {
          include: {
            member: {
              include: { role: true }
            }
          }
        }
      }
    });
    await this.audit.log({
      userId,
      action: 'workspace.crew_updated',
      entityType: 'crew_session',
      entityId: id,
      route: `/api/crew/sessions/${id}`,
      method: 'PATCH',
      statusCode: 200
    });
    return this.serializeCrewSession(updated);
  }
  auditLogs(userId: string) {
    return this.ensureWorkspaceSeed(userId).then((workspace) => {
      if (!this.canViewAuditLog(workspace)) {
        throw new ForbiddenException('You do not have permission to view audit logs');
      }
      return this.prisma.auditEvent.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100
      });
    });
  }

  async preferences(userId: string, role: string) {
    const scopeRole = this.workspaceScopeRole(role);
    const derived = await this.derivePreferences(userId);
    try {
      const workspace = await this.ensureWorkspaceSeed(userId);
      await this.migrateLegacyPreferences(userId, workspace.workspace.id, scopeRole);
      const stored = await this.readPreferences(workspace.workspace.id, userId, scopeRole);
      return this.deepMerge(derived, stored ?? {});
    } catch {
      const legacy = await this.findWorkspaceSetting(userId, this.scopedKey(scopeRole, 'preferences'));
      return this.deepMerge(derived, this.isPlainObject(legacy) ? legacy : {});
    }
  }
  async updatePreferences(userId: string, role: string, body: UpdatePreferencesDto) {
    const scopeRole = this.workspaceScopeRole(role);
    const current = await this.preferences(userId, role);
    const next = {
      ...current,
      ...(body.locale ? { locale: body.locale } : {}),
      ...(body.currency ? { currency: body.currency } : {}),
      ...(body.timezone ? { timezone: body.timezone } : {})
    };
    try {
      const workspace = await this.ensureWorkspaceSeed(userId);
      const record = await this.prisma.workspaceUserPreference.upsert({
        where: {
          workspaceId_userId_scopeRole: {
            workspaceId: workspace.workspace.id,
            userId,
            scopeRole
          }
        },
        update: {
          locale: this.readString(next.locale) || null,
          currency: this.readString(next.currency) || null,
          timezone: this.readString(next.timezone) || null
        },
        create: {
          workspaceId: workspace.workspace.id,
          userId,
          scopeRole,
          locale: this.readString(next.locale) || null,
          currency: this.readString(next.currency) || null,
          timezone: this.readString(next.timezone) || null
        }
      });
      await this.audit.log({
        userId,
        action: 'settings.preferences_updated',
        entityType: 'workspace_user_preference',
        entityId: 'preferences',
        route: '/api/settings/preferences',
        method: 'PATCH',
        statusCode: 200
      });
      return {
        locale: record.locale,
        currency: record.currency,
        timezone: record.timezone
      };
    } catch {
      const record = await this.upsertWorkspaceSetting(userId, this.scopedKey(scopeRole, 'preferences'), next);
      await this.audit.log({
        userId,
        action: 'settings.preferences_updated',
        entityType: 'workspace_setting',
        entityId: 'preferences',
        route: '/api/settings/preferences',
        method: 'PATCH',
        statusCode: 200
      });
      return record.payload as Record<string, unknown>;
    }
  }
  uiState(userId: string, role: string) {
    const defaults = {
      theme: null,
      locale: null,
      currency: null,
      moneyBar: {},
      creatorContext: {},
      shell: {},
      onboarding: {},
      channels: {}
    };
    return this.getUserSetting(userId, this.scopedKey(role, 'ui_state'), defaults).catch(() => defaults);
  }
  async updateUiState(userId: string, role: string, body: Record<string, unknown>) {
    const current = await this.uiState(userId, role);
    const patch = this.isPlainObject(body) ? body : {};
    const next = this.deepMerge(current, patch);
    try {
      const record = await this.upsertUserSetting(userId, this.scopedKey(role, 'ui_state'), next);
      await this.audit.log({
        userId,
        action: 'settings.ui_state_updated',
        entityType: 'user_setting',
        entityId: 'ui_state',
        route: '/api/settings/ui-state',
        method: 'PATCH',
        statusCode: 200,
        metadata: { keys: Object.keys(patch) }
      });
      return record.payload as Record<string, unknown>;
    } catch {
      return next;
    }
  }
  async payoutMethods(userId: string) {
    const workspace = await this.ensureWorkspaceSeed(userId);
    await this.migrateLegacyPayoutMethods(userId, workspace.workspace.id);
    const [stored, derived] = await Promise.all([
      this.readPayoutMethods(workspace.workspace.id),
      this.derivePayoutMethods(userId)
    ]);
    return this.deepMerge(derived, stored ?? {});
  }
  async updatePayoutMethods(userId: string, body: UpdatePayoutMethodsDto) {
    const workspace = await this.ensureWorkspaceSeed(userId);
    const methods = Array.isArray(body.methods) ? body.methods : [];
    const normalized = methods.map((method, index) => ({
      ...method,
      id: method.id ?? randomUUID(),
      isDefault: method.isDefault ?? index === 0
    }));
    const hasDefault = normalized.some((method) => method.isDefault);
    if (!hasDefault && normalized.length > 0) {
      normalized[0].isDefault = true;
    }
    await this.prisma.$transaction(async (tx) => {
      const settings = await tx.workspacePayoutSettings.upsert({
        where: { workspaceId: workspace.workspace.id },
        update: {
          metadata: this.ensurePayload(body.metadata ?? {}) as Prisma.InputJsonValue
        },
        create: {
          workspaceId: workspace.workspace.id,
          metadata: this.ensurePayload(body.metadata ?? {}) as Prisma.InputJsonValue
        }
      });
      await tx.workspacePayoutMethod.deleteMany({
        where: { settingsDbId: settings.dbId }
      });
      if (normalized.length > 0) {
        await tx.workspacePayoutMethod.createMany({
          data: normalized.map((method, index) => {
            const payload = this.ensureObjectPayload(method);
            return {
              settingsDbId: settings.dbId,
              externalId: this.readString(payload.id) || randomUUID(),
              type: this.readString(payload.type) || 'provider',
              label: this.readString(payload.label) || null,
              currency: this.readString(payload.currency) || null,
              isDefault: Boolean(payload.isDefault),
              position: index,
              payload: payload as Prisma.InputJsonValue
            };
          })
        });
      }
    });
    await this.audit.log({
      userId,
      action: 'settings.payout_methods_updated',
      entityType: 'workspace_payout_method',
      entityId: 'payout_methods',
      route: '/api/settings/payout-methods',
      method: 'PATCH',
      statusCode: 200
    });
    return this.payoutMethods(userId);
  }
  async securitySettings(userId: string) {
    await this.migrateLegacySecurity(userId);
    const current = await this.readSecuritySettings(userId);
    return {
      ...DEFAULT_SECURITY_SETTINGS,
      ...(current ?? {}),
      twoFactorConfig: {
        ...DEFAULT_SECURITY_SETTINGS.twoFactorConfig,
        ...(((current ?? {}).twoFactorConfig as Record<string, unknown> | undefined) ?? {})
      },
      passkeys: this.extractList(current ?? {}, 'passkeys'),
      sessions: this.extractList(current ?? {}, 'sessions'),
      trustedDevices: this.extractList(current ?? {}, 'trustedDevices'),
      alerts: this.extractList(current ?? {}, 'alerts')
    };
  }
  async updateSecuritySettings(userId: string, body: UpdateSecuritySettingsDto) {
    const current = await this.securitySettings(userId);
    const next = {
      ...current,
      ...(body.twoFactor !== undefined ? { twoFactor: body.twoFactor } : {}),
      ...(body.twoFactorMethod ? { twoFactorMethod: body.twoFactorMethod } : {}),
      ...(body.twoFactorConfig ? { twoFactorConfig: this.deepMerge(current.twoFactorConfig ?? {}, body.twoFactorConfig) } : {}),
      ...(body.sessions ? { sessions: body.sessions } : {}),
      ...(body.passkeys ? { passkeys: body.passkeys } : {}),
      ...(body.trustedDevices ? { trustedDevices: body.trustedDevices } : {}),
      ...(body.alerts ? { alerts: body.alerts } : {}),
      ...(body.metadata ? { metadata: this.deepMerge(((current as Record<string, unknown>).metadata as Record<string, unknown> | undefined) ?? {}, body.metadata) } : {})
    };
    const profile = await this.ensureUserSecurityProfile(userId);
    await this.prisma.$transaction(async (tx) => {
      await tx.userSecurityProfile.update({
        where: { userId },
        data: {
          twoFactor: Boolean(next.twoFactor),
          twoFactorMethod: this.readString(next.twoFactorMethod) || null,
          twoFactorConfig: this.ensurePayload(next.twoFactorConfig ?? {}) as Prisma.InputJsonValue,
          metadata: this.ensurePayload((next as Record<string, unknown>).metadata ?? {}) as Prisma.InputJsonValue
        }
      });
      await tx.userSecuritySession.deleteMany({ where: { profileDbId: profile.dbId } });
      await tx.userSecurityPasskey.deleteMany({ where: { profileDbId: profile.dbId } });
      await tx.userSecurityTrustedDevice.deleteMany({ where: { profileDbId: profile.dbId } });
      await tx.userSecurityAlert.deleteMany({ where: { profileDbId: profile.dbId } });
      if (Array.isArray(next.sessions) && next.sessions.length > 0) {
        await tx.userSecuritySession.createMany({
          data: next.sessions.map((session, index) => {
            const payload = this.ensureObjectPayload(session);
            return {
              profileDbId: profile.dbId,
              externalId: this.readString(payload.id) || `session-${index + 1}`,
              device: this.readString(payload.device) || null,
              ip: this.readString(payload.ip) || null,
              lastActiveAt: this.parseDate(this.readString(payload.lastActiveAt)),
              payload: payload as Prisma.InputJsonValue
            };
          })
        });
      }
      if (Array.isArray(next.passkeys) && next.passkeys.length > 0) {
        await tx.userSecurityPasskey.createMany({
          data: next.passkeys.map((passkey, index) => {
            const payload = this.ensureObjectPayload(passkey);
            return {
              profileDbId: profile.dbId,
              externalId: this.readString(payload.id) || `passkey-${index + 1}`,
              payload: payload as Prisma.InputJsonValue
            };
          })
        });
      }
      if (Array.isArray(next.trustedDevices) && next.trustedDevices.length > 0) {
        await tx.userSecurityTrustedDevice.createMany({
          data: next.trustedDevices.map((device, index) => {
            const payload = this.ensureObjectPayload(device);
            return {
              profileDbId: profile.dbId,
              externalId: this.readString(payload.id) || `trusted-${index + 1}`,
              payload: payload as Prisma.InputJsonValue
            };
          })
        });
      }
      if (Array.isArray(next.alerts) && next.alerts.length > 0) {
        await tx.userSecurityAlert.createMany({
          data: next.alerts.map((alert, index) => {
            const payload = this.ensureObjectPayload(alert);
            return {
              profileDbId: profile.dbId,
              externalId: this.readString(payload.id) || `alert-${index + 1}`,
              payload: payload as Prisma.InputJsonValue
            };
          })
        });
      }
    });
    await this.audit.log({
      userId,
      action: 'settings.security_updated',
      entityType: 'user_security_profile',
      entityId: 'security',
      route: '/api/settings/security',
      method: 'PATCH',
      statusCode: 200
    });
    return this.securitySettings(userId);
  }
  async integrations(userId: string) {
    const workspace = await this.ensureWorkspaceSeed(userId);
    await this.migrateLegacyIntegrations(userId, workspace.workspace.id);
    return (await this.readIntegrations(workspace.workspace.id)) ?? { integrations: [], webhooks: [] };
  }
  async updateIntegrations(userId: string, body: UpdateIntegrationsDto) {
    const workspace = await this.ensureWorkspaceSeed(userId);
    const current = await this.integrations(userId);
    const next = {
      ...current,
      ...(body.integrations ? { integrations: body.integrations } : {}),
      ...(body.webhooks ? { webhooks: body.webhooks } : {}),
      ...(body.metadata ? { metadata: body.metadata } : {})
    };
    await this.prisma.$transaction(async (tx) => {
      const settings = await tx.workspaceIntegrationSettings.upsert({
        where: { workspaceId: workspace.workspace.id },
        update: {
          metadata: this.ensurePayload((next as Record<string, unknown>).metadata ?? {}) as Prisma.InputJsonValue
        },
        create: {
          workspaceId: workspace.workspace.id,
          metadata: this.ensurePayload((next as Record<string, unknown>).metadata ?? {}) as Prisma.InputJsonValue
        }
      });
      await tx.workspaceIntegrationWebhook.deleteMany({
        where: { settingsDbId: settings.dbId }
      });
      await tx.workspaceIntegrationConnection.deleteMany({
        where: { settingsDbId: settings.dbId }
      });
      const integrations = Array.isArray(next.integrations) ? next.integrations : [];
      const integrationRows: Array<{ id: string; dbId: string }> = [];
      for (let index = 0; index < integrations.length; index += 1) {
        const payload = this.ensureObjectPayload(integrations[index]);
        const created = await tx.workspaceIntegrationConnection.create({
          data: {
            settingsDbId: settings.dbId,
            externalId: this.readString(payload.id) || randomUUID(),
            kind: this.readString(payload.kind) || this.readString(payload.type) || null,
            provider: this.readString(payload.provider) || null,
            status: this.readString(payload.status) || null,
            position: index,
            payload: payload as Prisma.InputJsonValue
          }
        });
        integrationRows.push({ id: created.externalId, dbId: created.id });
      }
      const integrationByExternalId = new Map(integrationRows.map((row) => [row.id, row.dbId]));
      const webhooks = Array.isArray(next.webhooks) ? next.webhooks : [];
      if (webhooks.length > 0) {
        await tx.workspaceIntegrationWebhook.createMany({
          data: webhooks.map((webhook, index) => {
            const payload = this.ensureObjectPayload(webhook);
            const integrationRef =
              this.readString(payload.integrationId) ||
              this.readString(payload.connectionId) ||
              this.readString(payload.providerId);
            return {
              settingsDbId: settings.dbId,
              integrationDbId: integrationRef ? integrationByExternalId.get(integrationRef) ?? null : null,
              externalId: this.readString(payload.id) || randomUUID(),
              status: this.readString(payload.status) || null,
              position: index,
              payload: payload as Prisma.InputJsonValue
            };
          })
        });
      }
    });
    await this.audit.log({
      userId,
      action: 'settings.integrations_updated',
      entityType: 'workspace_integration',
      entityId: 'integrations',
      route: '/api/settings/integrations',
      method: 'PATCH',
      statusCode: 200
    });
    return this.integrations(userId);
  }
  async tax(userId: string) {
    const workspace = await this.ensureWorkspaceSeed(userId);
    await this.migrateLegacyTaxSettings(userId, workspace.workspace.id);
    const [stored, derived] = await Promise.all([
      this.readTaxSettings(workspace.workspace.id),
      this.deriveTaxSettings(userId)
    ]);
    return this.deepMerge(derived, stored ?? {});
  }
  async updateTax(userId: string, body: UpdateTaxDto) {
    const workspace = await this.ensureWorkspaceSeed(userId);
    const current = await this.tax(userId);
    const next = {
      ...current,
      ...(body.profiles ? { profiles: body.profiles } : {}),
      ...(body.reports ? { reports: body.reports } : {}),
      ...(body.metadata ? { metadata: body.metadata } : {})
    };
    await this.prisma.$transaction(async (tx) => {
      const settings = await tx.workspaceTaxSettings.upsert({
        where: { workspaceId: workspace.workspace.id },
        update: {
          metadata: this.ensurePayload((next as Record<string, unknown>).metadata ?? {}) as Prisma.InputJsonValue
        },
        create: {
          workspaceId: workspace.workspace.id,
          metadata: this.ensurePayload((next as Record<string, unknown>).metadata ?? {}) as Prisma.InputJsonValue
        }
      });
      await tx.workspaceTaxReport.deleteMany({
        where: { settingsDbId: settings.dbId }
      });
      await tx.workspaceTaxProfile.deleteMany({
        where: { settingsDbId: settings.dbId }
      });
      const profiles = Array.isArray(next.profiles) ? next.profiles : [];
      const profileRows: Array<{ id: string; dbId: string }> = [];
      for (let index = 0; index < profiles.length; index += 1) {
        const payload = this.ensureObjectPayload(profiles[index]);
        const created = await tx.workspaceTaxProfile.create({
          data: {
            settingsDbId: settings.dbId,
            externalId: this.readString(payload.id) || randomUUID(),
            profileName: this.readString(payload.profileName) || this.readString(payload.name) || null,
            country: this.readString(payload.country) || null,
            vatId: this.readString(payload.vatId) || null,
            status: this.readString(payload.status) || null,
            isDefault: Boolean(payload.isDefault),
            position: index,
            payload: payload as Prisma.InputJsonValue
          }
        });
        profileRows.push({ id: created.externalId, dbId: created.id });
      }
      const profileByExternalId = new Map(profileRows.map((row) => [row.id, row.dbId]));
      const reports = Array.isArray(next.reports) ? next.reports : [];
      if (reports.length > 0) {
        await tx.workspaceTaxReport.createMany({
          data: reports.map((report, index) => {
            const payload = this.ensureObjectPayload(report);
            const profileRef = this.readString(payload.profileId);
            return {
              settingsDbId: settings.dbId,
              profileDbId: profileRef ? profileByExternalId.get(profileRef) ?? null : null,
              externalId: this.readString(payload.id) || randomUUID(),
              status: this.readString(payload.status) || null,
              periodStart: this.parseDate(this.readString(payload.periodStart)),
              periodEnd: this.parseDate(this.readString(payload.periodEnd)),
              position: index,
              payload: payload as Prisma.InputJsonValue
            };
          })
        });
      }
    });
    await this.audit.log({
      userId,
      action: 'settings.tax_updated',
      entityType: 'workspace_tax_profile',
      entityId: 'tax',
      route: '/api/settings/tax',
      method: 'PATCH',
      statusCode: 200
    });
    return this.tax(userId);
  }
  async kyc(userId: string) {
    const workspace = await this.ensureWorkspaceSeed(userId);
    await this.migrateLegacyKyc(userId, workspace.workspace.id);
    const [stored, derived] = await Promise.all([
      this.readKyc(workspace.workspace.id),
      this.deriveKycSettings(userId)
    ]);
    return this.deepMerge(derived, stored ?? {});
  }
  async updateKyc(userId: string, body: UpdateKycDto) {
    const workspace = await this.ensureWorkspaceSeed(userId);
    const current = await this.kyc(userId);
    const next = {
      ...current,
      ...(body.status ? { status: body.status } : {}),
      ...(body.documents ? { documents: body.documents } : {}),
      ...(body.metadata ? { metadata: body.metadata } : {})
    };
    await this.prisma.$transaction(async (tx) => {
      const profile = await tx.workspaceKycProfile.upsert({
        where: { workspaceId: workspace.workspace.id },
        update: {
          status: this.readString((next as Record<string, unknown>).status) || 'pending',
          metadata: this.ensurePayload((next as Record<string, unknown>).metadata ?? {}) as Prisma.InputJsonValue
        },
        create: {
          workspaceId: workspace.workspace.id,
          status: this.readString((next as Record<string, unknown>).status) || 'pending',
          metadata: this.ensurePayload((next as Record<string, unknown>).metadata ?? {}) as Prisma.InputJsonValue
        }
      });
      await tx.workspaceKycDocument.deleteMany({
        where: { kycProfileDbId: profile.dbId }
      });
      const documents = Array.isArray(next.documents) ? next.documents : [];
      if (documents.length > 0) {
        await tx.workspaceKycDocument.createMany({
          data: documents.map((document, index) => {
            const payload = this.ensureObjectPayload(document);
            return {
              kycProfileDbId: profile.dbId,
              externalId: this.readString(payload.id) || randomUUID(),
              title: this.readString(payload.title) || null,
              status: this.readString(payload.status) || null,
              uploadedAt: this.parseDate(this.readString(payload.uploadedAt)),
              expiresAt: this.parseDate(this.readString(payload.expiresAt)),
              position: index,
              payload: payload as Prisma.InputJsonValue
            };
          })
        });
      }
    });
    await this.audit.log({
      userId,
      action: 'settings.kyc_updated',
      entityType: 'workspace_kyc_document',
      entityId: 'kyc',
      route: '/api/settings/kyc',
      method: 'PATCH',
      statusCode: 200
    });
    return this.kyc(userId);
  }
  async savedViews(userId: string, role: string) {
    const scopeRole = this.workspaceScopeRole(role);
    try {
      const workspace = await this.ensureWorkspaceSeed(userId);
      await this.migrateLegacySavedViews(userId, workspace.workspace.id, scopeRole);
      const group = await this.prisma.workspaceSavedViewGroup.findUnique({
        where: { workspaceId_scopeRole: { workspaceId: workspace.workspace.id, scopeRole } },
        include: {
          views: {
            orderBy: [{ position: 'asc' }, { createdAt: 'asc' }]
          }
        }
      });
      return {
        views: (group?.views ?? []).map((view) => this.serializeStructuredPayload(view.payload, view.externalId)),
        ...(this.isPlainObject(group?.metadata) ? { metadata: group?.metadata as Record<string, unknown> } : {})
      };
    } catch {
      const payload = await this.findWorkspaceSetting(userId, this.scopedKey(scopeRole, 'saved_views'));
      const legacyViews = this.extractList(payload ?? { views: [] }, 'views').map((view, index) =>
        this.serializeStructuredPayload(view, `saved-view-${index + 1}`)
      );
      return {
        views: legacyViews,
        ...(this.isPlainObject(payload?.metadata) ? { metadata: payload?.metadata as Record<string, unknown> } : {})
      };
    }
  }
  async updateSavedViews(userId: string, role: string, body: UpdateSavedViewsDto) {
    const scopeRole = this.workspaceScopeRole(role);
    const current = await this.savedViews(userId, scopeRole);
    const next = {
      ...current,
      ...(body.views ? { views: body.views } : {}),
      ...(body.metadata ? { metadata: body.metadata } : {})
    };
    try {
      const workspace = await this.ensureWorkspaceSeed(userId);
      await this.prisma.$transaction(async (tx) => {
        const group = await tx.workspaceSavedViewGroup.upsert({
          where: { workspaceId_scopeRole: { workspaceId: workspace.workspace.id, scopeRole } },
          update: {
            metadata: this.ensurePayload((next as Record<string, unknown>).metadata ?? {}) as Prisma.InputJsonValue
          },
          create: {
            workspaceId: workspace.workspace.id,
            scopeRole,
            metadata: this.ensurePayload((next as Record<string, unknown>).metadata ?? {}) as Prisma.InputJsonValue
          }
        });
        await tx.workspaceSavedView.deleteMany({
          where: { groupDbId: group.dbId }
        });
        if (Array.isArray(next.views) && next.views.length > 0) {
          await tx.workspaceSavedView.createMany({
            data: next.views.map((view, index) => {
              const payload = this.ensureObjectPayload(view);
              return {
                groupDbId: group.dbId,
                createdByUserId: userId,
                externalId: this.readString(payload.id) || randomUUID(),
                name: this.readString(payload.name) || this.readString(payload.label) || `Saved view ${index + 1}`,
                position: index,
                payload: payload as Prisma.InputJsonValue
              };
            })
          });
        }
      });
    } catch {
      await this.upsertWorkspaceSetting(userId, this.scopedKey(scopeRole, 'saved_views'), next);
    }
    await this.audit.log({
      userId,
      action: 'settings.saved_views_updated',
      entityType: 'workspace_saved_view',
      entityId: 'saved_views',
      route: '/api/settings/saved-views',
      method: 'PATCH',
      statusCode: 200
    });
    return this.savedViews(userId, scopeRole);
  }
  async help(userId: string) {
    const workspace = await this.ensureWorkspaceSeed(userId);
    await this.migrateLegacyHelpLinks(userId, workspace.workspace.id);
    const rows = await this.prisma.workspaceHelpLink.findMany({
      where: { workspaceId: workspace.workspace.id },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }]
    });
    return {
      links: rows.map((row) => this.serializeStructuredPayload(row.payload, row.externalId))
    };
  }
  async statusCenter(userId: string) {
    const workspace = await this.ensureWorkspaceSeed(userId);
    await this.migrateLegacyStatusServices(userId, workspace.workspace.id);
    const rows = await this.prisma.workspaceStatusService.findMany({
      where: { workspaceId: workspace.workspace.id },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }]
    });
    return {
      services: rows.map((row) => this.serializeStructuredPayload(row.payload, row.externalId))
    };
  }
  async notificationPreferences(userId: string, role: string) {
    const scopeRole = this.workspaceScopeRole(role);
    try {
      const workspace = await this.ensureWorkspaceSeed(userId);
      await this.migrateLegacyNotificationPreferences(userId, workspace.workspace.id, scopeRole);
      const preference = await this.prisma.workspaceNotificationPreference.findUnique({
        where: {
          workspaceId_userId_scopeRole: {
            workspaceId: workspace.workspace.id,
            userId,
            scopeRole
          }
        },
        include: {
          watches: {
            orderBy: [{ position: 'asc' }, { createdAt: 'asc' }]
          }
        }
      });
      return {
        watches: (preference?.watches ?? []).map((watch) => this.serializeStructuredPayload(watch.payload, watch.externalId)),
        ...(this.isPlainObject(preference?.metadata) ? { metadata: preference?.metadata as Record<string, unknown> } : {})
      };
    } catch (error) {
      if (this.isMissingSchemaObjectError(error)) {
        return this.readLegacyNotificationPreferences(userId, scopeRole);
      }
      throw error;
    }
  }
  async updateNotificationPreferences(userId: string, role: string, body: UpdateNotificationPreferencesDto) {
    const scopeRole = this.workspaceScopeRole(role);
    const current = await this.notificationPreferences(userId, scopeRole);
    const next = {
      ...current,
      ...(body.watches ? { watches: body.watches } : {}),
      ...(body.metadata ? { metadata: body.metadata } : {})
    };
    try {
      const workspace = await this.ensureWorkspaceSeed(userId);
      await this.prisma.$transaction(async (tx) => {
        const preference = await tx.workspaceNotificationPreference.upsert({
          where: {
            workspaceId_userId_scopeRole: {
              workspaceId: workspace.workspace.id,
              userId,
              scopeRole
            }
          },
          update: {
            metadata: this.ensurePayload((next as Record<string, unknown>).metadata ?? {}) as Prisma.InputJsonValue
          },
          create: {
            workspaceId: workspace.workspace.id,
            userId,
            scopeRole,
            metadata: this.ensurePayload((next as Record<string, unknown>).metadata ?? {}) as Prisma.InputJsonValue
          }
        });
        await tx.workspaceNotificationWatch.deleteMany({
          where: { preferenceDbId: preference.dbId }
        });
        if (Array.isArray(next.watches) && next.watches.length > 0) {
          await tx.workspaceNotificationWatch.createMany({
            data: next.watches.map((watch, index) => {
              const payload = this.ensureObjectPayload(watch);
              return {
                preferenceDbId: preference.dbId,
                externalId: this.readString(payload.id) || randomUUID(),
                channel: this.readString(payload.channel) || null,
                enabled: payload.enabled === undefined ? null : Boolean(payload.enabled),
                position: index,
                payload: payload as Prisma.InputJsonValue
              };
            })
          });
        }
      });
    } catch (error) {
      if (this.isMissingSchemaObjectError(error)) {
        await this.writeLegacyNotificationPreferences(userId, scopeRole, next);
      } else {
        throw error;
      }
    }
    await this.audit.log({
      userId,
      action: 'settings.notifications_updated',
      entityType: 'workspace_notification_preference',
      entityId: 'notification_preferences',
      route: '/api/settings/notification-preferences',
      method: 'PATCH',
      statusCode: 200
    });
    return this.notificationPreferences(userId, scopeRole);
  }

  private async getWorkspaceSetting(userId: string, key: string, defaultValue: Record<string, unknown>) {
    try {
      const record = await this.prisma.workspaceSetting.findUnique({
        where: { userId_key: { userId, key } }
      });
      return record ? (record.payload as Record<string, unknown>) : defaultValue;
    } catch (error) {
      if (this.isMissingSchemaObjectError(error)) {
        return defaultValue;
      }
      throw error;
    }
  }

  private async findWorkspaceSetting(userId: string, key: string) {
    try {
      const record = await this.prisma.workspaceSetting.findUnique({
        where: { userId_key: { userId, key } }
      });
      return record ? (record.payload as Record<string, unknown>) : null;
    } catch (error) {
      if (this.isMissingSchemaObjectError(error)) {
        return null;
      }
      throw error;
    }
  }

  private async findUserSetting(userId: string, key: string) {
    try {
      const record = await this.prisma.userSetting.findUnique({
        where: { userId_key: { userId, key } }
      });
      return record ? (record.payload as Record<string, unknown>) : null;
    } catch (error) {
      if (this.isMissingSchemaObjectError(error)) {
        return null;
      }
      throw error;
    }
  }

  private async upsertWorkspaceSetting(userId: string, key: string, body: unknown) {
    const sanitized = this.ensurePayload(body);
    try {
      return await this.prisma.workspaceSetting.upsert({
        where: { userId_key: { userId, key } },
        update: { payload: sanitized as Prisma.InputJsonValue },
        create: {
          userId,
          key,
          payload: sanitized as Prisma.InputJsonValue
        }
      });
    } catch (error) {
      if (this.isMissingSchemaObjectError(error)) {
        const now = new Date();
        return {
          id: `workspace-setting-fallback:${userId}:${key}`,
          userId,
          key,
          payload: sanitized,
          createdAt: now,
          updatedAt: now
        };
      }
      throw error;
    }
  }

  private async getUserSetting(userId: string, key: string, defaultValue: Record<string, unknown>) {
    try {
      const record = await this.prisma.userSetting.findUnique({
        where: { userId_key: { userId, key } }
      });
      return record ? (record.payload as Record<string, unknown>) : defaultValue;
    } catch (error) {
      if (this.isMissingSchemaObjectError(error)) {
        return defaultValue;
      }
      throw error;
    }
  }

  private async upsertUserSetting(userId: string, key: string, body: unknown) {
    const sanitized = this.ensurePayload(body);
    try {
      return await this.prisma.userSetting.upsert({
        where: { userId_key: { userId, key } },
        update: { payload: sanitized as Prisma.InputJsonValue },
        create: {
          userId,
          key,
          payload: sanitized as Prisma.InputJsonValue
        }
      });
    } catch (error) {
      if (this.isMissingSchemaObjectError(error)) {
        const now = new Date();
        return {
          id: `user-setting-fallback:${userId}:${key}`,
          userId,
          key,
          payload: sanitized,
          createdAt: now,
          updatedAt: now
        };
      }
      throw error;
    }
  }

  private ensurePayload(payload: unknown) {
    const sanitized = sanitizePayload(payload, { maxDepth: 6, maxArrayLength: 300, maxKeys: 300 });
    if (sanitized === undefined) {
      throw new BadRequestException('Invalid payload');
    }
    return sanitized;
  }

  private ensureObjectPayload(payload: unknown) {
    const sanitized = this.ensurePayload(payload);
    if (!sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) {
      throw new BadRequestException('Invalid payload');
    }
    return sanitized as Record<string, unknown>;
  }

  private extractList(payload: unknown, key: string) {
    if (Array.isArray(payload)) {
      return payload;
    }
    if (payload && typeof payload === 'object' && Array.isArray((payload as Record<string, unknown>)[key])) {
      return (payload as Record<string, unknown>)[key] as unknown[];
    }
    return [];
  }

  private readPermissionPayload(payload: unknown) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(payload as Record<string, unknown>).map(([key, value]) => [key, Boolean(value)])
    );
  }

  private parseDate(value: string) {
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.valueOf()) ? null : parsed;
  }

  private async deriveSettings(userId: string) {
    const context = await this.loadDerivedAccountContext(userId);
    const profile = this.buildDerivedProfile(context);
    return profile ? { profile } : {};
  }

  private async derivePreferences(userId: string) {
    const context = await this.loadDerivedAccountContext(userId);
    const onboarding = context.onboarding;
    const locale = this.normalizeLocale(
      this.firstString(this.readStringArray(onboarding?.languages), ['en'])
    );
    const currency = this.readString(onboarding?.payout?.currency) || 'USD';
    return {
      locale,
      currency
    };
  }

  private async derivePayoutMethods(userId: string) {
    const context = await this.loadDerivedAccountContext(userId);
    const onboarding = context.onboarding;
    if (!onboarding) {
      return { methods: [] };
    }

    const method = this.readString(onboarding.payout?.method);
    if (!method) {
      return { methods: [] };
    }

    const currency = this.readString(onboarding.payout?.currency) || 'USD';
    const createdAt = this.readString(onboarding.submittedAt) || this.readString(onboarding.updatedAt) || new Date().toISOString();
    const approvalStatus = this.readString(context.approval?.status).toLowerCase();
    const verified = approvalStatus === 'approved';

    const payoutMethod =
      method === 'bank_account'
        ? {
            id: 'onboarding-bank-account',
            kind: 'bank',
            type: 'bank',
            provider: this.readString(onboarding.payout?.bankName) || 'Bank',
            label:
              this.readString(onboarding.payout?.accountName) ||
              this.readString(onboarding.payout?.bankName) ||
              'Bank account',
            country:
              this.readString(onboarding.payout?.bankCountry) ||
              this.readString(onboarding.tax?.taxCountry) ||
              this.readString(onboarding.shipFrom?.country) ||
              'UG',
            currency,
            status: verified ? 'Verified' : 'Pending verification',
            isDefault: true,
            createdAt,
            lastUsedAt: null,
            masked: this.maskSensitiveValue(this.readString(onboarding.payout?.accountNo), 4),
            accountNumberMasked: this.maskSensitiveValue(this.readString(onboarding.payout?.accountNo), 4),
            details: {
              masked: this.maskSensitiveValue(this.readString(onboarding.payout?.accountNo), 4),
              swiftBic: this.readString(onboarding.payout?.swiftBic),
              iban: this.readString(onboarding.payout?.iban)
            }
          }
        : {
            id: `onboarding-${method}`,
            kind: 'provider',
            type: 'provider',
            provider: this.resolvePayoutProvider(onboarding),
            label: this.resolvePayoutLabel(onboarding),
            country:
              this.readString(onboarding.payout?.otherCountry) ||
              this.readString(onboarding.tax?.taxCountry) ||
              this.readString(onboarding.shipFrom?.country) ||
              'UG',
            currency,
            status: verified ? 'Verified' : 'Pending verification',
            isDefault: true,
            createdAt,
            lastUsedAt: null,
            masked: this.maskSensitiveValue(this.resolvePayoutAccountRef(onboarding), 4),
            details: {
              masked: this.maskSensitiveValue(this.resolvePayoutAccountRef(onboarding), 4)
            }
          };

    return {
      methods: [payoutMethod],
      metadata: {
        kycState: verified ? 'Verified' : 'Pending',
        payoutSchedule: this.formatPayoutRhythm(this.readString(onboarding.payout?.rhythm)),
        minThreshold: this.readNumber(onboarding.payout?.thresholdAmount) ?? 0
      }
    };
  }

  private async deriveTaxSettings(userId: string) {
    const context = await this.loadDerivedAccountContext(userId);
    const onboarding = context.onboarding;
    if (!onboarding) {
      return { profiles: [], reports: [] };
    }

    const taxCountry = this.readString(onboarding.tax?.taxCountry);
    const taxId = this.readString(onboarding.tax?.taxId);
    const vatNumber = this.readString(onboarding.tax?.vatNumber);
    const legalName = this.readString(onboarding.tax?.legalName);
    const hasTaxProfile = Boolean(taxCountry || taxId || vatNumber || legalName);

    return {
      profiles: hasTaxProfile
        ? [
            {
              id: `tax-${(taxCountry || 'default').toLowerCase()}`,
              profileName: legalName || `${taxCountry || 'Default'} tax profile`,
              country: taxCountry || this.readString(onboarding.shipFrom?.country) || 'UG',
              vatId: vatNumber || taxId || '',
              standardRate: 0,
              reducedRate: 0,
              status: this.readString(context.approval?.status).toLowerCase() === 'approved' ? 'Active' : 'In Review',
              isDefault: true,
              updatedAt: this.readString(onboarding.updatedAt) || new Date().toISOString(),
              notes: this.readString(onboarding.tax?.taxpayerType) || ''
            }
          ]
        : [],
      reports: [],
      metadata: {
        packHistory: [],
        invoiceCfg: {
          legalName,
          legalAddress: this.readString(onboarding.tax?.legalAddress),
          includeVatId: Boolean(vatNumber || taxId),
          requireBuyerTaxIdForB2B: this.readString(onboarding.tax?.taxpayerType).toLowerCase() !== 'individual'
        }
      }
    };
  }

  private async deriveKycSettings(userId: string) {
    const context = await this.loadDerivedAccountContext(userId);
    const onboarding = context.onboarding;
    if (!onboarding) {
      return { status: 'pending', documents: [] };
    }

    const uploadedAt = this.readString(onboarding.submittedAt) || this.readString(onboarding.updatedAt) || new Date().toISOString();
    const documents = Array.isArray(onboarding.docs?.list)
      ? onboarding.docs.list
          .filter((entry) => this.isPlainObject(entry))
          .map((entry, index) => {
            const fileUrl = this.readString((entry as Record<string, unknown>).fileUrl);
            const fileName =
              this.readString((entry as Record<string, unknown>).file) ||
              this.readString((entry as Record<string, unknown>).name) ||
              this.extractAssetName(fileUrl) ||
              null;
            return {
              id: this.readString((entry as Record<string, unknown>).id) || `kyc-doc-${index + 1}`,
              title: this.humanizeDocumentTitle(
                this.readString((entry as Record<string, unknown>).name) ||
                  this.readString((entry as Record<string, unknown>).type) ||
                  `Document ${index + 1}`
              ),
              required: true,
              status: this.normalizeKycDocumentStatus(
                this.readString((entry as Record<string, unknown>).status),
                this.readString((entry as Record<string, unknown>).expiry)
              ),
              fileName,
              uploadedAt: this.readString((entry as Record<string, unknown>).uploadedAt) || uploadedAt,
              expiresAt: this.readString((entry as Record<string, unknown>).expiry) || null,
              reason: this.readString((entry as Record<string, unknown>).notes) || undefined,
              history: [
                {
                  at: this.readString((entry as Record<string, unknown>).uploadedAt) || uploadedAt,
                  by: 'Supplier',
                  event: `Uploaded ${fileName || 'document'}`
                }
              ]
            };
          })
      : [];

    const history = [
      ...(this.readString(onboarding.submittedAt)
        ? [
            {
              at: this.readString(onboarding.submittedAt),
              by: 'Supplier',
              event: 'Submitted onboarding for review'
            }
          ]
        : []),
      ...(this.readString(context.approval?.approvedAt)
        ? [
            {
              at: this.readString(context.approval?.approvedAt),
              by: 'Compliance',
              event: 'Account approved'
            }
          ]
        : []),
      ...(this.readString(context.approval?.rejectedAt)
        ? [
            {
              at: this.readString(context.approval?.rejectedAt),
              by: 'Compliance',
              event: 'Account rejected'
            }
          ]
        : [])
    ].filter((entry) => Boolean(entry.at));

    return {
      status: this.normalizeKycState(this.readString(context.approval?.status)),
      documents,
      metadata: {
        history
      }
    };
  }

  private normalizeSettingsRecord(payload: Record<string, unknown>) {
    if (!payload.profile || typeof payload.profile !== 'object') {
      payload.profile = {};
    }
    if (!payload.settings || typeof payload.settings !== 'object') {
      payload.settings = {};
    }
    if (!payload.security || typeof payload.security !== 'object') {
      payload.security = {};
    }
    if (!payload.notifications || typeof payload.notifications !== 'object') {
      payload.notifications = {};
    }
    if (!payload.payout || typeof payload.payout !== 'object') {
      payload.payout = {};
    }
    return payload;
  }

  private async loadDerivedAccountContext(userId: string) {
    const [user, seller, onboarding, approval] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, phone: true }
      }),
      this.prisma.seller.findUnique({
        where: { userId },
        include: { storefront: true }
      }),
      this.getWorkflowRecordPayload(userId, 'onboarding', 'main'),
      this.getWorkflowRecordPayload(userId, 'account_approval', 'main')
    ]);

    return {
      user,
      seller,
      storefront: seller?.storefront ?? null,
      onboarding: this.isPlainObject(onboarding) ? (onboarding as Record<string, any>) : null,
      approval: this.isPlainObject(approval) ? (approval as Record<string, any>) : null
    };
  }

  private buildDerivedProfile(context: {
    user: { email?: string | null; phone?: string | null } | null;
    seller: {
      id: string;
      handle: string | null;
      name: string;
      displayName: string;
      legalBusinessName: string | null;
      storefrontName: string | null;
      category: string | null;
      description: string | null;
      updatedAt: Date;
      storefront?: {
        id: string;
        slug: string;
        name: string;
        tagline: string | null;
        description: string | null;
        logoUrl: string | null;
        coverUrl: string | null;
      } | null;
    } | null;
    storefront: {
      id: string;
      slug: string;
      name: string;
      tagline: string | null;
      description: string | null;
      logoUrl: string | null;
      coverUrl: string | null;
    } | null;
    onboarding: Record<string, any> | null;
    approval: Record<string, any> | null;
  }) {
    const onboarding = context.onboarding;
    const storefront = context.storefront;
    const seller = context.seller;
    const email = this.readString(context.user?.email) || this.readString(onboarding?.email);
    const phone = this.readString(context.user?.phone) || this.readString(onboarding?.phone);
    const shipFrom = this.isPlainObject(onboarding?.shipFrom) ? onboarding?.shipFrom : null;
    const addressLine1 = this.readString(shipFrom?.address1);
    const addressLine2 = this.readString(shipFrom?.address2);
    const country = this.readString(shipFrom?.country);
    const city = this.readString(shipFrom?.city);
    const province = this.readString(shipFrom?.province);
    const storeHandle = this.readString(storefront?.slug) || this.readString(seller?.handle) || this.readString(onboarding?.storeSlug);
    const storeName =
      this.readString(storefront?.name) ||
      this.readString(seller?.storefrontName) ||
      this.readString(seller?.displayName) ||
      this.readString(onboarding?.storeName) ||
      '';
    const productLines = this.buildDerivedProductLines(onboarding);

    return {
      identity: {
        displayName:
          this.readString(seller?.displayName) ||
          this.readString(onboarding?.storeName) ||
          this.readString(onboarding?.owner) ||
          '',
        legalName:
          this.readString(seller?.legalBusinessName) ||
          this.readString(onboarding?.tax?.legalName) ||
          '',
        handle: storeHandle,
        email,
        phone,
        website: this.readString(onboarding?.website),
        category:
          this.readString(seller?.category) ||
          this.readString(onboarding?.taxonomySelection?.label) ||
          this.readString(productLines[0]?.path?.slice(-1)?.[0]?.name) ||
          ''
      },
      branding: {
        tagline: this.readString(storefront?.tagline),
        description:
          this.readString(storefront?.description) ||
          this.readString(seller?.description) ||
          this.readString(onboarding?.about),
        primary: this.readString(onboarding?.brandColor) || '#03CD8C',
        accent: '#F77F00',
        logoUrl: this.readString(onboarding?.logoUrl) || this.readString(storefront?.logoUrl),
        coverUrl: this.readString(onboarding?.coverUrl) || this.readString(storefront?.coverUrl),
        logoName: this.extractAssetName(this.readString(onboarding?.logoUrl) || this.readString(storefront?.logoUrl)),
        coverName: this.extractAssetName(this.readString(onboarding?.coverUrl) || this.readString(storefront?.coverUrl))
      },
      addresses:
        addressLine1 || addressLine2 || city || country
          ? [
              {
                id: 'onboarding-primary-address',
                label: 'Primary warehouse',
                type: 'Warehouse',
                line1: [addressLine1, addressLine2].filter(Boolean).join(', '),
                city,
                region: province,
                country,
                isDefault: true,
                updatedAt:
                  this.readString(onboarding?.updatedAt) ||
                  seller?.updatedAt?.toISOString() ||
                  new Date().toISOString()
              }
            ]
          : [],
      stores:
        storeName || storeHandle
          ? [
              {
                id: storefront?.id || seller?.id || 'primary-store',
                name: storeName || 'Primary store',
                handle: storeHandle,
                region: country || this.readString(onboarding?.tax?.taxCountry) || 'Global',
                status: this.readString(context.approval?.status).toLowerCase() === 'approved' ? 'Active' : 'Planned'
              }
            ]
          : [],
      regions: Array.from(
        new Set(
          [
            country,
            this.readString(onboarding?.tax?.taxCountry),
            ...this.readStringArray(onboarding?.channels)
          ].filter(Boolean)
        )
      ),
      supportHours: '',
      socials: {
        facebook: '',
        instagram: '',
        twitter: '',
        youtube: '',
        linkedin: '',
        tiktok: ''
      },
      customSocials: [],
      productLines
    };
  }

  private buildDerivedProductLines(onboarding: Record<string, any> | null) {
    const selections = Array.isArray(onboarding?.taxonomySelections)
      ? onboarding.taxonomySelections
      : this.isPlainObject(onboarding?.taxonomySelection)
        ? [onboarding.taxonomySelection]
        : [];

    return selections
      .filter((entry) => this.isPlainObject(entry))
      .map((entry, index) => {
        const record = entry as Record<string, unknown>;
        const nodeId = this.readString(record.nodeId);
        if (!nodeId) {
          return null;
        }
        const pathNodes = Array.isArray(record.pathNodes)
          ? record.pathNodes
              .filter((node) => this.isPlainObject(node))
              .map((node, nodeIndex) => {
                const pathNode = node as Record<string, unknown>;
                return {
                  id: this.readString(pathNode.id) || `${nodeId}-path-${nodeIndex + 1}`,
                  name: this.readString(pathNode.name) || `Category ${nodeIndex + 1}`,
                  type: this.readString(pathNode.type) || 'Category'
                };
              })
          : this.readStringArray(record.path).map((name, pathIndex) => ({
              id: `${nodeId}-path-${pathIndex + 1}`,
              name,
              type: pathIndex === 0 ? 'Marketplace' : 'Category'
            }));
        return {
          id: `taxonomy-${nodeId}-${index + 1}`,
          nodeId,
          path: pathNodes,
          status: 'active'
        };
      })
      .filter(Boolean);
  }

  private async getWorkflowRecordPayload(userId: string, recordType: string, recordKey: string) {
    if (recordType === 'account_approval' && recordKey === 'main') {
      try {
        const accountApproval = await this.prisma.accountApproval.findUnique({
          where: { userId }
        });
        if (accountApproval) {
          return accountApproval.payload ?? null;
        }
      } catch (error) {
        if (!this.isMissingSchemaObjectError(error)) {
          throw error;
        }
      }
    }

    try {
      const record = await this.prisma.workflowRecord.findUnique({
        where: {
          userId_recordType_recordKey: {
            userId,
            recordType,
            recordKey
          }
        }
      });
      return record?.payload ?? null;
    } catch (error) {
      if (this.isMissingSchemaObjectError(error)) {
        return null;
      }
      throw error;
    }
  }

  private readString(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
  }

  private readNumber(value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private readStringArray(value: unknown) {
    return Array.isArray(value)
      ? value.map((entry) => this.readString(entry)).filter(Boolean)
      : [];
  }

  private firstString(values: string[], defaultValue: string[]) {
    return values.find(Boolean) || defaultValue[0];
  }

  private normalizeLocale(value: string) {
    return value || 'en';
  }

  private resolvePayoutProvider(onboarding: Record<string, any>) {
    const method = this.readString(onboarding.payout?.method);
    if (method === 'mobile_money') {
      return this.readString(onboarding.payout?.mobileProvider) || 'Mobile money';
    }
    if (method === 'alipay') {
      return 'Alipay';
    }
    if (method === 'wechat_pay') {
      return 'WeChat Pay';
    }
    return (
      this.readString(onboarding.payout?.otherProvider) ||
      this.readString(onboarding.payout?.otherMethod) ||
      'Payout provider'
    );
  }

  private resolvePayoutLabel(onboarding: Record<string, any>) {
    return (
      this.readString(onboarding.payout?.accountName) ||
      this.readString(onboarding.payout?.mobileNo) ||
      this.readString(onboarding.payout?.alipayLogin) ||
      this.readString(onboarding.payout?.wechatId) ||
      this.readString(onboarding.payout?.otherDescription) ||
      this.resolvePayoutProvider(onboarding)
    );
  }

  private resolvePayoutAccountRef(onboarding: Record<string, any>) {
    return (
      this.readString(onboarding.payout?.accountNo) ||
      this.readString(onboarding.payout?.mobileNo) ||
      this.readString(onboarding.payout?.alipayLogin) ||
      this.readString(onboarding.payout?.wechatId) ||
      this.readString(onboarding.payout?.otherDetails)
    );
  }

  private isMissingSchemaObjectError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2021' || error.code === 'P2022')
    );
  }

  private formatPayoutRhythm(value: string) {
    if (!value) {
      return 'Manual';
    }
    return value
      .split(/[_\s]+/)
      .filter(Boolean)
      .map((entry) => entry[0]?.toUpperCase() + entry.slice(1).toLowerCase())
      .join(' ');
  }

  private maskSensitiveValue(value: string, visibleDigits = 4) {
    if (!value) {
      return '';
    }
    const compact = value.replace(/\s+/g, '');
    const suffix = compact.slice(-visibleDigits);
    return suffix ? `**** ${suffix}` : '****';
  }

  private extractAssetName(value: string) {
    if (!value) {
      return '';
    }
    const [path] = value.split('?');
    const parts = path.split('/').filter(Boolean);
    return parts[parts.length - 1] ?? value;
  }

  private humanizeDocumentTitle(value: string) {
    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private normalizeKycDocumentStatus(status: string, expiry: string) {
    const normalized = status.toLowerCase();
    if (normalized === 'approved') return 'Approved';
    if (normalized === 'rejected') return 'Rejected';
    if (expiry) {
      const expiryDate = new Date(expiry);
      if (!Number.isNaN(expiryDate.getTime()) && expiryDate.getTime() <= Date.now() + 30 * 24 * 3600_000) {
        return 'Expiring';
      }
    }
    if (normalized === 'submitted' || normalized === 'uploaded' || normalized === 'pending') {
      return 'Submitted';
    }
    return 'Required';
  }

  private normalizeKycState(status: string) {
    const normalized = status.toLowerCase();
    if (normalized === 'approved') return 'verified';
    if (normalized === 'rejected') return 'rejected';
    if (normalized === 'resubmitted' || normalized === 'submitted' || normalized === 'pending') return 'pending';
    return 'pending';
  }

  private normalizeSettingsPatch(body: UpdateSettingsDto) {
    return {
      ...(body.settings ? { settings: body.settings } : {}),
      ...(body.notifications ? { notifications: body.notifications } : {}),
      ...(body.security ? { security: body.security } : {}),
      ...(body.payout ? { payout: body.payout } : {}),
      ...(body.profile ? { profile: body.profile } : {})
    };
  }

  private normalizePerms(perms: Record<string, boolean> | undefined) {
    if (!perms || typeof perms !== 'object' || Array.isArray(perms)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(perms).map(([key, value]) => [String(key), Boolean(value)])
    );
  }

  private isPlainObject(value: unknown) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  private deepMerge(base: any, patch: any) {
    if (patch === undefined) return base;
    if (Array.isArray(base) && Array.isArray(patch)) return [...patch];
    if (Array.isArray(patch)) return [...patch];
    if (this.isPlainObject(base) && this.isPlainObject(patch)) {
      const output = { ...base };
      Object.entries(patch).forEach(([key, value]) => {
        output[key] = this.deepMerge((base as any)[key], value);
      });
      return output;
    }
    return patch;
  }

  private canManageWorkspaceRoles(workspace: {
    currentMember: any | null;
    effectivePermissions: Record<string, boolean>;
  }) {
    return Boolean(
      workspace.currentMember &&
        (workspace.effectivePermissions['roles.manage'] ||
          workspace.effectivePermissions['admin.manage_roles'] ||
          workspace.effectivePermissions['admin.manage_team'] ||
          String(workspace.currentMember.seat || '').toLowerCase() === 'owner')
    );
  }

  private canViewAuditLog(workspace: {
    currentMember: any | null;
    effectivePermissions: Record<string, boolean>;
  }) {
    return Boolean(
      workspace.currentMember &&
        (workspace.effectivePermissions['admin.audit'] ||
          workspace.effectivePermissions['admin.manage_roles'] ||
          String(workspace.currentMember.seat || '').toLowerCase() === 'owner')
    );
  }

  private ensureWorkspaceRoleManager(workspace: {
    currentMember: any | null;
    effectivePermissions: Record<string, boolean>;
  }) {
    if (!workspace.currentMember) {
      throw new ForbiddenException('Workspace member not found');
    }
    if (!this.canManageWorkspaceRoles(workspace)) {
      throw new ForbiddenException('You do not have permission to manage workspace roles');
    }
  }

  private scopedKey(role: string, key: string) {
    return `${String(role || 'seller').toLowerCase()}:${key}`;
  }

  private workspaceScopeRole(role: string) {
    return String(role || 'SELLER').trim().toUpperCase() || 'SELLER';
  }

  private matchesRoleMetadata(metadata: unknown, role: string) {
    const currentRole = String(role || '').toUpperCase();
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return true;
    }
    const workspaceRole = String((metadata as Record<string, unknown>).workspaceRole || '').toUpperCase();
    if (!workspaceRole) {
      return true;
    }
    if (workspaceRole === currentRole) {
      return true;
    }
    const isCommerceRole = (value: string) => value === 'SELLER' || value === 'PROVIDER';
    if (isCommerceRole(workspaceRole) && isCommerceRole(currentRole)) {
      return true;
    }
    return false;
  }

  private async ensureWorkspaceSeed(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });
    const email = String(user?.email ?? '').trim().toLowerCase();
    const workspace = await this.ensureWorkspaceRow(userId);
    await this.migrateLegacyWorkspaceData(userId, workspace.id, email);

    let roleRecords = await this.prisma.workspaceRole.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: 'asc' }
    });
    if (roleRecords.length === 0) {
      await this.prisma.workspaceRole.create({
        data: {
          workspaceId: workspace.id,
          key: 'role_owner',
          name: 'Owner',
          badge: 'System',
          description: 'Workspace owner with full access.',
          permissions: {
            'roles.manage': true,
            'admin.manage_roles': true,
            'admin.manage_team': true,
            'admin.audit': true
          } as Prisma.InputJsonValue,
          isSystem: true
        }
      });
      roleRecords = await this.prisma.workspaceRole.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { createdAt: 'asc' }
      });
    }

    let memberRecords = await this.prisma.workspaceMember.findMany({
      where: { workspaceId: workspace.id },
      include: { role: true },
      orderBy: { createdAt: 'asc' }
    });
    if (memberRecords.length === 0 && email) {
      const ownerRole = roleRecords.find((role) => role.key === 'role_owner') ?? roleRecords[0];
      await this.prisma.workspaceMember.create({
        data: {
          externalId: 'member_owner',
          workspaceId: workspace.id,
          userId,
          roleDbId: ownerRole.dbId,
          name: email.split('@')[0] || 'Owner',
          email,
          status: 'active',
          seat: 'Owner',
          joinedAt: new Date()
        }
      });
      memberRecords = await this.prisma.workspaceMember.findMany({
        where: { workspaceId: workspace.id },
        include: { role: true },
        orderBy: { createdAt: 'asc' }
      });
    }

    const inviteRecords = await this.prisma.workspaceInvite.findMany({
      where: { workspaceId: workspace.id },
      include: { role: true, member: { include: { role: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const roles = roleRecords.map((role) => this.serializeWorkspaceRole(role));
    const members = memberRecords.map((member) => this.serializeWorkspaceMember(member));
    const invites = inviteRecords.map((invite) => this.serializeWorkspaceInvite(invite));

    const currentMemberRecord = memberRecords.find(
      (member) => String(member.email || '').trim().toLowerCase() === email
    ) ?? null;
    const currentMember = currentMemberRecord ? this.serializeWorkspaceMember(currentMemberRecord) : null;
    const effectivePermissions = currentMemberRecord
      ? this.readPermissionPayload(currentMemberRecord.role?.permissions)
      : {};

    const combinedInvites = [
      ...invites,
      ...members.filter((member) => String(member.status || '').toLowerCase() === 'invited')
    ];

    return {
      workspace,
      ownerEmail: email,
      roleRecords,
      memberRecords,
      inviteRecords,
      roles,
      members,
      invites: combinedInvites,
      currentMember,
      effectivePermissions,
      workspaceSecurity: this.serializeWorkspaceSecurity(workspace)
    };
  }

  private async buildLegacyWorkspaceResponse(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });
    const email = String(user?.email ?? '').trim().toLowerCase();
    const now = new Date().toISOString();
    const ownerRole = {
      id: 'role_owner',
      name: 'Owner',
      badge: 'System',
      description: 'Workspace owner with full access.',
      perms: {
        'roles.manage': true,
        'admin.manage_roles': true,
        'admin.manage_team': true,
        'admin.audit': true
      },
      createdAt: now,
      updatedAt: now
    };
    const currentMember = email
      ? {
          id: 'member_owner',
          name: email.split('@')[0] || 'Owner',
          email,
          roleId: 'role_owner',
          status: 'active',
          seat: 'Owner',
          createdAt: now,
          updatedAt: now
        }
      : null;

    return {
      workspace: {
        id: 'legacy-workspace',
        ownerUserId: userId
      },
      ownerEmail: email,
      roleRecords: [],
      memberRecords: [],
      inviteRecords: [],
      roles: [ownerRole],
      members: currentMember ? [currentMember] : [],
      invites: [],
      currentMember,
      effectivePermissions: ownerRole.perms,
      workspaceSecurity: DEFAULT_WORKSPACE_SECURITY
    };
  }

  private async ensureWorkspaceRow(userId: string) {
    const existing = await this.prisma.workspace.findUnique({
      where: { ownerUserId: userId }
    });
    if (existing) {
      return existing;
    }
    return this.prisma.workspace.create({
      data: {
        ownerUserId: userId,
        inviteDomainAllowlist: DEFAULT_INVITE_DOMAIN_ALLOWLIST as Prisma.InputJsonValue
      }
    });
  }

  private async migrateLegacyWorkspaceData(userId: string, workspaceId: string, ownerEmail: string) {
    const [legacyRoles, legacyMembers, legacyInvites, legacySecurity, roleCount, memberCount, inviteCount] = await Promise.all([
      this.findWorkspaceSetting(userId, 'roles'),
      this.findWorkspaceSetting(userId, 'members'),
      this.findWorkspaceSetting(userId, 'role_invites'),
      this.findWorkspaceSetting(userId, 'roles_security'),
      this.prisma.workspaceRole.count({ where: { workspaceId } }),
      this.prisma.workspaceMember.count({ where: { workspaceId } }),
      this.prisma.workspaceInvite.count({ where: { workspaceId } })
    ]);

    if (legacySecurity) {
      const security = this.hydrateWorkspaceSecurity(legacySecurity);
      await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          require2FA: security.require2FA,
          allowExternalInvites: security.allowExternalInvites,
          supplierGuestExpiryHours: security.supplierGuestExpiryHours,
          inviteDomainAllowlist: security.inviteDomainAllowlist as Prisma.InputJsonValue,
          requireApprovalForPayouts: security.requireApprovalForPayouts,
          payoutApprovalThresholdUsd: security.payoutApprovalThresholdUsd,
          restrictSensitiveExports: security.restrictSensitiveExports,
          sessionTimeoutMins: security.sessionTimeoutMins
        }
      });
    }

    if (roleCount === 0) {
      const legacyRoleRows = this.extractList(legacyRoles ?? { roles: [] }, 'roles') as Array<Record<string, unknown>>;
      for (const legacyRole of legacyRoleRows) {
        await this.prisma.workspaceRole.create({
          data: {
            workspaceId,
            key: this.readString(legacyRole.id) || randomUUID(),
            name: this.readString(legacyRole.name) || 'Custom',
            badge: this.readString(legacyRole.badge) || 'Custom',
            description: this.readString(legacyRole.description) || 'Custom workspace role.',
            permissions: this.normalizePerms((legacyRole.perms as Record<string, boolean> | undefined) ?? {}) as Prisma.InputJsonValue,
            isSystem: this.readString(legacyRole.badge).toLowerCase() === 'system'
          }
        });
      }
    }

    const roleRecords = await this.prisma.workspaceRole.findMany({
      where: { workspaceId }
    });
    const roleByKey = new Map(roleRecords.map((role) => [role.key, role]));

    if (memberCount === 0) {
      const legacyMemberRows = this.extractList(legacyMembers ?? { members: [] }, 'members') as Array<Record<string, unknown>>;
      for (const legacyMember of legacyMemberRows) {
        const role = roleByKey.get(this.readString(legacyMember.roleId)) ?? roleRecords[0];
        if (!role) continue;
        const email = this.readString(legacyMember.email).toLowerCase();
        if (!email) continue;
        await this.prisma.workspaceMember.create({
          data: {
            externalId: this.readString(legacyMember.id) || randomUUID(),
            workspaceId,
            userId: email === ownerEmail ? userId : null,
            roleDbId: role.dbId,
            name: this.readString(legacyMember.name) || email.split('@')[0] || 'Member',
            email,
            status: this.readString(legacyMember.status) || 'active',
            seat: this.readString(legacyMember.seat) || null,
            invitedAt: this.parseDate(this.readString(legacyMember.createdAt)),
            joinedAt: this.readString(legacyMember.status).toLowerCase() === 'active'
              ? this.parseDate(this.readString(legacyMember.createdAt))
              : null
          }
        });
      }
    }

    const memberRecords = await this.prisma.workspaceMember.findMany({
      where: { workspaceId }
    });
    const memberById = new Map(memberRecords.map((member) => [member.externalId, member]));

    if (inviteCount === 0) {
      const legacyInviteRows = this.extractList(legacyInvites ?? { invites: [] }, 'invites') as Array<Record<string, unknown>>;
      for (const legacyInvite of legacyInviteRows) {
        const role = roleByKey.get(this.readString(legacyInvite.roleId)) ?? roleRecords[0];
        const email = this.readString(legacyInvite.email).toLowerCase();
        if (!role || !email) continue;
        const member = memberById.get(this.readString(legacyInvite.id));
        await this.prisma.workspaceInvite.create({
          data: {
            workspaceId,
            roleDbId: role.dbId,
            memberDbId: member?.dbId ?? null,
            invitedByUserId: userId,
            name: this.readString(legacyInvite.name) || email.split('@')[0] || 'Invitee',
            email,
            status: this.readString(legacyInvite.status) || 'invited',
            seat: this.readString(legacyInvite.seat) || null,
            acceptedAt: this.readString(legacyInvite.status).toLowerCase() === 'active'
              ? this.parseDate(this.readString(legacyInvite.updatedAt))
              : null
          }
        });
      }
    }
  }

  private async migrateLegacyCrewSessions(userId: string, workspaceId: string) {
    const existingCount = await this.prisma.workspaceCrewSession.count({
      where: { workspaceId }
    });
    if (existingCount > 0) {
      return;
    }

    const payload = await this.findUserSetting(userId, 'crew_sessions');
    const sessions = this.extractList(payload ?? { sessions: [] }, 'sessions') as Array<Record<string, unknown>>;
    if (sessions.length === 0) {
      return;
    }

    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId }
    });
    for (const session of sessions) {
      const id = this.readString(session.id) || randomUUID();
      await this.prisma.workspaceCrewSession.create({
        data: {
          workspaceId,
          sessionKey: id,
          payload: { updatedAt: this.readString(session.updatedAt) || new Date().toISOString() } as Prisma.InputJsonValue
        }
      });
      const createdSession = await this.prisma.workspaceCrewSession.findUniqueOrThrow({
        where: { workspaceId_sessionKey: { workspaceId, sessionKey: id } }
      });
      const assignments = Array.isArray(session.assignments) ? session.assignments : [];
      if (assignments.length > 0) {
        await this.prisma.workspaceCrewAssignment.createMany({
          data: assignments.map((assignment) => ({
            crewSessionDbId: createdSession.dbId,
            memberDbId: this.resolveCrewAssignmentMemberDbId(assignment as Record<string, unknown>, members),
            assignmentRole: this.resolveCrewAssignmentRole(assignment as Record<string, unknown>),
            payload: this.ensurePayload(assignment) as Prisma.InputJsonValue
          }))
        });
      }
    }
  }

  private async migrateLegacySavedViews(userId: string, workspaceId: string, scopeRole: string) {
    const existing = await this.prisma.workspaceSavedViewGroup.findUnique({
      where: { workspaceId_scopeRole: { workspaceId, scopeRole } }
    });
    if (existing) {
      return;
    }
    const payload = await this.findWorkspaceSetting(userId, this.scopedKey(scopeRole, 'saved_views'));
    const views = this.extractList(payload ?? { views: [] }, 'views') as Array<Record<string, unknown>>;
    const metadata = this.isPlainObject(payload?.metadata) ? payload?.metadata as Record<string, unknown> : {};
    if (views.length === 0 && Object.keys(metadata).length === 0) {
      return;
    }
    const group = await this.prisma.workspaceSavedViewGroup.create({
      data: {
        workspaceId,
        scopeRole,
        metadata: this.ensurePayload(metadata) as Prisma.InputJsonValue
      }
    });
    if (views.length > 0) {
      await this.prisma.workspaceSavedView.createMany({
        data: views.map((view, index) => {
          const payloadRecord = this.ensureObjectPayload(view);
          return {
            groupDbId: group.dbId,
            createdByUserId: userId,
            externalId: this.readString(payloadRecord.id) || randomUUID(),
            name: this.readString(payloadRecord.name) || this.readString(payloadRecord.label) || `Saved view ${index + 1}`,
            position: index,
            payload: payloadRecord as Prisma.InputJsonValue
          };
        })
      });
    }
  }

  private async migrateLegacyHelpLinks(userId: string, workspaceId: string) {
    const existingCount = await this.prisma.workspaceHelpLink.count({
      where: { workspaceId }
    });
    if (existingCount > 0) {
      return;
    }
    const payload = await this.findWorkspaceSetting(userId, 'help');
    const links = this.extractList(payload ?? { links: [] }, 'links') as Array<Record<string, unknown>>;
    if (links.length === 0) {
      return;
    }
    await this.prisma.workspaceHelpLink.createMany({
      data: links.map((link, index) => {
        const payloadRecord = this.ensureObjectPayload(link);
        return {
          workspaceId,
          externalId: this.readString(payloadRecord.id) || randomUUID(),
          title: this.readString(payloadRecord.title) || this.readString(payloadRecord.label) || null,
          category: this.readString(payloadRecord.category) || this.readString(payloadRecord.kind) || null,
          position: index,
          payload: payloadRecord as Prisma.InputJsonValue
        };
      })
    });
  }

  private async migrateLegacyStatusServices(userId: string, workspaceId: string) {
    const existingCount = await this.prisma.workspaceStatusService.count({
      where: { workspaceId }
    });
    if (existingCount > 0) {
      return;
    }
    const payload = await this.findWorkspaceSetting(userId, 'status_center');
    const services = this.extractList(payload ?? { services: [] }, 'services') as Array<Record<string, unknown>>;
    if (services.length === 0) {
      return;
    }
    await this.prisma.workspaceStatusService.createMany({
      data: services.map((service, index) => {
        const payloadRecord = this.ensureObjectPayload(service);
        return {
          workspaceId,
          externalId: this.readString(payloadRecord.id) || randomUUID(),
          name: this.readString(payloadRecord.name) || this.readString(payloadRecord.label) || null,
          status: this.readString(payloadRecord.status) || null,
          position: index,
          payload: payloadRecord as Prisma.InputJsonValue
        };
      })
    });
  }

  private async migrateLegacyNotificationPreferences(userId: string, workspaceId: string, scopeRole: string) {
    let existing;
    try {
      existing = await this.prisma.workspaceNotificationPreference.findUnique({
        where: {
          workspaceId_userId_scopeRole: {
            workspaceId,
            userId,
            scopeRole
          }
        }
      });
    } catch (error) {
      if (this.isMissingSchemaObjectError(error)) {
        return;
      }
      throw error;
    }
    if (existing) {
      return;
    }
    const payload =
      await this.findWorkspaceSetting(userId, this.scopedKey(scopeRole, 'notification_preferences')) ??
      await this.findWorkspaceSetting(userId, 'notification_preferences');
    const watches = this.extractList(payload ?? { watches: [] }, 'watches') as Array<Record<string, unknown>>;
    const metadata = this.isPlainObject(payload?.metadata) ? payload?.metadata as Record<string, unknown> : {};
    if (watches.length === 0 && Object.keys(metadata).length === 0) {
      return;
    }
    try {
      const preference = await this.prisma.workspaceNotificationPreference.create({
        data: {
          workspaceId,
          userId,
          scopeRole,
          metadata: this.ensurePayload(metadata) as Prisma.InputJsonValue
        }
      });
      if (watches.length > 0) {
        await this.prisma.workspaceNotificationWatch.createMany({
          data: watches.map((watch, index) => {
            const payloadRecord = this.ensureObjectPayload(watch);
            return {
              preferenceDbId: preference.dbId,
              externalId: this.readString(payloadRecord.id) || randomUUID(),
              channel: this.readString(payloadRecord.channel) || null,
              enabled: payloadRecord.enabled === undefined ? null : Boolean(payloadRecord.enabled),
              position: index,
              payload: payloadRecord as Prisma.InputJsonValue
            };
          })
        });
      }
    } catch (error) {
      if (this.isMissingSchemaObjectError(error)) {
        return;
      }
      throw error;
    }
  }

  private async readLegacyNotificationPreferences(userId: string, scopeRole: string) {
    const payload =
      await this.findWorkspaceSetting(userId, this.scopedKey(scopeRole, 'notification_preferences')) ??
      await this.findWorkspaceSetting(userId, 'notification_preferences') ??
      {};
    const watches = this.extractList(payload, 'watches') as Array<Record<string, unknown>>;
    const metadata = this.isPlainObject(payload?.metadata)
      ? (payload.metadata as Record<string, unknown>)
      : (this.isPlainObject(payload) ? (payload as Record<string, unknown>) : {});
    return {
      watches,
      metadata
    };
  }

  private async writeLegacyNotificationPreferences(userId: string, scopeRole: string, payload: Record<string, unknown>) {
    await this.upsertWorkspaceSetting(userId, this.scopedKey(scopeRole, 'notification_preferences'), payload);
  }

  private async readPayoutMethods(workspaceId: string) {
    const settings = await this.prisma.workspacePayoutSettings.findUnique({
      where: { workspaceId },
      include: {
        methods: {
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }]
        }
      }
    });
    if (!settings) {
      return null;
    }
    return {
      methods: (settings?.methods ?? []).map((method) => this.serializeStructuredPayload(method.payload, method.externalId)),
      ...(this.isPlainObject(settings?.metadata) ? { metadata: settings?.metadata as Record<string, unknown> } : {})
    };
  }

  private async readIntegrations(workspaceId: string) {
    const settings = await this.prisma.workspaceIntegrationSettings.findUnique({
      where: { workspaceId },
      include: {
        integrations: {
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }]
        },
        webhooks: {
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }]
        }
      }
    });
    if (!settings) {
      return null;
    }
    return {
      integrations: (settings?.integrations ?? []).map((item) => this.serializeStructuredPayload(item.payload, item.externalId)),
      webhooks: (settings?.webhooks ?? []).map((item) => this.serializeStructuredPayload(item.payload, item.externalId)),
      ...(this.isPlainObject(settings?.metadata) ? { metadata: settings?.metadata as Record<string, unknown> } : {})
    };
  }

  private async readTaxSettings(workspaceId: string) {
    const settings = await this.prisma.workspaceTaxSettings.findUnique({
      where: { workspaceId },
      include: {
        profiles: {
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }]
        },
        reports: {
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }]
        }
      }
    });
    if (!settings) {
      return null;
    }
    return {
      profiles: (settings?.profiles ?? []).map((item) => this.serializeStructuredPayload(item.payload, item.externalId)),
      reports: (settings?.reports ?? []).map((item) => this.serializeStructuredPayload(item.payload, item.externalId)),
      ...(this.isPlainObject(settings?.metadata) ? { metadata: settings?.metadata as Record<string, unknown> } : {})
    };
  }

  private async readKyc(workspaceId: string) {
    const profile = await this.prisma.workspaceKycProfile.findUnique({
      where: { workspaceId },
      include: {
        documents: {
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }]
        }
      }
    });
    if (!profile) {
      return null;
    }
    return {
      status: profile?.status ?? 'pending',
      documents: (profile?.documents ?? []).map((item) => this.serializeStructuredPayload(item.payload, item.externalId)),
      ...(this.isPlainObject(profile?.metadata) ? { metadata: profile?.metadata as Record<string, unknown> } : {})
    };
  }

  private async migrateLegacyPayoutMethods(userId: string, workspaceId: string) {
    const existing = await this.prisma.workspacePayoutSettings.findUnique({
      where: { workspaceId }
    });
    if (existing) {
      return;
    }
    const payload = await this.findWorkspaceSetting(userId, 'payout_methods');
    const methods = this.extractList(payload ?? { methods: [] }, 'methods') as Array<Record<string, unknown>>;
    const metadata = this.isPlainObject(payload?.metadata) ? payload?.metadata as Record<string, unknown> : {};
    if (methods.length === 0 && Object.keys(metadata).length === 0) {
      return;
    }
    const settings = await this.prisma.workspacePayoutSettings.create({
      data: {
        workspaceId,
        metadata: this.ensurePayload(metadata) as Prisma.InputJsonValue
      }
    });
    if (methods.length > 0) {
      await this.prisma.workspacePayoutMethod.createMany({
        data: methods.map((method, index) => {
          const payloadRecord = this.ensureObjectPayload(method);
          return {
            settingsDbId: settings.dbId,
            externalId: this.readString(payloadRecord.id) || randomUUID(),
            type: this.readString(payloadRecord.type) || 'provider',
            label: this.readString(payloadRecord.label) || null,
            currency: this.readString(payloadRecord.currency) || null,
            isDefault: Boolean(payloadRecord.isDefault),
            position: index,
            payload: payloadRecord as Prisma.InputJsonValue
          };
        })
      });
    }
  }

  private async migrateLegacyIntegrations(userId: string, workspaceId: string) {
    const existing = await this.prisma.workspaceIntegrationSettings.findUnique({
      where: { workspaceId }
    });
    if (existing) {
      return;
    }
    const payload = await this.findWorkspaceSetting(userId, 'integrations');
    const integrations = this.extractList(payload ?? { integrations: [] }, 'integrations') as Array<Record<string, unknown>>;
    const webhooks = this.extractList(payload ?? { webhooks: [] }, 'webhooks') as Array<Record<string, unknown>>;
    const metadata = this.isPlainObject(payload?.metadata) ? payload?.metadata as Record<string, unknown> : {};
    if (integrations.length === 0 && webhooks.length === 0 && Object.keys(metadata).length === 0) {
      return;
    }
    const settings = await this.prisma.workspaceIntegrationSettings.create({
      data: {
        workspaceId,
        metadata: this.ensurePayload(metadata) as Prisma.InputJsonValue
      }
    });
    const createdConnections = new Map<string, string>();
    for (let index = 0; index < integrations.length; index += 1) {
      const payloadRecord = this.ensureObjectPayload(integrations[index]);
      const created = await this.prisma.workspaceIntegrationConnection.create({
        data: {
          settingsDbId: settings.dbId,
          externalId: this.readString(payloadRecord.id) || randomUUID(),
          kind: this.readString(payloadRecord.kind) || this.readString(payloadRecord.type) || null,
          provider: this.readString(payloadRecord.provider) || null,
          status: this.readString(payloadRecord.status) || null,
          position: index,
          payload: payloadRecord as Prisma.InputJsonValue
        }
      });
      createdConnections.set(created.externalId, created.id);
    }
    if (webhooks.length > 0) {
      await this.prisma.workspaceIntegrationWebhook.createMany({
        data: webhooks.map((webhook, index) => {
          const payloadRecord = this.ensureObjectPayload(webhook);
          const integrationRef =
            this.readString(payloadRecord.integrationId) ||
            this.readString(payloadRecord.connectionId) ||
            this.readString(payloadRecord.providerId);
          return {
            settingsDbId: settings.dbId,
            integrationDbId: integrationRef ? createdConnections.get(integrationRef) ?? null : null,
            externalId: this.readString(payloadRecord.id) || randomUUID(),
            status: this.readString(payloadRecord.status) || null,
            position: index,
            payload: payloadRecord as Prisma.InputJsonValue
          };
        })
      });
    }
  }

  private async migrateLegacyTaxSettings(userId: string, workspaceId: string) {
    const existing = await this.prisma.workspaceTaxSettings.findUnique({
      where: { workspaceId }
    });
    if (existing) {
      return;
    }
    const payload = await this.findWorkspaceSetting(userId, 'tax');
    const profiles = this.extractList(payload ?? { profiles: [] }, 'profiles') as Array<Record<string, unknown>>;
    const reports = this.extractList(payload ?? { reports: [] }, 'reports') as Array<Record<string, unknown>>;
    const metadata = this.isPlainObject(payload?.metadata) ? payload?.metadata as Record<string, unknown> : {};
    if (profiles.length === 0 && reports.length === 0 && Object.keys(metadata).length === 0) {
      return;
    }
    const settings = await this.prisma.workspaceTaxSettings.create({
      data: {
        workspaceId,
        metadata: this.ensurePayload(metadata) as Prisma.InputJsonValue
      }
    });
    const createdProfiles = new Map<string, string>();
    for (let index = 0; index < profiles.length; index += 1) {
      const payloadRecord = this.ensureObjectPayload(profiles[index]);
      const created = await this.prisma.workspaceTaxProfile.create({
        data: {
          settingsDbId: settings.dbId,
          externalId: this.readString(payloadRecord.id) || randomUUID(),
          profileName: this.readString(payloadRecord.profileName) || this.readString(payloadRecord.name) || null,
          country: this.readString(payloadRecord.country) || null,
          vatId: this.readString(payloadRecord.vatId) || null,
          status: this.readString(payloadRecord.status) || null,
          isDefault: Boolean(payloadRecord.isDefault),
          position: index,
          payload: payloadRecord as Prisma.InputJsonValue
        }
      });
      createdProfiles.set(created.externalId, created.id);
    }
    if (reports.length > 0) {
      await this.prisma.workspaceTaxReport.createMany({
        data: reports.map((report, index) => {
          const payloadRecord = this.ensureObjectPayload(report);
          const profileRef = this.readString(payloadRecord.profileId);
          return {
            settingsDbId: settings.dbId,
            profileDbId: profileRef ? createdProfiles.get(profileRef) ?? null : null,
            externalId: this.readString(payloadRecord.id) || randomUUID(),
            status: this.readString(payloadRecord.status) || null,
            periodStart: this.parseDate(this.readString(payloadRecord.periodStart)),
            periodEnd: this.parseDate(this.readString(payloadRecord.periodEnd)),
            position: index,
            payload: payloadRecord as Prisma.InputJsonValue
          };
        })
      });
    }
  }

  private async migrateLegacyKyc(userId: string, workspaceId: string) {
    const existing = await this.prisma.workspaceKycProfile.findUnique({
      where: { workspaceId }
    });
    if (existing) {
      return;
    }
    const payload = await this.findWorkspaceSetting(userId, 'kyc');
    const documents = this.extractList(payload ?? { documents: [] }, 'documents') as Array<Record<string, unknown>>;
    const metadata = this.isPlainObject(payload?.metadata) ? payload?.metadata as Record<string, unknown> : {};
    const status = this.readString(payload?.status);
    if (documents.length === 0 && Object.keys(metadata).length === 0 && !status) {
      return;
    }
    const profile = await this.prisma.workspaceKycProfile.create({
      data: {
        workspaceId,
        status: status || 'pending',
        metadata: this.ensurePayload(metadata) as Prisma.InputJsonValue
      }
    });
    if (documents.length > 0) {
      await this.prisma.workspaceKycDocument.createMany({
        data: documents.map((document, index) => {
          const payloadRecord = this.ensureObjectPayload(document);
          return {
            kycProfileDbId: profile.dbId,
            externalId: this.readString(payloadRecord.id) || randomUUID(),
            title: this.readString(payloadRecord.title) || null,
            status: this.readString(payloadRecord.status) || null,
            uploadedAt: this.parseDate(this.readString(payloadRecord.uploadedAt)),
            expiresAt: this.parseDate(this.readString(payloadRecord.expiresAt)),
            position: index,
            payload: payloadRecord as Prisma.InputJsonValue
          };
        })
      });
    }
  }

  private async readPreferences(workspaceId: string, userId: string, scopeRole: string) {
    let record;
    try {
      record = await this.prisma.workspaceUserPreference.findUnique({
        where: {
          workspaceId_userId_scopeRole: {
            workspaceId,
            userId,
            scopeRole
          }
        }
      });
    } catch (error) {
      if (this.isMissingSchemaObjectError(error)) {
        return null;
      }
      throw error;
    }
    if (!record) {
      return null;
    }
    return {
      locale: record.locale,
      currency: record.currency,
      timezone: record.timezone
    };
  }

  private async migrateLegacyPreferences(userId: string, workspaceId: string, scopeRole: string) {
    let existing;
    try {
      existing = await this.prisma.workspaceUserPreference.findUnique({
        where: {
          workspaceId_userId_scopeRole: {
            workspaceId,
            userId,
            scopeRole
          }
        }
      });
    } catch (error) {
      if (this.isMissingSchemaObjectError(error)) {
        return;
      }
      throw error;
    }
    if (existing) {
      return;
    }
    const payload = await this.findWorkspaceSetting(userId, this.scopedKey(scopeRole, 'preferences'));
    if (!payload) {
      return;
    }
    const locale = this.readString(payload.locale);
    const currency = this.readString(payload.currency);
    const timezone = this.readString(payload.timezone);
    if (!locale && !currency && !timezone) {
      return;
    }
    try {
      await this.prisma.workspaceUserPreference.create({
        data: {
          workspaceId,
          userId,
          scopeRole,
          locale: locale || null,
          currency: currency || null,
          timezone: timezone || null
        }
      });
    } catch (error) {
      if (this.isMissingSchemaObjectError(error)) {
        return;
      }
      throw error;
    }
  }

  private async ensureUserSecurityProfile(userId: string) {
    const existing = await this.prisma.userSecurityProfile.findUnique({
      where: { userId }
    });
    if (existing) {
      return existing;
    }
    return this.prisma.userSecurityProfile.create({
      data: {
        userId,
        twoFactorMethod: DEFAULT_SECURITY_SETTINGS.twoFactorMethod,
        twoFactorConfig: DEFAULT_SECURITY_SETTINGS.twoFactorConfig as Prisma.InputJsonValue,
        metadata: {} as Prisma.InputJsonValue
      }
    });
  }

  private async readSecuritySettings(userId: string) {
    const profile = await this.prisma.userSecurityProfile.findUnique({
      where: { userId },
      include: {
        sessions: { orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }] },
        passkeys: { orderBy: { updatedAt: 'desc' } },
        trustedDevices: { orderBy: { updatedAt: 'desc' } },
        alerts: { orderBy: { updatedAt: 'desc' } }
      }
    });
    if (!profile) {
      return null;
    }
    return {
      twoFactor: profile.twoFactor,
      twoFactorMethod: profile.twoFactorMethod ?? DEFAULT_SECURITY_SETTINGS.twoFactorMethod,
      twoFactorConfig: this.isPlainObject(profile.twoFactorConfig) ? profile.twoFactorConfig as Record<string, unknown> : {},
      metadata: this.isPlainObject(profile.metadata) ? profile.metadata as Record<string, unknown> : {},
      sessions: profile.sessions.map((session) => this.serializeStructuredPayload(session.payload, session.externalId)),
      passkeys: profile.passkeys.map((passkey) => this.serializeStructuredPayload(passkey.payload, passkey.externalId)),
      trustedDevices: profile.trustedDevices.map((device) => this.serializeStructuredPayload(device.payload, device.externalId)),
      alerts: profile.alerts.map((alert) => this.serializeStructuredPayload(alert.payload, alert.externalId))
    };
  }

  private async migrateLegacySecurity(userId: string) {
    const existing = await this.prisma.userSecurityProfile.findUnique({
      where: { userId }
    });
    if (existing) {
      return;
    }
    const [securityPayload, devicesPayload] = await Promise.all([
      this.findWorkspaceSetting(userId, 'security'),
      this.findUserSetting(userId, 'devices')
    ]);
    const hasSecurity = Boolean(securityPayload);
    const hasDevices = this.extractList(devicesPayload ?? { devices: [] }, 'devices').length > 0;
    if (!hasSecurity && !hasDevices) {
      return;
    }
    const profile = await this.prisma.userSecurityProfile.create({
      data: {
        userId,
        twoFactor: Boolean(securityPayload?.twoFactor ?? DEFAULT_SECURITY_SETTINGS.twoFactor),
        twoFactorMethod: this.readString(securityPayload?.twoFactorMethod) || DEFAULT_SECURITY_SETTINGS.twoFactorMethod,
        twoFactorConfig: this.ensurePayload((securityPayload?.twoFactorConfig as Record<string, unknown> | undefined) ?? {}) as Prisma.InputJsonValue,
        metadata: this.ensurePayload((securityPayload?.metadata as Record<string, unknown> | undefined) ?? {}) as Prisma.InputJsonValue
      }
    });
    const sessions = this.extractList(securityPayload ?? {}, 'sessions') as Array<Record<string, unknown>>;
    const passkeys = this.extractList(securityPayload ?? {}, 'passkeys') as Array<Record<string, unknown>>;
    const trustedDevices = this.extractList(securityPayload ?? {}, 'trustedDevices') as Array<Record<string, unknown>>;
    const alerts = this.extractList(securityPayload ?? {}, 'alerts') as Array<Record<string, unknown>>;
    const devices = this.extractList(devicesPayload ?? {}, 'devices') as Array<Record<string, unknown>>;
    if (sessions.length > 0) {
      await this.prisma.userSecuritySession.createMany({
        data: sessions.map((session, index) => {
          const payload = this.ensureObjectPayload(session);
          return {
            profileDbId: profile.dbId,
            externalId: this.readString(payload.id) || `session-${index + 1}`,
            device: this.readString(payload.device) || null,
            ip: this.readString(payload.ip) || null,
            lastActiveAt: this.parseDate(this.readString(payload.lastActiveAt)),
            payload: payload as Prisma.InputJsonValue
          };
        })
      });
    }
    if (passkeys.length > 0) {
      await this.prisma.userSecurityPasskey.createMany({
        data: passkeys.map((passkey, index) => {
          const payload = this.ensureObjectPayload(passkey);
          return {
            profileDbId: profile.dbId,
            externalId: this.readString(payload.id) || `passkey-${index + 1}`,
            payload: payload as Prisma.InputJsonValue
          };
        })
      });
    }
    if (trustedDevices.length > 0) {
      await this.prisma.userSecurityTrustedDevice.createMany({
        data: trustedDevices.map((device, index) => {
          const payload = this.ensureObjectPayload(device);
          return {
            profileDbId: profile.dbId,
            externalId: this.readString(payload.id) || `trusted-${index + 1}`,
            payload: payload as Prisma.InputJsonValue
          };
        })
      });
    }
    if (alerts.length > 0) {
      await this.prisma.userSecurityAlert.createMany({
        data: alerts.map((alert, index) => {
          const payload = this.ensureObjectPayload(alert);
          return {
            profileDbId: profile.dbId,
            externalId: this.readString(payload.id) || `alert-${index + 1}`,
            payload: payload as Prisma.InputJsonValue
          };
        })
      });
    }
    if (devices.length > 0) {
      await this.prisma.userRememberedDevice.createMany({
        data: devices.map((device, index) => {
          const payload = this.ensureObjectPayload(device);
          return {
            profileDbId: profile.dbId,
            externalId: this.readString(payload.id) || `device-${index + 1}`,
            payload: payload as Prisma.InputJsonValue
          };
        })
      });
    }
  }

  private serializeWorkspaceRole(role: {
    key: string;
    name: string;
    badge: string | null;
    description: string | null;
    permissions: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: role.key,
      name: role.name,
      badge: role.badge ?? 'Custom',
      description: role.description ?? 'Custom workspace role.',
      perms: this.readPermissionPayload(role.permissions),
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString()
    };
  }

  private serializeWorkspaceMember(member: {
    externalId: string;
    name: string;
    email: string;
    status: string;
    seat: string | null;
    createdAt: Date;
    updatedAt: Date;
    role?: { key: string } | null;
  }) {
    return {
      id: member.externalId,
      name: member.name,
      email: member.email,
      roleId: member.role?.key ?? 'role_owner',
      status: member.status,
      seat: member.seat ?? 'Team',
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString()
    };
  }

  private serializeWorkspaceInvite(invite: {
    dbId: string;
    name: string;
    email: string;
    status: string;
    seat: string | null;
    createdAt: Date;
    updatedAt: Date;
    role?: { key: string } | null;
    member?: { externalId: string } | null;
  }) {
    return {
      id: invite.member?.externalId ?? invite.dbId,
      name: invite.name,
      email: invite.email,
      roleId: invite.role?.key ?? 'role_owner',
      status: invite.status,
      seat: invite.seat ?? 'Team',
      createdAt: invite.createdAt.toISOString(),
      updatedAt: invite.updatedAt.toISOString()
    };
  }

  private serializeWorkspaceSecurity(workspace: {
    require2FA: boolean;
    allowExternalInvites: boolean;
    supplierGuestExpiryHours: number;
    inviteDomainAllowlist: unknown;
    requireApprovalForPayouts: boolean;
    payoutApprovalThresholdUsd: number;
    restrictSensitiveExports: boolean;
    sessionTimeoutMins: number;
  }) {
    return {
      require2FA: workspace.require2FA,
      allowExternalInvites: workspace.allowExternalInvites,
      supplierGuestExpiryHours: workspace.supplierGuestExpiryHours,
      inviteDomainAllowlist: this.readStringArray(workspace.inviteDomainAllowlist).length
        ? this.readStringArray(workspace.inviteDomainAllowlist)
        : DEFAULT_INVITE_DOMAIN_ALLOWLIST,
      requireApprovalForPayouts: workspace.requireApprovalForPayouts,
      payoutApprovalThresholdUsd: workspace.payoutApprovalThresholdUsd,
      restrictSensitiveExports: workspace.restrictSensitiveExports,
      sessionTimeoutMins: workspace.sessionTimeoutMins
    };
  }

  private serializeCrewSession(session: {
    sessionKey: string;
    payload: unknown;
    createdAt: Date;
    updatedAt: Date;
    assignments: Array<{ payload: unknown }>;
  }) {
    const payload = this.isPlainObject(session.payload) ? (session.payload as Record<string, unknown>) : {};
    return {
      id: session.sessionKey,
      ...payload,
      assignments: session.assignments
        .map((assignment) => (this.isPlainObject(assignment.payload) ? assignment.payload as Record<string, unknown> : null))
        .filter(Boolean),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString()
    };
  }

  private serializeStructuredPayload(payload: unknown, fallbackId: string) {
    const record = this.isPlainObject(payload) ? { ...(payload as Record<string, unknown>) } : {};
    if (!record.id) {
      record.id = fallbackId;
    }
    return record;
  }

  private resolveCrewAssignmentMemberDbId(assignment: Record<string, unknown>, members: Array<{ dbId: string; externalId?: string | null; id?: string | null; userId?: string | null }>) {
    const candidateIds = [
      this.readString(assignment.memberId),
      this.readString(assignment.id),
      this.readString(assignment.userId)
    ].filter(Boolean);
    if (candidateIds.length === 0) {
      return null;
    }
    const matched = members.find((member) =>
      candidateIds.includes(this.readString((member as any).externalId)) ||
      candidateIds.includes(this.readString((member as any).id)) ||
      candidateIds.includes(this.readString((member as any).userId))
    );
    return matched ? matched.dbId : null;
  }

  private resolveCrewAssignmentRole(assignment: Record<string, unknown>) {
    return (
      this.readString(assignment.role) ||
      this.readString(assignment.crewRole) ||
      this.readString(assignment.type) ||
      this.readString(assignment.slot) ||
      null
    );
  }

  private hydrateWorkspaceSecurity(payload: Record<string, unknown>) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return { ...DEFAULT_WORKSPACE_SECURITY };
    }
    const current = payload as Record<string, unknown>;
    const allowlist = Array.isArray(current.inviteDomainAllowlist)
      ? current.inviteDomainAllowlist.map((entry) => String(entry).trim().toLowerCase()).filter(Boolean)
      : DEFAULT_INVITE_DOMAIN_ALLOWLIST;
    const supplierGuestExpiryHours = Number.isFinite(Number(current.supplierGuestExpiryHours))
      ? Math.max(1, Math.min(168, Number(current.supplierGuestExpiryHours)))
      : DEFAULT_WORKSPACE_SECURITY.supplierGuestExpiryHours;

    return {
      require2FA: current.require2FA === undefined ? DEFAULT_WORKSPACE_SECURITY.require2FA : Boolean(current.require2FA),
      allowExternalInvites: current.allowExternalInvites === undefined ? DEFAULT_WORKSPACE_SECURITY.allowExternalInvites : Boolean(current.allowExternalInvites),
      supplierGuestExpiryHours,
      inviteDomainAllowlist: allowlist.length ? allowlist : DEFAULT_INVITE_DOMAIN_ALLOWLIST,
      requireApprovalForPayouts:
        current.requireApprovalForPayouts === undefined
          ? DEFAULT_WORKSPACE_SECURITY.requireApprovalForPayouts
          : Boolean(current.requireApprovalForPayouts),
      payoutApprovalThresholdUsd: Number.isFinite(Number(current.payoutApprovalThresholdUsd))
        ? Math.max(0, Number(current.payoutApprovalThresholdUsd))
        : DEFAULT_WORKSPACE_SECURITY.payoutApprovalThresholdUsd,
      restrictSensitiveExports:
        current.restrictSensitiveExports === undefined
          ? DEFAULT_WORKSPACE_SECURITY.restrictSensitiveExports
          : Boolean(current.restrictSensitiveExports),
      sessionTimeoutMins: Number.isFinite(Number(current.sessionTimeoutMins))
        ? Math.max(5, Math.min(1440, Number(current.sessionTimeoutMins)))
        : DEFAULT_WORKSPACE_SECURITY.sessionTimeoutMins
    };
  }

}
