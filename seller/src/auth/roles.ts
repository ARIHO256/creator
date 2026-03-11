import type { Session } from "../types/session";
import type { UserRole } from "../types/roles";
import { isUserRole } from "../types/roles";

const normalizeRole = (value: unknown): UserRole | null => {
  if (!value) return null;
  const raw = String(value).toLowerCase().trim();
  if (raw === "provider" || raw === "service_provider" || raw === "service-provider" || raw === "serviceprovider") {
    return "provider";
  }
  if (raw === "seller" || raw === "merchant" || raw === "vendor") {
    return "seller";
  }
  return null;
};

export const getCurrentRole = (session: Session | null | undefined): UserRole => {
  if (!session) return "seller";
  const direct = normalizeRole(session.role);
  if (direct) return direct;
  if (session.role && isUserRole(session.role)) return session.role;
  if (Array.isArray(session.roles)) {
    if (session.roles.some((r) => normalizeRole(r) === "provider")) return "provider";
    if (session.roles.some((r) => normalizeRole(r) === "seller")) return "seller";
  }
  const candidates = [
    (session as Session & { userType?: unknown }).userType,
    (session as Session & { accountType?: unknown }).accountType,
    (session as Session & { type?: unknown }).type,
    (session as Session & { kind?: unknown }).kind,
    (session as Session & { profile?: { role?: unknown } }).profile?.role,
    (session as Session & { user?: { role?: unknown } }).user?.role,
    (session as Session & { user?: { type?: unknown } }).user?.type,
  ];
  for (const value of candidates) {
    const role = normalizeRole(value);
    if (role) return role;
  }
  return "seller";
};

export const isProvider = (session: Session | null | undefined) =>
  getCurrentRole(session) === "provider";

export const isSeller = (session: Session | null | undefined) =>
  getCurrentRole(session) === "seller";
