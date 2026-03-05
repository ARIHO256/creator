import type { AuthSession, AuthUser, FrontendUserStatus } from "./types";

export const AUTH_TOKEN_STORAGE_KEY = "mldz:auth:token";
export const AUTH_USER_STORAGE_KEY = "mldz:auth:user";
export const LEGACY_ENTERED_STORAGE_KEY = "creatorPlatformEntered";
export const LEGACY_APPROVAL_STORAGE_KEY = "mldz_creator_approval_status";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function safeRead(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage write failures.
  }
}

function safeRemove(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage delete failures.
  }
}

function isAuthUser(candidate: unknown): candidate is AuthUser {
  if (!candidate || typeof candidate !== "object") return false;
  const record = candidate as Record<string, unknown>;
  return typeof record.id === "string" && typeof record.email === "string";
}

export function readAuthToken(): string | null {
  return safeRead(AUTH_TOKEN_STORAGE_KEY);
}

export function readStoredAuthUser(): AuthUser | null {
  const raw = safeRead(AUTH_USER_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    return isAuthUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function hasLegacyAuthBridgeSignal(): boolean {
  return safeRead(LEGACY_ENTERED_STORAGE_KEY) === "true";
}

export function readLegacyApprovalStatus(): string | null {
  return safeRead(LEGACY_APPROVAL_STORAGE_KEY);
}

export function deriveFrontendUserStatus(user: Pick<AuthUser, "approvalStatus" | "onboardingCompleted"> | null): FrontendUserStatus {
  if (!user) return "GUEST";

  if (user.approvalStatus === "APPROVED") {
    return "APPROVED";
  }

  if (user.approvalStatus === "NEEDS_ONBOARDING" || !user.onboardingCompleted) {
    return "NEEDS_ONBOARDING";
  }

  return "AWAITING_APPROVAL";
}

export function readStoredUserStatus(): FrontendUserStatus {
  const storedUser = readStoredAuthUser();
  if (storedUser) {
    return deriveFrontendUserStatus(storedUser);
  }

  if (!hasLegacyAuthBridgeSignal()) {
    return "GUEST";
  }

  const approvalStatus = readLegacyApprovalStatus();

  if (!approvalStatus) {
    return "NEEDS_ONBOARDING";
  }

  if (approvalStatus !== "Approved") {
    return "AWAITING_APPROVAL";
  }

  return "APPROVED";
}

export function syncLegacyAuthFromUser(user: Pick<AuthUser, "approvalStatus">): void {
  safeWrite(LEGACY_ENTERED_STORAGE_KEY, "true");

  if (user.approvalStatus === "APPROVED") {
    safeWrite(LEGACY_APPROVAL_STORAGE_KEY, "Approved");
    return;
  }

  if (user.approvalStatus === "NEEDS_ONBOARDING") {
    safeRemove(LEGACY_APPROVAL_STORAGE_KEY);
    return;
  }

  safeWrite(LEGACY_APPROVAL_STORAGE_KEY, user.approvalStatus);
}

export function persistAuthSession(session: AuthSession): void {
  safeWrite(AUTH_TOKEN_STORAGE_KEY, session.token);
  safeWrite(AUTH_USER_STORAGE_KEY, JSON.stringify(session.user));
  syncLegacyAuthFromUser(session.user);
}

export function persistAuthUser(user: AuthUser): void {
  safeWrite(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
  syncLegacyAuthFromUser(user);
}

export function clearStoredApiSession(): void {
  safeRemove(AUTH_TOKEN_STORAGE_KEY);
  safeRemove(AUTH_USER_STORAGE_KEY);
}

export function clearStoredAuthSession(): void {
  safeRemove(AUTH_TOKEN_STORAGE_KEY);
  safeRemove(AUTH_USER_STORAGE_KEY);
  safeRemove(LEGACY_ENTERED_STORAGE_KEY);
  safeRemove(LEGACY_APPROVAL_STORAGE_KEY);
}
