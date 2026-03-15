import type { Session } from "../types/session";
import type { UserRole } from "../types/roles";
import { resolveApiUrl } from "./apiRuntime";

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  role: string;
  roles: string[];
};

type RegistrationResponse =
  | LoginResponse
  | {
      registrationQueued: true;
      requestId: string;
      status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
      readyToLogin: boolean;
      failed: boolean;
      pollAfterMs: number;
      errorMessage?: string;
    };

type MeResponse = {
  id: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  roles?: string[] | null;
  approvalStatus?: string | null;
  onboardingCompleted?: boolean | null;
  sellerProfile?: {
    displayName?: string | null;
    name?: string | null;
  } | null;
  creatorProfile?: {
    name?: string | null;
  } | null;
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const headers = new Headers(init?.headers ?? {});
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const url = await resolveApiUrl(path);
  const response = await fetch(url, { ...init, headers });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.message || `Request failed with status ${response.status}`);
  }
  if (payload && typeof payload === "object" && "data" in payload && "success" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
};

const normalizeRole = (value?: string | null): UserRole =>
  String(value || "SELLER").toUpperCase() === "PROVIDER" ? "provider" : "seller";

const parseIdentifier = (identifier: string) =>
  identifier.includes("@")
    ? { email: identifier.trim().toLowerCase(), phone: undefined }
    : { email: undefined, phone: identifier.trim() };

async function fetchProfile(accessToken: string) {
  return request<MeResponse>("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

function isQueuedRegistration(payload: RegistrationResponse): payload is Extract<RegistrationResponse, { registrationQueued: true }> {
  return typeof payload === "object" && payload !== null && "registrationQueued" in payload;
}

async function signInWithPassword(identifier: string, password: string) {
  const tokens = await request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ ...parseIdentifier(identifier), password }),
  });
  const profile = await fetchProfile(tokens.accessToken);
  return mapSession(tokens, profile);
}

async function waitForQueuedRegistration(requestId: string, identifier: string, password: string) {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    const status = await request<Extract<RegistrationResponse, { registrationQueued: true }>>(
      `/api/auth/register/${requestId}/status`
    );
    if (status.failed) {
      throw new Error(status.errorMessage || "Registration failed");
    }
    if (status.readyToLogin) {
      return signInWithPassword(identifier, password);
    }
    const waitMs = Math.max(250, Math.min(Number(status.pollAfterMs || 1000), 3000));
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  throw new Error("Account creation is still processing. Please try signing in in a moment.");
}

function mapSession(tokens: LoginResponse, profile: MeResponse): Session {
  const role = normalizeRole(profile.role || tokens.role);
  const roles = Array.isArray(profile.roles) && profile.roles.length
    ? profile.roles.map(normalizeRole)
    : [role];

  const approvalStatusRaw = (profile.approvalStatus || "").toString();
  const approvalStatus =
    approvalStatusRaw.trim().length > 0 ? approvalStatusRaw : undefined;
  const normalizedApprovalStatus = approvalStatus ? approvalStatus.toUpperCase() : "";

  const onboardingCompleted =
    typeof profile.onboardingCompleted === "boolean"
      ? profile.onboardingCompleted
      : normalizedApprovalStatus === "APPROVED"
      ? true
      : undefined;

  return {
    userId: profile.id,
    email: profile.email || undefined,
    phone: profile.phone || undefined,
    name:
      profile.sellerProfile?.displayName ||
      profile.sellerProfile?.name ||
      profile.creatorProfile?.name ||
      profile.email ||
      profile.id,
    approvalStatus,
    onboardingCompleted,
    role,
    roles,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    token: tokens.accessToken,
  };
}

export const authClient = {
  async signIn({
    identifier,
    password,
  }: {
    identifier: string;
    password: string;
    role: UserRole;
  }) {
    return signInWithPassword(identifier, password);
  },

  async signUp({
    name,
    email,
    phone,
    password,
    role,
  }: {
    name: string;
    email: string;
    phone?: string;
    password?: string;
    role: UserRole;
  }) {
    if (!password?.trim()) {
      throw new Error("Password is required for registration");
    }
    const backendRole = role === "provider" ? "PROVIDER" : "SELLER";
    const identifier = email?.trim().toLowerCase() || phone?.trim() || "";
    const response = await request<RegistrationResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name,
        email: email?.trim().toLowerCase(),
        phone,
        password,
        role: backendRole,
        roles: [backendRole],
        sellerKind: backendRole,
        sellerDisplayName: name,
      }),
    });
    if (isQueuedRegistration(response)) {
      return waitForQueuedRegistration(response.requestId, identifier, password);
    }
    const profile = await fetchProfile(response.accessToken);
    return mapSession(response, profile);
  },

  async signOut(refreshToken?: string, accessToken?: string) {
    if (!refreshToken || !accessToken) return;
    await request("/api/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  },

  async resetPassword(identifier: string) {
    const payload = parseIdentifier(identifier);
    return request<{ ok: true }>("/api/auth/recovery", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
