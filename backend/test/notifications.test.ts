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

  await assert.rejects(() => service.notificationRead('user-1', 'missing'), /Notification not found/);
});

test('SettingsService.notificationRead updates existing notifications', async () => {
  const prisma = {
    notification: {
      findFirst: async () => ({ id: 'note-1', userId: 'user-1', readAt: null }),
      update: async ({ data }: any) => ({ id: 'note-1', readAt: data.readAt })
    }
  };
  const service = new SettingsService(prisma as any);
  const updated = await service.notificationRead('user-1', 'note-1');
  assert.ok(updated.readAt);
});
