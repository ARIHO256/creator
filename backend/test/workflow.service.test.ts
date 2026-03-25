import assert from 'node:assert/strict';
import test from 'node:test';
import { WorkflowService } from '../src/modules/workflow/workflow.service.js';

function createWorkflowService(initialRecords?: Map<string, Record<string, unknown>>) {
  const workflowRecords = initialRecords ?? new Map<string, Record<string, unknown>>();
  const accountApprovals = new Map<string, Record<string, unknown>>();
  const screenStates = new Map<string, Record<string, unknown>>();
  const contentApprovals = new Map<string, Record<string, unknown>>();
  const userSettings = new Map<string, Record<string, unknown>>();
  const workspaceRows = new Map<string, { id: string; ownerUserId: string }>();
  const workspaceNotificationPreferences = new Map<string, { dbId: string; metadata: Record<string, unknown> }>();
  const workspaceNotificationWatches = new Map<string, Record<string, unknown>>();
  const workspacePayoutSettings = new Map<string, { dbId: string; metadata: Record<string, unknown> }>();
  const workspacePayoutMethods = new Map<string, Record<string, unknown>>();
  const workspaceTaxSettings = new Map<string, { dbId: string; metadata: Record<string, unknown> }>();
  const workspaceTaxProfiles = new Map<string, Record<string, unknown>>();
  const workspaceKycProfiles = new Map<string, { dbId: string; status: string; metadata: Record<string, unknown> }>();
  const workspaceKycDocuments = new Map<string, Record<string, unknown>>();
  const providerRecords = new Map<string, Record<string, unknown>>();
  const makeKey = (userId: string, recordType: string, recordKey: string) => `${userId}:${recordType}:${recordKey}`;
  const prisma = {
    accountApproval: {
      async findUnique({ where }: any) {
        const payload = accountApprovals.get(where.userId);
        return payload ? { userId: where.userId, payload } : null;
      },
      async upsert({ where, update, create }: any) {
        const payload = accountApprovals.has(where.userId) ? update.payload : create.payload;
        accountApprovals.set(where.userId, payload);
        return { userId: where.userId, payload };
      }
    },
    workflowScreenState: {
      async findUnique({ where }: any) {
        const key = `${where.userId_key.userId}:${where.userId_key.key}`;
        const payload = screenStates.get(key);
        return payload ? { id: key, userId: where.userId_key.userId, key: where.userId_key.key, payload } : null;
      },
      async upsert({ where, update, create }: any) {
        const key = `${where.userId_key.userId}:${where.userId_key.key}`;
        const payload = screenStates.has(key) ? update.payload : create.payload;
        screenStates.set(key, payload);
        return { id: key, userId: where.userId_key.userId, key: where.userId_key.key, payload };
      }
    },
    contentApproval: {
      async findMany({ where }: any) {
        return Array.from(contentApprovals.entries())
          .filter(([key]) => key.startsWith(`${where.userId}:`))
          .map(([key, payload]) => ({
            id: key.split(':', 2)[1],
            userId: where.userId,
            payload
          }));
      },
      async findUnique({ where }: any) {
        const entry = Array.from(contentApprovals.entries()).find(([key]) => key.endsWith(`:${where.id}`));
        if (!entry) {
          return null;
        }
        const [key, payload] = entry;
        const [userId] = key.split(':');
        return { id: where.id, userId, payload };
      },
      async upsert({ where, update, create }: any) {
        const key = `${create.userId ?? update.userId}:` + where.id;
        const payload = contentApprovals.has(key) ? update.payload : create.payload;
        contentApprovals.set(key, payload);
        return { id: where.id, userId: create.userId ?? update.userId, payload };
      }
    },
    workflowRecord: {
      async findUnique({ where }: any) {
        const key = makeKey(where.userId_recordType_recordKey.userId, where.userId_recordType_recordKey.recordType, where.userId_recordType_recordKey.recordKey);
        const payload = workflowRecords.get(key);
        if (!payload) {
          return null;
        }
        return { id: key, payload };
      },
      async create({ data }: any) {
        const key = makeKey(data.userId, data.recordType, data.recordKey);
        workflowRecords.set(key, data.payload);
        return { id: key, payload: data.payload };
      },
      async update({ where, data }: any) {
        workflowRecords.set(where.id, data.payload);
        return { id: where.id, payload: data.payload };
      },
      async upsert({ where, update, create }: any) {
        const key = makeKey(where.userId_recordType_recordKey.userId, where.userId_recordType_recordKey.recordType, where.userId_recordType_recordKey.recordKey);
        const payload = workflowRecords.has(key) ? update.payload : create.payload;
        workflowRecords.set(key, payload);
        return { id: key, payload };
      },
      async findMany() {
        return [];
      }
    },
    user: {
      async findUnique() {
        return { role: 'SELLER', email: 'seller@example.com' };
      },
      async update() {
        return { id: 'user-1' };
      }
    },
    userSetting: {
      async findUnique({ where }: any) {
        return userSettings.get(`${where.userId_key.userId}:${where.userId_key.key}`)
          ? { payload: userSettings.get(`${where.userId_key.userId}:${where.userId_key.key}`) }
          : null;
      },
      async upsert({ where, update, create }: any) {
        const key = `${where.userId_key.userId}:${where.userId_key.key}`;
        const payload = userSettings.has(key) ? update.payload : create.payload;
        userSettings.set(key, payload);
        return { payload };
      }
    },
    workspace: {
      async findUnique({ where }: any) {
        return workspaceRows.get(where.ownerUserId) ?? null;
      },
      async create({ data }: any) {
        const row = { id: `workspace:${data.ownerUserId}`, ownerUserId: data.ownerUserId };
        workspaceRows.set(data.ownerUserId, row);
        return row;
      }
    },
    workspaceNotificationPreference: {
      async upsert({ where, update, create }: any) {
        const key = `${where.workspaceId_userId_scopeRole.workspaceId}:${where.workspaceId_userId_scopeRole.userId}:${where.workspaceId_userId_scopeRole.scopeRole}`;
        const existing = workspaceNotificationPreferences.get(key);
        const next = existing
          ? { ...existing, metadata: update.metadata }
          : { dbId: `pref:${key}`, metadata: create.metadata };
        workspaceNotificationPreferences.set(key, next);
        return next;
      }
    },
    workspaceNotificationWatch: {
      async upsert({ where, update, create }: any) {
        const key = `${where.preferenceDbId_externalId.preferenceDbId}:${where.preferenceDbId_externalId.externalId}`;
        const payload = workspaceNotificationWatches.has(key)
          ? update.payload
          : create.payload;
        workspaceNotificationWatches.set(key, {
          channel: workspaceNotificationWatches.has(key) ? update.channel : create.channel,
          enabled: workspaceNotificationWatches.has(key) ? update.enabled : create.enabled,
          payload
        });
        return workspaceNotificationWatches.get(key);
      }
    },
    workspacePayoutSettings: {
      async upsert({ where, update, create }: any) {
        const existing = workspacePayoutSettings.get(where.workspaceId);
        const next = existing
          ? { ...existing, metadata: update.metadata }
          : { dbId: `payout:${where.workspaceId}`, metadata: create.metadata };
        workspacePayoutSettings.set(where.workspaceId, next);
        return next;
      }
    },
    workspacePayoutMethod: {
      async upsert({ where, update, create }: any) {
        const key = `${where.settingsDbId_externalId.settingsDbId}:${where.settingsDbId_externalId.externalId}`;
        workspacePayoutMethods.set(key, workspacePayoutMethods.has(key) ? update.payload : create.payload);
        return { payload: workspacePayoutMethods.get(key) };
      }
    },
    workspaceTaxSettings: {
      async upsert({ where, update, create }: any) {
        const existing = workspaceTaxSettings.get(where.workspaceId);
        const next = existing
          ? { ...existing, metadata: update.metadata }
          : { dbId: `tax:${where.workspaceId}`, metadata: create.metadata };
        workspaceTaxSettings.set(where.workspaceId, next);
        return next;
      }
    },
    workspaceTaxProfile: {
      async upsert({ where, update, create }: any) {
        const key = `${where.settingsDbId_externalId.settingsDbId}:${where.settingsDbId_externalId.externalId}`;
        workspaceTaxProfiles.set(key, workspaceTaxProfiles.has(key) ? update.payload : create.payload);
        return { payload: workspaceTaxProfiles.get(key) };
      }
    },
    workspaceKycProfile: {
      async upsert({ where, update, create }: any) {
        const existing = workspaceKycProfiles.get(where.workspaceId);
        const next = existing
          ? { ...existing, status: update.status, metadata: update.metadata }
          : { dbId: `kyc:${where.workspaceId}`, status: create.status, metadata: create.metadata };
        workspaceKycProfiles.set(where.workspaceId, next);
        return next;
      }
    },
    workspaceKycDocument: {
      async upsert({ where, update, create }: any) {
        const key = `${where.kycProfileDbId_externalId.kycProfileDbId}:${where.kycProfileDbId_externalId.externalId}`;
        workspaceKycDocuments.set(key, workspaceKycDocuments.has(key) ? update.payload : create.payload);
        return { payload: workspaceKycDocuments.get(key) };
      }
    },
    providerRecord: {
      async upsert({ where, update, create }: any) {
        const key = makeKey(
          where.userId_recordType_recordKey.userId,
          where.userId_recordType_recordKey.recordType,
          where.userId_recordType_recordKey.recordKey
        );
        providerRecords.set(key, providerRecords.has(key) ? update.payload : create.payload);
        return { payload: providerRecords.get(key) };
      }
    },
    seller: {
      async findUnique() {
        return null;
      },
      async create({ data }: any) {
        return { id: 'seller-1', ...data };
      },
      async update({ data }: any) {
        return { id: 'seller-1', ...data };
      }
    },
    storefront: {
      async upsert() {
        return { id: 'storefront-1' };
      }
    },
    sellerWarehouse: {
      async create() {
        return { id: 'warehouse-1' };
      },
      async update() {
        return { id: 'warehouse-1' };
      }
    },
    shippingProfile: {
      async create() {
        return { id: 'shipping-1' };
      },
      async update() {
        return { id: 'shipping-1' };
      }
    },
    systemContent: {
      async findUnique() {
        return null;
      }
    }
  };

  const config = { get() { return undefined; } };
  const jobs = {};
  const taxonomy = {};
  return {
    service: new WorkflowService(config as any, prisma as any, jobs as any, taxonomy as any),
    workflowRecords,
    accountApprovals,
    contentApprovals,
    userSettings,
    workspaceNotificationPreferences,
    workspaceNotificationWatches,
    workspacePayoutSettings,
    workspacePayoutMethods,
    workspaceTaxSettings,
    workspaceTaxProfiles,
    workspaceKycProfiles,
    workspaceKycDocuments,
    providerRecords
  };
}

test('WorkflowService.patchContentApproval preserves existing payload fields', async () => {
  const key = 'user-1:content_approval:approval-1';
  const { service, contentApprovals } = createWorkflowService(
    new Map([
      [
        key,
        {
          status: 'pending',
          title: 'Initial review',
          reviewer: { id: 'rev-1', note: 'keep' }
        }
      ]
    ])
  );

  const updated = await service.patchContentApproval('user-1', 'approval-1', {
    reviewer: { note: 'updated' }
  });

  assert.equal(updated.status, 'pending');
  assert.equal(updated.title, 'Initial review');
  assert.deepEqual(updated.reviewer, { id: 'rev-1', note: 'updated' });
  assert.deepEqual(contentApprovals.get('user-1:approval-1'), {
    status: 'pending',
    title: 'Initial review',
    reviewer: { id: 'rev-1', note: 'updated' }
  });
});

test('WorkflowService.patchAccountApproval preserves existing fields while applying updates', async () => {
  const key = 'user-1:account_approval:main';
  const { service, accountApprovals } = createWorkflowService(
    new Map([
      [
        key,
        {
          status: 'pending',
          documents: [{ id: 'doc-1', status: 'uploaded' }],
          checks: { kyc: 'pending', tax: 'approved' }
        }
      ]
    ])
  );

  const updated = await service.patchAccountApproval('user-1', {
    checks: { kyc: 'approved' }
  } as any);

  assert.equal(updated.status, 'pending');
  assert.deepEqual(updated.documents, [{ id: 'doc-1', status: 'uploaded' }]);
  assert.deepEqual(updated.checks, { kyc: 'approved', tax: 'approved' });
  assert.ok(typeof updated.updatedAt === 'string');
  assert.deepEqual(accountApprovals.get('user-1')?.documents, [{ id: 'doc-1', status: 'uploaded' }]);
});

test('WorkflowService onboarding sync promotes underused onboarding fields into workspace and provider records', async () => {
  const { service, accountApprovals, userSettings, workspaceNotificationPreferences, workspaceNotificationWatches, workspacePayoutSettings, workspacePayoutMethods, workspaceTaxSettings, workspaceTaxProfiles, workspaceKycProfiles, workspaceKycDocuments, providerRecords } =
    createWorkflowService();

  const onboarding = {
    profileType: 'PROVIDER',
    status: 'submitted',
    owner: 'Owner Name',
    storeName: 'Provider Studio',
    storeSlug: 'provider-studio',
    email: 'owner@example.com',
    phone: '+256700000000',
    website: 'https://provider.example.com',
    about: 'Studio profile',
    brandColor: '#112233',
    logoUrl: '',
    coverUrl: '',
    support: { whatsapp: '+256711111111', email: 'support@example.com', phone: '+256722222222' },
    shipFrom: { country: 'UG', province: 'Central', city: 'Kampala', address1: 'Plot 1', address2: '', postalCode: '' },
    channels: ['online'],
    languages: ['en'],
    taxonomySelection: null,
    taxonomySelections: [],
    docs: { list: [{ id: 'doc-1', type: 'passport', status: 'submitted', uploadedAt: '2026-03-15T00:00:00.000Z' }] },
    shipping: { profileId: '', expressReady: false, handlingTimeDays: null },
    policies: {
      returnsDays: 7,
      warrantyDays: 30,
      termsUrl: 'https://provider.example.com/terms',
      privacyUrl: 'https://provider.example.com/privacy',
      policyNotes: 'Policy notes'
    },
    payout: {
      method: 'mobile_money',
      currency: 'UGX',
      rhythm: 'weekly',
      thresholdAmount: 100000,
      bankName: '',
      bankCountry: '',
      bankBranch: '',
      accountName: '',
      accountNo: '',
      swiftBic: '',
      iban: '',
      mobileProvider: 'MTN Mobile Money',
      mobileCountryCode: '+256',
      mobileNo: '+256755555555',
      mobileIdType: 'national_id',
      mobileIdNumber: 'CM1234',
      alipayRegion: '',
      alipayLogin: '',
      wechatRegion: '',
      wechatId: '',
      otherMethod: '',
      otherProvider: '',
      otherCountry: '',
      otherNotes: '',
      notificationsEmail: 'finance@example.com',
      notificationsWhatsApp: '+256733333333',
      confirmDetails: true,
      otherDetails: '',
      otherDescription: ''
    },
    tax: {
      taxpayerType: 'company',
      legalName: 'Provider Studio Ltd',
      taxCountry: 'UG',
      taxId: 'TIN-1',
      vatNumber: 'VAT-1',
      legalAddress: 'Kampala',
      contact: 'Finance Lead',
      contactEmail: 'tax@example.com',
      contactSameAsOwner: false
    },
    acceptance: { sellerTerms: true, contentPolicy: true, dataProcessing: true },
    verification: {
      emailVerified: true,
      phoneVerified: true,
      verificationPhone: '+256744444444',
      verificationEmail: 'verify@example.com',
      kycStatus: 'APPROVED',
      otpStatus: 'VERIFIED',
      kycReference: 'KYC-123'
    },
    progress: { totalSteps: 10, completedSteps: 10, completionPercent: 100, lastCompletedStepId: 'done' },
    steps: [],
    providerServices: ['consulting', 'production'],
    bookingModes: ['instant', 'request'],
    metadata: {},
    submittedAt: '2026-03-15T00:00:00.000Z',
    updatedAt: '2026-03-15T00:00:00.000Z'
  };

  await (service as any).syncWorkspaceSettingsFromOnboarding('user-1', onboarding);
  await (service as any).syncProviderProfileFromOnboarding('user-1', onboarding);
  await (service as any).syncAccountApprovalFromOnboarding('user-1', onboarding);

  assert.equal((userSettings.get('user-1:profile') as any)?.profile?.identity?.website, 'https://provider.example.com');
  assert.equal((userSettings.get('user-1:profile') as any)?.profile?.branding?.primary, '#112233');
  assert.equal((workspaceNotificationPreferences.values().next().value as any)?.metadata?.payoutNotifications?.email, 'finance@example.com');
  assert.equal((workspaceNotificationWatches.values().next().value as any)?.payload?.category, 'payouts');
  assert.equal((workspacePayoutSettings.values().next().value as any)?.metadata?.confirmDetails, true);
  assert.equal((workspacePayoutMethods.values().next().value as any)?.details?.mobileProvider, 'MTN Mobile Money');
  assert.equal((workspaceTaxSettings.values().next().value as any)?.metadata?.invoiceCfg?.contactEmail, 'tax@example.com');
  assert.equal((workspaceTaxProfiles.values().next().value as any)?.contactSameAsOwner, false);
  assert.equal((workspaceKycProfiles.values().next().value as any)?.metadata?.kycReference, 'KYC-123');
  assert.equal((workspaceKycDocuments.values().next().value as any)?.source, 'onboarding');
  assert.deepEqual((providerRecords.get('user-1:onboarding_profile:main') as any)?.bookingModes, ['instant', 'request']);
  assert.deepEqual((accountApprovals.get('user-1') as any)?.metadata?.submissionSnapshot?.providerServices, ['consulting', 'production']);
  assert.equal((accountApprovals.get('user-1') as any)?.metadata?.submissionSnapshot?.policies?.termsUrl, 'https://provider.example.com/terms');
});

test('WorkflowService.onboarding returns a default draft when workflow storage tables are missing', async () => {
  const schemaError = { code: 'P2021' };
  const prisma = {
    user: {
      async findUnique() {
        return { role: 'CREATOR' };
      }
    },
    workflowRecord: {
      async findUnique() {
        throw schemaError;
      },
      async upsert() {
        throw schemaError;
      }
    }
  };

  const service = new WorkflowService({ get() { return undefined; } } as any, prisma as any, {} as any, {} as any);
  (service as any).isMissingSchemaObjectError = (error: unknown) => (error as { code?: string })?.code === 'P2021';

  const onboarding = await service.onboarding('user-1');

  assert.equal(onboarding.profileType, 'CREATOR');
  assert.equal(onboarding.status, 'draft');
  assert.deepEqual(onboarding.support, { whatsapp: '', email: '', phone: '' });
});

test('WorkflowService.screenState returns an empty object when workflow storage tables are missing', async () => {
  const schemaError = { code: 'P2021' };
  const prisma = {
    workflowScreenState: {
      async findUnique() {
        throw schemaError;
      }
    },
    workflowRecord: {
      async findUnique() {
        throw schemaError;
      }
    }
  };

  const service = new WorkflowService({ get() { return undefined; } } as any, prisma as any, {} as any, {} as any);
  (service as any).isMissingSchemaObjectError = (error: unknown) => (error as { code?: string })?.code === 'P2021';

  const screenState = await service.screenState('user-1', 'creator-settings');

  assert.deepEqual(screenState, {});
});

test('WorkflowService.uploads returns an empty list when upload storage is missing', async () => {
  const schemaError = { code: 'P2021' };
  const prisma = {
    uploadSession: {
      async findMany() {
        throw schemaError;
      }
    }
  };

  const service = new WorkflowService({ get() { return undefined; } } as any, prisma as any, {} as any, {} as any);
  (service as any).isMissingSchemaObjectError = (error: unknown) => (error as { code?: string })?.code === 'P2021';

  const uploads = await service.uploads('user-1');

  assert.deepEqual(uploads, []);
});

test('WorkflowService.onboardingLookups returns defaults when system content storage is missing', async () => {
  const schemaError = { code: 'P2021' };
  const prisma = {
    systemContent: {
      async findUnique() {
        throw schemaError;
      },
      async create() {
        throw schemaError;
      }
    }
  };

  const service = new WorkflowService({ get() { return undefined; } } as any, prisma as any, {} as any, {} as any);
  (service as any).isMissingSchemaObjectError = (error: unknown) => (error as { code?: string })?.code === 'P2021';

  const lookups = await service.onboardingLookups();

  assert.deepEqual(lookups.languages, []);
  assert.deepEqual(lookups.payoutMethods, []);
  assert.deepEqual(lookups.payoutRegions, { alipay: [], wechat: [] });
});
