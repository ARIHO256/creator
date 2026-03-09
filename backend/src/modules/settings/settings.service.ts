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
  async updateSettings(userId: string, body: Record<string, unknown>) {
    const record = await this.upsertUserSetting(userId, 'profile', body);
    return record.payload as Record<string, unknown>;
  }
  sendPayoutCode(userId: string, body: Record<string, unknown>) {
    const channel = typeof body.channel === 'string' ? body.channel : 'email';
    return { sent: true, channel, codeId: randomUUID() };
  }
  async verifyPayout(userId: string, body: Record<string, unknown>) {
    const payload = {
      verified: true,
      ...this.ensureObjectPayload(body),
      verifiedAt: new Date().toISOString()
    };
    const record = await this.upsertUserSetting(userId, 'payout_verification', payload);
    return record.payload as Record<string, unknown>;
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

  async security(userId: string, body: Record<string, unknown>) {
    const record = await this.upsertWorkspaceSetting(userId, 'roles_security', body);
    return record.payload as Record<string, unknown>;
  }
  async createRole(userId: string, body: Record<string, unknown>) {
    const payload = this.ensureObjectPayload(body);
    const id = String((payload as any).id ?? randomUUID());
    const rolesPayload = await this.getWorkspaceSetting(userId, 'roles', { roles: [] });
    const roles = this.extractList(rolesPayload, 'roles');
    const nextRole = { id, createdAt: new Date().toISOString(), ...payload };
    const nextRoles = [nextRole, ...roles.filter((entry: any) => entry?.id !== id)];
    await this.upsertWorkspaceSetting(userId, 'roles', { roles: nextRoles });
    return nextRole;
  }
  async updateRole(userId: string, id: string, body: Record<string, unknown>) {
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
    return updated;
  }
  async deleteRole(userId: string, id: string) {
    const rolesPayload = await this.getWorkspaceSetting(userId, 'roles', { roles: [] });
    const roles = this.extractList(rolesPayload, 'roles');
    const nextRoles = roles.filter((entry: any) => entry?.id !== id);
    await this.upsertWorkspaceSetting(userId, 'roles', { roles: nextRoles });
    return { deleted: true };
  }
  async createInvite(userId: string, body: Record<string, unknown>) {
    const payload = this.ensureObjectPayload(body);
    const id = String((payload as any).id ?? randomUUID());
    const invitesPayload = await this.getWorkspaceSetting(userId, 'role_invites', { invites: [] });
    const invites = this.extractList(invitesPayload, 'invites');
    const nextInvite = { id, createdAt: new Date().toISOString(), ...payload };
    const nextInvites = [nextInvite, ...invites.filter((entry: any) => entry?.id !== id)];
    await this.upsertWorkspaceSetting(userId, 'role_invites', { invites: nextInvites });
    return nextInvite;
  }
  async updateMember(userId: string, id: string, body: Record<string, unknown>) {
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
    return updated;
  }

  async crew(userId: string) {
    const payload = await this.getUserSetting(userId, 'crew_sessions', { sessions: [] });
    return this.extractList(payload, 'sessions');
  }
  async crewSession(userId: string, id: string, body: Record<string, unknown>) {
    const payload = this.ensureObjectPayload(body);
    const sessionsPayload = await this.getUserSetting(userId, 'crew_sessions', { sessions: [] });
    const sessions = this.extractList(sessionsPayload, 'sessions');
    const existing = sessions.find((entry: any) => entry?.id === id);
    const updated = { id, ...(existing ?? {}), ...payload, updatedAt: new Date().toISOString() };
    const nextSessions = existing
      ? sessions.map((entry: any) => (entry?.id === id ? updated : entry))
      : [updated, ...sessions];
    await this.upsertUserSetting(userId, 'crew_sessions', { sessions: nextSessions });
    return updated;
  }
  auditLogs(userId: string) {
    return this.prisma.auditEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }

  preferences(userId: string) { return this.getWorkspaceSetting(userId, 'preferences', { locale: 'en', currency: 'USD' }); }
  async updatePreferences(userId: string, body: Record<string, unknown>) {
    const record = await this.upsertWorkspaceSetting(userId, 'preferences', body);
    return record.payload as Record<string, unknown>;
  }
  payoutMethods(userId: string) { return this.getWorkspaceSetting(userId, 'payout_methods', { methods: [] }); }
  async updatePayoutMethods(userId: string, body: Record<string, unknown>) {
    const record = await this.upsertWorkspaceSetting(userId, 'payout_methods', body);
    return record.payload as Record<string, unknown>;
  }
  securitySettings(userId: string) { return this.getWorkspaceSetting(userId, 'security', { twoFactor: false, sessions: [] }); }
  async updateSecuritySettings(userId: string, body: Record<string, unknown>) {
    const record = await this.upsertWorkspaceSetting(userId, 'security', body);
    return record.payload as Record<string, unknown>;
  }
  integrations(userId: string) { return this.getWorkspaceSetting(userId, 'integrations', { integrations: [], webhooks: [] }); }
  async updateIntegrations(userId: string, body: Record<string, unknown>) {
    const record = await this.upsertWorkspaceSetting(userId, 'integrations', body);
    return record.payload as Record<string, unknown>;
  }
  tax(userId: string) { return this.getWorkspaceSetting(userId, 'tax', { profiles: [], reports: [] }); }
  async updateTax(userId: string, body: Record<string, unknown>) {
    const record = await this.upsertWorkspaceSetting(userId, 'tax', body);
    return record.payload as Record<string, unknown>;
  }
  kyc(userId: string) { return this.getWorkspaceSetting(userId, 'kyc', { status: 'pending', documents: [] }); }
  async updateKyc(userId: string, body: Record<string, unknown>) {
    const record = await this.upsertWorkspaceSetting(userId, 'kyc', body);
    return record.payload as Record<string, unknown>;
  }
  savedViews(userId: string) { return this.getWorkspaceSetting(userId, 'saved_views', { views: [] }); }
  async updateSavedViews(userId: string, body: Record<string, unknown>) {
    const record = await this.upsertWorkspaceSetting(userId, 'saved_views', body);
    return record.payload as Record<string, unknown>;
  }
  help(userId: string) { return this.getWorkspaceSetting(userId, 'help', { links: [] }); }
  statusCenter(userId: string) { return this.getWorkspaceSetting(userId, 'status_center', { services: [] }); }
  notificationPreferences(userId: string) { return this.getWorkspaceSetting(userId, 'notification_preferences', { watches: [] }); }
  async updateNotificationPreferences(userId: string, body: Record<string, unknown>) {
    const record = await this.upsertWorkspaceSetting(userId, 'notification_preferences', body);
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

}
