import { readSession } from "../auth/session";

const API_BASE_URL =
  (import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL ??
  "";

const toUrl = (path: string) => `${API_BASE_URL}${path}`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  const session = readSession();
  const token = session?.accessToken || session?.token || "";

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(toUrl(path), { ...init, headers });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(
      payload?.error?.message || payload?.message || `Request failed with status ${response.status}`
    );
  }

  return payload as T;
}

export const sellerBackendApi = {
  getAuthMe: () => request<Record<string, unknown>>("/api/auth/me"),
  getPreferences: () => request<Record<string, unknown>>("/api/settings/preferences"),
  patchPreferences: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/settings/preferences", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getUiState: () => request<Record<string, unknown>>("/api/settings/ui-state"),
  patchUiState: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/settings/ui-state", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getSettings: () => request<Record<string, unknown>>("/api/settings"),
  patchSettings: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/settings", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getPayoutMethods: () => request<{ methods?: unknown[] }>("/api/settings/payout-methods"),
  patchPayoutMethods: (body: { methods: unknown[] }) =>
    request<Record<string, unknown>>("/api/settings/payout-methods", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getSavedViews: () => request<Record<string, unknown>>("/api/settings/saved-views"),
  patchSavedViews: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/settings/saved-views", {
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
  patchOnboarding: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/onboarding", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  submitOnboarding: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/onboarding/submit", {
      method: "POST",
      body: JSON.stringify(body),
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
      body: JSON.stringify(body),
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
  getShippingProfiles: () => request<Record<string, unknown>>("/api/seller/shipping-profiles"),
  getMarketplaceListings: () => request<Array<Record<string, unknown>>>("/api/marketplace/listings"),
  getListingDetail: (id: string) =>
    request<Record<string, unknown>>(`/api/listings/${encodeURIComponent(id)}`),
};
