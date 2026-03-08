import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AppRecordsService } from '../../platform/app-records.service.js';

@Injectable()
export class SettingsService {
  constructor(private readonly records: AppRecordsService) {}

  settings(userId: string) {
    return this.records.getByEntityId('settings', 'profile', 'main', userId).then((r)=>r.payload).catch(()=>({}));
  }
  updateSettings(userId: string, body: any) { return this.records.upsert('settings', 'profile', 'main', body, userId); }
  sendPayoutCode(userId: string, body: any) { return { sent: true, channel: body?.channel || 'email', codeId: randomUUID() }; }
  verifyPayout(userId: string, body: any) { return this.records.upsert('settings', 'payout_verification', 'main', { verified: true, ...body }, userId); }
  signOutDevice(userId: string, id: string) { return this.records.remove('settings', 'device', id, userId).catch(()=>({deleted:true})); }
  async signOutAll(userId: string) {
    await this.records.removeMany('settings', 'device', userId);
    return { signedOutAll: true };
  }

  notifications(userId: string) { return this.records.list('settings', 'notification', userId).then((rows)=>rows.map((r)=>({id:r.entityId,...(r.payload as any)}))); }
  async notificationRead(userId: string, id: string) { const rec = await this.records.getByEntityId('settings','notification',id,userId); return this.records.update('settings','notification',id,{...(rec.payload as any),read:true},userId); }
  async notificationReadAll(userId: string) {
    const rows = await this.records.list('settings', 'notification', userId);
    return this.records.updateMany(
      'settings',
      'notification',
      rows
        .filter((row) => row.entityId)
        .map((row) => ({
          entityId: row.entityId!,
          payload: { ...(row.payload as any), read: true }
        })),
      userId
    );
  }

  roles(userId: string) {
    return Promise.all([
      this.records.list('settings','role',userId),
      this.records.list('settings','member',userId),
      this.records.list('settings','role_invite',userId)
    ]).then(([roles,members,invites]) => ({
      roles: roles.map((r)=>({id:r.entityId,...(r.payload as any)})),
      members: members.map((r)=>({id:r.entityId,...(r.payload as any)})),
      invites: invites.map((r)=>({id:r.entityId,...(r.payload as any)}))
    }));
  }

  security(userId: string, body: any) { return this.records.upsert('settings','roles_security','main',body,userId); }
  createRole(userId: string, body: any) { const id = body.id || randomUUID(); return this.records.create('settings','role',body,id,userId); }
  updateRole(userId: string, id: string, body: any) { return this.records.update('settings','role',id,body,userId); }
  deleteRole(userId: string, id: string) { return this.records.remove('settings','role',id,userId); }
  createInvite(userId: string, body: any) { const id = body.id || randomUUID(); return this.records.create('settings','role_invite',body,id,userId); }
  updateMember(userId: string, id: string, body: any) { return this.records.upsert('settings','member',id,body,userId); }

  crew(userId: string) { return this.records.list('settings','crew_session',userId).then((rows)=>rows.map((r)=>({id:r.entityId,...(r.payload as any)}))); }
  crewSession(userId: string, id: string, body: any) { return this.records.upsert('settings','crew_session',id,body,userId); }
  auditLogs(userId: string) { return this.records.list('settings','audit_log',userId).then((rows)=>rows.map((r)=>({id:r.entityId,...(r.payload as any)}))); }

  preferences(userId: string) { return this.getWorkspaceSetting(userId, 'preferences', { locale: 'en', currency: 'USD' }); }
  updatePreferences(userId: string, body: any) { return this.upsertWorkspaceSetting(userId, 'preferences', body); }
  payoutMethods(userId: string) { return this.getWorkspaceSetting(userId, 'payout_methods', { methods: [] }); }
  updatePayoutMethods(userId: string, body: any) { return this.upsertWorkspaceSetting(userId, 'payout_methods', body); }
  securitySettings(userId: string) { return this.getWorkspaceSetting(userId, 'security', { twoFactor: false, sessions: [] }); }
  updateSecuritySettings(userId: string, body: any) { return this.upsertWorkspaceSetting(userId, 'security', body); }
  integrations(userId: string) { return this.getWorkspaceSetting(userId, 'integrations', { integrations: [], webhooks: [] }); }
  updateIntegrations(userId: string, body: any) { return this.upsertWorkspaceSetting(userId, 'integrations', body); }
  tax(userId: string) { return this.getWorkspaceSetting(userId, 'tax', { profiles: [], reports: [] }); }
  updateTax(userId: string, body: any) { return this.upsertWorkspaceSetting(userId, 'tax', body); }
  kyc(userId: string) { return this.getWorkspaceSetting(userId, 'kyc', { status: 'pending', documents: [] }); }
  updateKyc(userId: string, body: any) { return this.upsertWorkspaceSetting(userId, 'kyc', body); }
  savedViews(userId: string) { return this.getWorkspaceSetting(userId, 'saved_views', { views: [] }); }
  updateSavedViews(userId: string, body: any) { return this.upsertWorkspaceSetting(userId, 'saved_views', body); }
  help(userId: string) { return this.getWorkspaceSetting(userId, 'help', { links: [] }); }
  statusCenter(userId: string) { return this.getWorkspaceSetting(userId, 'status_center', { services: [] }); }
  notificationPreferences(userId: string) { return this.getWorkspaceSetting(userId, 'notification_preferences', { watches: [] }); }
  updateNotificationPreferences(userId: string, body: any) { return this.upsertWorkspaceSetting(userId, 'notification_preferences', body); }

  private getWorkspaceSetting(userId: string, key: string, fallback: any) {
    return this.records.getByEntityId('seller_workspace', key, 'main', userId).then((r)=>r.payload).catch(()=>fallback);
  }

  private upsertWorkspaceSetting(userId: string, key: string, body: any) {
    return this.records.upsert('seller_workspace', key, 'main', body, userId);
  }
}
