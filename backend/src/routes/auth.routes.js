import { created, noContent, ok } from "../lib/http.js";
import {
  assertStrongPassword,
  assertValidEmail,
  createSession,
  hashPassword,
  invalidateSession,
  normalizeEmail,
  sanitizeUser,
  verifyPassword
} from "../lib/auth.js";
import { ensure, id, pushAudit, requireFields } from "../lib/utils.js";

function normalizeHandle(rawHandle, fallbackName) {
  const selected = String(rawHandle || fallbackName || "");
  return selected
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, ".")
    .replace(/\.{2,}/g, ".")
    .replace(/(^[._-]+|[._-]+$)/g, "");
}

export function registerAuthRoutes(router, { sessionTtlDays }) {
  router.add("POST", "/api/auth/register", { tag: "auth", description: "Create a creator account." }, async ({ store, readBody }) => {
    const body = await readBody();
    requireFields(body, ["email", "password", "name"]);

    const email = normalizeEmail(body.email);
    const name = String(body.name || "").trim();
    const handle = normalizeHandle(body.handle, body.name);
    assertValidEmail(email);
    assertStrongPassword(String(body.password));
    ensure(name.length >= 2 && name.length <= 120, "Name must be between 2 and 120 characters.", "INVALID_NAME", 400);
    ensure(handle.length >= 3 && handle.length <= 40, "Handle must be between 3 and 40 characters.", "INVALID_HANDLE", 400);
    ensure(/^[a-z0-9._-]+$/.test(handle), "Handle can include letters, numbers, dots, underscores, and hyphens.", "INVALID_HANDLE", 400);

    const user = store.update((db) => {
      ensure(!db.users.some((entry) => normalizeEmail(entry.email) === email), "That email is already registered.", "EMAIL_TAKEN", 409);
      ensure(!db.creatorProfiles.some((entry) => String(entry.handle || "").toLowerCase() === handle), "That handle is already in use.", "HANDLE_TAKEN", 409);

      const userId = id("user");
      const creatorId = id("creator");
      const user = {
        id: userId,
        email,
        passwordHash: hashPassword(String(body.password)),
        roles: ["creator", "seller", "buyer", "provider"],
        currentRole: "Creator",
        approvalStatus: "NEEDS_ONBOARDING",
        onboardingCompleted: false
      };

      const profile = {
        id: creatorId,
        userId,
        name,
        handle,
        tier: "Bronze",
        tagline: "",
        bio: "",
        categories: [],
        regions: [],
        languages: [],
        followers: 0,
        rating: 0,
        avgViews: 0,
        totalSalesDriven: 0,
        isKycVerified: false,
        followingSellerIds: []
      };

      db.users.push(user);
      db.creatorProfiles.push(profile);
      pushAudit(db, { actor: name, action: "Account registered", detail: email, severity: "info" });

      const token = createSession(db, userId, sessionTtlDays);
      return { token, user: sanitizeUser(user, profile) };
    });

    return created(user);
  });

  router.add("POST", "/api/auth/login", { tag: "auth", description: "Log in with email and password." }, async ({ store, readBody }) => {
    const body = await readBody();
    requireFields(body, ["email", "password"]);
    const email = normalizeEmail(body.email);
    assertValidEmail(email);

    const login = store.update((db) => {
      const user = db.users.find((entry) => normalizeEmail(entry.email) === email);
      ensure(user, "The email or password is incorrect.", "INVALID_CREDENTIALS", 401);
      ensure(verifyPassword(String(body.password), user.passwordHash), "The email or password is incorrect.", "INVALID_CREDENTIALS", 401);

      const profile = db.creatorProfiles.find((entry) => entry.userId === user.id) || null;
      const token = createSession(db, user.id, sessionTtlDays);
      pushAudit(db, { actor: email, action: "Logged in", detail: "Creator session created", severity: "info" });
      return { token, user: sanitizeUser(user, profile) };
    });

    return ok(login);
  });

  router.add("POST", "/api/auth/logout", { tag: "auth", auth: true, description: "Invalidate the current session token." }, async ({ store, auth }) => {
    store.update((db) => {
      invalidateSession(db, auth.token);
      pushAudit(db, { actor: auth.user.email, action: "Logged out", detail: "Creator session invalidated", severity: "info" });
      return null;
    });
    return noContent();
  });

  router.add("GET", "/api/me", { tag: "auth", auth: true, description: "Return the authenticated user and creator profile." }, async ({ auth }) => {
    return ok({ user: sanitizeUser(auth.user, auth.profile) });
  });

  router.add("POST", "/api/auth/switch-role", { tag: "auth", auth: true, description: "Persist the current shell role for the active session." }, async ({ auth, readBody, store }) => {
    const body = await readBody();
    requireFields(body, ["role"]);

    const allowedRoles = new Set(["Creator", "Seller", "Buyer", "Provider"]);
    const nextRole = String(body.role || "").trim();
    ensure(allowedRoles.has(nextRole), "Role must be Creator, Seller, Buyer, or Provider.", "INVALID_ROLE", 400);

    const result = store.update((db) => {
      const user = db.users.find((entry) => entry.id === auth.user.id);
      ensure(user, "User not found.", "USER_NOT_FOUND", 404);
      user.currentRole = nextRole;
      if (!Array.isArray(user.roles)) user.roles = ["creator"];
      const normalizedToken = nextRole.toLowerCase();
      if (!user.roles.includes(normalizedToken)) {
        user.roles.push(normalizedToken);
      }
      const profile = db.creatorProfiles.find((entry) => entry.userId === user.id) || null;
      pushAudit(db, { actor: auth.user.email, action: "Switched shell role", detail: nextRole, severity: "info" });
      return { user: sanitizeUser(user, profile) };
    });

    return ok(result);
  });
}
