import { clearSession, hasSessionToken, readSession, writeSession } from "../auth/session";
import { resolveApiUrl } from "./apiRuntime";
import type { Session } from "../types/session";
import type { UserRole } from "../types/roles";

type BackendRequestError = Error & {
  status?: number;
  payload?: unknown;
};

let authRedirectScheduled = false;
let refreshPromise: Promise<string | null> | null = null;
let roleSwitchPromise: Promise<string | null> | null = null;
const UI_STATE_PATCH_DEBOUNCE_MS = 400;
let pendingUiStatePatch: Record<string, unknown> | null = null;
let uiStatePatchTimer: ReturnType<typeof setTimeout> | null = null;
let uiStatePatchInFlight = false;
let uiStatePatchResolvers: Array<(value: Record<string, unknown>) => void> = [];
let uiStatePatchRejecters: Array<(reason?: unknown) => void> = [];

const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/recovery",
  "/api/auth/refresh",
  "/api/auth/logout"
];

function isPublicApiPath(path: string) {
  return PUBLIC_API_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeUiStatePatch(
  base: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...base };
  Object.entries(patch).forEach(([key, value]) => {
    if (isPlainObject(next[key]) && isPlainObject(value)) {
      next[key] = mergeUiStatePatch(next[key] as Record<string, unknown>, value);
      return;
    }
    next[key] = value;
  });
  return next;
}

function normalizeRole(value: unknown): UserRole {
  return String(value || "").toUpperCase() === "PROVIDER" ? "provider" : "seller";
}

function normalizeRoles(values: unknown, fallbackRole: UserRole): UserRole[] {
  if (!Array.isArray(values) || values.length === 0) return [fallbackRole];
  const mapped = values
    .map((entry) => normalizeRole(entry))
    .filter((entry, index, arr) => arr.indexOf(entry) === index);
  return mapped.length ? mapped : [fallbackRole];
}

function normalizeBackendRole(value: unknown) {
  const raw = String(value || "").toUpperCase().trim();
  return raw === "SELLER" || raw === "PROVIDER" ? raw : null;
}

function preferredBackendRole(role: UserRole | undefined | null) {
  return role === "provider" ? "PROVIDER" : "SELLER";
}

function canRecoverRoleForPath(path: string, session: Session | null) {
  if (!session || !Array.isArray(session.roles) || session.roles.length === 0) {
    return false;
  }
  if (path.startsWith("/api/provider")) {
    return session.roles.includes("provider");
  }
  if (path.startsWith("/api/seller") || path.startsWith("/api/sellers")) {
    return session.roles.includes("seller");
  }
  return false;
}

function handleUnauthorizedResponse() {
  clearSession();
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/auth") || authRedirectScheduled) return;
  authRedirectScheduled = true;
  const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(`/auth?next=${encodeURIComponent(next)}`);
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const normalized = String(token || "").trim();
  if (!normalized) return null;

  const segments = normalized.split(".");
  if (segments.length < 2) return null;

  try {
    const base64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const decodeBase64 =
      typeof globalThis !== "undefined" && typeof globalThis.atob === "function"
        ? globalThis.atob.bind(globalThis)
        : null;
    if (!decodeBase64) return null;
    const decoded = decodeBase64(padded);
    const payload = JSON.parse(decoded);
    return payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function isAccessTokenExpired(token: string) {
  const payload = decodeJwtPayload(token);
  const exp = Number(payload?.exp);
  if (!Number.isFinite(exp) || exp <= 0) return false;
  const now = Math.floor(Date.now() / 1000);
  return exp <= now + 30;
}

async function parsePayload(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const session = readSession();
    const refreshToken =
      session && typeof session.refreshToken === "string" ? session.refreshToken.trim() : "";

    const url = await resolveApiUrl("/api/auth/refresh");
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    });
    const payload = await parsePayload(response);
    if (!response.ok) {
      return null;
    }

    const data =
      payload && typeof payload === "object" && "data" in payload && "success" in payload
        ? (payload as { data: Record<string, unknown> }).data
        : (payload as Record<string, unknown> | null);
    const nextAccessToken =
      typeof data?.accessToken === "string" && data.accessToken.trim()
        ? data.accessToken
        : "";
    if (!nextAccessToken) {
      return null;
    }

    const current = readSession();
    const nextRole = normalizeRole(data?.role ?? current?.role);
    const nextSession: Session = {
      ...(current || {}),
      accessToken: nextAccessToken,
      token: nextAccessToken,
      refreshToken:
        typeof data?.refreshToken === "string" && data.refreshToken.trim()
          ? data.refreshToken
          : current?.refreshToken,
      role: nextRole,
      roles: normalizeRoles(data?.roles ?? current?.roles, nextRole),
    };
    writeSession(nextSession);
    authRedirectScheduled = false;
    return nextAccessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function fetchAuthMe(token: string): Promise<{ ok: boolean; status: number; data: Record<string, unknown> | null }> {
  const url = await resolveApiUrl("/api/auth/me");
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const payload = await parsePayload(response);
  if (!response.ok) {
    return { ok: false, status: response.status, data: null };
  }
  const data =
    payload && typeof payload === "object" && "data" in payload && "success" in payload
      ? ((payload as { data: Record<string, unknown> }).data ?? null)
      : ((payload as Record<string, unknown> | null) ?? null);
  return { ok: true, status: response.status, data };
}

async function switchWorkspaceRole(targetRole: UserRole): Promise<string | null> {
  if (roleSwitchPromise) {
    return roleSwitchPromise;
  }

  roleSwitchPromise = (async () => {
    const current = readSession();
    let token = current?.accessToken || current?.token || "";
    if (!token) {
      return null;
    }

    if (isAccessTokenExpired(token)) {
      const refreshedToken = await refreshAccessToken();
      if (refreshedToken) {
        token = refreshedToken;
      }
    }

    let authMeResponse = await fetchAuthMe(token);
    if (!authMeResponse.ok && authMeResponse.status === 401) {
      const refreshedToken = await refreshAccessToken();
      if (refreshedToken) {
        token = refreshedToken;
        authMeResponse = await fetchAuthMe(token);
      }
    }

    const authMe = authMeResponse.data;
    const availableRoles = normalizeRoles(authMe?.roles ?? current?.roles, targetRole);
    if (!availableRoles.includes(targetRole)) {
      return null;
    }

    if (normalizeBackendRole(authMe?.role) === preferredBackendRole(targetRole)) {
      writeSession({
        ...(current || {}),
        role: targetRole,
        roles: availableRoles,
      });
      return token;
    }

    const url = await resolveApiUrl("/api/auth/switch-role");
    const makeSwitchRequest = async (bearer: string) => {
      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${bearer}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: preferredBackendRole(targetRole) }),
      });
      const payload = await parsePayload(response);
      return { response, payload };
    };

    let { response, payload } = await makeSwitchRequest(token);
    if (!response.ok && response.status === 401) {
      const refreshedToken = await refreshAccessToken();
      if (refreshedToken) {
        token = refreshedToken;
        ({ response, payload } = await makeSwitchRequest(token));
      }
    }
    if (!response.ok) {
      return null;
    }

    const data =
      payload && typeof payload === "object" && "data" in payload && "success" in payload
        ? (payload as { data: Record<string, unknown> }).data
        : (payload as Record<string, unknown> | null);
    const nextAccessToken =
      typeof data?.accessToken === "string" && data.accessToken.trim()
        ? data.accessToken
        : "";
    if (!nextAccessToken) {
      return null;
    }

    writeSession({
      ...(current || {}),
      accessToken: nextAccessToken,
      token: nextAccessToken,
      refreshToken:
        typeof data?.refreshToken === "string" && data.refreshToken.trim()
          ? data.refreshToken
          : current?.refreshToken,
      role: targetRole,
      roles: normalizeRoles(data?.roles ?? availableRoles, targetRole),
    });
    authRedirectScheduled = false;
    return nextAccessToken;
  })().finally(() => {
    roleSwitchPromise = null;
  });

  return roleSwitchPromise;
}

async function request<T>(path: string, init?: RequestInit, allowRetry = true): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  const session = readSession();
  let token = session?.accessToken || session?.token || "";

  if (!hasSessionToken(session) && !isPublicApiPath(path)) {
    handleUnauthorizedResponse();
    const error = new Error("Missing authentication session") as BackendRequestError;
    error.status = 401;
    throw error;
  }

  if (token && !isPublicApiPath(path) && isAccessTokenExpired(token)) {
    const refreshedToken = await refreshAccessToken();
    if (!refreshedToken) {
      handleUnauthorizedResponse();
      const error = new Error("Authentication session expired") as BackendRequestError;
      error.status = 401;
      throw error;
    }
    token = refreshedToken;
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const url = await resolveApiUrl(path);
  const response = await fetch(url, { ...init, headers, credentials: "include" });
  const payload = await parsePayload(response);

  if (!response.ok) {
    if (response.status === 401 && allowRetry && !isPublicApiPath(path)) {
      const refreshedToken = await refreshAccessToken();
      if (refreshedToken) {
        const retryHeaders = new Headers(init?.headers ?? {});
        retryHeaders.set("Authorization", `Bearer ${refreshedToken}`);
        if (init?.body && !(init.body instanceof FormData) && !retryHeaders.has("Content-Type")) {
          retryHeaders.set("Content-Type", "application/json");
        }
        return request<T>(path, { ...init, headers: retryHeaders }, false);
      }
    }
    if (response.status === 403 && allowRetry && canRecoverRoleForPath(path, session)) {
      const targetRole: UserRole = path.startsWith("/api/provider") ? "provider" : "seller";
      const switchedToken = await switchWorkspaceRole(targetRole);
      if (switchedToken) {
        const retryHeaders = new Headers(init?.headers ?? {});
        retryHeaders.set("Authorization", `Bearer ${switchedToken}`);
        if (init?.body && !(init.body instanceof FormData) && !retryHeaders.has("Content-Type")) {
          retryHeaders.set("Content-Type", "application/json");
        }
        return request<T>(path, { ...init, headers: retryHeaders }, false);
      }
    }
    if (response.status === 401) {
      handleUnauthorizedResponse();
    }
    const error = new Error(
      payload?.error?.message || payload?.message || `Request failed with status ${response.status}`
    ) as BackendRequestError;
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  if (payload && typeof payload === "object" && "data" in payload && "success" in payload) {
    authRedirectScheduled = false;
    return (payload as { data: T }).data;
  }

  authRedirectScheduled = false;
  return payload as T;
}

function scheduleUiStatePatchFlush() {
  if (uiStatePatchTimer) {
    clearTimeout(uiStatePatchTimer);
  }
  uiStatePatchTimer = setTimeout(() => {
    uiStatePatchTimer = null;
    void flushUiStatePatch();
  }, UI_STATE_PATCH_DEBOUNCE_MS);
}

async function flushUiStatePatch(): Promise<Record<string, unknown>> {
  if (uiStatePatchInFlight) {
    return {};
  }

  const body = pendingUiStatePatch;
  if (!body) {
    return {};
  }

  pendingUiStatePatch = null;
  uiStatePatchInFlight = true;
  const resolvers = uiStatePatchResolvers;
  const rejecters = uiStatePatchRejecters;
  uiStatePatchResolvers = [];
  uiStatePatchRejecters = [];

  try {
    const payload = await request<Record<string, unknown>>("/api/settings/ui-state", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    resolvers.forEach((resolve) => resolve(payload));
    return payload;
  } catch (error) {
    rejecters.forEach((reject) => reject(error));
    throw error;
  } finally {
    uiStatePatchInFlight = false;
    if (pendingUiStatePatch) {
      scheduleUiStatePatchFlush();
    }
  }
}

function queueUiStatePatch(body: Record<string, unknown>) {
  pendingUiStatePatch = mergeUiStatePatch(pendingUiStatePatch || {}, body);
  scheduleUiStatePatchFlush();
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    uiStatePatchResolvers.push(resolve);
    uiStatePatchRejecters.push(reject);
  });
}

const LIVE_TOOL_ROUTE_MAP: Record<string, string> = {
  "audience-notifications": "/api/tools/audience-notifications",
  "live-alerts": "/api/tools/live-alerts",
  overlays: "/api/tools/overlays",
  "post-live": "/api/tools/post-live",
  streaming: "/api/tools/streaming",
  safety: "/api/tools/safety",
};

function resolveLiveToolPath(key: string) {
  const normalized = String(key || "").trim();
  return LIVE_TOOL_ROUTE_MAP[normalized] ?? `/api/tools/${encodeURIComponent(normalized)}`;
}

export const sellerBackendApi = {
  ensureWorkspaceRole: async (preferredRole?: UserRole) => {
    const session = readSession();
    if (!hasSessionToken(session)) {
      return null;
    }
    return switchWorkspaceRole(preferredRole ?? session?.role ?? "seller");
  },
  getAuthMe: () => request<Record<string, unknown>>("/api/auth/me"),
  switchAuthRole: (body: { role: string }) =>
    request<Record<string, unknown>>("/api/auth/switch-role", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getSellerDashboard: () => request<Record<string, unknown>>("/api/seller/dashboard"),
  getSellerDashboardSummary: (query?: {
    range?: string;
    from?: string;
    to?: string;
    channels?: string[];
    marketplaces?: string[];
    warehouses?: string[];
  }) => {
    const params = new URLSearchParams();
    if (query?.range) params.set("range", query.range);
    if (query?.from) params.set("from", query.from);
    if (query?.to) params.set("to", query.to);
    if (query?.channels?.length) params.set("channels", query.channels.join(","));
    if (query?.marketplaces?.length) params.set("marketplaces", query.marketplaces.join(","));
    if (query?.warehouses?.length) params.set("warehouses", query.warehouses.join(","));
    const search = params.toString();
    return request<Record<string, unknown>>(`/api/seller/dashboard/summary${search ? `?${search}` : ""}`);
  },
  getDashboardFeed: () => request<Record<string, unknown>>("/api/dashboard/feed"),
  getLiveFeedWorkspace: () => request<Record<string, unknown>>("/api/dashboard/live-feed"),
  getSellerPublicProfile: () => request<Record<string, unknown>>("/api/dashboard/seller-public-profile"),
  getDashboardSummary: () => request<Record<string, unknown>>("/api/dashboard/summary"),
  getSellerOrders: (query?: { limit?: number; offset?: number; channel?: string }) => {
    const params = new URLSearchParams();
    if (typeof query?.limit === "number") params.set("limit", String(query.limit));
    if (typeof query?.offset === "number") params.set("offset", String(query.offset));
    if (query?.channel) params.set("channel", query.channel);
    const search = params.toString();
    return request<{ orders?: Array<Record<string, unknown>>; returns?: Array<Record<string, unknown>>; disputes?: Array<Record<string, unknown>> }>(
      `/api/seller/orders${search ? `?${search}` : ""}`
    );
  },
  getSellerListingWizard: () => request<Record<string, unknown>>("/api/seller/listing-wizard"),
  getSellerOrderDetail: (id: string) =>
    request<Record<string, unknown>>(`/api/seller/orders/${encodeURIComponent(id)}`),
  patchSellerOrder: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/seller/orders/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getSellerPrintInvoice: (id: string) =>
    request<Record<string, unknown>>(`/api/seller/orders/${encodeURIComponent(id)}/print/invoice`),
  getSellerPrintPackingSlip: (id: string) =>
    request<Record<string, unknown>>(`/api/seller/orders/${encodeURIComponent(id)}/print/packing-slip`),
  getSellerPrintSticker: (id: string) =>
    request<Record<string, unknown>>(`/api/seller/orders/${encodeURIComponent(id)}/print/sticker`),
  getSellerReturns: () => request<Array<Record<string, unknown>>>("/api/seller/returns"),
  createSellerReturn: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/seller/returns", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchSellerReturn: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/seller/returns/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getSellerDisputes: () => request<Array<Record<string, unknown>>>("/api/seller/disputes"),
  createSellerDispute: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/seller/disputes", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchSellerDispute: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/seller/disputes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getSellerDisputeExportPack: (id: string) =>
    request<Record<string, unknown>>(`/api/seller/disputes/${encodeURIComponent(id)}/export-pack`),
  getExpressOrders: () =>
    request<{ orders?: Array<Record<string, unknown>>; returns?: Array<Record<string, unknown>>; disputes?: Array<Record<string, unknown>> }>(
      "/api/expressmart/orders"
    ),
  getExpressOrderDetail: (id: string) =>
    request<Record<string, unknown>>(`/api/expressmart/orders/${encodeURIComponent(id)}`),
  getExpressRiders: () => request<{ riders?: Array<Record<string, unknown>> }>("/api/expressmart/riders"),
  patchExpressOrder: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/expressmart/orders/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getMessages: () => request<Record<string, unknown>>("/api/messages"),
  getMessageThread: (threadId: string) =>
    request<Record<string, unknown>>(`/api/messages/${encodeURIComponent(threadId)}`),
  replyMessageThread: (threadId: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/messages/${encodeURIComponent(threadId)}/reply`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  markMessageThreadRead: (threadId: string) =>
    request<Record<string, unknown>>(`/api/messages/${encodeURIComponent(threadId)}/read`, {
      method: "PATCH",
    }),
  patchMessageTemplates: (body: { templates: unknown[] }) =>
    request<Record<string, unknown>>("/api/messages/templates", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  markAllMessagesRead: () =>
    request<Record<string, unknown>>("/api/messages/read-all", {
      method: "POST",
    }),
  getNotifications: () => request<Array<Record<string, unknown>>>("/api/notifications"),
  getInvites: (query?: { limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    if (typeof query?.limit === "number") params.set("limit", String(query.limit));
    if (typeof query?.offset === "number") params.set("offset", String(query.offset));
    const search = params.toString();
    return request<Array<Record<string, unknown>>>(`/api/invites${search ? `?${search}` : ""}`);
  },
  createCreatorInvite: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/invites", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  respondInvite: (id: string, status: "ACCEPTED" | "DECLINED" | "PENDING" | "CANCELLED" | "EXPIRED") =>
    request<Record<string, unknown>>(`/api/invites/${encodeURIComponent(id)}/respond`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),
  markNotificationRead: (id: string) =>
    request<Record<string, unknown>>(`/api/notifications/${encodeURIComponent(id)}/read`, {
      method: "PATCH",
    }),
  markNotificationUnread: (id: string) =>
    request<Record<string, unknown>>(`/api/notifications/${encodeURIComponent(id)}/unread`, {
      method: "PATCH",
    }),
  markAllNotificationsRead: () =>
    request<Record<string, unknown>>("/api/notifications/read-all", {
      method: "POST",
    }),
  getPreferences: () => request<Record<string, unknown>>("/api/settings/preferences"),
  patchPreferences: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/settings/preferences", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getUiState: () => request<Record<string, unknown>>("/api/settings/ui-state"),
  patchUiState: (body: Record<string, unknown>) => queueUiStatePatch(body),
  getSettings: () => request<Record<string, unknown>>("/api/settings"),
  patchSettings: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/settings", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getMyStorefront: () => request<Record<string, unknown>>("/api/storefront/me"),
  patchMyStorefront: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/storefront/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getTaxonomyCoverage: () => request<Array<Record<string, unknown>>>("/api/taxonomy/coverage"),
  addTaxonomyCoverage: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/taxonomy/coverage", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchTaxonomyCoverage: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/taxonomy/coverage/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  removeTaxonomyCoverage: (id: string) =>
    request<Record<string, unknown>>(`/api/taxonomy/coverage/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  getPayoutMethods: () => request<{ methods?: unknown[] }>("/api/settings/payout-methods"),
  patchPayoutMethods: (body: { methods: unknown[] }) =>
    request<Record<string, unknown>>("/api/settings/payout-methods", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getIntegrations: () => request<Record<string, unknown>>("/api/settings/integrations"),
  patchIntegrations: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/settings/integrations", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getSecuritySettings: () => request<Record<string, unknown>>("/api/settings/security"),
  patchSecuritySettings: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/settings/security", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getTaxSettings: () => request<Record<string, unknown>>("/api/settings/tax"),
  patchTaxSettings: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/settings/tax", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getKycSettings: () => request<Record<string, unknown>>("/api/settings/kyc"),
  patchKycSettings: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/settings/kyc", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  signOutDevice: (id: string) =>
    request<Record<string, unknown>>(`/api/settings/devices/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  signOutAllDevices: () =>
    request<Record<string, unknown>>("/api/settings/devices/sign-out-all", {
      method: "POST",
    }),
  getSavedViews: () => request<Record<string, unknown>>("/api/settings/saved-views"),
  patchSavedViews: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/settings/saved-views", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getHelpSettings: () => request<Record<string, unknown>>("/api/settings/help"),
  getStatusCenter: () => request<Record<string, unknown>>("/api/settings/status-center"),
  getNotificationPreferences: () => request<Record<string, unknown>>("/api/settings/notification-preferences"),
  patchNotificationPreferences: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/settings/notification-preferences", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  sendTestNotificationPreferences: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/settings/notification-preferences/test", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getAnalyticsPage: () => request<Record<string, unknown>>("/api/analytics/page"),
  getAnalyticsRankDetail: (query?: { range?: string; category?: string }) => {
    const params = new URLSearchParams();
    if (query?.range) params.set("range", query.range);
    if (query?.category) params.set("category", query.category);
    const search = params.toString();
    return request<Record<string, unknown>>(`/api/analytics/rank-detail${search ? `?${search}` : ""}`);
  },
  patchAnalyticsPage: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/analytics/page", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  sendPayoutCode: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/settings/payout/send-code", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  verifyPayout: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/settings/payout/verify", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getOnboarding: () => request<Record<string, unknown>>("/api/onboarding"),
  getOnboardingLookups: () => request<Record<string, unknown>>("/api/onboarding/lookups"),
  patchOnboarding: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/onboarding", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  submitOnboarding: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/onboarding/submit", {
      method: "POST",
      body: JSON.stringify(body),
    }).catch((error: BackendRequestError) => {
      if (error?.status === 404 || error?.status === 500) {
        return request<Record<string, unknown>>("/api/onboarding", {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      }
      throw error;
    }),
  resetOnboarding: () =>
    request<Record<string, unknown>>("/api/onboarding/reset", {
      method: "POST",
    }),
  getSlugAvailability: (slug: string) =>
    request<{ slug?: string; available?: boolean; reason?: string }>(
      `/api/onboarding/slug-availability/${encodeURIComponent(slug)}`
    ),
  getAccountApproval: () => request<Record<string, unknown>>("/api/account-approval"),
  patchAccountApproval: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/account-approval", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getWorkflowScreenState: (key: string) =>
    request<Record<string, unknown>>(`/api/workflow/screen-state/${encodeURIComponent(key)}`),
  patchWorkflowScreenState: (key: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/workflow/screen-state/${encodeURIComponent(key)}`, {
      method: "PATCH",
      body: JSON.stringify(
        body.__resetToDefault === true && Object.keys(body).length === 1 ? body : { payload: body }
      ),
    }),
  getContentApprovals: () => request<Array<Record<string, unknown>>>("/api/content-approvals"),
  createContentApproval: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/content-approvals", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchContentApproval: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/content-approvals/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  resubmitContentApproval: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/content-approvals/${encodeURIComponent(id)}/resubmit`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getCatalogTemplates: () => request<{ templates?: unknown[] }>("/api/catalog/templates"),
  createCatalogTemplate: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/catalog/templates", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchCatalogTemplate: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/catalog/templates/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteCatalogTemplate: (id: string) =>
    request<{ deleted?: boolean }>(`/api/catalog/templates/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  getMediaAssets: () => request<Array<Record<string, unknown>>>("/api/media/assets"),
  uploadMediaFile: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/media/files", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  createMediaAsset: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/media/assets", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchMediaAsset: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/media/assets/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteMediaAsset: (id: string) =>
    request<{ deleted?: boolean }>(`/api/media/assets/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  getSellerWorkspaceListings: () => request<Array<Record<string, unknown>>>("/api/sellers/me/listings"),
  createSellerWorkspaceListing: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/sellers/me/listings", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchSellerWorkspaceListing: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/sellers/me/listings/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getSellerCart: () => request<Record<string, unknown>>("/api/seller/cart"),
  addSellerCartItem: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/seller/cart/items", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getShippingProfiles: () => request<Record<string, unknown>>("/api/seller/shipping-profiles"),
  createShippingProfile: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/seller/shipping-profiles", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchShippingProfile: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/seller/shipping-profiles/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getOpsOverview: () => request<Record<string, unknown>>("/api/ops/overview"),
  getOpsOverviewPage: () => request<Record<string, unknown>>("/api/ops/overview-page"),
  patchOpsOverviewPage: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/ops/overview-page", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getOpsInventory: () => request<Record<string, unknown>>("/api/ops/inventory"),
  getOpsInventoryPage: () => request<Record<string, unknown>>("/api/ops/inventory-page"),
  patchOpsInventoryPage: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/ops/inventory-page", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getOpsShipping: () => request<Record<string, unknown>>("/api/ops/shipping"),
  getOpsWarehouses: () => request<Record<string, unknown>>("/api/ops/warehouses"),
  getOpsDocuments: () => request<Record<string, unknown>>("/api/ops/documents"),
  getOpsExports: () => request<Record<string, unknown>>("/api/ops/exports"),
  getOpsExceptions: () => request<Record<string, unknown>>("/api/ops/exceptions"),
  getOpsCompliancePage: () => request<Record<string, unknown>>("/api/ops/compliance-page"),
  patchOpsCompliancePage: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/ops/compliance-page", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getFinanceHome: () => request<Record<string, unknown>>("/api/seller/finance/home"),
  getFinanceWallets: () => request<Record<string, unknown>>("/api/seller/finance/wallets"),
  getFinanceHolds: () => request<Record<string, unknown>>("/api/seller/finance/holds"),
  getFinanceInvoices: () => request<Record<string, unknown>>("/api/seller/finance/invoices"),
  getFinanceStatements: () => request<Record<string, unknown>>("/api/seller/finance/statements"),
  generateFinanceStatement: () =>
    request<Record<string, unknown>>("/api/seller/finance/statements/generate", {
      method: "POST",
    }),
  getFinanceTaxReports: () => request<Record<string, unknown>>("/api/seller/finance/tax-reports"),
  patchFinanceInvoice: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/seller/finance/invoices/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteFinanceHold: (id: string) =>
    request<{ deleted?: boolean }>(`/api/seller/finance/holds/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  getHelpSupportContent: () => request<Record<string, unknown>>("/api/help-support/content"),
  getSettingsHelp: () => request<Record<string, unknown>>("/api/settings/help"),
  createHelpSupportTicket: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/help-support/tickets", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchSupportTicket: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/help-support/tickets/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getSystemStatus: () => request<Record<string, unknown>>("/api/system-status"),
  getCompliance: () => request<Record<string, unknown>>("/api/compliance"),
  createComplianceItem: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/compliance/items", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchComplianceItem: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/compliance/items/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getReviewsSummary: () => request<Record<string, unknown>>("/api/reviews/summary"),
  getReviews: (scope?: "received" | "authored") =>
    request<Array<Record<string, unknown>>>(
      `/api/reviews${scope ? `?scope=${encodeURIComponent(scope)}` : ""}`
    ),
  getReviewInsights: (query?: Record<string, string | number | undefined | null>) => {
    const params = new URLSearchParams();
    Object.entries(query ?? {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      params.set(key, String(value));
    });
    const suffix = params.toString();
    return request<Record<string, unknown>>(`/api/reviews/insights${suffix ? `?${suffix}` : ""}`);
  },
  patchReview: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/reviews/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  respondReview: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/reviews/respond", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  replyReview: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/reviews/${encodeURIComponent(id)}/replies`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getRegulatoryDesks: () => request<Record<string, unknown>>("/api/regulatory/desks"),
  getRegulatoryOverview: () => request<Record<string, unknown>>("/api/regulatory/overview"),
  patchRegulatoryOverview: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/regulatory/overview", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getRegulatoryDesk: (slug: string) =>
    request<Record<string, unknown>>(`/api/regulatory/desks/${encodeURIComponent(slug)}`),
  getProviderServiceCommand: () => request<Record<string, unknown>>("/api/provider/service-command"),
  getProviderQuotes: () => request<Record<string, unknown>>("/api/provider/quotes"),
  getProviderJointQuotes: () => request<Record<string, unknown>>("/api/provider/joint-quotes"),
  createProviderJointQuote: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/provider/joint-quotes", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchProviderJointQuote: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/provider/joint-quotes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getProviderConsultations: () => request<Record<string, unknown>>("/api/provider/consultations"),
  createProviderConsultationRequest: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/provider/consultations", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getProviderBookings: () => request<Record<string, unknown>>("/api/provider/bookings"),
  createProviderBookingRequest: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/provider/bookings", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getProviderPortfolio: () => request<Record<string, unknown>>("/api/provider/portfolio"),
  patchProviderPortfolio: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/provider/portfolio", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getProviderQuoteTemplates: () => request<Record<string, unknown>>("/api/provider/quote-templates"),
  getProviderReviews: () => request<Record<string, unknown>>("/api/provider/reviews"),
  getProviderDisputes: () => request<Record<string, unknown>>("/api/provider/disputes"),
  getRoles: () => request<Record<string, unknown>>("/api/roles"),
  patchRolesSecurity: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/roles/security", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  createRole: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/roles", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchRole: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/roles/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteRole: (id: string) =>
    request<{ deleted?: boolean }>(`/api/roles/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  createRoleInvite: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/roles/invites", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchRoleMember: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/roles/members/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteRoleMember: (id: string) =>
    request<{ deleted?: boolean }>(`/api/roles/members/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  getAuditLogs: () => request<Array<Record<string, unknown>>>("/api/audit-logs"),
  getWholesalePriceLists: () => request<Record<string, unknown>>("/api/wholesale/price-lists"),
  getWholesaleIncoterms: () => request<Record<string, unknown>>("/api/wholesale/incoterms"),
  getDealzMarketplace: () => request<Record<string, unknown>>("/api/campaigns/dealz-marketplace"),
  patchDealzMarketplace: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/campaigns/dealz-marketplace", {
      method: "PATCH",
      body: JSON.stringify({ payload: body }),
    }),
  getCampaignWorkspace: () => request<Record<string, unknown>>("/api/campaigns/workspace"),
  getCampaigns: () => request<Array<Record<string, unknown>>>("/api/campaigns"),
  createCampaign: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/campaigns", {
      method: "POST",
      body: JSON.stringify({ payload: body }),
    }),
  patchCampaign: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/campaigns/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ payload: body }),
    }),
  getWholesaleRfqs: () => request<Record<string, unknown>>("/api/wholesale/rfqs"),
  getWholesaleQuotes: () => request<Record<string, unknown>>("/api/wholesale/quotes"),
  getLiveBuilder: (id: string) =>
    request<Record<string, unknown>>(`/api/live/builder/${encodeURIComponent(id)}`),
  getLiveSessions: () => request<Array<Record<string, unknown>>>("/api/live/sessions"),
  getLiveScheduleWorkspace: () => request<Record<string, unknown>>("/api/live/schedule-workspace"),
  getLiveDashboardWorkspace: () => request<Record<string, unknown>>("/api/live/dashboard-workspace"),
  createLiveSession: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/live/sessions", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchLiveSession: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/live/sessions/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getLiveReplays: () => request<Array<Record<string, unknown>>>("/api/live/replays"),
  getLiveReplay: (id: string) =>
    request<Record<string, unknown>>(`/api/live/replays/${encodeURIComponent(id)}`),
  getLiveReplayBySession: (sessionId: string) =>
    request<Record<string, unknown>>(`/api/live/replays/by-session/${encodeURIComponent(sessionId)}`),
  patchLiveReplay: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/live/replays/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  publishLiveReplay: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/live/replays/${encodeURIComponent(id)}/publish`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  saveLiveBuilder: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/live/builder/save", {
      method: "POST",
      body: JSON.stringify({ payload: body }),
    }),
  publishLiveBuilder: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/live/builder/${encodeURIComponent(id)}/publish`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getAdzCampaigns: () => request<Array<Record<string, unknown>>>("/api/adz/campaigns"),
  getAdzCampaign: (id: string) =>
    request<Record<string, unknown>>(`/api/adz/campaigns/${encodeURIComponent(id)}`),
  createAdzCampaign: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/adz/campaigns", {
      method: "POST",
      body: JSON.stringify({ payload: body }),
    }),
  patchAdzCampaign: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/adz/campaigns/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ payload: body }),
    }),
  getAdzMarketplace: () => request<Array<Record<string, unknown>>>("/api/adz/marketplace"),
  getAdzBuilderConfig: () => request<Record<string, unknown>>("/api/adz/builder-config"),
  getAdzBuilder: (id: string) =>
    request<Record<string, unknown>>(`/api/adz/builder/${encodeURIComponent(id)}`),
  saveAdzBuilder: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/adz/builder/save", {
      method: "POST",
      body: JSON.stringify({ payload: body }),
    }),
  validateAdzSchedule: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/adz/validate-schedule", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  publishAdzBuilder: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/adz/builder/${encodeURIComponent(id)}/publish`, {
      method: "POST",
      body: JSON.stringify({ payload: body }),
    }),
  getAdzPerformance: (id: string) =>
    request<Record<string, unknown>>(`/api/adz/campaigns/${encodeURIComponent(id)}/performance`),
  getCreators: (query?: { limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    if (typeof query?.limit === "number") params.set("limit", String(query.limit));
    if (typeof query?.offset === "number") params.set("offset", String(query.offset));
    const search = params.toString();
    return request<Array<Record<string, unknown>>>(`/api/creators${search ? `?${search}` : ""}`);
  },
  getAllCreators: async () => {
    const pageSize = 100;
    const allCreators: Array<Record<string, unknown>> = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await request<Array<Record<string, unknown>>>(`/api/creators?limit=${pageSize}&offset=${offset}`);
      const rows = Array.isArray(batch) ? batch : [];
      allCreators.push(...rows);
      if (rows.length < pageSize) {
        hasMore = false;
      } else {
        offset += pageSize;
      }
    }

    return allCreators;
  },
  getSellers: () => request<Array<Record<string, unknown>>>("/api/sellers"),
  followSeller: (id: string, body: { follow?: boolean }) =>
    request<Record<string, unknown>>(`/api/sellers/${encodeURIComponent(id)}/follow`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getDiscoveryOpportunities: () => request<Array<Record<string, unknown>>>("/api/opportunities"),
  getCreatorProfile: (id: string) =>
    request<Record<string, unknown>>(`/api/creators/${encodeURIComponent(id)}/profile`),
  followCreator: (id: string, body: { follow?: boolean }) =>
    request<Record<string, unknown>>(`/api/creators/${encodeURIComponent(id)}/follow`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getMyCreatorsWorkspace: () => request<Record<string, unknown>>("/api/my-creators/workspace"),
  getCollaborationProposals: () => request<Array<Record<string, unknown>>>("/api/proposals"),
  createCollaborationProposal: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/proposals", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getCollaborationProposal: (id: string) =>
    request<Record<string, unknown>>(`/api/proposals/${encodeURIComponent(id)}`),
  getCollaborationProposalNegotiationRoom: (id: string) =>
    request<Record<string, unknown>>(`/api/proposals/${encodeURIComponent(id)}/negotiation-room`),
  updateCollaborationProposal: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/proposals/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  updateCollaborationProposalNegotiationRoom: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/proposals/${encodeURIComponent(id)}/negotiation-room`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  createCollaborationProposalMessage: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/proposals/${encodeURIComponent(id)}/messages`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  transitionCollaborationProposal: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/proposals/${encodeURIComponent(id)}/transition`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  closeCollaborationProposalNegotiationRoom: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/proposals/${encodeURIComponent(id)}/negotiation-room/close`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  reopenCollaborationProposalNegotiationRoom: (id: string) =>
    request<Record<string, unknown>>(`/api/proposals/${encodeURIComponent(id)}/negotiation-room/reopen`, {
      method: "POST",
    }),
  getCollaborationContracts: () => request<Array<Record<string, unknown>>>("/api/contracts"),
  getCollaborationTask: (id: string) =>
    request<Record<string, unknown>>(`/api/tasks/${encodeURIComponent(id)}`),
  getCollaborationTasks: () => request<Array<Record<string, unknown>>>("/api/tasks"),
  createCollaborationTask: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/tasks", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchCollaborationTask: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/tasks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  createCollaborationTaskComment: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/tasks/${encodeURIComponent(id)}/comments`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  createCollaborationTaskAttachment: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/tasks/${encodeURIComponent(id)}/attachments`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  terminateCollaborationContract: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/contracts/${encodeURIComponent(id)}/terminate-request`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getLiveStudioDefault: () => request<Record<string, unknown>>("/api/live/studio/default"),
  patchLiveStudio: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/live/studio/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getLiveToolConfig: (key: string) =>
    request<Record<string, unknown>>(resolveLiveToolPath(key)),
  patchLiveToolConfig: (key: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(resolveLiveToolPath(key), {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  startLiveStudio: (id: string) =>
    request<Record<string, unknown>>(`/api/live/studio/${encodeURIComponent(id)}/start`, {
      method: "POST",
    }),
  endLiveStudio: (id: string) =>
    request<Record<string, unknown>>(`/api/live/studio/${encodeURIComponent(id)}/end`, {
      method: "POST",
    }),
  addLiveStudioMoment: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/live/studio/${encodeURIComponent(id)}/moments`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getSubscription: () => request<Record<string, unknown>>("/api/subscription"),
  patchSubscription: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/subscription", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getMediaWorkspace: () => request<Record<string, unknown>>("/api/media/workspace"),
  getMarketplaceListings: () => request<Array<Record<string, unknown>>>("/api/marketplace/listings"),
  getListingDetail: (id: string) =>
    request<Record<string, unknown>>(`/api/seller/listings/${encodeURIComponent(id)}`),
};
