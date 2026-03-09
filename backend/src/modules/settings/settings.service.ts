import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { sanitizePayload } from '../../common/sanitizers/payload-sanitizer.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async settings(userId: string) {
    return (await this.getUserSetting(userId, 'profile', {})) as Record<string, unknown>;
  }
  async updateSettings(userId: string, body: any) {
    const record = await this.upsertUserSetting(userId, 'profile', body);
    return this.toAppRecord(record, 'settings', 'profile', 'main');
  }
  sendPayoutCode(userId: string, body: any) { return { sent: true, channel: body?.channel || 'email', codeId: randomUUID() }; }
  async verifyPayout(userId: string, body: any) {
    const payload = {
      verified: true,
      ...this.ensurePayload(body),
      verifiedAt: new Date().toISOString()
    };
    const record = await this.upsertUserSetting(userId, 'payout_verification', payload);
    return this.toAppRecord(record, 'settings', 'payout_verification', 'main');
  }
  async signOutDevice(userId: string, id: string) {
    const devicesPayload = await this.getUserSetting(userId, 'devices', { devices: [] });
    const devices = this.extractList(devicesPayload, 'devices');
    const nextDevices = devices.filter((device: any) => device?.id !== id);
    await this.upsertUserSetting(userId, 'devices', { devices: nextDevices });
    return { deleted: true };
  }
  async signOutAll(userId: string) {
    await this.upsertUserSetting(userId, 'devices', { devices: [] });
    return { signedOutAll: true };
  }

  notifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
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
  async notificationReadAll(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() }
    });
  }

  async roles(userId: string) {
    const [rolesPayload, membersPayload, invitesPayload] = await Promise.all([
      this.getWorkspaceSetting(userId, 'roles', { roles: [] }),
      this.getWorkspaceSetting(userId, 'members', { members: [] }),
      this.getWorkspaceSetting(userId, 'role_invites', { invites: [] })
    ]);

    return {
      roles: this.extractList(rolesPayload, 'roles'),
      members: this.extractList(membersPayload, 'members'),
      invites: this.extractList(invitesPayload, 'invites')
    };
  }

  async security(userId: string, body: any) {
    const record = await this.upsertWorkspaceSetting(userId, 'roles_security', body);
    return this.toAppRecord(record, 'settings', 'roles_security', 'main');
  }
  async createRole(userId: string, body: any) {
    const payload = this.ensureObjectPayload(body);
    const id = String((payload as any).id ?? randomUUID());
    const rolesPayload = await this.getWorkspaceSetting(userId, 'roles', { roles: [] });
    const roles = this.extractList(rolesPayload, 'roles');
    const nextRole = { id, createdAt: new Date().toISOString(), ...payload };
    const nextRoles = [nextRole, ...roles.filter((entry: any) => entry?.id !== id)];
    await this.upsertWorkspaceSetting(userId, 'roles', { roles: nextRoles });
    return this.buildAppRecord(userId, 'settings', 'role', id, nextRole);
  }
  async updateRole(userId: string, id: string, body: any) {
    const payload = this.ensureObjectPayload(body);
    const rolesPayload = await this.getWorkspaceSetting(userId, 'roles', { roles: [] });
    const roles = this.extractList(rolesPayload, 'roles');
    const existing = roles.find((entry: any) => entry?.id === id);
    if (!existing) {
      throw new NotFoundException('Role not found');
    }
    const updated = { ...existing, ...payload, updatedAt: new Date().toISOString() };
    const nextRoles = roles.map((entry: any) => (entry?.id === id ? updated : entry));
    await this.upsertWorkspaceSetting(userId, 'roles', { roles: nextRoles });
    return this.buildAppRecord(userId, 'settings', 'role', id, updated);
  }
  async deleteRole(userId: string, id: string) {
    const rolesPayload = await this.getWorkspaceSetting(userId, 'roles', { roles: [] });
    const roles = this.extractList(rolesPayload, 'roles');
    const nextRoles = roles.filter((entry: any) => entry?.id !== id);
    await this.upsertWorkspaceSetting(userId, 'roles', { roles: nextRoles });
    return { deleted: true };
  }
  async createInvite(userId: string, body: any) {
    const payload = this.ensureObjectPayload(body);
    const id = String((payload as any).id ?? randomUUID());
    const invitesPayload = await this.getWorkspaceSetting(userId, 'role_invites', { invites: [] });
    const invites = this.extractList(invitesPayload, 'invites');
    const nextInvite = { id, createdAt: new Date().toISOString(), ...payload };
    const nextInvites = [nextInvite, ...invites.filter((entry: any) => entry?.id !== id)];
    await this.upsertWorkspaceSetting(userId, 'role_invites', { invites: nextInvites });
    return this.buildAppRecord(userId, 'settings', 'role_invite', id, nextInvite);
  }
  async updateMember(userId: string, id: string, body: any) {
    const payload = this.ensureObjectPayload(body);
    const membersPayload = await this.getWorkspaceSetting(userId, 'members', { members: [] });
    const members = this.extractList(membersPayload, 'members');
    const existing = members.find((entry: any) => entry?.id === id);
    const updated = {
      id,
      ...(existing ?? {}),
      ...payload,
      updatedAt: new Date().toISOString()
    };
    const nextMembers = existing
      ? members.map((entry: any) => (entry?.id === id ? updated : entry))
      : [updated, ...members];
    await this.upsertWorkspaceSetting(userId, 'members', { members: nextMembers });
    return this.buildAppRecord(userId, 'settings', 'member', id, updated);
  }

  async crew(userId: string) {
    const payload = await this.getUserSetting(userId, 'crew_sessions', { sessions: [] });
    return this.extractList(payload, 'sessions');
  }
  async crewSession(userId: string, id: string, body: any) {
    const payload = this.ensureObjectPayload(body);
    const sessionsPayload = await this.getUserSetting(userId, 'crew_sessions', { sessions: [] });
    const sessions = this.extractList(sessionsPayload, 'sessions');
    const existing = sessions.find((entry: any) => entry?.id === id);
    const updated = { id, ...(existing ?? {}), ...payload, updatedAt: new Date().toISOString() };
    const nextSessions = existing
      ? sessions.map((entry: any) => (entry?.id === id ? updated : entry))
      : [updated, ...sessions];
    await this.upsertUserSetting(userId, 'crew_sessions', { sessions: nextSessions });
    return this.buildAppRecord(userId, 'settings', 'crew_session', id, updated);
  }
  auditLogs(userId: string) {
    return this.prisma.auditEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }

  preferences(userId: string) { return this.getWorkspaceSetting(userId, 'preferences', { locale: 'en', currency: 'USD' }); }
  async updatePreferences(userId: string, body: any) {
    const record = await this.upsertWorkspaceSetting(userId, 'preferences', body);
    return this.toAppRecord(record, 'seller_workspace', 'preferences', 'main');
  }
  payoutMethods(userId: string) { return this.getWorkspaceSetting(userId, 'payout_methods', { methods: [] }); }
  async updatePayoutMethods(userId: string, body: any) {
    const record = await this.upsertWorkspaceSetting(userId, 'payout_methods', body);
    return this.toAppRecord(record, 'seller_workspace', 'payout_methods', 'main');
  }
  securitySettings(userId: string) { return this.getWorkspaceSetting(userId, 'security', { twoFactor: false, sessions: [] }); }
  async updateSecuritySettings(userId: string, body: any) {
    const record = await this.upsertWorkspaceSetting(userId, 'security', body);
    return this.toAppRecord(record, 'seller_workspace', 'security', 'main');
  }
  integrations(userId: string) { return this.getWorkspaceSetting(userId, 'integrations', { integrations: [], webhooks: [] }); }
  async updateIntegrations(userId: string, body: any) {
    const record = await this.upsertWorkspaceSetting(userId, 'integrations', body);
    return this.toAppRecord(record, 'seller_workspace', 'integrations', 'main');
  }
  tax(userId: string) { return this.getWorkspaceSetting(userId, 'tax', { profiles: [], reports: [] }); }
  async updateTax(userId: string, body: any) {
    const record = await this.upsertWorkspaceSetting(userId, 'tax', body);
    return this.toAppRecord(record, 'seller_workspace', 'tax', 'main');
  }
  kyc(userId: string) { return this.getWorkspaceSetting(userId, 'kyc', { status: 'pending', documents: [] }); }
  async updateKyc(userId: string, body: any) {
    const record = await this.upsertWorkspaceSetting(userId, 'kyc', body);
    return this.toAppRecord(record, 'seller_workspace', 'kyc', 'main');
  }
  savedViews(userId: string) { return this.getWorkspaceSetting(userId, 'saved_views', { views: [] }); }
  async updateSavedViews(userId: string, body: any) {
    const record = await this.upsertWorkspaceSetting(userId, 'saved_views', body);
    return this.toAppRecord(record, 'seller_workspace', 'saved_views', 'main');
  }
  help(userId: string) { return this.getWorkspaceSetting(userId, 'help', { links: [] }); }
  statusCenter(userId: string) { return this.getWorkspaceSetting(userId, 'status_center', { services: [] }); }
  notificationPreferences(userId: string) { return this.getWorkspaceSetting(userId, 'notification_preferences', { watches: [] }); }
  async updateNotificationPreferences(userId: string, body: any) {
    const record = await this.upsertWorkspaceSetting(userId, 'notification_preferences', body);
    return this.toAppRecord(record, 'seller_workspace', 'notification_preferences', 'main');
  }

  private async getWorkspaceSetting(userId: string, key: string, fallback: any) {
    const record = await this.prisma.workspaceSetting.findUnique({
      where: { userId_key: { userId, key } }
    });
    return record ? (record.payload as Record<string, unknown>) : fallback;
  }

  private async upsertWorkspaceSetting(userId: string, key: string, body: any) {
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

  private async getUserSetting(userId: string, key: string, fallback: any) {
    const record = await this.prisma.userSetting.findUnique({
      where: { userId_key: { userId, key } }
    });
    return record ? (record.payload as Record<string, unknown>) : fallback;
  }

  private async upsertUserSetting(userId: string, key: string, body: any) {
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
    if (payload && typeof payload === 'object' && Array.isArray((payload as any)[key])) {
      return (payload as any)[key] as unknown[];
    }
    return [];
  }

  private toAppRecord(
    record: { id: string; userId: string; key: string; payload: unknown; createdAt: Date; updatedAt: Date },
    domain: string,
    entityType: string,
    entityId: string
  ) {
    return {
      id: record.id,
      domain,
      entityType,
      entityId,
      userId: record.userId,
      payload: record.payload,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }

  private buildAppRecord(
    userId: string,
    domain: string,
    entityType: string,
    entityId: string,
    payload: unknown
  ) {
    const now = new Date();
    return {
      id: entityId,
      domain,
      entityType,
      entityId,
      userId,
      payload,
      createdAt: now,
      updatedAt: now
    };
  }
}
