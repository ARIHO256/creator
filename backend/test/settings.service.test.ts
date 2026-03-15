import assert from 'node:assert/strict';
import test from 'node:test';
import { SettingsService } from '../src/modules/settings/settings.service.js';

function createPrismaStub(overrides: {
  user?: Record<string, unknown>;
  seller?: Record<string, unknown> | null;
  workflowRecords?: Map<string, Record<string, unknown>>;
  workspaceSettings?: Array<{ userId: string; key: string; payload: Record<string, unknown> }>;
} = {}) {
  const workspaceSettings = new Map<string, any>(
    (overrides.workspaceSettings ?? []).map((record) => [
      `${record.userId}:${record.key}`,
      {
        id: `${record.userId}:${record.key}`,
        userId: record.userId,
        key: record.key,
        payload: record.payload,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ])
  );
  const userSettings = new Map<string, any>();
  const workflowRecords = overrides.workflowRecords ?? new Map<string, Record<string, unknown>>();
  const workspaces: any[] = [];
  const workspaceRoles: any[] = [];
  const workspaceMembers: any[] = [];
  const workspaceInvites: any[] = [];
  const workspaceSavedViewGroups: any[] = [];
  const workspaceSavedViews: any[] = [];
  const workspaceNotificationPreferences: any[] = [];
  const workspaceNotificationWatches: any[] = [];
  const workspaceHelpLinks: any[] = [];
  const workspaceStatusServices: any[] = [];
  const workspacePayoutSettings: any[] = [];
  const workspacePayoutMethods: any[] = [];
  const workspaceIntegrationSettings: any[] = [];
  const workspaceIntegrationConnections: any[] = [];
  const workspaceIntegrationWebhooks: any[] = [];
  const workspaceTaxSettings: any[] = [];
  const workspaceTaxProfiles: any[] = [];
  const workspaceTaxReports: any[] = [];
  const workspaceKycProfiles: any[] = [];
  const workspaceKycDocuments: any[] = [];
  const workspaceUserPreferences: any[] = [];
  const userSecurityProfiles: any[] = [];
  const userSecuritySessions: any[] = [];
  const userSecurityPasskeys: any[] = [];
  const userSecurityTrustedDevices: any[] = [];
  const userSecurityAlerts: any[] = [];
  const userRememberedDevices: any[] = [];
  let sequence = 0;

  const nextId = (prefix: string) => `${prefix}-${++sequence}`;
  const now = () => new Date();
  const withTimestamps = <T extends Record<string, unknown>>(record: T) => ({
    createdAt: now(),
    updatedAt: now(),
    ...record
  });
  const includeRole = (member: any) => ({
    ...member,
    role: workspaceRoles.find((role) => role.dbId === member.roleDbId) ?? null
  });
  const includeInvite = (invite: any) => ({
    ...invite,
    role: workspaceRoles.find((role) => role.dbId === invite.roleDbId) ?? null,
    member: invite.memberDbId ? workspaceMembers.find((member) => member.dbId === invite.memberDbId) ?? null : null
  });
  const includeSavedViewGroup = (group: any) => ({
    ...group,
    views: workspaceSavedViews
      .filter((view) => view.groupDbId === group.dbId)
      .sort((a, b) => a.position - b.position || a.createdAt.valueOf() - b.createdAt.valueOf())
  });
  const includeNotificationPreference = (preference: any) => ({
    ...preference,
    watches: workspaceNotificationWatches
      .filter((watch) => watch.preferenceDbId === preference.dbId)
      .sort((a, b) => a.position - b.position || a.createdAt.valueOf() - b.createdAt.valueOf())
  });
  const includePayoutSettings = (settings: any) => ({
    ...settings,
    methods: workspacePayoutMethods
      .filter((method) => method.settingsDbId === settings.dbId)
      .sort((a, b) => a.position - b.position || a.createdAt.valueOf() - b.createdAt.valueOf())
  });
  const includeIntegrationSettings = (settings: any) => ({
    ...settings,
    integrations: workspaceIntegrationConnections
      .filter((item) => item.settingsDbId === settings.dbId)
      .sort((a, b) => a.position - b.position || a.createdAt.valueOf() - b.createdAt.valueOf()),
    webhooks: workspaceIntegrationWebhooks
      .filter((item) => item.settingsDbId === settings.dbId)
      .sort((a, b) => a.position - b.position || a.createdAt.valueOf() - b.createdAt.valueOf())
  });
  const includeTaxSettings = (settings: any) => ({
    ...settings,
    profiles: workspaceTaxProfiles
      .filter((item) => item.settingsDbId === settings.dbId)
      .sort((a, b) => a.position - b.position || a.createdAt.valueOf() - b.createdAt.valueOf()),
    reports: workspaceTaxReports
      .filter((item) => item.settingsDbId === settings.dbId)
      .sort((a, b) => a.position - b.position || a.createdAt.valueOf() - b.createdAt.valueOf())
  });
  const includeKycProfile = (profile: any) => ({
    ...profile,
    documents: workspaceKycDocuments
      .filter((item) => item.kycProfileDbId === profile.dbId)
      .sort((a, b) => a.position - b.position || a.createdAt.valueOf() - b.createdAt.valueOf())
  });
  const includeSecurityProfile = (profile: any) => ({
    ...profile,
    sessions: userSecuritySessions
      .filter((item) => item.profileDbId === profile.dbId)
      .sort((a, b) => b.updatedAt.valueOf() - a.updatedAt.valueOf()),
    passkeys: userSecurityPasskeys
      .filter((item) => item.profileDbId === profile.dbId)
      .sort((a, b) => b.updatedAt.valueOf() - a.updatedAt.valueOf()),
    trustedDevices: userSecurityTrustedDevices
      .filter((item) => item.profileDbId === profile.dbId)
      .sort((a, b) => b.updatedAt.valueOf() - a.updatedAt.valueOf()),
    alerts: userSecurityAlerts
      .filter((item) => item.profileDbId === profile.dbId)
      .sort((a, b) => b.updatedAt.valueOf() - a.updatedAt.valueOf()),
    devices: userRememberedDevices
      .filter((item) => item.profileDbId === profile.dbId)
      .sort((a, b) => b.updatedAt.valueOf() - a.updatedAt.valueOf())
  });

  const prisma: any = {
    async $transaction(arg: any) {
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      return arg(prisma);
    },
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
    workspace: {
      async findUnique({ where }: any) {
        if (where.ownerUserId) {
          return workspaces.find((workspace) => workspace.ownerUserId === where.ownerUserId) ?? null;
        }
        if (where.id) {
          return workspaces.find((workspace) => workspace.id === where.id) ?? null;
        }
        return null;
      },
      async create({ data }: any) {
        const record = withTimestamps({
          id: data.id ?? nextId('workspace'),
          ownerUserId: data.ownerUserId,
          require2FA: data.require2FA ?? true,
          allowExternalInvites: data.allowExternalInvites ?? false,
          supplierGuestExpiryHours: data.supplierGuestExpiryHours ?? 24,
          inviteDomainAllowlist: data.inviteDomainAllowlist ?? ['creator.com', 'studio.com', 'mylivedealz.com', 'studio.test'],
          requireApprovalForPayouts: data.requireApprovalForPayouts ?? true,
          payoutApprovalThresholdUsd: data.payoutApprovalThresholdUsd ?? 500,
          restrictSensitiveExports: data.restrictSensitiveExports ?? true,
          sessionTimeoutMins: data.sessionTimeoutMins ?? 60
        });
        workspaces.push(record);
        return record;
      },
      async update({ where, data }: any) {
        const workspace = workspaces.find((entry) => entry.id === where.id);
        Object.assign(workspace, data, { updatedAt: now() });
        return workspace;
      }
    },
    workspaceRole: {
      async count({ where }: any) {
        return workspaceRoles.filter((role) => role.workspaceId === where.workspaceId).length;
      },
      async findMany({ where, orderBy }: any) {
        let rows = workspaceRoles.filter((role) => role.workspaceId === where.workspaceId);
        if (orderBy?.createdAt === 'asc') {
          rows = [...rows].sort((a, b) => a.createdAt.valueOf() - b.createdAt.valueOf());
        }
        return rows;
      },
      async create({ data }: any) {
        const record = withTimestamps({
          dbId: data.dbId ?? nextId('role'),
          workspaceId: data.workspaceId,
          key: data.key,
          name: data.name,
          badge: data.badge ?? null,
          description: data.description ?? null,
          permissions: data.permissions ?? {},
          isSystem: Boolean(data.isSystem)
        });
        workspaceRoles.push(record);
        return record;
      },
      async update({ where, data }: any) {
        const record = workspaceRoles.find((role) => role.dbId === where.dbId);
        Object.assign(record, data, { updatedAt: now() });
        return record;
      },
      async delete({ where }: any) {
        const index = workspaceRoles.findIndex((role) => role.dbId === where.dbId);
        const [removed] = workspaceRoles.splice(index, 1);
        return removed;
      }
    },
    workspaceMember: {
      async count({ where }: any) {
        return workspaceMembers.filter((member) => member.workspaceId === where.workspaceId).length;
      },
      async findMany({ where, include, orderBy }: any) {
        let rows = workspaceMembers.filter((member) => member.workspaceId === where.workspaceId);
        if (orderBy?.createdAt === 'asc') {
          rows = [...rows].sort((a, b) => a.createdAt.valueOf() - b.createdAt.valueOf());
        }
        return include?.role ? rows.map(includeRole) : rows;
      },
      async create({ data, include }: any) {
        const record = withTimestamps({
          dbId: data.dbId ?? nextId('member'),
          workspaceId: data.workspaceId,
          externalId: data.externalId,
          userId: data.userId ?? null,
          roleDbId: data.roleDbId,
          name: data.name,
          email: data.email,
          status: data.status ?? 'active',
          seat: data.seat ?? null,
          invitedAt: data.invitedAt ?? null,
          joinedAt: data.joinedAt ?? null
        });
        workspaceMembers.push(record);
        return include?.role ? includeRole(record) : record;
      },
      async update({ where, data, include }: any) {
        const record = workspaceMembers.find((member) => member.dbId === where.dbId);
        Object.assign(record, data, { updatedAt: now() });
        return include?.role ? includeRole(record) : record;
      },
      async delete({ where }: any) {
        const index = workspaceMembers.findIndex((member) => member.dbId === where.dbId);
        const [removed] = workspaceMembers.splice(index, 1);
        return removed;
      }
    },
    workspaceInvite: {
      async count({ where }: any) {
        return workspaceInvites.filter((invite) => invite.workspaceId === where.workspaceId).length;
      },
      async findMany({ where, orderBy }: any) {
        let rows = workspaceInvites.filter((invite) => invite.workspaceId === where.workspaceId);
        if (orderBy?.createdAt === 'desc') {
          rows = [...rows].sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf());
        }
        return rows.map(includeInvite);
      },
      async create({ data, include }: any) {
        const record = withTimestamps({
          dbId: data.dbId ?? nextId('invite'),
          workspaceId: data.workspaceId,
          roleDbId: data.roleDbId,
          memberDbId: data.memberDbId ?? null,
          invitedByUserId: data.invitedByUserId ?? null,
          name: data.name,
          email: data.email,
          status: data.status ?? 'invited',
          seat: data.seat ?? null,
          acceptedAt: data.acceptedAt ?? null
        });
        workspaceInvites.push(record);
        return include ? includeInvite(record) : record;
      },
      async deleteMany({ where }: any) {
        const before = workspaceInvites.length;
        for (let index = workspaceInvites.length - 1; index >= 0; index -= 1) {
          const invite = workspaceInvites[index];
          const matchesWorkspace = invite.workspaceId === where.workspaceId;
          const matchesOr = (where.OR ?? []).some((condition: any) =>
            (condition.memberDbId && invite.memberDbId === condition.memberDbId) ||
            (condition.email && invite.email === condition.email)
          );
          if (matchesWorkspace && matchesOr) {
            workspaceInvites.splice(index, 1);
          }
        }
        return { count: before - workspaceInvites.length };
      }
    },
    workspaceCrewSession: {
      async count() {
        return 0;
      }
    },
    workspaceCrewAssignment: {
      async deleteMany() {
        return { count: 0 };
      }
    },
    workspaceSavedViewGroup: {
      async findUnique({ where, include }: any) {
        const group = workspaceSavedViewGroups.find(
          (entry) => entry.workspaceId === where.workspaceId_scopeRole.workspaceId && entry.scopeRole === where.workspaceId_scopeRole.scopeRole
        );
        return group ? (include?.views ? includeSavedViewGroup(group) : group) : null;
      },
      async create({ data }: any) {
        const record = withTimestamps({
          dbId: data.dbId ?? nextId('view-group'),
          workspaceId: data.workspaceId,
          scopeRole: data.scopeRole,
          metadata: data.metadata ?? {}
        });
        workspaceSavedViewGroups.push(record);
        return record;
      },
      async upsert({ where, update, create }: any) {
        const existing = workspaceSavedViewGroups.find(
          (entry) => entry.workspaceId === where.workspaceId_scopeRole.workspaceId && entry.scopeRole === where.workspaceId_scopeRole.scopeRole
        );
        if (existing) {
          Object.assign(existing, update, { updatedAt: now() });
          return existing;
        }
        return this.create({ data: create });
      }
    },
    workspaceSavedView: {
      async deleteMany({ where }: any) {
        const before = workspaceSavedViews.length;
        for (let index = workspaceSavedViews.length - 1; index >= 0; index -= 1) {
          if (workspaceSavedViews[index].groupDbId === where.groupDbId) {
            workspaceSavedViews.splice(index, 1);
          }
        }
        return { count: before - workspaceSavedViews.length };
      },
      async createMany({ data }: any) {
        for (const row of data) {
          workspaceSavedViews.push(
            withTimestamps({
              id: row.id ?? nextId('view'),
              groupDbId: row.groupDbId,
              createdByUserId: row.createdByUserId ?? null,
              externalId: row.externalId,
              name: row.name ?? null,
              position: row.position ?? 0,
              payload: row.payload
            })
          );
        }
        return { count: data.length };
      }
    },
    workspaceHelpLink: {
      async count({ where }: any) {
        return workspaceHelpLinks.filter((link) => link.workspaceId === where.workspaceId).length;
      },
      async findMany({ where }: any) {
        return workspaceHelpLinks
          .filter((link) => link.workspaceId === where.workspaceId)
          .sort((a, b) => a.position - b.position || a.createdAt.valueOf() - b.createdAt.valueOf());
      },
      async createMany({ data }: any) {
        for (const row of data) {
          workspaceHelpLinks.push(
            withTimestamps({
              id: row.id ?? nextId('help'),
              workspaceId: row.workspaceId,
              externalId: row.externalId,
              title: row.title ?? null,
              category: row.category ?? null,
              position: row.position ?? 0,
              payload: row.payload
            })
          );
        }
        return { count: data.length };
      }
    },
    workspaceStatusService: {
      async count({ where }: any) {
        return workspaceStatusServices.filter((service) => service.workspaceId === where.workspaceId).length;
      },
      async findMany({ where }: any) {
        return workspaceStatusServices
          .filter((service) => service.workspaceId === where.workspaceId)
          .sort((a, b) => a.position - b.position || a.createdAt.valueOf() - b.createdAt.valueOf());
      },
      async createMany({ data }: any) {
        for (const row of data) {
          workspaceStatusServices.push(
            withTimestamps({
              id: row.id ?? nextId('status'),
              workspaceId: row.workspaceId,
              externalId: row.externalId,
              name: row.name ?? null,
              status: row.status ?? null,
              position: row.position ?? 0,
              payload: row.payload
            })
          );
        }
        return { count: data.length };
      }
    },
    workspaceNotificationPreference: {
      async findUnique({ where, include }: any) {
        const preference = workspaceNotificationPreferences.find(
          (entry) =>
            entry.workspaceId === where.workspaceId_userId_scopeRole.workspaceId &&
            entry.userId === where.workspaceId_userId_scopeRole.userId &&
            entry.scopeRole === where.workspaceId_userId_scopeRole.scopeRole
        );
        return preference ? (include?.watches ? includeNotificationPreference(preference) : preference) : null;
      },
      async create({ data }: any) {
        const record = withTimestamps({
          dbId: data.dbId ?? nextId('pref'),
          workspaceId: data.workspaceId,
          userId: data.userId,
          scopeRole: data.scopeRole,
          metadata: data.metadata ?? {}
        });
        workspaceNotificationPreferences.push(record);
        return record;
      },
      async upsert({ where, update, create }: any) {
        const existing = workspaceNotificationPreferences.find(
          (entry) =>
            entry.workspaceId === where.workspaceId_userId_scopeRole.workspaceId &&
            entry.userId === where.workspaceId_userId_scopeRole.userId &&
            entry.scopeRole === where.workspaceId_userId_scopeRole.scopeRole
        );
        if (existing) {
          Object.assign(existing, update, { updatedAt: now() });
          return existing;
        }
        return this.create({ data: create });
      }
    },
    workspaceNotificationWatch: {
      async deleteMany({ where }: any) {
        const before = workspaceNotificationWatches.length;
        for (let index = workspaceNotificationWatches.length - 1; index >= 0; index -= 1) {
          if (workspaceNotificationWatches[index].preferenceDbId === where.preferenceDbId) {
            workspaceNotificationWatches.splice(index, 1);
          }
        }
        return { count: before - workspaceNotificationWatches.length };
      },
      async createMany({ data }: any) {
        for (const row of data) {
          workspaceNotificationWatches.push(
            withTimestamps({
              id: row.id ?? nextId('watch'),
              preferenceDbId: row.preferenceDbId,
              externalId: row.externalId,
              channel: row.channel ?? null,
              enabled: row.enabled ?? null,
              position: row.position ?? 0,
              payload: row.payload
            })
          );
        }
        return { count: data.length };
      }
    },
    workspacePayoutSettings: {
      async findUnique({ where, include }: any) {
        const settings = workspacePayoutSettings.find((entry) => entry.workspaceId === where.workspaceId);
        return settings ? (include?.methods ? includePayoutSettings(settings) : settings) : null;
      },
      async create({ data }: any) {
        const record = withTimestamps({
          dbId: data.dbId ?? nextId('payout-settings'),
          workspaceId: data.workspaceId,
          metadata: data.metadata ?? {}
        });
        workspacePayoutSettings.push(record);
        return record;
      },
      async upsert({ where, update, create }: any) {
        const existing = workspacePayoutSettings.find((entry) => entry.workspaceId === where.workspaceId);
        if (existing) {
          Object.assign(existing, update, { updatedAt: now() });
          return existing;
        }
        return this.create({ data: create });
      }
    },
    workspacePayoutMethod: {
      async deleteMany({ where }: any) {
        const before = workspacePayoutMethods.length;
        for (let index = workspacePayoutMethods.length - 1; index >= 0; index -= 1) {
          if (workspacePayoutMethods[index].settingsDbId === where.settingsDbId) {
            workspacePayoutMethods.splice(index, 1);
          }
        }
        return { count: before - workspacePayoutMethods.length };
      },
      async createMany({ data }: any) {
        for (const row of data) {
          workspacePayoutMethods.push(
            withTimestamps({
              id: row.id ?? nextId('payout-method'),
              settingsDbId: row.settingsDbId,
              externalId: row.externalId,
              type: row.type,
              label: row.label ?? null,
              currency: row.currency ?? null,
              isDefault: Boolean(row.isDefault),
              position: row.position ?? 0,
              payload: row.payload
            })
          );
        }
        return { count: data.length };
      }
    },
    workspaceIntegrationSettings: {
      async findUnique({ where, include }: any) {
        const settings = workspaceIntegrationSettings.find((entry) => entry.workspaceId === where.workspaceId);
        return settings ? (include ? includeIntegrationSettings(settings) : settings) : null;
      },
      async create({ data }: any) {
        const record = withTimestamps({
          dbId: data.dbId ?? nextId('integration-settings'),
          workspaceId: data.workspaceId,
          metadata: data.metadata ?? {}
        });
        workspaceIntegrationSettings.push(record);
        return record;
      },
      async upsert({ where, update, create }: any) {
        const existing = workspaceIntegrationSettings.find((entry) => entry.workspaceId === where.workspaceId);
        if (existing) {
          Object.assign(existing, update, { updatedAt: now() });
          return existing;
        }
        return this.create({ data: create });
      }
    },
    workspaceIntegrationConnection: {
      async create({ data }: any) {
        const record = withTimestamps({
          id: data.id ?? nextId('integration'),
          settingsDbId: data.settingsDbId,
          externalId: data.externalId,
          kind: data.kind ?? null,
          provider: data.provider ?? null,
          status: data.status ?? null,
          position: data.position ?? 0,
          payload: data.payload
        });
        workspaceIntegrationConnections.push(record);
        return record;
      },
      async deleteMany({ where }: any) {
        const before = workspaceIntegrationConnections.length;
        for (let index = workspaceIntegrationConnections.length - 1; index >= 0; index -= 1) {
          if (workspaceIntegrationConnections[index].settingsDbId === where.settingsDbId) {
            workspaceIntegrationConnections.splice(index, 1);
          }
        }
        return { count: before - workspaceIntegrationConnections.length };
      }
    },
    workspaceIntegrationWebhook: {
      async deleteMany({ where }: any) {
        const before = workspaceIntegrationWebhooks.length;
        for (let index = workspaceIntegrationWebhooks.length - 1; index >= 0; index -= 1) {
          if (workspaceIntegrationWebhooks[index].settingsDbId === where.settingsDbId) {
            workspaceIntegrationWebhooks.splice(index, 1);
          }
        }
        return { count: before - workspaceIntegrationWebhooks.length };
      },
      async createMany({ data }: any) {
        for (const row of data) {
          workspaceIntegrationWebhooks.push(
            withTimestamps({
              id: row.id ?? nextId('webhook'),
              settingsDbId: row.settingsDbId,
              integrationDbId: row.integrationDbId ?? null,
              externalId: row.externalId,
              status: row.status ?? null,
              position: row.position ?? 0,
              payload: row.payload
            })
          );
        }
        return { count: data.length };
      }
    },
    workspaceTaxSettings: {
      async findUnique({ where, include }: any) {
        const settings = workspaceTaxSettings.find((entry) => entry.workspaceId === where.workspaceId);
        return settings ? (include ? includeTaxSettings(settings) : settings) : null;
      },
      async create({ data }: any) {
        const record = withTimestamps({
          dbId: data.dbId ?? nextId('tax-settings'),
          workspaceId: data.workspaceId,
          metadata: data.metadata ?? {}
        });
        workspaceTaxSettings.push(record);
        return record;
      },
      async upsert({ where, update, create }: any) {
        const existing = workspaceTaxSettings.find((entry) => entry.workspaceId === where.workspaceId);
        if (existing) {
          Object.assign(existing, update, { updatedAt: now() });
          return existing;
        }
        return this.create({ data: create });
      }
    },
    workspaceTaxProfile: {
      async create({ data }: any) {
        const record = withTimestamps({
          id: data.id ?? nextId('tax-profile'),
          settingsDbId: data.settingsDbId,
          externalId: data.externalId,
          profileName: data.profileName ?? null,
          country: data.country ?? null,
          vatId: data.vatId ?? null,
          status: data.status ?? null,
          isDefault: Boolean(data.isDefault),
          position: data.position ?? 0,
          payload: data.payload
        });
        workspaceTaxProfiles.push(record);
        return record;
      },
      async deleteMany({ where }: any) {
        const before = workspaceTaxProfiles.length;
        for (let index = workspaceTaxProfiles.length - 1; index >= 0; index -= 1) {
          if (workspaceTaxProfiles[index].settingsDbId === where.settingsDbId) {
            workspaceTaxProfiles.splice(index, 1);
          }
        }
        return { count: before - workspaceTaxProfiles.length };
      }
    },
    workspaceTaxReport: {
      async deleteMany({ where }: any) {
        const before = workspaceTaxReports.length;
        for (let index = workspaceTaxReports.length - 1; index >= 0; index -= 1) {
          if (workspaceTaxReports[index].settingsDbId === where.settingsDbId) {
            workspaceTaxReports.splice(index, 1);
          }
        }
        return { count: before - workspaceTaxReports.length };
      },
      async createMany({ data }: any) {
        for (const row of data) {
          workspaceTaxReports.push(
            withTimestamps({
              id: row.id ?? nextId('tax-report'),
              settingsDbId: row.settingsDbId,
              profileDbId: row.profileDbId ?? null,
              externalId: row.externalId,
              status: row.status ?? null,
              periodStart: row.periodStart ?? null,
              periodEnd: row.periodEnd ?? null,
              position: row.position ?? 0,
              payload: row.payload
            })
          );
        }
        return { count: data.length };
      }
    },
    workspaceKycProfile: {
      async findUnique({ where, include }: any) {
        const profile = workspaceKycProfiles.find((entry) => entry.workspaceId === where.workspaceId);
        return profile ? (include?.documents ? includeKycProfile(profile) : profile) : null;
      },
      async create({ data }: any) {
        const record = withTimestamps({
          dbId: data.dbId ?? nextId('kyc-profile'),
          workspaceId: data.workspaceId,
          status: data.status ?? 'pending',
          metadata: data.metadata ?? {}
        });
        workspaceKycProfiles.push(record);
        return record;
      },
      async upsert({ where, update, create }: any) {
        const existing = workspaceKycProfiles.find((entry) => entry.workspaceId === where.workspaceId);
        if (existing) {
          Object.assign(existing, update, { updatedAt: now() });
          return existing;
        }
        return this.create({ data: create });
      }
    },
    workspaceKycDocument: {
      async deleteMany({ where }: any) {
        const before = workspaceKycDocuments.length;
        for (let index = workspaceKycDocuments.length - 1; index >= 0; index -= 1) {
          if (workspaceKycDocuments[index].kycProfileDbId === where.kycProfileDbId) {
            workspaceKycDocuments.splice(index, 1);
          }
        }
        return { count: before - workspaceKycDocuments.length };
      },
      async createMany({ data }: any) {
        for (const row of data) {
          workspaceKycDocuments.push(
            withTimestamps({
              id: row.id ?? nextId('kyc-doc'),
              kycProfileDbId: row.kycProfileDbId,
              externalId: row.externalId,
              title: row.title ?? null,
              status: row.status ?? null,
              uploadedAt: row.uploadedAt ?? null,
              expiresAt: row.expiresAt ?? null,
              position: row.position ?? 0,
              payload: row.payload
            })
          );
        }
        return { count: data.length };
      }
    },
    workspaceSetting: {
      async findUnique({ where }: any) {
        return workspaceSettings.get(`${where.userId_key.userId}:${where.userId_key.key}`) ?? null;
      },
      async upsert({ where, update, create }: any) {
        const key = `${where.userId_key.userId}:${where.userId_key.key}`;
        const existing = workspaceSettings.get(key);
        const payload = update?.payload ?? create.payload;
        const record = {
          id: existing?.id ?? key,
          userId: create.userId,
          key: create.key,
          payload,
          createdAt: existing?.createdAt ?? now(),
          updatedAt: now()
        };
        workspaceSettings.set(key, record);
        return record;
      }
    },
    workspaceUserPreference: {
      async findUnique({ where }: any) {
        return workspaceUserPreferences.find(
          (entry) =>
            entry.workspaceId === where.workspaceId_userId_scopeRole.workspaceId &&
            entry.userId === where.workspaceId_userId_scopeRole.userId &&
            entry.scopeRole === where.workspaceId_userId_scopeRole.scopeRole
        ) ?? null;
      },
      async create({ data }: any) {
        const record = withTimestamps({
          dbId: data.dbId ?? nextId('workspace-pref'),
          workspaceId: data.workspaceId,
          userId: data.userId,
          scopeRole: data.scopeRole,
          locale: data.locale ?? null,
          currency: data.currency ?? null,
          timezone: data.timezone ?? null
        });
        workspaceUserPreferences.push(record);
        return record;
      },
      async upsert({ where, update, create }: any) {
        const existing = workspaceUserPreferences.find(
          (entry) =>
            entry.workspaceId === where.workspaceId_userId_scopeRole.workspaceId &&
            entry.userId === where.workspaceId_userId_scopeRole.userId &&
            entry.scopeRole === where.workspaceId_userId_scopeRole.scopeRole
        );
        if (existing) {
          Object.assign(existing, update, { updatedAt: now() });
          return existing;
        }
        return this.create({ data: create });
      }
    },
    userSecurityProfile: {
      async findUnique({ where, include }: any) {
        const profile = userSecurityProfiles.find((entry) => entry.userId === where.userId);
        return profile ? (include ? includeSecurityProfile(profile) : profile) : null;
      },
      async create({ data }: any) {
        const record = withTimestamps({
          dbId: data.dbId ?? nextId('security-profile'),
          userId: data.userId,
          twoFactor: Boolean(data.twoFactor),
          twoFactorMethod: data.twoFactorMethod ?? 'authenticator',
          twoFactorConfig: data.twoFactorConfig ?? {},
          metadata: data.metadata ?? {}
        });
        userSecurityProfiles.push(record);
        return record;
      },
      async update({ where, data }: any) {
        const record = userSecurityProfiles.find((entry) => entry.userId === where.userId);
        Object.assign(record, data, { updatedAt: now() });
        return record;
      }
    },
    userSecuritySession: {
      async deleteMany({ where }: any) {
        const before = userSecuritySessions.length;
        for (let index = userSecuritySessions.length - 1; index >= 0; index -= 1) {
          const row = userSecuritySessions[index];
          if (row.profileDbId === where.profileDbId && (!where.externalId || row.externalId === where.externalId)) {
            userSecuritySessions.splice(index, 1);
          }
        }
        return { count: before - userSecuritySessions.length };
      },
      async createMany({ data }: any) {
        for (const row of data) {
          userSecuritySessions.push(
            withTimestamps({
              id: row.id ?? nextId('session'),
              profileDbId: row.profileDbId,
              externalId: row.externalId,
              device: row.device ?? null,
              ip: row.ip ?? null,
              lastActiveAt: row.lastActiveAt ?? null,
              payload: row.payload ?? {}
            })
          );
        }
        return { count: data.length };
      }
    },
    userSecurityPasskey: {
      async deleteMany({ where }: any) {
        const before = userSecurityPasskeys.length;
        for (let index = userSecurityPasskeys.length - 1; index >= 0; index -= 1) {
          if (userSecurityPasskeys[index].profileDbId === where.profileDbId) {
            userSecurityPasskeys.splice(index, 1);
          }
        }
        return { count: before - userSecurityPasskeys.length };
      },
      async createMany({ data }: any) {
        for (const row of data) {
          userSecurityPasskeys.push(
            withTimestamps({
              id: row.id ?? nextId('passkey'),
              profileDbId: row.profileDbId,
              externalId: row.externalId,
              payload: row.payload ?? {}
            })
          );
        }
        return { count: data.length };
      }
    },
    userSecurityTrustedDevice: {
      async deleteMany({ where }: any) {
        const before = userSecurityTrustedDevices.length;
        for (let index = userSecurityTrustedDevices.length - 1; index >= 0; index -= 1) {
          const row = userSecurityTrustedDevices[index];
          if (row.profileDbId === where.profileDbId && (!where.externalId || row.externalId === where.externalId)) {
            userSecurityTrustedDevices.splice(index, 1);
          }
        }
        return { count: before - userSecurityTrustedDevices.length };
      },
      async createMany({ data }: any) {
        for (const row of data) {
          userSecurityTrustedDevices.push(
            withTimestamps({
              id: row.id ?? nextId('trusted-device'),
              profileDbId: row.profileDbId,
              externalId: row.externalId,
              payload: row.payload ?? {}
            })
          );
        }
        return { count: data.length };
      }
    },
    userSecurityAlert: {
      async deleteMany({ where }: any) {
        const before = userSecurityAlerts.length;
        for (let index = userSecurityAlerts.length - 1; index >= 0; index -= 1) {
          if (userSecurityAlerts[index].profileDbId === where.profileDbId) {
            userSecurityAlerts.splice(index, 1);
          }
        }
        return { count: before - userSecurityAlerts.length };
      },
      async createMany({ data }: any) {
        for (const row of data) {
          userSecurityAlerts.push(
            withTimestamps({
              id: row.id ?? nextId('alert'),
              profileDbId: row.profileDbId,
              externalId: row.externalId,
              payload: row.payload ?? {}
            })
          );
        }
        return { count: data.length };
      }
    },
    userRememberedDevice: {
      async deleteMany({ where }: any) {
        const before = userRememberedDevices.length;
        for (let index = userRememberedDevices.length - 1; index >= 0; index -= 1) {
          const row = userRememberedDevices[index];
          if (row.profileDbId === where.profileDbId && (!where.externalId || row.externalId === where.externalId)) {
            userRememberedDevices.splice(index, 1);
          }
        }
        return { count: before - userRememberedDevices.length };
      },
      async createMany({ data }: any) {
        for (const row of data) {
          userRememberedDevices.push(
            withTimestamps({
              id: row.id ?? nextId('remembered-device'),
              profileDbId: row.profileDbId,
              externalId: row.externalId,
              payload: row.payload ?? {}
            })
          );
        }
        return { count: data.length };
      }
    },
    userSetting: {
      async findUnique({ where }: any) {
        return userSettings.get(`${where.userId_key.userId}:${where.userId_key.key}`) ?? null;
      },
      async upsert({ where, update, create }: any) {
        const key = `${where.userId_key.userId}:${where.userId_key.key}`;
        const existing = userSettings.get(key);
        const payload = update?.payload ?? create.payload;
        const record = {
          id: existing?.id ?? key,
          userId: create.userId,
          key: create.key,
          payload,
          createdAt: existing?.createdAt ?? now(),
          updatedAt: now()
        };
        userSettings.set(key, record);
        return record;
      }
    },
    auditEvent: { async findMany() { return []; } }
  };

  return prisma;
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

test('SettingsService.savedViews migrates legacy scoped data into relational tables', async () => {
  const prisma = createPrismaStub({
    workspaceSettings: [
      {
        userId: 'user-1',
        key: 'seller:saved_views',
        payload: {
          views: [{ id: 'view-1', name: 'Overview', filters: { status: 'open' } }],
          metadata: { defaultViewId: 'view-1' }
        }
      }
    ]
  });
  const service = new SettingsService(prisma as any, { async log() {} } as any);

  const result = await service.savedViews('user-1', 'SELLER');

  assert.equal(result.views.length, 1);
  assert.equal((result.views[0] as any).id, 'view-1');
  assert.equal((result.metadata as any).defaultViewId, 'view-1');
});

test('SettingsService.preferences migrates legacy scoped preferences into relational tables', async () => {
  const prisma = createPrismaStub({
    workspaceSettings: [
      {
        userId: 'user-1',
        key: 'seller:preferences',
        payload: {
          locale: 'sw',
          currency: 'KES',
          timezone: 'Africa/Nairobi'
        }
      }
    ]
  });
  const service = new SettingsService(prisma as any, { async log() {} } as any);

  const result = await service.preferences('user-1', 'SELLER');

  assert.equal((result as any).locale, 'sw');
  assert.equal((result as any).currency, 'KES');
  assert.equal((result as any).timezone, 'Africa/Nairobi');
});

test('SettingsService.securitySettings migrates legacy security payloads and signOutDevice removes matching records', async () => {
  const prisma = createPrismaStub({
    workspaceSettings: [
      {
        userId: 'user-1',
        key: 'security',
        payload: {
          twoFactor: true,
          twoFactorMethod: 'sms',
          sessions: [{ id: 'device-1', device: 'Chrome' }],
          trustedDevices: [{ id: 'device-1', label: 'Laptop' }],
          alerts: [{ id: 'alert-1', type: 'login' }]
        }
      }
    ]
  });
  (prisma.userSetting as any).upsert({
    where: { userId_key: { userId: 'user-1', key: 'devices' } },
    create: { userId: 'user-1', key: 'devices', payload: { devices: [{ id: 'device-1', name: 'Laptop' }] } },
    update: { payload: { devices: [{ id: 'device-1', name: 'Laptop' }] } }
  });
  const service = new SettingsService(prisma as any, { async log() {} } as any);

  const before = await service.securitySettings('user-1');
  assert.equal((before as any).twoFactor, true);
  assert.equal((before as any).sessions.length, 1);
  assert.equal((before as any).trustedDevices.length, 1);

  await service.signOutDevice('user-1', 'device-1');

  const after = await service.securitySettings('user-1');
  assert.equal((after as any).sessions.length, 0);
  assert.equal((after as any).trustedDevices.length, 0);
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
