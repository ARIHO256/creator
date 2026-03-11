import type { Session } from "../types/session";
import type { UserRole } from "../types/roles";

const API_BASE_URL =
  (import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL ??
  "";

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  role: string;
  roles: string[];
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

const toUrl = (path: string) => `${API_BASE_URL}${path}`;

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const headers = new Headers(init?.headers ?? {});
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(toUrl(path), { ...init, headers });
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

function mapSession(tokens: LoginResponse, profile: MeResponse): Session {
  const role = normalizeRole(profile.role || tokens.role);
  const roles = Array.isArray(profile.roles) && profile.roles.length
    ? profile.roles.map(normalizeRole)
    : [role];

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
    approvalStatus: profile.approvalStatus || undefined,
    onboardingCompleted: Boolean(profile.onboardingCompleted),
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
    const payload = parseIdentifier(identifier);
    const tokens = await request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ ...payload, password }),
    });
    const profile = await fetchProfile(tokens.accessToken);
    return mapSession(tokens, profile);
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
    const backendRole = role === "provider" ? "PROVIDER" : "SELLER";
    const tokens = await request<LoginResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name,
        email: email?.trim().toLowerCase(),
        phone,
        password: password || "demo1234",
        role: backendRole,
        roles: role === "provider" ? ["PROVIDER", "SELLER"] : ["SELLER"],
        sellerKind: backendRole,
        sellerDisplayName: name,
      }),
    });
    const profile = await fetchProfile(tokens.accessToken);
    return mapSession(tokens, profile);
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
