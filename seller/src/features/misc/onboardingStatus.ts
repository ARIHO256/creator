// Lightweight helpers to keep registration flows on the onboarding track (per user)
import type { UserRole } from "../../types/roles";
import type { Session } from "../../types/session";
import { hasSessionToken, readSession } from "../../auth/session";
import { sellerBackendApi } from "../../lib/backendApi";

const STATUS_DONE = ["APPROVED", "SUBMITTED"] as const;
export const ONBOARDING_KEYS: Record<UserRole, string> = {
  seller: "seller_onb_pro_v3",
  provider: "provider_onb_pro_v31",
};

type StatusMap = Record<string, string>;

let statusMapCache: StatusMap = {};
let statusMapBootstrapped = false;

const readMap = (): StatusMap => {
  if (!statusMapBootstrapped && typeof window !== "undefined" && hasSessionToken(readSession())) {
    statusMapBootstrapped = true;
    void sellerBackendApi
      .getUiState()
      .then((payload) => {
        const next = (payload.onboarding as { statusMap?: StatusMap } | undefined)?.statusMap;
        if (next && typeof next === "object") {
          statusMapCache = next;
        }
      })
      .catch(() => undefined);
  }
  return statusMapCache;
};

const writeMap = (map: StatusMap) => {
  statusMapCache = map;
  if (!hasSessionToken(readSession())) {
    return;
  }
  void sellerBackendApi.patchUiState({ onboarding: { statusMap: map } }).catch(() => undefined);
};

const getUserKey = (role: UserRole = "seller", userInput: Session | null = null) => {
  const user = userInput || {};
  const id = (user.userId || user.email || user.phone || "").toLowerCase() || "guest";
  const safeRole: UserRole = role === "provider" ? "provider" : "seller";
  return `${safeRole}:${id}`;
};

const readLegacyStatus = (role: UserRole = "seller", userInput: Session | null = null) => {
  const user = userInput || {};
  const key = getUserKey(role, user);
  return statusMapCache[key] || null;
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

  // If we have no server/recorded status, don't assume onboarding is required.
  // Sign-up flow explicitly marks onboarding via `onboardingRequired` + recordOnboardingStatus.
  return "";
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
  const user = userInput || {};
  if (typeof user.onboardingRequired === "boolean") {
    return user.onboardingRequired;
  }
  if (typeof user.onboardingCompleted === "boolean") {
    return !user.onboardingCompleted;
  }
  const approvalStatus = String(user.approvalStatus || "").toUpperCase();
  if (approvalStatus === "APPROVED") {
    return false;
  }
  if (approvalStatus) {
    return true;
  }
  const status = readOnboardingStatus(role, userInput || {});
  if (!status) return false;
  return !STATUS_DONE.includes(status || "");
};

export const nextOnboardingRoute = (role: UserRole = "seller", status = "DRAFT") => {
  const base = onboardingPathForRole(role);
  if (status === "APPROVED" || status === "SUBMITTED") return null;
  return base;
};
