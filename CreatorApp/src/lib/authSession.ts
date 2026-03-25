export type AuthApprovalStatus =
  | "NEEDS_ONBOARDING"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "REJECTED";

export type AuthUserSession = {
  id: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  activeRole?: string;
  roles: string[];
  approvalStatus: AuthApprovalStatus;
  onboardingCompleted: boolean;
  creatorProfile?: Record<string, unknown> | null;
  sellerProfile?: Record<string, unknown> | null;
};

const AUTH_SESSION_KEY = "mldz:auth:user";
const AUTH_DASHBOARD_OVERRIDE_KEY = "mldz:auth:dashboard-override";
export const AUTH_INVALIDATED_EVENT = "mldz:auth:invalidated";

export function readAuthSession(): AuthUserSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUserSession;
  } catch {
    return null;
  }
}

export function hasStoredAuthState() {
  if (typeof window === "undefined") return false;

  if (readAuthSession()) return true;

  try {
    return window.localStorage.getItem("creatorPlatformEntered") === "true";
  } catch {
    return false;
  }
}

export function hasPersistedAuthSession() {
  return readAuthSession() !== null;
}

export function persistAuthSession(session: AuthUserSession) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    window.localStorage.setItem("creatorPlatformEntered", "true");
    window.localStorage.setItem("mldz_creator_approval_status", session.approvalStatus);
    window.localStorage.setItem("userRole", String(session.activeRole || session.role || "creator").toLowerCase());
  } catch {
    // ignore
  }
}

export function enableDashboardAuthOverride() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(AUTH_DASHBOARD_OVERRIDE_KEY, "true");
  } catch {
    // ignore
  }
}

export function hasDashboardAuthOverride() {
  if (typeof window === "undefined") return false;

  try {
    return window.sessionStorage.getItem(AUTH_DASHBOARD_OVERRIDE_KEY) === "true";
  } catch {
    return false;
  }
}

export function clearDashboardAuthOverride() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(AUTH_DASHBOARD_OVERRIDE_KEY);
  } catch {
    // ignore
  }
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    window.localStorage.removeItem("creatorPlatformEntered");
    window.localStorage.removeItem("mldz_creator_approval_status");
    window.localStorage.removeItem("userRole");
    window.sessionStorage.removeItem(AUTH_DASHBOARD_OVERRIDE_KEY);
  } catch {
    // ignore
  }
}

export function invalidateAuthSession() {
  clearAuthSession();

  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent(AUTH_INVALIDATED_EVENT));
}

export function deriveUserStatusFromSession(
  session: AuthUserSession | null
): "GUEST" | "AWAITING_APPROVAL" | "NEEDS_ONBOARDING" | "APPROVED" {
  if (!session) return "GUEST";

  if (hasDashboardAuthOverride()) {
    return "APPROVED";
  }

  if (!session.onboardingCompleted || session.approvalStatus === "NEEDS_ONBOARDING") {
    return "NEEDS_ONBOARDING";
  }

  return "APPROVED";
}

export function getPostAuthPath(session: AuthUserSession | null) {
  const status = deriveUserStatusFromSession(session);
  if (status === "NEEDS_ONBOARDING") return "/onboarding";
  if (status === "AWAITING_APPROVAL") return "/account-approval";
  if (status === "APPROVED") return "/home";
  return "/auth-redirect";
}
