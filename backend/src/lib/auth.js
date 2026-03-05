import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { HttpError } from "./http.js";
import { id, nowIso } from "./utils.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_POLICY =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

export function hashPassword(password) {
  const normalized = String(password || "");
  if (!normalized) {
    throw new HttpError(400, "VALIDATION_ERROR", "Password cannot be empty.");
  }
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(normalized, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  const [salt, originalHash] = String(storedHash || "").split(":");
  if (!salt || !originalHash) return false;
  let candidateHash = "";
  try {
    candidateHash = scryptSync(String(password || ""), salt, 64).toString("hex");
  } catch {
    return false;
  }

  const candidateBuffer = Buffer.from(candidateHash, "hex");
  const originalBuffer = Buffer.from(originalHash, "hex");
  if (candidateBuffer.length !== originalBuffer.length) return false;
  return timingSafeEqual(candidateBuffer, originalBuffer);
}

export function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}

export function assertValidEmail(email) {
  if (!EMAIL_REGEX.test(normalizeEmail(email))) {
    throw new HttpError(400, "INVALID_EMAIL", "Provide a valid email address.");
  }
}

export function assertStrongPassword(password) {
  const value = String(password || "");
  if (!PASSWORD_POLICY.test(value)) {
    throw new HttpError(
      400,
      "WEAK_PASSWORD",
      "Password must be 8-128 chars and include upper, lower, number, and symbol."
    );
  }
}

export function purgeExpiredSessions(db, now = Date.now()) {
  if (!Array.isArray(db.sessions) || db.sessions.length === 0) return 0;
  const before = db.sessions.length;
  db.sessions = db.sessions.filter((session) => new Date(session.expiresAt).getTime() > now);
  return before - db.sessions.length;
}

export function createSession(db, userId, ttlDays = 30) {
  purgeExpiredSessions(db);

  const maxSessionsPerUser = 5;
  const sameUserSessions = db.sessions
    .filter((session) => session.userId === userId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  while (sameUserSessions.length >= maxSessionsPerUser) {
    const oldest = sameUserSessions.shift();
    db.sessions = db.sessions.filter((session) => session.id !== oldest.id);
  }

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
    purgeExpiredSessions(db);
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
