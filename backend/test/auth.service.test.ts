import assert from 'node:assert/strict';
import test from 'node:test';
import { hash } from 'bcrypt';
import { AuthService } from '../src/modules/auth/auth.service.js';

function createConfigService(overrides: Record<string, unknown> = {}) {
  return {
    get(key: string) {
      return overrides[key];
    }
  };
}

test('AuthService.register queues registrations when queue mode is enabled', async () => {
  let enqueued: any = null;
  const prisma = {
    user: {
      async findFirst() {
        return null;
      },
      async findMany() {
        return [];
      }
    },
    backgroundJob: {
      async findUnique() {
        return null;
      }
    }
  };
  const jobsService = {
    async enqueue(input: any) {
      enqueued = input;
      return {
        id: 'job-reg-1',
        queue: 'auth',
        type: 'AUTH_REGISTER',
        status: 'PENDING'
      };
    }
  };

  const service = new AuthService(
    prisma as any,
    {} as any,
    createConfigService({
      'auth.registerQueueEnabled': true,
      'jobs.workerEnabled': true,
      'auth.registrationQueueSecret': 'queue-secret',
      'auth.registrationPollAfterMs': 750
    }) as any,
    jobsService as any
  );

  const result = await service.register({
    name: 'Seller One',
    email: 'Seller@One.test',
    password: 'Password123!',
    role: 'SELLER',
    roles: ['SELLER'],
    sellerKind: 'SELLER'
  });

  assert.equal(enqueued.queue, 'auth');
  assert.equal(enqueued.type, 'AUTH_REGISTER');
  assert.equal(enqueued.dedupeKey, 'auth:register:seller@one.test:SELLER');
  assert.equal(typeof enqueued.payload.encryptedPassword, 'string');
  assert.equal(enqueued.payload.password, undefined);
  assert.equal(result.registrationQueued, true);
  assert.equal(result.requestId, 'job-reg-1');
  assert.equal(result.status, 'PENDING');
  assert.equal(result.pollAfterMs, 750);
});

test('AuthService.registrationStatus maps completed auth jobs to ready-to-login state', async () => {
  const jobsService = {
    async get() {
      return {
        id: 'job-reg-2',
        queue: 'auth',
        type: 'AUTH_REGISTER',
        status: 'COMPLETED',
        lastError: null
      };
    }
  };

  const service = new AuthService(
    {} as any,
    {} as any,
    createConfigService({
      'auth.registrationPollAfterMs': 1200
    }) as any,
    jobsService as any
  );

  const result = await service.registrationStatus('job-reg-2');

  assert.equal(result.registrationQueued, true);
  assert.equal(result.status, 'READY');
  assert.equal(result.readyToLogin, true);
  assert.equal(result.failed, false);
  assert.equal(result.pollAfterMs, 1200);
});

test('AuthService.login succeeds when workflow and refresh token tables are missing', async () => {
  const passwordHash = await hash('Password123!', 12);
  const schemaError = { code: 'P2021' };
  const prisma = {
    user: {
      async findFirst() {
        return {
          id: 'user-1',
          email: 'creator@example.com',
          phone: null,
          passwordHash,
          role: 'CREATOR',
          approvalStatus: 'NEEDS_ONBOARDING',
          onboardingCompleted: false,
          creatorProfile: null,
          sellerProfile: null,
          roleAssignments: [{ role: 'CREATOR' }]
        };
      }
    },
    workflowRecord: {
      async findUnique() {
        throw schemaError;
      }
    },
    refreshToken: {
      async create() {
        throw schemaError;
      }
    }
  };
  const jwtService = {
    async signAsync(payload: any) {
      return `token:${payload.sub}:${payload.tokenId ?? 'access'}`;
    }
  };

  const service = new AuthService(
    prisma as any,
    jwtService as any,
    createConfigService({
      'auth.accessSecret': 'access-secret',
      'auth.accessTtl': '15m',
      'auth.refreshSecret': 'refresh-secret',
      'auth.refreshTtlDays': 30
    }) as any,
    {} as any
  );
  (service as any).isMissingSchemaObjectError = (error: unknown) => (error as { code?: string })?.code === 'P2021';

  const result = await service.login({
    email: 'creator@example.com',
    password: 'Password123!'
  } as any);

  assert.equal(result.tokenType, 'Bearer');
  assert.equal(result.role, 'CREATOR');
  assert.deepEqual(result.roles, ['CREATOR']);
  assert.match(result.accessToken, /^token:user-1:access$/);
  assert.match(result.refreshToken, /^token:user-1:/);
});

test('AuthService.login still auto-approves when account approval storage is missing but workflow legacy storage exists', async () => {
  const passwordHash = await hash('Password123!', 12);
  const schemaError = { code: 'P2021' };
  const userRecord = {
    id: 'user-2',
    email: 'seller@example.com',
    phone: null,
    passwordHash,
    role: 'SELLER',
    approvalStatus: 'NEEDS_ONBOARDING',
    onboardingCompleted: false,
    creatorProfile: null,
    sellerProfile: null,
    roleAssignments: [{ role: 'SELLER' }]
  };
  let userUpdated = false;
  let legacyApprovalWritten = false;
  const prisma = {
    user: {
      async findFirst() {
        return userRecord;
      },
      async update({ data }: any) {
        userUpdated = true;
        return { ...userRecord, ...data };
      },
      async findUnique() {
        return { ...userRecord, approvalStatus: 'APPROVED', onboardingCompleted: true, roleAssignments: [{ role: 'SELLER' }] };
      }
    },
    workflowRecord: {
      async findUnique() {
        return {
          payload: {
            profileType: 'SELLER',
            status: 'submitted',
            submittedAt: '2026-03-25T10:00:00.000Z'
          }
        };
      },
      async upsert() {
        legacyApprovalWritten = true;
        return { id: 'approval-legacy' };
      }
    },
    accountApproval: {
      async upsert() {
        throw schemaError;
      }
    },
    refreshToken: {
      async create() {
        return { id: 'refresh-1' };
      }
    },
    $transaction(actions: any[]) {
      return Promise.all(actions);
    }
  };
  const jwtService = {
    async signAsync(payload: any) {
      return `token:${payload.sub}:${payload.tokenId ?? 'access'}`;
    }
  };

  const service = new AuthService(
    prisma as any,
    jwtService as any,
    createConfigService({
      'auth.accessSecret': 'access-secret',
      'auth.accessTtl': '15m',
      'auth.refreshSecret': 'refresh-secret',
      'auth.refreshTtlDays': 30
    }) as any,
    {} as any
  );
  (service as any).isMissingSchemaObjectError = (error: unknown) => (error as { code?: string })?.code === 'P2021';

  const result = await service.login({
    email: 'seller@example.com',
    password: 'Password123!'
  } as any);

  assert.equal(userUpdated, true);
  assert.equal(legacyApprovalWritten, true);
  assert.equal(result.role, 'SELLER');
});

test('AuthService.me falls back when relation tables are missing', async () => {
  const schemaError = { code: 'P2021' };
  const prisma = {
    user: {
      async findUnique(args: any) {
        if (args.include) {
          throw schemaError;
        }
        return {
          id: 'user-3',
          email: 'creator@example.com',
          phone: '+256700000000',
          role: 'CREATOR',
          approvalStatus: 'NEEDS_ONBOARDING',
          onboardingCompleted: false,
          createdAt: new Date('2026-03-25T10:00:00.000Z')
        };
      }
    }
  };

  const service = new AuthService(
    prisma as any,
    {} as any,
    createConfigService() as any,
    {} as any
  );
  (service as any).isMissingSchemaObjectError = (error: unknown) => (error as { code?: string })?.code === 'P2021';
  (service as any).autoApproveSubmittedOnboarding = async (user: any) => user;

  const result = await service.me('user-3');

  assert.equal(result.id, 'user-3');
  assert.equal(result.role, 'CREATOR');
  assert.deepEqual(result.roles, ['CREATOR']);
  assert.equal(result.creatorProfile, null);
  assert.equal(result.sellerProfile, null);
});
