import assert from 'node:assert/strict';
import test from 'node:test';
import { SettingsService } from '../src/modules/settings/settings.service.js';

test('SettingsService.notificationRead handles missing notifications', async () => {
  const prisma = {
    notification: {
      findFirst: async () => null,
      update: async () => ({})
    }
  };
  const service = new SettingsService(prisma as any);

  await assert.rejects(() => service.notificationRead('user-1', 'SELLER', 'missing'), /Notification not found/);
});

test('SettingsService.notificationRead updates existing notifications', async () => {
  const prisma = {
    notification: {
      findFirst: async () => ({ id: 'note-1', userId: 'user-1', readAt: null, metadata: { workspaceRole: 'SELLER' } }),
      update: async ({ data }: any) => ({ id: 'note-1', readAt: data.readAt })
    }
  };
  const service = new SettingsService(prisma as any);
  const updated = await service.notificationRead('user-1', 'SELLER', 'note-1');
  assert.ok(updated.readAt);
});

test('SettingsService.notifications filters by active workspace role', async () => {
  const prisma = {
    notification: {
      findMany: async () => ([
        { id: 'note-seller', userId: 'user-1', title: 'Seller', body: '', kind: 'system', readAt: null, metadata: { workspaceRole: 'SELLER' }, createdAt: new Date(), updatedAt: new Date() },
        { id: 'note-provider', userId: 'user-1', title: 'Provider', body: '', kind: 'system', readAt: null, metadata: { workspaceRole: 'PROVIDER' }, createdAt: new Date(), updatedAt: new Date() }
      ])
    }
  };
  const service = new SettingsService(prisma as any);
  const notifications = await service.notifications('user-1', 'SELLER');

  assert.deepEqual(notifications.map((entry: any) => entry.id), ['note-seller']);
});
