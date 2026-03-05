import { created, noContent, ok } from "../lib/http.js";
import { createSession, hashPassword, invalidateSession, sanitizeUser, verifyPassword } from "../lib/auth.js";
import { ensure, pushAudit, requireFields } from "../lib/utils.js";

export function registerAuthRoutes(router, { sessionTtlDays }) {
  router.add("POST", "/api/auth/register", { tag: "auth", description: "Create a creator account." }, async ({ store, readBody }) => {
    const body = await readBody();
    requireFields(body, ["email", "password", "name"]);

    const email = String(body.email).toLowerCase().trim();

    const user = store.update((db) => {
      ensure(!db.users.some((entry) => entry.email === email), "That email is already registered.", "EMAIL_TAKEN", 409);

      const userId = `user_${Date.now()}`;
      const creatorId = `creator_${Date.now()}`;
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
        name: String(body.name),
        handle: String(body.handle || body.name).toLowerCase().replace(/\s+/g, "."),
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
      pushAudit(db, { actor: body.name, action: "Account registered", detail: email, severity: "info" });

      const token = createSession(db, userId, sessionTtlDays);
      return { token, user: sanitizeUser(user, profile) };
    });

    return created(user);
  });

  router.add("POST", "/api/auth/login", { tag: "auth", description: "Log in with email and password." }, async ({ store, readBody }) => {
    const body = await readBody();
    requireFields(body, ["email", "password"]);
    const email = String(body.email).toLowerCase().trim();

    const login = store.update((db) => {
      const user = db.users.find((entry) => entry.email === email);
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
