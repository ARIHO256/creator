import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { HttpError } from "./http.js";
import { id, nowIso } from "./utils.js";

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  const [salt, originalHash] = String(storedHash || "").split(":");
  if (!salt || !originalHash) return false;
  const candidateHash = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(candidateHash, "hex"), Buffer.from(originalHash, "hex"));
}

export function createSession(db, userId, ttlDays = 30) {
  const token = randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();
  db.sessions.push({
    id: id("sess"),
    token,
    userId,
    createdAt: nowIso(),
    expiresAt
  });
  return token;
}

export function invalidateSession(db, token) {
  db.sessions = db.sessions.filter((session) => session.token !== token);
}

export function sanitizeUser(user, profile) {
  return {
    id: user.id,
    email: user.email,
    roles: user.roles,
    approvalStatus: user.approvalStatus,
    onboardingCompleted: user.onboardingCompleted,
    currentRole: user.currentRole,
    creatorProfile: profile
      ? {
          id: profile.id,
          name: profile.name,
          handle: profile.handle,
          tier: profile.tier,
          categories: profile.categories,
          regions: profile.regions,
          isKycVerified: profile.isKycVerified
        }
      : null
  };
}

export function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export function requireAuth(store) {
  return (req) => {
    const token = getBearerToken(req);
    if (!token) {
      throw new HttpError(401, "AUTH_REQUIRED", "A bearer token is required.");
    }
    const db = store.load();
    const session = db.sessions.find((entry) => entry.token === token);
    if (!session) {
      throw new HttpError(401, "INVALID_SESSION", "The provided session token is invalid.");
    }
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      throw new HttpError(401, "SESSION_EXPIRED", "The provided session token has expired.");
    }
    const user = db.users.find((entry) => entry.id === session.userId);
    if (!user) {
      throw new HttpError(401, "INVALID_SESSION", "The session is no longer linked to a user.");
    }
    const profile = db.creatorProfiles.find((entry) => entry.userId === user.id) || null;
    return {
      token,
      session,
      user,
      profile
    };
  };
}
