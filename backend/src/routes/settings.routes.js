import { created, noContent, ok } from "../lib/http.js";
import { ensure, id, pushAudit, requireFields } from "../lib/utils.js";

const DEFAULT_INVITE_DOMAIN_ALLOWLIST = ["creator.com", "studio.com", "mylivedealz.com", "studio.test"];
const DEFAULT_WORKSPACE_SECURITY = {
  require2FA: true,
  allowExternalInvites: false,
  supplierGuestExpiryHours: 24,
  inviteDomainAllowlist: DEFAULT_INVITE_DOMAIN_ALLOWLIST
};

function resolveWorkspaceAccess(db, auth) {
  const normalizedEmail = String(auth?.user?.email || "").trim().toLowerCase();
  const currentMember = db.members.find((member) => String(member.email || "").trim().toLowerCase() === normalizedEmail) || null;
  const currentRole = currentMember ? db.roles.find((role) => role.id === currentMember.roleId) || null : null;
  return {
    currentMember,
    currentRole,
    effectivePermissions: currentRole?.perms || {}
  };
}

function canManageWorkspaceRoles(access) {
  return Boolean(
    access.currentMember &&
      (access.effectivePermissions["roles.manage"] ||
        access.effectivePermissions["admin.manage_roles"] ||
        access.effectivePermissions["admin.manage_team"] ||
        String(access.currentMember.seat || "").toLowerCase() === "owner")
  );
}

function canViewAuditLog(access) {
  return Boolean(
    access.currentMember &&
      (access.effectivePermissions["admin.audit"] ||
        access.effectivePermissions["admin.manage_roles"] ||
        String(access.currentMember.seat || "").toLowerCase() === "owner")
  );
}

function ensureWorkspaceRoleManager(db, auth) {
  const access = resolveWorkspaceAccess(db, auth);
  ensure(access.currentMember, "Workspace member not found.", "WORKSPACE_MEMBER_NOT_FOUND", 403);
  ensure(canManageWorkspaceRoles(access), "You do not have permission to manage workspace roles.", "FORBIDDEN", 403);
  return access;
}

function normalizePerms(perms) {
  if (!perms || typeof perms !== "object" || Array.isArray(perms)) {
    return {};
  }

  return Object.entries(perms).reduce((accumulator, [permId, value]) => {
    accumulator[String(permId)] = Boolean(value);
    return accumulator;
  }, {});
}

function hydrateWorkspaceSecurity(db) {
  if (!db.workspaceSecurity || typeof db.workspaceSecurity !== "object" || Array.isArray(db.workspaceSecurity)) {
    db.workspaceSecurity = structuredClone(DEFAULT_WORKSPACE_SECURITY);
    return db.workspaceSecurity;
  }

  const current = db.workspaceSecurity;
  const allowlist = Array.isArray(current.inviteDomainAllowlist)
    ? current.inviteDomainAllowlist.map((entry) => String(entry).trim().toLowerCase()).filter(Boolean)
    : DEFAULT_INVITE_DOMAIN_ALLOWLIST;

  const supplierGuestExpiryHours = Number.isFinite(Number(current.supplierGuestExpiryHours))
    ? Math.max(1, Math.min(168, Number(current.supplierGuestExpiryHours)))
    : DEFAULT_WORKSPACE_SECURITY.supplierGuestExpiryHours;

  db.workspaceSecurity = {
    require2FA: current.require2FA === undefined ? DEFAULT_WORKSPACE_SECURITY.require2FA : Boolean(current.require2FA),
    allowExternalInvites: current.allowExternalInvites === undefined ? DEFAULT_WORKSPACE_SECURITY.allowExternalInvites : Boolean(current.allowExternalInvites),
    supplierGuestExpiryHours,
    inviteDomainAllowlist: allowlist.length ? allowlist : DEFAULT_INVITE_DOMAIN_ALLOWLIST
  };

  return db.workspaceSecurity;
}

function humanizeExpiry(hours) {
  const rounded = Math.max(1, Math.round(hours));
  if (rounded % 24 === 0) {
    const days = rounded / 24;
    return `In ${days} day${days === 1 ? "" : "s"}`;
  }
  return `In ${rounded} hour${rounded === 1 ? "" : "s"}`;
}


function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(base, patch) {
  if (patch === undefined) return base;
  if (Array.isArray(base) && Array.isArray(patch)) return [...patch];
  if (Array.isArray(patch)) return [...patch];

  if (isPlainObject(base) && isPlainObject(patch)) {
    const out = { ...base };
    Object.entries(patch).forEach(([key, value]) => {
      out[key] = deepMerge(base[key], value);
    });
    return out;
  }

  return patch;
}

function findWorkflowSnapshot(db, userId) {
  return db.onboardingWorkflows.find((workflow) => workflow.userId === userId)?.form || null;
}

function hydrateSettingsRecord(db, userId) {
  const workflowSnapshot = findWorkflowSnapshot(db, userId);
  const baseSettings = db.settings && db.settings.userId === userId ? db.settings : { userId };
  const hydrated = deepMerge(workflowSnapshot || {}, baseSettings || {});
  hydrated.userId = userId;

  if (!isPlainObject(hydrated.settings)) hydrated.settings = {};
  const nestedSettings = hydrated.settings;

  if (isPlainObject(hydrated.notifications)) {
    nestedSettings.notifications = deepMerge(nestedSettings.notifications || {}, hydrated.notifications);
  }

  if ((!Array.isArray(nestedSettings.devices) || nestedSettings.devices.length === 0) && Array.isArray(hydrated.security?.devices)) {
    nestedSettings.devices = [...hydrated.security.devices];
  }

  if (!isPlainObject(nestedSettings.calendar)) {
    nestedSettings.calendar = {
      shareAvailability: true,
      visibility: "Admins only",
      googleConnected: false
    };
  }

  if (!isPlainObject(nestedSettings.privacy)) {
    nestedSettings.privacy = {
      profileVisibility: "Public",
      allowDMsFrom: "All suppliers",
      allowExternalGuests: true,
      blockedSellers: []
    };
  }

  if (!Array.isArray(nestedSettings.audit)) {
    nestedSettings.audit = [];
  }

  hydrated.settings = nestedSettings;
  return hydrated;
}

function persistSettingsUpdate(db, auth, patch) {
  const current = hydrateSettingsRecord(db, auth.user.id);
  db.settings = deepMerge(current, patch || {});
  db.settings.userId = auth.user.id;
  db.settings.updatedAt = new Date().toISOString();
  return db.settings;
}

export function registerSettingsRoutes(router) {
  router.add("GET", "/api/settings", { tag: "settings", auth: true, description: "Creator settings and safety profile." }, async ({ auth, store }) => {
    const db = store.load();
    const settings = hydrateSettingsRecord(db, auth.user.id);
    return ok(settings);
  });

  router.add("PATCH", "/api/settings", { tag: "settings", auth: true, description: "Update creator settings." }, async ({ auth, readBody, store }) => {
    const body = await readBody();
    const settings = store.update((db) => persistSettingsUpdate(db, auth, body));
    return ok(settings);
  });

  router.add("POST", "/api/settings/payout/send-code", { tag: "settings", auth: true, description: "Send a payout verification code for the active payout method." }, async ({ auth, readBody, store }) => {
    const body = await readBody();
    const settings = store.update((db) => {
      const merged = persistSettingsUpdate(db, auth, body?.payout ? { payout: body.payout } : {});
      if (!isPlainObject(merged.payout)) merged.payout = {};
      ensure(String(merged.payout?.method || "").trim().length > 0, "Select a payout method first.", "PAYOUT_METHOD_REQUIRED", 400);
      if (!isPlainObject(merged.payout.verification)) merged.payout.verification = {};
      merged.payout.verification.status = "code_sent";
      merged.payout.verification.lastSentTo = merged.payout.method;
      merged.updatedAt = new Date().toISOString();
      pushAudit(db, { actor: auth.user.email, action: "Payout verification code sent", detail: String(merged.payout.method || "Payout"), severity: "info" });
      return merged;
    });
    return ok(settings);
  });

  router.add("POST", "/api/settings/payout/verify", { tag: "settings", auth: true, description: "Mark the payout method as verified." }, async ({ auth, readBody, store }) => {
    const body = await readBody();
    const settings = store.update((db) => {
      const merged = persistSettingsUpdate(db, auth, body?.payout ? { payout: body.payout } : {});
      if (!isPlainObject(merged.payout)) merged.payout = {};
      ensure(String(merged.payout?.method || "").trim().length > 0, "Select a payout method first.", "PAYOUT_METHOD_REQUIRED", 400);
      if (!isPlainObject(merged.payout.verification)) merged.payout.verification = {};
      merged.payout.verification.status = "verified";
      merged.updatedAt = new Date().toISOString();
      pushAudit(db, { actor: auth.user.email, action: "Payout method verified", detail: String(merged.payout.method || "Payout"), severity: "info" });
      return merged;
    });
    return ok(settings);
  });

  router.add("DELETE", "/api/settings/devices/:id", { tag: "settings", auth: true, description: "Sign out a specific remembered device." }, async ({ auth, params, store }) => {
    const settings = store.update((db) => {
      const merged = persistSettingsUpdate(db, auth, {});
      const devices = Array.isArray(merged.settings?.devices) ? merged.settings.devices : [];
      const nextDevices = devices.filter((device) => device.id !== params.id);
      ensure(nextDevices.length !== devices.length, "Device not found.", "DEVICE_NOT_FOUND", 404);
      merged.settings.devices = nextDevices;
      merged.security = deepMerge(merged.security || {}, { devices: nextDevices });
      merged.updatedAt = new Date().toISOString();
      pushAudit(db, { actor: auth.user.email, action: "Settings device signed out", detail: params.id, severity: "info" });
      return merged;
    });
    return ok(settings);
  });

  router.add("POST", "/api/settings/devices/sign-out-all", { tag: "settings", auth: true, description: "Sign out all remembered settings devices." }, async ({ auth, store }) => {
    const settings = store.update((db) => {
      const merged = persistSettingsUpdate(db, auth, {});
      merged.settings.devices = [];
      merged.security = deepMerge(merged.security || {}, { devices: [] });
      merged.updatedAt = new Date().toISOString();
      pushAudit(db, { actor: auth.user.email, action: "Settings signed out everywhere", detail: "All remembered devices removed", severity: "warn" });
      return merged;
    });
    return ok(settings);
  });

  router.add("GET", "/api/notifications", { tag: "settings", auth: true, description: "List notifications." }, async ({ auth, store }) => {
    const db = store.load();
    return ok(db.notifications.filter((item) => item.userId === auth.user.id));
  });

  router.add("PATCH", "/api/notifications/:id/read", { tag: "settings", auth: true, description: "Mark a notification as read." }, async ({ auth, params, store }) => {
    const notification = store.update((db) => {
      const notification = db.notifications.find((item) => item.id === params.id && item.userId === auth.user.id);
      ensure(notification, "Notification not found.", "NOTIFICATION_NOT_FOUND", 404);
      notification.read = true;
      return notification;
    });
    return ok(notification);
  });

  router.add("POST", "/api/notifications/read-all", { tag: "settings", auth: true, description: "Mark all notifications as read." }, async ({ auth, store }) => {
    const result = store.update((db) => {
      const notifications = db.notifications.filter((item) => item.userId === auth.user.id);
      notifications.forEach((notification) => {
        notification.read = true;
      });
      return { updated: notifications.length };
    });
    return ok(result);
  });

  router.add("GET", "/api/roles", { tag: "settings", auth: true, description: "Roles, members, invites, and effective permissions for the current member." }, async ({ auth, store }) => {
    const db = store.load();
    const access = resolveWorkspaceAccess(db, auth);
    const workspaceSecurity = hydrateWorkspaceSecurity(db);
    return ok({
      roles: db.roles,
      members: db.members,
      invites: db.members.filter((member) => String(member.status || "").toLowerCase() === "invited"),
      currentMember: access.currentMember,
      effectivePermissions: access.effectivePermissions,
      workspaceSecurity
    });
  });

  router.add(
    "PATCH",
    "/api/roles/security",
    {
      tag: "settings",
      auth: true,
      description: "Update workspace security & invite policies used by /roles-permissions."
    },
    async ({ auth, readBody, store }) => {
      const body = await readBody();
      const workspaceSecurity = store.update((db) => {
        const access = ensureWorkspaceRoleManager(db, auth);
        const current = hydrateWorkspaceSecurity(db);

        if (body?.require2FA !== undefined) {
          current.require2FA = Boolean(body.require2FA);
        }

        if (body?.allowExternalInvites !== undefined) {
          current.allowExternalInvites = Boolean(body.allowExternalInvites);
        }

        if (body?.supplierGuestExpiryHours !== undefined) {
          const hours = Number(body.supplierGuestExpiryHours);
          ensure(Number.isFinite(hours), "supplierGuestExpiryHours must be a number.", "VALIDATION_ERROR", 400);
          current.supplierGuestExpiryHours = Math.max(1, Math.min(168, Math.round(hours)));
        }

        if (body?.inviteDomainAllowlist !== undefined) {
          ensure(Array.isArray(body.inviteDomainAllowlist), "inviteDomainAllowlist must be an array.", "VALIDATION_ERROR", 400);
          const allowlist = body.inviteDomainAllowlist.map((entry) => String(entry).trim().toLowerCase()).filter(Boolean);
          ensure(allowlist.length > 0, "inviteDomainAllowlist cannot be empty.", "VALIDATION_ERROR", 400);
          current.inviteDomainAllowlist = allowlist;
        }

        db.workspaceSecurity = current;
        const actor = access.currentMember?.email || auth.user.email;
        pushAudit(db, {
          actor,
          action: "Workspace security policy updated",
          detail: `Require 2FA: ${current.require2FA ? "ON" : "OFF"}; External invites: ${current.allowExternalInvites ? "ON" : "OFF"}; Supplier guest expiry: ${current.supplierGuestExpiryHours}h`,
          severity: "warn"
        });
        return current;
      });

      return ok(workspaceSecurity);
    }
  );

  router.add("POST", "/api/roles", { tag: "settings", auth: true, description: "Create a new workspace role." }, async ({ auth, readBody, store }) => {
    const body = await readBody();
    requireFields(body, ["name"]);

    const role = store.update((db) => {
      ensureWorkspaceRoleManager(db, auth);
      const roleId = body.id ? String(body.id) : id("role");
      ensure(!db.roles.some((entry) => entry.id === roleId), "Role id already exists.", "ROLE_ALREADY_EXISTS", 409);
      ensure(
        !db.roles.some((entry) => String(entry.name || "").trim().toLowerCase() === String(body.name || "").trim().toLowerCase()),
        "Role name already exists.",
        "ROLE_NAME_TAKEN",
        409
      );

      const role = {
        id: roleId,
        name: String(body.name).trim(),
        badge: body.badge ? String(body.badge) : "Custom",
        description: body.description ? String(body.description).trim() : "Custom workspace role.",
        perms: normalizePerms(body.perms)
      };
      db.roles.unshift(role);
      pushAudit(db, { actor: auth.user.email, action: "Role created", detail: role.name, severity: "info" });
      return role;
    });

    return created(role);
  });

  router.add("PATCH", "/api/roles/:id", { tag: "settings", auth: true, description: "Update workspace role metadata or permissions." }, async ({ auth, params, readBody, store }) => {
    const body = await readBody();
    const role = store.update((db) => {
      ensureWorkspaceRoleManager(db, auth);
      const role = db.roles.find((entry) => entry.id === params.id);
      ensure(role, "Role not found.", "ROLE_NOT_FOUND", 404);

      if (body.name !== undefined) {
        const nextName = String(body.name).trim();
        ensure(nextName.length > 0, "Role name cannot be empty.", "VALIDATION_ERROR", 400);
        ensure(
          !db.roles.some((entry) => entry.id !== role.id && String(entry.name || "").trim().toLowerCase() === nextName.toLowerCase()),
          "Role name already exists.",
          "ROLE_NAME_TAKEN",
          409
        );
        role.name = nextName;
      }

      if (body.description !== undefined) {
        role.description = String(body.description).trim();
      }

      if (body.badge !== undefined) {
        role.badge = String(body.badge).trim() || role.badge;
      }

      if (body.perms !== undefined) {
        role.perms = {
          ...role.perms,
          ...normalizePerms(body.perms)
        };
      }

      pushAudit(db, { actor: auth.user.email, action: "Role updated", detail: role.name, severity: "info" });
      return role;
    });

    return ok(role);
  });

  router.add("DELETE", "/api/roles/:id", { tag: "settings", auth: true, description: "Delete a custom workspace role." }, async ({ auth, params, store }) => {
    store.update((db) => {
      ensureWorkspaceRoleManager(db, auth);
      const roleIndex = db.roles.findIndex((entry) => entry.id === params.id);
      ensure(roleIndex >= 0, "Role not found.", "ROLE_NOT_FOUND", 404);
      const role = db.roles[roleIndex];
      ensure(String(role.badge || "").toLowerCase() !== "system", "System roles cannot be deleted.", "ROLE_DELETE_BLOCKED", 400);
      ensure(!db.members.some((member) => member.roleId === role.id), "Role is still assigned to a workspace member.", "ROLE_IN_USE", 409);
      db.roles.splice(roleIndex, 1);
      pushAudit(db, { actor: auth.user.email, action: "Role deleted", detail: role.name, severity: "warn" });
      return db;
    });

    return ok({ id: params.id, deleted: true });
  });

  router.add("POST", "/api/roles/invites", { tag: "settings", auth: true, description: "Invite a member into the workspace." }, async ({ auth, readBody, store }) => {
    const body = await readBody();
    requireFields(body, ["name", "email", "roleId"]);

    const member = store.update((db) => {
      ensureWorkspaceRoleManager(db, auth);
      const workspaceSecurity = hydrateWorkspaceSecurity(db);
      ensure(db.roles.some((role) => role.id === body.roleId), "Role not found.", "ROLE_NOT_FOUND", 404);
      ensure(
        !db.members.some((entry) => String(entry.email || "").trim().toLowerCase() === String(body.email || "").trim().toLowerCase()),
        "A workspace member with that email already exists.",
        "MEMBER_ALREADY_EXISTS",
        409
      );

      const normalizedEmail = String(body.email).trim().toLowerCase();
      const domain = normalizedEmail.split("@")[1] || "";
      const allowlist = Array.isArray(workspaceSecurity.inviteDomainAllowlist) ? workspaceSecurity.inviteDomainAllowlist : DEFAULT_INVITE_DOMAIN_ALLOWLIST;
      const isExternal = domain ? !allowlist.includes(domain) : true;
      ensure(
        workspaceSecurity.allowExternalInvites || !isExternal,
        "External invites are blocked by workspace policy.",
        "EXTERNAL_INVITES_BLOCKED",
        403,
        { domain, allowlist }
      );

      const seat = body.seat || "Team";
      const seatNormalized = String(seat).trim().toLowerCase();
      const supplierExpiryHours = Number(workspaceSecurity.supplierGuestExpiryHours || DEFAULT_WORKSPACE_SECURITY.supplierGuestExpiryHours);
      const expiresAtLabel = seatNormalized === "supplier guest" ? humanizeExpiry(supplierExpiryHours) : "In 7 days";

      const member = {
        id: id("member"),
        name: String(body.name),
        email: normalizedEmail,
        roleId: String(body.roleId),
        status: "invited",
        seat,
        lastActiveLabel: "Pending",
        twoFA: "Off",
        createdAtLabel: "Now",
        expiresAtLabel
      };
      db.members.push(member);
      pushAudit(db, { actor: auth.user.email, action: "Member invited", detail: member.email, severity: "info" });
      return member;
    });

    return created(member);
  });

  router.add("PATCH", "/api/roles/members/:id", { tag: "settings", auth: true, description: "Update a member role or status." }, async ({ auth, params, readBody, store }) => {
    const body = await readBody();
    const member = store.update((db) => {
      ensureWorkspaceRoleManager(db, auth);
      const member = db.members.find((item) => item.id === params.id);
      ensure(member, "Member not found.", "MEMBER_NOT_FOUND", 404);

      if (body.roleId !== undefined) {
        ensure(db.roles.some((role) => role.id === body.roleId), "Role not found.", "ROLE_NOT_FOUND", 404);
        member.roleId = String(body.roleId);
      }
      if (body.status !== undefined) {
        member.status = String(body.status).trim().toLowerCase();
      }
      if (body.seat !== undefined) {
        member.seat = String(body.seat).trim() || member.seat;
      }

      pushAudit(db, { actor: auth.user.email, action: "Member updated", detail: member.email, severity: "info" });
      return member;
    });

    return ok(member);
  });

  router.add("GET", "/api/crew", { tag: "settings", auth: true, description: "Crew assignments and availability." }, async ({ store }) => {
    const db = store.load();
    return ok({
      crew: db.crew,
      liveSessions: db.liveSessions,
      members: db.members,
      roles: db.roles
    });
  });

  router.add("PATCH", "/api/crew/sessions/:id", { tag: "settings", auth: true, description: "Replace crew assignments for a live session." }, async ({ auth, params, readBody, store }) => {
    const body = await readBody();
    ensure(Array.isArray(body.assignments), "Assignments must be an array.");
    const crew = store.update((db) => {
      const sessionAssignments = db.crew.sessions.find((entry) => entry.sessionId === params.id);
      ensure(sessionAssignments, "Crew session not found.", "CREW_SESSION_NOT_FOUND", 404);
      sessionAssignments.assignments = body.assignments;
      sessionAssignments.updatedAt = new Date().toISOString();
      pushAudit(db, { actor: auth.user.email, action: "Crew assignments updated", detail: params.id, severity: "info" });
      return sessionAssignments;
    });
    return ok(crew);
  });

  router.add("GET", "/api/audit-logs", { tag: "settings", auth: true, description: "Audit log rows." }, async ({ auth, query, store }) => {
    const db = store.load();
    const access = resolveWorkspaceAccess(db, auth);
    ensure(access.currentMember, "Workspace member not found.", "WORKSPACE_MEMBER_NOT_FOUND", 403);
    ensure(canViewAuditLog(access), "You do not have permission to view audit logs.", "FORBIDDEN", 403);

    let rows = [...db.auditLogs];
    const q = String(query.get("q") || "").trim().toLowerCase();
    const severity = String(query.get("severity") || "").trim().toLowerCase();

    if (severity) {
      rows = rows.filter((entry) => String(entry.severity || "").toLowerCase() === severity);
    }

    if (q) {
      rows = rows.filter((entry) =>
        [entry.id, entry.actor, entry.action, entry.detail, entry.severity]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    return ok(rows);
  });
}
