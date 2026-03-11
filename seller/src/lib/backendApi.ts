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

  if (payload && typeof payload === "object" && "data" in payload && "success" in payload) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

export const sellerBackendApi = {
  getAuthMe: () => request<Record<string, unknown>>("/api/auth/me"),
  switchAuthRole: (body: { role: string }) =>
    request<Record<string, unknown>>("/api/auth/switch-role", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getSellerDashboard: () => request<Record<string, unknown>>("/api/seller/dashboard"),
  getSellerOrders: () =>
    request<{ orders?: Array<Record<string, unknown>>; returns?: Array<Record<string, unknown>>; disputes?: Array<Record<string, unknown>> }>(
      "/api/seller/orders"
    ),
  getSellerListingWizard: () => request<Record<string, unknown>>("/api/seller/listing-wizard"),
  getSellerOrderDetail: (id: string) =>
    request<Record<string, unknown>>(`/api/seller/orders/${encodeURIComponent(id)}`),
  getSellerReturns: () => request<Array<Record<string, unknown>>>("/api/seller/returns"),
  getSellerDisputes: () => request<Array<Record<string, unknown>>>("/api/seller/disputes"),
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
  createCreatorInvite: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/invites", {
      method: "POST",
      body: JSON.stringify(body),
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
  getAnalyticsPage: () => request<Record<string, unknown>>("/api/analytics/page"),
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
    request<Record<string, unknown>>(`/api/support/tickets/${encodeURIComponent(id)}`, {
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
  getProviderBookings: () => request<Record<string, unknown>>("/api/provider/bookings"),
  getProviderPortfolio: () => request<Record<string, unknown>>("/api/provider/portfolio"),
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
  getLegacyDealzMarketplace: () => request<Record<string, unknown>>("/api/campaigns/legacy-marketplace"),
  patchLegacyDealzMarketplace: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/campaigns/legacy-marketplace", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getCampaignWorkspace: () => request<Record<string, unknown>>("/api/campaigns/workspace"),
  getCampaigns: () => request<Array<Record<string, unknown>>>("/api/campaigns"),
  createCampaign: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/campaigns", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchCampaign: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/campaigns/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getWholesaleRfqs: () => request<Record<string, unknown>>("/api/wholesale/rfqs"),
  getWholesaleQuotes: () => request<Record<string, unknown>>("/api/wholesale/quotes"),
  getLiveBuilder: (id: string) =>
    request<Record<string, unknown>>(`/api/live/builder/${encodeURIComponent(id)}`),
  saveLiveBuilder: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/live/builder/save", {
      method: "POST",
      body: JSON.stringify(body),
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
      body: JSON.stringify(body),
    }),
  patchAdzCampaign: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/adz/campaigns/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getAdzMarketplace: () => request<Array<Record<string, unknown>>>("/api/adz/marketplace"),
  getAdzBuilder: (id: string) =>
    request<Record<string, unknown>>(`/api/adz/builder/${encodeURIComponent(id)}`),
  saveAdzBuilder: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/adz/builder/save", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  publishAdzBuilder: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/adz/builder/${encodeURIComponent(id)}/publish`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getAdzPerformance: (id: string) =>
    request<Record<string, unknown>>(`/api/adz/campaigns/${encodeURIComponent(id)}/performance`),
  getLiveStudioDefault: () => request<Record<string, unknown>>("/api/live/studio/default"),
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
    request<Record<string, unknown>>(`/api/listings/${encodeURIComponent(id)}`),
};
