import assert from 'node:assert/strict';
import test from 'node:test';
import { SettingsService } from '../src/modules/settings/settings.service.js';

function createPrismaStub(overrides: {
  user?: Record<string, unknown>;
  seller?: Record<string, unknown> | null;
  workflowRecords?: Map<string, Record<string, unknown>>;
} = {}) {
  const workspaceSettings = new Map<string, any>();
  const userSettings = new Map<string, any>();
  const workflowRecords = overrides.workflowRecords ?? new Map<string, Record<string, unknown>>();
  return {
    user: {
      async findUnique() {
        return overrides.user ?? { email: 'owner@example.com', phone: '+256700000000' };
      }
    },
    seller: {
      async findUnique() {
        return overrides.seller ?? null;
      }
    },
    accountApproval: {
      async findUnique({ where }: any) {
        const payload = workflowRecords.get(`${where.userId}:account_approval:main`);
        return payload ? { userId: where.userId, payload } : null;
      }
    },
    workflowRecord: {
      async findUnique({ where }: any) {
        const key = `${where.userId_recordType_recordKey.userId}:${where.userId_recordType_recordKey.recordType}:${where.userId_recordType_recordKey.recordKey}`;
        const payload = workflowRecords.get(key);
        return payload ? { payload } : null;
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

test('SettingsService derives live seller settings from submitted onboarding data', async () => {
  const workflowRecords = new Map<string, Record<string, unknown>>([
    [
      'user-1:onboarding:main',
      {
        profileType: 'SELLER',
        status: 'submitted',
        owner: 'Jane Doe',
        storeName: 'Acme Wholesale',
        storeSlug: 'acme-wholesale',
        email: 'seller@example.com',
        phone: '+256700111222',
        website: 'https://acme.example.com',
        about: 'Wholesale electronics and accessories.',
        brandColor: '#112233',
        logoUrl: 'https://cdn.example.com/assets/logo.png',
        coverUrl: 'https://cdn.example.com/assets/cover.jpg',
        channels: ['uganda'],
        languages: ['en', 'sw'],
        shipFrom: {
          country: 'UG',
          province: 'Central',
          city: 'Kampala',
          address1: 'Plot 4 Market Street',
          address2: 'Level 2',
          postalCode: '256'
        },
        support: {
          email: 'support@acme.example.com',
          phone: '+256700333444',
          whatsapp: '+256700333444'
        },
        taxonomySelections: [
          {
            nodeId: 'node-1',
            pathNodes: [
              { id: 'market', name: 'Marketplace', type: 'Marketplace' },
              { id: 'cat-1', name: 'Electronics', type: 'Category' }
            ]
          }
        ],
        docs: {
          list: [
            {
              id: 'doc-1',
              type: 'passport',
              name: 'passport.pdf',
              file: 'passport.pdf',
              status: 'submitted',
              uploadedAt: '2026-03-12T09:00:00.000Z'
            }
          ]
        },
        payout: {
          method: 'bank_account',
          currency: 'UGX',
          rhythm: 'weekly',
          thresholdAmount: 500,
          bankName: 'Stanbic',
          bankCountry: 'UG',
          accountName: 'Acme Wholesale Ltd',
          accountNo: '1234567890',
          swiftBic: 'SBICUGKX'
        },
        tax: {
          taxpayerType: 'company',
          legalName: 'Acme Wholesale Ltd',
          taxCountry: 'UG',
          taxId: 'TIN-001',
          vatNumber: 'VAT-001',
          legalAddress: 'Plot 4 Market Street, Kampala'
        },
        submittedAt: '2026-03-12T10:00:00.000Z',
        updatedAt: '2026-03-12T10:00:00.000Z'
      }
    ],
    [
      'user-1:account_approval:main',
      {
        status: 'approved',
        approvedAt: '2026-03-12T11:00:00.000Z'
      }
    ]
  ]);
  const prisma = createPrismaStub({
    user: { email: 'seller@example.com', phone: '+256700111222' },
    seller: {
      id: 'seller-1',
      handle: 'acme-wholesale',
      name: 'Acme Wholesale',
      displayName: 'Acme Wholesale',
      legalBusinessName: 'Acme Wholesale Ltd',
      storefrontName: 'Acme Wholesale',
      category: null,
      description: 'Wholesale electronics and accessories.',
      updatedAt: new Date('2026-03-12T10:00:00.000Z'),
      storefront: {
        id: 'storefront-1',
        slug: 'acme-wholesale',
        name: 'Acme Wholesale',
        tagline: null,
        description: 'Wholesale electronics and accessories.',
        logoUrl: 'https://cdn.example.com/assets/logo.png',
        coverUrl: 'https://cdn.example.com/assets/cover.jpg'
      }
    },
    workflowRecords
  });
  const audit = { async log() {} };
  const service = new SettingsService(prisma as any, audit as any);

  const settings = await service.settings('user-1');
  const preferences = await service.preferences('user-1', 'SELLER');
  const payout = await service.payoutMethods('user-1');
  const tax = await service.tax('user-1');
  const kyc = await service.kyc('user-1');

  assert.equal((settings.profile as any).identity.displayName, 'Acme Wholesale');
  assert.equal((settings.profile as any).identity.handle, 'acme-wholesale');
  assert.equal((settings.profile as any).branding.logoName, 'logo.png');
  assert.equal((settings.profile as any).addresses[0].country, 'UG');
  assert.equal((settings.profile as any).stores[0].status, 'Active');
  assert.equal((settings.profile as any).productLines[0].nodeId, 'node-1');

  assert.equal((preferences as any).locale, 'en');
  assert.equal((preferences as any).currency, 'UGX');

  assert.equal((payout as any).methods.length, 1);
  assert.equal((payout as any).methods[0].provider, 'Stanbic');
  assert.equal((payout as any).metadata.kycState, 'Verified');

  assert.equal((tax as any).profiles.length, 1);
  assert.equal((tax as any).profiles[0].country, 'UG');
  assert.equal((tax as any).metadata.invoiceCfg.legalName, 'Acme Wholesale Ltd');

  assert.equal((kyc as any).documents.length, 1);
  assert.equal((kyc as any).documents[0].status, 'Submitted');
  assert.equal((kyc as any).metadata.history[0].event, 'Submitted onboarding for review');
});
