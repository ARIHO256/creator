import assert from 'node:assert/strict';
import test from 'node:test';
import { SettingsService } from '../src/modules/settings/settings.service.js';

function createPrismaStub() {
  const workspaceSettings = new Map<string, any>();
  const userSettings = new Map<string, any>();
  return {
    user: {
      async findUnique() {
        return { email: 'owner@example.com' };
      }
    },
    workspaceSetting: {
      async findUnique({ where }: any) {
        return workspaceSettings.get(`${where.userId_key.userId}:${where.userId_key.key}`) ?? null;
      },
      async upsert({ where, update, create }: any) {
        const key = `${where.userId_key.userId}:${where.userId_key.key}`;
        const payload = update?.payload ?? create.payload;
        const record = { id: key, ...create, payload };
        workspaceSettings.set(key, record);
        return record;
      }
    },
    userSetting: {
      async findUnique({ where }: any) {
        return userSettings.get(`${where.userId_key.userId}:${where.userId_key.key}`) ?? null;
      },
      async upsert({ where, update, create }: any) {
        const key = `${where.userId_key.userId}:${where.userId_key.key}`;
        const payload = update?.payload ?? create.payload;
        const record = { id: key, ...create, payload };
        userSettings.set(key, record);
        return record;
      }
    },
    auditEvent: { async findMany() { return []; } }
  };
}

test('SettingsService.roles seeds workspace roles and current member', async () => {
  const prisma = createPrismaStub();
  const audit = { async log() {} };
  const service = new SettingsService(prisma as any, audit as any);

  const result = await service.roles('user-1');
  assert.ok(result.roles.length > 0);
  assert.ok(result.currentMember);
  assert.equal(result.currentMember.email, 'owner@example.com');
});

test('SettingsService.createRole rejects duplicate role names', async () => {
  const prisma = createPrismaStub();
  const audit = { async log() {} };
  const service = new SettingsService(prisma as any, audit as any);

  await service.createRole('user-1', { name: 'Custom' } as any);
  await assert.rejects(
    () => service.createRole('user-1', { name: 'Custom' } as any),
    /Role name already exists/
  );
});
