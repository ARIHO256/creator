// Lightweight helpers to keep registration flows on the onboarding track (per user)
import type { UserRole } from "../../types/roles";
import type { Session } from "../../types/session";

const STATUS_DONE = ["APPROVED", "SUBMITTED"] as const;
const STATUS_MAP_KEY = "onboarding_status_map_v1";
export const ONBOARDING_KEYS: Record<UserRole, string> = {
  seller: "seller_onb_pro_v3",
  provider: "provider_onb_pro_v31",
};

type StatusMap = Record<string, string>;

const readMap = (): StatusMap => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STATUS_MAP_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
};

const writeMap = (map: StatusMap) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STATUS_MAP_KEY, JSON.stringify(map));
  } catch {
    /* noop */
  }
};

const getUserKey = (role: UserRole = "seller", userInput: Session | null = null) => {
  const user = userInput || {};
  const id = (user.userId || user.email || user.phone || "").toLowerCase() || "guest";
  const safeRole: UserRole = role === "provider" ? "provider" : "seller";
  return `${safeRole}:${id}`;
};

const readLegacyStatus = (role: UserRole = "seller", userInput: Session | null = null) => {
  const user = userInput || {};
  if (typeof window === "undefined") return null;
  const storageKey = role === "provider" ? ONBOARDING_KEYS.provider : ONBOARDING_KEYS.seller;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const status = parsed?.status;
    const owner = (parsed?.email || parsed?.contactEmail || parsed?.userId || "").toLowerCase();
    const userId = (user.userId || user.email || user.phone || "").toLowerCase();
    if (owner && userId && owner !== userId) return null; // different user, ignore legacy state
    return status || null;
  } catch {
    return null;
  }
};

export const onboardingPathForRole = (role: UserRole = "seller") =>
  role === "provider" ? "/provider/onboarding" : "/seller/onboarding";

export const readOnboardingStatus = (role: UserRole = "seller", userInput: Session | null = null) => {
  const user = userInput || {};
  const key = getUserKey(role, user);
  const map = readMap();
  const mappedStatus = map[key];
  if (mappedStatus) return mappedStatus;

  const legacy = readLegacyStatus(role, user);
  if (legacy) {
    map[key] = legacy;
    writeMap(map);
    return legacy;
  }

  if (user.userId || user.email || user.phone) {
    map[key] = "DRAFT";
    writeMap(map);
  }
  return "DRAFT";
};

export const recordOnboardingStatus = (
  role: UserRole = "seller",
  userInput: Session | null = null,
  status = "DRAFT"
) => {
  const user = userInput || {};
  const key = getUserKey(role, user);
  const map = readMap();
  map[key] = status || "DRAFT";
  writeMap(map);
};

export const clearOnboardingStatus = (role: UserRole = "seller", userInput: Session | null = null) => {
  const user = userInput || {};
  const key = getUserKey(role, user);
  const map = readMap();
  delete map[key];
  writeMap(map);
};

export const needsOnboarding = (role: UserRole = "seller", userInput: Session | null = null) => {
  const status = readOnboardingStatus(role, userInput || {});
  return !STATUS_DONE.includes(status || "");
};

export const nextOnboardingRoute = (role: UserRole = "seller", status = "DRAFT") => {
  const base = onboardingPathForRole(role);
  if (status === "APPROVED" || status === "SUBMITTED") return null;
  return base;
};
