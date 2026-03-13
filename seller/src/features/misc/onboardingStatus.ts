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

  return null;
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

  // Explicit opt-out: once marked completed, never force onboarding again.
  if (typeof user.onboardingCompleted === "boolean") {
    return !user.onboardingCompleted;
  }

  // IMPORTANT: Only users who have just registered via this app
  // should be forced through onboarding. SignUp sets `onboardingRequired`
  // on the session; normal sign-ins should not be redirected.
  if (typeof user.onboardingRequired === "boolean") {
    return user.onboardingRequired;
  }

  // Do not infer onboarding from approvalStatus or local status map anymore;
  // existing accounts signed in via /auth should land on the dashboard.
  return false;
};

export const nextOnboardingRoute = (role: UserRole = "seller", status: string | null = null) => {
  if (!status) return null;
  if (STATUS_DONE.includes(status)) return null;
  return onboardingPathForRole(role);
};
