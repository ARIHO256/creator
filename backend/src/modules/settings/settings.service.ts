import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { sanitizePayload } from '../../common/sanitizers/payload-sanitizer.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { CreateInviteDto } from './dto/create-invite.dto.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { SendPayoutCodeDto } from './dto/send-payout-code.dto.js';
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
    const record = await this.getUserSetting(userId, 'profile', {});
    return this.normalizeSettingsRecord(record);
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
    const [devicesPayload, securityPayload] = await Promise.all([
      this.getUserSetting(userId, 'devices', { devices: [] }),
      this.securitySettings(userId)
    ]);
    const devices = this.extractList(devicesPayload, 'devices');
    const nextDevices = devices.filter((device: any) => device?.id !== id);
    const nextSecurity = {
      ...DEFAULT_SECURITY_SETTINGS,
      ...securityPayload,
      sessions: this.extractList(securityPayload, 'sessions').filter((session: any) => session?.id !== id),
      trustedDevices: this.extractList(securityPayload, 'trustedDevices').filter((device: any) => device?.id !== id)
    };
    await Promise.all([
      this.upsertUserSetting(userId, 'devices', { devices: nextDevices }),
      this.upsertWorkspaceSetting(userId, 'security', nextSecurity)
    ]);
    return { deleted: true };
  }
  async signOutAll(userId: string) {
    const securityPayload = await this.securitySettings(userId);
    const nextSecurity = {
      ...DEFAULT_SECURITY_SETTINGS,
      ...securityPayload,
      sessions: [],
      trustedDevices: []
    };
    await Promise.all([
      this.upsertUserSetting(userId, 'devices', { devices: [] }),
      this.upsertWorkspaceSetting(userId, 'security', nextSecurity)
    ]);
    return { signedOutAll: true };
  }

  notifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    }).then((rows) =>
      rows.map((row) => {
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
  async notificationRead(userId: string, id: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id, userId }
    });
    if (!existing) {
      throw new NotFoundException('Notification not found');
    }
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() }
    });
  }
  async notificationUnread(userId: string, id: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id, userId }
    });
    if (!existing) {
      throw new NotFoundException('Notification not found');
    }
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: null }
    });
  }
  async notificationReadAll(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() }
    });
  }

  async roles(userId: string) {
    const workspace = await this.ensureWorkspaceSeed(userId);
    return workspace;
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

    const record = await this.upsertWorkspaceSetting(userId, 'roles_security', nextSecurity);
    await this.audit.log({
      userId,
      action: 'workspace.security_updated',
      entityType: 'workspace_setting',
      entityId: 'roles_security',
      route: '/api/roles/security',
      method: 'PATCH',
      statusCode: 200
    });
    return record.payload as Record<string, unknown>;
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

    const role = {
      id: roleId,
      name: nextName,
      badge: body.badge ?? 'Custom',
      description: body.description ?? 'Custom workspace role.',
      perms: this.normalizePerms(body.perms),
      createdAt: new Date().toISOString()
    };

    const nextRoles = [role, ...workspace.roles];
    await this.upsertWorkspaceSetting(userId, 'roles', { roles: nextRoles });
    await this.audit.log({
      userId,
      action: 'workspace.role_created',
      entityType: 'workspace_role',
      entityId: role.id,
      route: '/api/roles',
      method: 'POST',
      statusCode: 201,
      metadata: { name: role.name }
    });
    return role;
  }
  async updateRole(userId: string, id: string, body: UpdateRoleDto) {
    const workspace = await this.ensureWorkspaceSeed(userId);
    this.ensureWorkspaceRoleManager(workspace);
    const existing = workspace.roles.find((entry) => entry.id === id);
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

    const updated = {
      ...existing,
      ...(body.name ? { name: body.name.trim() } : {}),
      ...(body.badge ? { badge: body.badge.trim() } : {}),
      ...(body.description ? { description: body.description.trim() } : {}),
      ...(body.perms ? { perms: { ...existing.perms, ...this.normalizePerms(body.perms) } } : {}),
      updatedAt: new Date().toISOString()
    };

    const nextRoles = workspace.roles.map((entry) => (entry.id === id ? updated : entry));
    await this.upsertWorkspaceSetting(userId, 'roles', { roles: nextRoles });
    await this.audit.log({
      userId,
      action: 'workspace.role_updated',
      entityType: 'workspace_role',
      entityId: id,
      route: `/api/roles/${id}`,
      method: 'PATCH',
      statusCode: 200
    });
    return updated;
  }
  async deleteRole(userId: string, id: string) {
    const workspace = await this.ensureWorkspaceSeed(userId);
    this.ensureWorkspaceRoleManager(workspace);
    const role = workspace.roles.find((entry) => entry.id === id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (String(role.badge || '').toLowerCase() === 'system') {
      throw new BadRequestException('System roles cannot be deleted');
    }
    if (workspace.members.some((member) => member.roleId === role.id)) {
      throw new BadRequestException('Role is still assigned to a workspace member');
    }

    const nextRoles = workspace.roles.filter((entry) => entry.id !== id);
    await this.upsertWorkspaceSetting(userId, 'roles', { roles: nextRoles });
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
    if (!workspace.roles.some((role) => role.id === body.roleId)) {
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

    const invite = {
      id: body.id ?? randomUUID(),
      name: body.name,
      email: normalizedEmail,
      roleId: body.roleId,
      status: 'invited',
      seat: body.seat ?? 'Team',
      createdAt: new Date().toISOString()
    };

    const nextInvites = [invite, ...workspace.invites.filter((entry) => entry.id !== invite.id)];
    const nextMembers = [invite, ...workspace.members];
    await Promise.all([
      this.upsertWorkspaceSetting(userId, 'role_invites', { invites: nextInvites }),
      this.upsertWorkspaceSetting(userId, 'members', { members: nextMembers })
    ]);
    await this.audit.log({
      userId,
      action: 'workspace.member_invited',
      entityType: 'workspace_member',
      entityId: invite.id,
      route: '/api/roles/invites',
      method: 'POST',
      statusCode: 201,
      metadata: { email: invite.email }
    });
    return invite;
  }
  async updateMember(userId: string, id: string, body: UpdateMemberDto) {
    const workspace = await this.ensureWorkspaceSeed(userId);
    this.ensureWorkspaceRoleManager(workspace);

    const existing = workspace.members.find((entry) => entry.id === id);
    if (!existing) {
      throw new NotFoundException('Member not found');
    }
    if (body.roleId && !workspace.roles.some((role) => role.id === body.roleId)) {
      throw new NotFoundException('Role not found');
    }

    const updated = {
      ...existing,
      ...(body.roleId ? { roleId: body.roleId } : {}),
      ...(body.status ? { status: body.status.trim().toLowerCase() } : {}),
      ...(body.seat ? { seat: body.seat.trim() || existing.seat } : {}),
      updatedAt: new Date().toISOString()
    };

    const nextMembers = workspace.members.map((entry) => (entry.id === id ? updated : entry));
    await this.upsertWorkspaceSetting(userId, 'members', { members: nextMembers });
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
    return updated;
  }

  async deleteMember(userId: string, id: string) {
    const workspace = await this.ensureWorkspaceSeed(userId);
    this.ensureWorkspaceRoleManager(workspace);

    const existing = workspace.members.find((entry) => entry.id === id);
    if (!existing) {
      throw new NotFoundException('Member not found');
    }

    const nextMembers = workspace.members.filter((entry) => entry.id !== id);
    const nextInvites = workspace.invites.filter((entry) => entry.id !== id);
    await Promise.all([
      this.upsertWorkspaceSetting(userId, 'members', { members: nextMembers }),
      this.upsertWorkspaceSetting(userId, 'role_invites', { invites: nextInvites })
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
    const payload = await this.getUserSetting(userId, 'crew_sessions', { sessions: [] });
    return this.extractList(payload, 'sessions');
  }
  async crewSession(userId: string, id: string, body: UpdateCrewSessionDto) {
    const workspace = await this.ensureWorkspaceSeed(userId);
    this.ensureWorkspaceRoleManager(workspace);
    const sessionsPayload = await this.getUserSetting(userId, 'crew_sessions', { sessions: [] });
    const sessions = this.extractList(sessionsPayload, 'sessions');
    const existing = sessions.find((entry: any) => entry?.id === id);
    const updated = {
      id,
      ...(existing ?? {}),
      ...(body.assignments ? { assignments: body.assignments } : {}),
      updatedAt: new Date().toISOString()
    };
    const nextSessions = existing
      ? sessions.map((entry: any) => (entry?.id === id ? updated : entry))
      : [updated, ...sessions];
    await this.upsertUserSetting(userId, 'crew_sessions', { sessions: nextSessions });
    await this.audit.log({
      userId,
      action: 'workspace.crew_updated',
      entityType: 'crew_session',
      entityId: id,
      route: `/api/crew/sessions/${id}`,
      method: 'PATCH',
      statusCode: 200
    });
    return updated;
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

  preferences(userId: string) { return this.getWorkspaceSetting(userId, 'preferences', { locale: 'en', currency: 'USD' }); }
  async updatePreferences(userId: string, body: UpdatePreferencesDto) {
    const current = await this.preferences(userId);
    const next = {
      ...current,
      ...(body.locale ? { locale: body.locale } : {}),
      ...(body.currency ? { currency: body.currency } : {}),
      ...(body.timezone ? { timezone: body.timezone } : {})
    };
    const record = await this.upsertWorkspaceSetting(userId, 'preferences', next);
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
  uiState(userId: string) {
    return this.getUserSetting(userId, 'ui_state', {
      theme: null,
      locale: null,
      currency: null,
      moneyBar: {},
      creatorContext: {},
      shell: {},
      onboarding: {},
      channels: {}
    });
  }
  async updateUiState(userId: string, body: Record<string, unknown>) {
    const current = await this.uiState(userId);
    const next = this.deepMerge(current, body);
    const record = await this.upsertUserSetting(userId, 'ui_state', next);
    await this.audit.log({
      userId,
      action: 'settings.ui_state_updated',
      entityType: 'user_setting',
      entityId: 'ui_state',
      route: '/api/settings/ui-state',
      method: 'PATCH',
      statusCode: 200,
      metadata: { keys: Object.keys(body || {}) }
    });
    return record.payload as Record<string, unknown>;
  }
  payoutMethods(userId: string) { return this.getWorkspaceSetting(userId, 'payout_methods', { methods: [] }); }
  async updatePayoutMethods(userId: string, body: UpdatePayoutMethodsDto) {
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
    const record = await this.upsertWorkspaceSetting(userId, 'payout_methods', {
      methods: normalized,
      ...(body.metadata ? { metadata: body.metadata } : {})
    });
    await this.audit.log({
      userId,
      action: 'settings.payout_methods_updated',
      entityType: 'workspace_setting',
      entityId: 'payout_methods',
      route: '/api/settings/payout-methods',
      method: 'PATCH',
      statusCode: 200
    });
    return record.payload as Record<string, unknown>;
  }
  async securitySettings(userId: string) {
    const current = await this.getWorkspaceSetting(userId, 'security', DEFAULT_SECURITY_SETTINGS);
    return {
      ...DEFAULT_SECURITY_SETTINGS,
      ...current,
      twoFactorConfig: {
        ...DEFAULT_SECURITY_SETTINGS.twoFactorConfig,
        ...((current.twoFactorConfig as Record<string, unknown> | undefined) ?? {})
      },
      passkeys: this.extractList(current, 'passkeys'),
      sessions: this.extractList(current, 'sessions'),
      trustedDevices: this.extractList(current, 'trustedDevices'),
      alerts: this.extractList(current, 'alerts')
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
    const record = await this.upsertWorkspaceSetting(userId, 'security', next);
    await this.audit.log({
      userId,
      action: 'settings.security_updated',
      entityType: 'workspace_setting',
      entityId: 'security',
      route: '/api/settings/security',
      method: 'PATCH',
      statusCode: 200
    });
    return record.payload as Record<string, unknown>;
  }
  integrations(userId: string) { return this.getWorkspaceSetting(userId, 'integrations', { integrations: [], webhooks: [] }); }
  async updateIntegrations(userId: string, body: UpdateIntegrationsDto) {
    const current = await this.integrations(userId);
    const next = {
      ...current,
      ...(body.integrations ? { integrations: body.integrations } : {}),
      ...(body.webhooks ? { webhooks: body.webhooks } : {}),
      ...(body.metadata ? { metadata: body.metadata } : {})
    };
    const record = await this.upsertWorkspaceSetting(userId, 'integrations', next);
    await this.audit.log({
      userId,
      action: 'settings.integrations_updated',
      entityType: 'workspace_setting',
      entityId: 'integrations',
      route: '/api/settings/integrations',
      method: 'PATCH',
      statusCode: 200
    });
    return record.payload as Record<string, unknown>;
  }
  tax(userId: string) { return this.getWorkspaceSetting(userId, 'tax', { profiles: [], reports: [] }); }
  async updateTax(userId: string, body: UpdateTaxDto) {
    const current = await this.tax(userId);
    const next = {
      ...current,
      ...(body.profiles ? { profiles: body.profiles } : {}),
      ...(body.reports ? { reports: body.reports } : {}),
      ...(body.metadata ? { metadata: body.metadata } : {})
    };
    const record = await this.upsertWorkspaceSetting(userId, 'tax', next);
    await this.audit.log({
      userId,
      action: 'settings.tax_updated',
      entityType: 'workspace_setting',
      entityId: 'tax',
      route: '/api/settings/tax',
      method: 'PATCH',
      statusCode: 200
    });
    return record.payload as Record<string, unknown>;
  }
  kyc(userId: string) { return this.getWorkspaceSetting(userId, 'kyc', { status: 'pending', documents: [] }); }
  async updateKyc(userId: string, body: UpdateKycDto) {
    const current = await this.kyc(userId);
    const next = {
      ...current,
      ...(body.status ? { status: body.status } : {}),
      ...(body.documents ? { documents: body.documents } : {}),
      ...(body.metadata ? { metadata: body.metadata } : {})
    };
    const record = await this.upsertWorkspaceSetting(userId, 'kyc', next);
    await this.audit.log({
      userId,
      action: 'settings.kyc_updated',
      entityType: 'workspace_setting',
      entityId: 'kyc',
      route: '/api/settings/kyc',
      method: 'PATCH',
      statusCode: 200
    });
    return record.payload as Record<string, unknown>;
  }
  savedViews(userId: string) { return this.getWorkspaceSetting(userId, 'saved_views', { views: [] }); }
  async updateSavedViews(userId: string, body: UpdateSavedViewsDto) {
    const current = await this.savedViews(userId);
    const next = {
      ...current,
      ...(body.views ? { views: body.views } : {}),
      ...(body.metadata ? { metadata: body.metadata } : {})
    };
    const record = await this.upsertWorkspaceSetting(userId, 'saved_views', next);
    await this.audit.log({
      userId,
      action: 'settings.saved_views_updated',
      entityType: 'workspace_setting',
      entityId: 'saved_views',
      route: '/api/settings/saved-views',
      method: 'PATCH',
      statusCode: 200
    });
    return record.payload as Record<string, unknown>;
  }
  help(userId: string) { return this.getWorkspaceSetting(userId, 'help', { links: [] }); }
  statusCenter(userId: string) { return this.getWorkspaceSetting(userId, 'status_center', { services: [] }); }
  notificationPreferences(userId: string) { return this.getWorkspaceSetting(userId, 'notification_preferences', { watches: [] }); }
  async updateNotificationPreferences(userId: string, body: UpdateNotificationPreferencesDto) {
    const current = await this.notificationPreferences(userId);
    const next = {
      ...current,
      ...(body.watches ? { watches: body.watches } : {}),
      ...(body.metadata ? { metadata: body.metadata } : {})
    };
    const record = await this.upsertWorkspaceSetting(userId, 'notification_preferences', next);
    await this.audit.log({
      userId,
      action: 'settings.notifications_updated',
      entityType: 'workspace_setting',
      entityId: 'notification_preferences',
      route: '/api/settings/notification-preferences',
      method: 'PATCH',
      statusCode: 200
    });
    return record.payload as Record<string, unknown>;
  }

  private async getWorkspaceSetting(userId: string, key: string, fallback: Record<string, unknown>) {
    const record = await this.prisma.workspaceSetting.findUnique({
      where: { userId_key: { userId, key } }
    });
    return record ? (record.payload as Record<string, unknown>) : fallback;
  }

  private async upsertWorkspaceSetting(userId: string, key: string, body: unknown) {
    const sanitized = this.ensurePayload(body);
    return this.prisma.workspaceSetting.upsert({
      where: { userId_key: { userId, key } },
      update: { payload: sanitized as Prisma.InputJsonValue },
      create: {
        userId,
        key,
        payload: sanitized as Prisma.InputJsonValue
      }
    });
  }

  private async getUserSetting(userId: string, key: string, fallback: Record<string, unknown>) {
    const record = await this.prisma.userSetting.findUnique({
      where: { userId_key: { userId, key } }
    });
    return record ? (record.payload as Record<string, unknown>) : fallback;
  }

  private async upsertUserSetting(userId: string, key: string, body: unknown) {
    const sanitized = this.ensurePayload(body);
    return this.prisma.userSetting.upsert({
      where: { userId_key: { userId, key } },
      update: { payload: sanitized as Prisma.InputJsonValue },
      create: {
        userId,
        key,
        payload: sanitized as Prisma.InputJsonValue
      }
    });
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

  private normalizeSettingsRecord(payload: Record<string, unknown>) {
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

  private async ensureWorkspaceSeed(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });
    const email = String(user?.email ?? '').trim().toLowerCase();
    const [rolesPayload, membersPayload, invitesPayload, securityPayload] = await Promise.all([
      this.getWorkspaceSetting(userId, 'roles', { roles: [] }),
      this.getWorkspaceSetting(userId, 'members', { members: [] }),
      this.getWorkspaceSetting(userId, 'role_invites', { invites: [] }),
      this.getWorkspaceSetting(userId, 'roles_security', DEFAULT_WORKSPACE_SECURITY)
    ]);

    const roles = this.extractList(rolesPayload, 'roles') as any[];
    const members = this.extractList(membersPayload, 'members') as any[];
    const invites = this.extractList(invitesPayload, 'invites') as any[];
    const workspaceSecurity = this.hydrateWorkspaceSecurity(securityPayload as Record<string, unknown>);

    let nextRoles = roles;
    if (roles.length === 0) {
      nextRoles = [
        {
          id: 'role_owner',
          name: 'Owner',
          badge: 'System',
          description: 'Workspace owner with full access.',
          perms: {
            'roles.manage': true,
            'admin.manage_roles': true,
            'admin.manage_team': true,
            'admin.audit': true
          }
        }
      ];
      await this.upsertWorkspaceSetting(userId, 'roles', { roles: nextRoles });
    }

    let nextMembers = members;
    if (members.length === 0 && email) {
      nextMembers = [
        {
          id: 'member_owner',
          name: email.split('@')[0] || 'Owner',
          email,
          roleId: nextRoles[0].id,
          status: 'active',
          seat: 'Owner',
          createdAt: new Date().toISOString()
        }
      ];
      await this.upsertWorkspaceSetting(userId, 'members', { members: nextMembers });
    }

    const currentMember = nextMembers.find(
      (member) => String(member.email || '').trim().toLowerCase() === email
    );
    const currentRole = currentMember
      ? nextRoles.find((role) => role.id === currentMember.roleId) ?? null
      : null;
    const effectivePermissions = this.normalizePerms(currentRole?.perms);

    const combinedInvites = [
      ...invites,
      ...nextMembers.filter((member) => String(member.status || '').toLowerCase() === 'invited')
    ];

    return {
      roles: nextRoles,
      members: nextMembers,
      invites: combinedInvites,
      currentMember: currentMember ?? null,
      effectivePermissions,
      workspaceSecurity
    };
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
