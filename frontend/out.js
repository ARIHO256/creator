// src/pages/creator/MySubscriptionPage.tsx
import { useMemo as useMemo5, useState as useState3 } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FileText,
  Layers3,
  LifeBuoy,
  Loader2,
  Mail,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Users,
  XCircle
} from "lucide-react";

// src/components/PageHeader.tsx
import React from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
var PageHeader = ({
  pageTitle,
  badge,
  rightContent,
  className = "",
  mobileViewType = "menu",
  // Default to existing behavior
  mobileHideBadge = false
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef(null);
  const btnRef = React.useRef(null);
  React.useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target) && btnRef.current && !btnRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const hasRightSide = badge || rightContent;
  return /* @__PURE__ */ jsxs("header", { className: `relative z-[38] h-16 w-full flex items-center justify-between px-3 sm:px-4 md:px-6 lg:px-8 pt-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors shadow-sm ${className}`, children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 sm:gap-3 flex-shrink-0", children: [
      /* @__PURE__ */ jsx(
        "img",
        {
          src: "/MyliveDealz PNG Icon 1.png",
          alt: "MyLiveDealz",
          className: "h-7 w-7 sm:h-8 sm:w-8 object-contain flex-shrink-0"
        }
      ),
      /* @__PURE__ */ jsx("span", { className: "text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-50", children: pageTitle })
    ] }),
    hasRightSide && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("div", { className: "hidden xl:flex items-center gap-3 text-sm flex-shrink-0", children: [
        badge,
        rightContent
      ] }),
      /* @__PURE__ */ jsx("div", { className: "xl:hidden relative", children: mobileViewType === "hide" ? null : mobileViewType === "inline-right" ? /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2", children: rightContent }) : (
        // Default 'menu' behavior
        /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              ref: btnRef,
              onClick: () => setMenuOpen(!menuOpen),
              className: "p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors",
              children: /* @__PURE__ */ jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "1" }),
                /* @__PURE__ */ jsx("circle", { cx: "19", cy: "12", r: "1" }),
                /* @__PURE__ */ jsx("circle", { cx: "5", cy: "12", r: "1" })
              ] })
            }
          ),
          menuOpen && /* @__PURE__ */ jsxs(
            "div",
            {
              ref: menuRef,
              className: "absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden flex flex-col p-1.5",
              children: [
                badge && !mobileHideBadge && /* @__PURE__ */ jsx("div", { className: "flex flex-col w-full mb-1.5 last:mb-0 [&_button]:!w-full [&_button]:!px-3.5 [&_button]:!py-3 [&_button]:!rounded-xl [&_button]:!text-left [&_button]:!flex [&_button]:!items-center [&_button]:!gap-2", children: React.cloneElement(badge, {
                  className: `${badge.props.className || ""} !flex !flex-col !w-full !gap-1.5 !px-0 !py-0 !bg-transparent !border-none !shadow-none`.replace(/\bhidden\b/g, "")
                }) }),
                rightContent && /* @__PURE__ */ jsx("div", { className: "flex flex-col w-full gap-1.5 [&_button]:!w-full [&_button]:!px-3.5 [&_button]:!py-3 [&_button]:!rounded-xl [&_button]:!text-left [&_button]:!flex [&_button]:!items-center [&_button]:!gap-2 transition-colors", children: rightContent })
              ]
            }
          )
        ] })
      ) })
    ] })
  ] });
};

// src/components/PermissionGate.tsx
import { Link, ShieldAlert } from "lucide-react";

// src/hooks/useWorkspaceAccess.ts
import { useMemo as useMemo3 } from "react";

// src/hooks/api/useWorkspaceRoles.ts
import { useCallback as useCallback4 } from "react";

// src/api/storage.ts
var AUTH_TOKEN_STORAGE_KEY = "mldz:auth:token";
function isBrowser() {
  return typeof window !== "undefined";
}
function safeRead(key) {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function readAuthToken() {
  return safeRead(AUTH_TOKEN_STORAGE_KEY);
}

// src/api/client.ts
var DEFAULT_API_BASE_URL = (import.meta.env.VITE_MLDZ_API_BASE_URL ?? "http://127.0.0.1:4010").replace(/\/$/, "");
var ApiClientError = class extends Error {
  status;
  code;
  details;
  constructor(status, code, message, details) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
};
function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function appendQueryValue(searchParams, key, value) {
  if (value === void 0 || value === null || value === "") {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => appendQueryValue(searchParams, key, entry));
    return;
  }
  searchParams.append(key, String(value));
}
function buildUrl(baseUrl, path, query) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalizedPath, `${baseUrl}/`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => appendQueryValue(url.searchParams, key, value));
  }
  return url.toString();
}
function parseJsonSafe(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
function isApiEnvelope(value) {
  return isObject(value) && value.ok === true && "data" in value;
}
function isApiErrorShape(value) {
  return isObject(value) && value.ok === false && isObject(value.error);
}
function normalizePaginatedResult(result) {
  return {
    items: result.data,
    meta: result.meta
  };
}
var ApiClient = class {
  baseUrl;
  getToken;
  constructor(baseUrl = DEFAULT_API_BASE_URL, getToken = readAuthToken) {
    this.baseUrl = baseUrl;
    this.getToken = getToken;
  }
  async requestResponse(path, options = {}) {
    const url = buildUrl(this.baseUrl, path, options.query);
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    if (options.body !== void 0) {
      headers.set("Content-Type", "application/json");
    }
    if (options.auth !== false) {
      const token = this.getToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }
    let response;
    try {
      response = await fetch(url, {
        method: options.method ?? (options.body !== void 0 ? "POST" : "GET"),
        headers,
        body: options.body !== void 0 ? JSON.stringify(options.body) : void 0,
        signal: options.signal
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network request failed.";
      throw new ApiClientError(0, "NETWORK_ERROR", message, error);
    }
    if (response.status === 204) {
      return { data: void 0 };
    }
    const rawText = await response.text();
    const parsed = rawText ? parseJsonSafe(rawText) : null;
    if (!response.ok) {
      if (isApiErrorShape(parsed)) {
        throw new ApiClientError(response.status, parsed.error.code, parsed.error.message, parsed.error.details);
      }
      throw new ApiClientError(response.status, "HTTP_ERROR", response.statusText || "The request failed.", parsed);
    }
    if (isApiEnvelope(parsed)) {
      return {
        data: parsed.data,
        meta: parsed.meta
      };
    }
    return {
      data: parsed
    };
  }
  async request(path, options = {}) {
    const result = await this.requestResponse(path, options);
    return result.data;
  }
  async get(path, options = {}) {
    return this.request(path, { ...options, method: "GET" });
  }
  async post(path, body, options = {}) {
    return this.request(path, { ...options, method: "POST", body });
  }
  async patch(path, body, options = {}) {
    return this.request(path, { ...options, method: "PATCH", body });
  }
  async login(payload, signal) {
    return this.post("/api/auth/login", payload, { auth: false, signal });
  }
  async register(payload, signal) {
    return this.post("/api/auth/register", payload, { auth: false, signal });
  }
  async logout(signal) {
    await this.post("/api/auth/logout", void 0, { signal });
  }
  async getMe(signal) {
    return this.get("/api/me", { signal });
  }
  async switchRole(role, signal) {
    return this.post("/api/auth/switch-role", { role }, { signal });
  }
  async getBootstrap(signal) {
    return this.get("/api/app/bootstrap", { signal });
  }
  async getLandingContent(signal) {
    return this.get("/api/landing/content", { signal, auth: false });
  }
  async getDashboardFeed(signal) {
    return this.get("/api/dashboard/feed", { signal });
  }
  async getMyDayWorkspace(signal) {
    return this.get("/api/dashboard/my-day", { signal });
  }
  async getPublicCreatorProfile(handle, signal) {
    return this.get(`/api/public-profile/${encodeURIComponent(handle)}`, { signal, auth: false });
  }
  async getReviewsDashboard(filters = {}, signal) {
    return this.get("/api/reviews/dashboard", { query: filters, signal });
  }
  async getSettings(signal) {
    return this.get("/api/settings", { signal });
  }
  async getRolesWorkspace(signal) {
    return this.get("/api/roles", { signal });
  }
  async listAuditLogs(signal) {
    return this.get("/api/audit-logs", { signal });
  }
  async createWorkspaceRole(payload, signal) {
    return this.post("/api/roles", payload, { signal });
  }
  async updateWorkspaceRole(roleId, payload, signal) {
    return this.patch(`/api/roles/${encodeURIComponent(roleId)}`, payload, { signal });
  }
  async deleteWorkspaceRole(roleId, signal) {
    return this.request(`/api/roles/${encodeURIComponent(roleId)}`, { method: "DELETE", signal });
  }
  async inviteWorkspaceMember(payload, signal) {
    return this.post("/api/roles/invites", payload, { signal });
  }
  async updateWorkspaceMember(memberId, payload, signal) {
    return this.patch(`/api/roles/members/${encodeURIComponent(memberId)}`, payload, { signal });
  }
  async getLiveCampaignGiveawayInventory(campaignId, options = {}) {
    return this.get(`/api/live/campaigns/${encodeURIComponent(campaignId)}/giveaways`, {
      query: options.sessionId ? { sessionId: options.sessionId } : void 0,
      signal: options.signal
    });
  }
  async updateSettings(patch, signal) {
    return this.patch("/api/settings", patch, { signal });
  }
  async sendPayoutVerificationCode(payload = {}, signal) {
    return this.post("/api/settings/payout/send-code", payload, { signal });
  }
  async verifyPayoutSettings(payload = {}, signal) {
    return this.post("/api/settings/payout/verify", payload, { signal });
  }
  async removeSettingsDevice(deviceId, signal) {
    return this.request(`/api/settings/devices/${encodeURIComponent(deviceId)}`, { method: "DELETE", signal });
  }
  async signOutAllSettingsDevices(signal) {
    return this.post("/api/settings/devices/sign-out-all", void 0, { signal });
  }
  async listUploads(filters = {}, signal) {
    return this.get("/api/uploads", { query: filters, signal });
  }
  async createUpload(payload, signal) {
    return this.post("/api/uploads", payload, { signal });
  }
  async getOnboardingWorkflow(signal) {
    return this.get("/api/onboarding", { signal });
  }
  async saveOnboardingDraft(payload, signal) {
    return this.patch("/api/onboarding", payload, { signal });
  }
  async resetOnboardingWorkflow(signal) {
    return this.post("/api/onboarding/reset", void 0, { signal });
  }
  async submitOnboarding(payload, signal) {
    return this.post("/api/onboarding/submit", payload, { signal });
  }
  async getAccountApproval(signal) {
    return this.get("/api/account-approval", { signal });
  }
  async updateAccountApprovalDraft(payload, signal) {
    return this.patch("/api/account-approval", payload, { signal });
  }
  async refreshAccountApproval(signal) {
    return this.post("/api/account-approval/refresh", void 0, { signal });
  }
  async resubmitAccountApproval(payload, signal) {
    return this.post("/api/account-approval/resubmit", payload, { signal });
  }
  async devApproveAccountApproval(signal) {
    return this.post("/api/account-approval/dev-approve", void 0, { signal });
  }
  async listContentApprovals(signal) {
    return this.get("/api/content-approvals", { signal });
  }
  async getContentApproval(submissionId, signal) {
    return this.get(`/api/content-approvals/${encodeURIComponent(submissionId)}`, { signal });
  }
  async createContentApproval(payload, signal) {
    return this.post("/api/content-approvals", payload, { signal });
  }
  async updateContentApproval(submissionId, payload, signal) {
    return this.patch(`/api/content-approvals/${encodeURIComponent(submissionId)}`, payload, { signal });
  }
  async nudgeContentApproval(submissionId, signal) {
    return this.post(`/api/content-approvals/${encodeURIComponent(submissionId)}/nudge`, void 0, { signal });
  }
  async withdrawContentApproval(submissionId, signal) {
    return this.post(`/api/content-approvals/${encodeURIComponent(submissionId)}/withdraw`, void 0, { signal });
  }
  async resubmitContentApproval(submissionId, payload = {}, signal) {
    return this.post(`/api/content-approvals/${encodeURIComponent(submissionId)}/resubmit`, payload, { signal });
  }
  async listNotifications(signal) {
    return this.get("/api/notifications", { signal });
  }
  async markNotificationRead(id, signal) {
    return this.patch(`/api/notifications/${encodeURIComponent(id)}/read`, void 0, { signal });
  }
  async markAllNotificationsRead(signal) {
    return this.post("/api/notifications/read-all", void 0, { signal });
  }
  async getEarningsSummary(signal) {
    return this.get("/api/earnings/summary", { signal });
  }
  async listPayouts(filters = {}, signal) {
    const result = await this.requestResponse("/api/earnings/payouts", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }
  async requestPayout(payload, signal) {
    return this.post("/api/earnings/payouts/request", payload, { signal });
  }
  async getAnalyticsOverview(signal) {
    return this.get("/api/analytics/overview", { signal });
  }
  async getSubscription(signal) {
    return this.get("/api/subscription", { signal });
  }
  async updateSubscription(payload, signal) {
    return this.patch("/api/subscription", payload, { signal });
  }
  async listOpportunities(filters = {}, signal) {
    const result = await this.requestResponse("/api/opportunities", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }
  async listInvites(filters = {}, signal) {
    const result = await this.requestResponse("/api/invites", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }
  async respondToInvite(inviteId, payload, signal) {
    return this.post(`/api/invites/${encodeURIComponent(inviteId)}/respond`, payload, { signal });
  }
  async setOpportunitySaved(opportunityId, saved, signal) {
    return this.post(`/api/opportunities/${encodeURIComponent(opportunityId)}/save`, { saved }, { signal });
  }
  async listSellers(filters = {}, signal) {
    const result = await this.requestResponse("/api/sellers", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }
  async listMySellers(filters = {}, signal) {
    const result = await this.requestResponse("/api/my-sellers", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }
  async setSellerFollow(sellerId, follow, signal) {
    return this.post(`/api/sellers/${encodeURIComponent(sellerId)}/follow`, { follow }, { signal });
  }
  async listProposals(filters = {}, signal) {
    const result = await this.requestResponse("/api/proposals", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }
  async getProposal(proposalId, signal) {
    return this.get(`/api/proposals/${encodeURIComponent(proposalId)}`, { signal });
  }
  async updateProposal(proposalId, payload, signal) {
    return this.patch(`/api/proposals/${encodeURIComponent(proposalId)}`, payload, { signal });
  }
  async createProposal(payload, signal) {
    return this.post("/api/proposals", payload, { signal });
  }
  async sendProposalMessage(proposalId, payload, signal) {
    return this.post(`/api/proposals/${encodeURIComponent(proposalId)}/messages`, payload, { signal });
  }
  async transitionProposal(proposalId, payload, signal) {
    return this.post(`/api/proposals/${encodeURIComponent(proposalId)}/transition`, payload, { signal });
  }
  async listCampaigns(filters = {}, signal) {
    const result = await this.requestResponse("/api/campaigns", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }
  async listCampaignBoard(filters = {}, signal) {
    const result = await this.requestResponse("/api/campaign-board", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }
  async listDealzMarketplace(filters = {}, signal) {
    const result = await this.requestResponse("/api/dealz-marketplace", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }
  async listContracts(filters = {}, signal) {
    const result = await this.requestResponse("/api/contracts", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }
  async getContract(contractId, signal) {
    return this.get(`/api/contracts/${encodeURIComponent(contractId)}`, { signal });
  }
  async requestContractTermination(contractId, payload, signal) {
    return this.post(`/api/contracts/${encodeURIComponent(contractId)}/terminate-request`, payload, { signal });
  }
  async listTasks(filters = {}, signal) {
    const result = await this.requestResponse("/api/tasks", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }
  async getTask(taskId, signal) {
    return this.get(`/api/tasks/${encodeURIComponent(taskId)}`, { signal });
  }
  async createTask(payload, signal) {
    return this.post("/api/tasks", payload, { signal });
  }
  async updateTask(taskId, payload, signal) {
    return this.patch(`/api/tasks/${encodeURIComponent(taskId)}`, payload, { signal });
  }
  async addTaskComment(taskId, payload, signal) {
    return this.post(`/api/tasks/${encodeURIComponent(taskId)}/comments`, payload, { signal });
  }
  async addTaskAttachment(taskId, payload, signal) {
    return this.post(`/api/tasks/${encodeURIComponent(taskId)}/attachments`, payload, { signal });
  }
  async listAssets(filters = {}, signal) {
    const result = await this.requestResponse("/api/assets", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }
  async getAsset(assetId, signal) {
    return this.get(`/api/assets/${encodeURIComponent(assetId)}`, { signal });
  }
  async createAsset(payload, signal) {
    return this.post("/api/assets", payload, { signal });
  }
  async updateAssetReview(assetId, payload, signal) {
    return this.patch(`/api/assets/${encodeURIComponent(assetId)}/review`, payload, { signal });
  }
  async getLiveBuilderSession(sessionId, signal) {
    return this.get(`/api/live/builder/${encodeURIComponent(sessionId)}`, { signal });
  }
  async saveLiveBuilderSession(payload, signal) {
    return this.post("/api/live/builder/save", payload, { signal });
  }
  async publishLiveBuilderSession(sessionId, payload, signal) {
    return this.post(`/api/live/builder/${encodeURIComponent(sessionId)}/publish`, payload, { signal });
  }
  async getAdBuilderCampaign(adId, signal) {
    return this.get(`/api/adz/builder/${encodeURIComponent(adId)}`, { signal });
  }
  async saveAdBuilderCampaign(payload, signal) {
    return this.post("/api/adz/builder/save", payload, { signal });
  }
  async publishAdBuilderCampaign(adId, payload, signal) {
    return this.post(`/api/adz/builder/${encodeURIComponent(adId)}/publish`, payload, { signal });
  }
  async listLiveSessions(filters = {}, signal) {
    const result = await this.requestResponse("/api/live/sessions", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }
  async getLiveSession(sessionId, signal) {
    return this.get(`/api/live/sessions/${encodeURIComponent(sessionId)}`, { signal });
  }
  async getLiveStudio(sessionId, signal) {
    return this.get(`/api/live/studio/${encodeURIComponent(sessionId)}`, { signal });
  }
  async startLiveSession(sessionId, signal) {
    return this.post(`/api/live/studio/${encodeURIComponent(sessionId)}/start`, void 0, { signal });
  }
  async endLiveSession(sessionId, signal) {
    return this.post(`/api/live/studio/${encodeURIComponent(sessionId)}/end`, void 0, { signal });
  }
  async addLiveMoment(sessionId, payload, signal) {
    return this.post(`/api/live/studio/${encodeURIComponent(sessionId)}/moments`, payload, { signal });
  }
  async listLiveReplays(filters = {}, signal) {
    const result = await this.requestResponse("/api/live/replays", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }
  async getReplay(replayId, signal) {
    return this.get(`/api/live/replays/${encodeURIComponent(replayId)}`, { signal });
  }
  async getReplayBySession(sessionId, signal) {
    return this.get(`/api/live/replays/by-session/${encodeURIComponent(sessionId)}`, { signal });
  }
  async updateReplay(replayId, payload, signal) {
    return this.patch(`/api/live/replays/${encodeURIComponent(replayId)}`, payload, { signal });
  }
  async publishReplay(replayId, payload, signal) {
    return this.post(`/api/live/replays/${encodeURIComponent(replayId)}/publish`, payload, { signal });
  }
  async listAdzCampaigns(filters = {}, signal) {
    const result = await this.requestResponse("/api/adz/campaigns", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }
  async listAdzMarketplace(filters = {}, signal) {
    const result = await this.requestResponse("/api/adz/marketplace", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }
  async getAdzCampaign(campaignId, signal) {
    return this.get(`/api/adz/campaigns/${encodeURIComponent(campaignId)}`, { signal });
  }
  async updateAdzCampaign(campaignId, payload, signal) {
    return this.patch(`/api/adz/campaigns/${encodeURIComponent(campaignId)}`, payload, { signal });
  }
  async getAdzPerformance(campaignId, signal) {
    return this.get(`/api/adz/campaigns/${encodeURIComponent(campaignId)}/performance`, { signal });
  }
  async getPromoAdDetail(campaignId, signal) {
    return this.get(`/api/promo-ads/${encodeURIComponent(campaignId)}`, { signal });
  }
  async getCrewWorkspace(signal) {
    return this.get("/api/crew", { signal });
  }
  async updateCrewSession(sessionId, payload, signal) {
    return this.patch(`/api/crew/sessions/${encodeURIComponent(sessionId)}`, payload, { signal });
  }
  async getAudienceNotificationsTool(signal) {
    return this.get("/api/tools/audience-notifications", { signal });
  }
  async updateAudienceNotificationsTool(payload, signal) {
    return this.patch("/api/tools/audienceNotifications", payload, { signal });
  }
  async getLiveAlertsTool(signal) {
    return this.get("/api/tools/live-alerts", { signal });
  }
  async updateLiveAlertsTool(payload, signal) {
    return this.patch("/api/tools/liveAlerts", payload, { signal });
  }
  async getOverlaysTool(signal) {
    return this.get("/api/tools/overlays", { signal });
  }
  async updateOverlaysTool(payload, signal) {
    return this.patch("/api/tools/overlays", payload, { signal });
  }
  async getStreamingTool(signal) {
    return this.get("/api/tools/streaming", { signal });
  }
  async updateStreamingTool(payload, signal) {
    return this.patch("/api/tools/streaming", payload, { signal });
  }
  async getSafetyTool(signal) {
    return this.get("/api/tools/safety", { signal });
  }
  async updateSafetyTool(payload, signal) {
    return this.patch("/api/tools/safety", payload, { signal });
  }
  async listLinks(filters = {}, signal) {
    const result = await this.requestResponse("/api/links", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }
  async getLink(linkId, signal) {
    return this.get(`/api/links/${encodeURIComponent(linkId)}`, { signal });
  }
  async createLink(payload, signal) {
    return this.post("/api/links", payload, { signal });
  }
  async updateLink(linkId, payload, signal) {
    return this.patch(`/api/links/${encodeURIComponent(linkId)}`, payload, { signal });
  }
};
var apiClient = new ApiClient();

// src/api/queryKeys.ts
function compactRecord(value) {
  return Object.keys(value).sort().reduce((accumulator, key) => {
    const record = value;
    const entry = record[key];
    if (entry !== void 0 && entry !== null && entry !== "") {
      accumulator[key] = entry;
    }
    return accumulator;
  }, {});
}
function buildCollectionKey(prefix, filters) {
  const normalizedFilters = compactRecord(filters ?? {});
  return Object.keys(normalizedFilters).length > 0 ? [...prefix, normalizedFilters] : [...prefix];
}
function normalizeOpportunityFilters(filters = {}) {
  return compactRecord(filters);
}
function normalizeSellerFilters(filters = {}) {
  return compactRecord(filters);
}
function normalizeCampaignBoardFilters(filters = {}) {
  return compactRecord(filters);
}
function normalizeDealzMarketplaceFilters(filters = {}) {
  return compactRecord(filters);
}
function normalizeInviteFilters(filters = {}) {
  return compactRecord(filters);
}
function normalizeProposalFilters(filters = {}) {
  return compactRecord(filters);
}
function normalizeContractFilters(filters = {}) {
  return compactRecord(filters);
}
function normalizeCampaignFilters(filters = {}) {
  return compactRecord(filters);
}
function normalizeTaskFilters(filters = {}) {
  return compactRecord(filters);
}
function normalizeAssetFilters(filters = {}) {
  return compactRecord(filters);
}
function normalizeLiveSessionFilters(filters = {}) {
  return compactRecord(filters);
}
function normalizeLiveReplayFilters(filters = {}) {
  return compactRecord(filters);
}
function normalizeAdzCampaignFilters(filters = {}) {
  return compactRecord(filters);
}
function normalizeAdzMarketplaceFilters(filters = {}) {
  return compactRecord(filters);
}
function normalizeLinkFilters(filters = {}) {
  return compactRecord(filters);
}
function normalizeUploadFilters(filters = {}) {
  return compactRecord(filters);
}
function normalizePayoutFilters(filters = {}) {
  return compactRecord(filters);
}
function normalizeReviewsDashboardFilters(filters = {}) {
  return compactRecord(filters);
}
var queryKeys = {
  auth: {
    me: () => ["auth", "me"]
  },
  app: {
    bootstrap: () => ["app", "bootstrap"]
  },
  workspace: {
    landing: () => ["workspace", "landing"],
    feed: () => ["workspace", "feed"],
    myDay: () => ["workspace", "my-day"],
    publicProfile: (handle) => ["workspace", "public-profile", handle ?? "unknown"]
  },
  settings: {
    root: () => ["settings", "root"],
    notifications: () => ["settings", "notifications"],
    roles: () => ["settings", "roles"],
    auditLogs: () => ["settings", "audit-logs"]
  },
  reviews: {
    dashboard: (filters = {}) => buildCollectionKey(["reviews", "dashboard"], normalizeReviewsDashboardFilters(filters))
  },
  workflow: {
    uploads: (filters = {}) => buildCollectionKey(["workflow", "uploads"], normalizeUploadFilters(filters)),
    onboarding: () => ["workflow", "onboarding"],
    accountApproval: () => ["workflow", "account-approval"],
    contentApprovals: () => ["workflow", "content-approvals"],
    contentApproval: (submissionId) => ["workflow", "content-approvals", "detail", submissionId ?? "unknown"]
  },
  finance: {
    earningsSummary: () => ["finance", "earnings", "summary"],
    payouts: (filters = {}) => buildCollectionKey(["finance", "payouts"], normalizePayoutFilters(filters)),
    analyticsOverview: () => ["finance", "analytics", "overview"],
    subscription: () => ["finance", "subscription"]
  },
  discovery: {
    sellers: (filters = {}) => buildCollectionKey(["discovery", "sellers"], normalizeSellerFilters(filters)),
    mySellers: (filters = {}) => buildCollectionKey(["discovery", "my-sellers"], normalizeSellerFilters(filters)),
    opportunities: (filters = {}) => buildCollectionKey(["discovery", "opportunities"], normalizeOpportunityFilters(filters)),
    invites: (filters = {}) => buildCollectionKey(["discovery", "invites"], normalizeInviteFilters(filters)),
    campaignBoard: (filters = {}) => buildCollectionKey(["discovery", "campaign-board"], normalizeCampaignBoardFilters(filters)),
    dealzMarketplace: (filters = {}) => buildCollectionKey(["discovery", "dealz-marketplace"], normalizeDealzMarketplaceFilters(filters))
  },
  collaboration: {
    proposals: (filters = {}) => buildCollectionKey(["collaboration", "proposals"], normalizeProposalFilters(filters)),
    proposal: (proposalId) => ["collaboration", "proposals", "detail", proposalId ?? "unknown"],
    campaigns: (filters = {}) => buildCollectionKey(["collaboration", "campaigns"], normalizeCampaignFilters(filters)),
    contracts: (filters = {}) => buildCollectionKey(["collaboration", "contracts"], normalizeContractFilters(filters)),
    contract: (contractId) => ["collaboration", "contracts", "detail", contractId ?? "unknown"],
    tasks: (filters = {}) => buildCollectionKey(["collaboration", "tasks"], normalizeTaskFilters(filters)),
    task: (taskId) => ["collaboration", "tasks", "detail", taskId ?? "unknown"],
    assets: (filters = {}) => buildCollectionKey(["collaboration", "assets"], normalizeAssetFilters(filters)),
    asset: (assetId) => ["collaboration", "assets", "detail", assetId ?? "unknown"]
  },
  live: {
    builderSession: (sessionId) => ["live", "builder-session", sessionId ?? "unknown"],
    campaignGiveaways: (campaignId, sessionId) => ["live", "campaign-giveaways", campaignId ?? "unknown", sessionId ?? "none"],
    crewWorkspace: () => ["live", "crew-workspace"],
    tool: (toolKey) => ["live", "tools", toolKey],
    sessions: (filters = {}) => buildCollectionKey(["live", "sessions"], normalizeLiveSessionFilters(filters)),
    session: (sessionId) => ["live", "sessions", "detail", sessionId ?? "unknown"],
    studio: (sessionId) => ["live", "studio", sessionId ?? "unknown"],
    replays: (filters = {}) => buildCollectionKey(["live", "replays"], normalizeLiveReplayFilters(filters)),
    replay: (replayId) => ["live", "replays", "detail", replayId ?? "unknown"],
    replayBySession: (sessionId) => ["live", "replays", "by-session", sessionId ?? "unknown"]
  },
  adz: {
    builderCampaign: (adId) => ["adz", "builder-campaign", adId ?? "unknown"],
    campaigns: (filters = {}) => buildCollectionKey(["adz", "campaigns"], normalizeAdzCampaignFilters(filters)),
    marketplace: (filters = {}) => buildCollectionKey(["adz", "marketplace"], normalizeAdzMarketplaceFilters(filters)),
    campaign: (campaignId) => ["adz", "campaigns", "detail", campaignId ?? "unknown"],
    performance: (campaignId) => ["adz", "campaigns", "performance", campaignId ?? "unknown"],
    promo: (campaignId) => ["adz", "promo", campaignId ?? "unknown"],
    links: (filters = {}) => buildCollectionKey(["adz", "links"], normalizeLinkFilters(filters)),
    link: (linkId) => ["adz", "links", "detail", linkId ?? "unknown"]
  }
};

// src/contexts/AuthContext.tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useLocation } from "react-router-dom";
import { jsx as jsx2 } from "react/jsx-runtime";
var AuthContext = createContext(void 0);
function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}

// src/hooks/api/useApiMutation.ts
import { useCallback as useCallback2, useState as useState2 } from "react";

// src/api/cache.tsx
import { createContext as createContext2, useContext as useContext2, useRef as useRef2 } from "react";
import { jsx as jsx3 } from "react/jsx-runtime";
function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function stableSerialize(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function serializeQueryKey(queryKey) {
  return stableSerialize(queryKey);
}
var ApiCacheContext = createContext2(null);
function useApiCache() {
  const context = useContext2(ApiCacheContext);
  if (!context) {
    throw new Error("useApiCache must be used within an ApiCacheProvider.");
  }
  return context;
}

// src/hooks/api/useApiMutation.ts
function useApiMutation(mutationFn, options = {}) {
  const cache = useApiCache();
  const [data, setData] = useState2(void 0);
  const [error, setError] = useState2(void 0);
  const [isPending, setIsPending] = useState2(false);
  const mutateAsync = useCallback2(
    async (variables) => {
      setIsPending(true);
      setError(void 0);
      try {
        const result = await mutationFn(variables);
        setData(result);
        const invalidationKeys = typeof options.invalidate === "function" ? options.invalidate(result, variables) : options.invalidate;
        invalidationKeys?.forEach((queryKey) => cache.invalidate(queryKey));
        options.onSuccess?.(result, variables);
        return result;
      } catch (mutationError) {
        setError(mutationError);
        options.onError?.(mutationError, variables);
        throw mutationError;
      } finally {
        setIsPending(false);
      }
    },
    [cache, mutationFn, options]
  );
  const reset = useCallback2(() => {
    setData(void 0);
    setError(void 0);
    setIsPending(false);
  }, []);
  return {
    data,
    error,
    isPending,
    mutateAsync,
    reset
  };
}

// src/hooks/api/useApiQuery.ts
import { useCallback as useCallback3, useEffect as useEffect2, useMemo as useMemo2, useSyncExternalStore } from "react";
function useApiQuery(queryKey, fetcher, options = {}) {
  const cache = useApiCache();
  const enabled = options.enabled ?? true;
  const staleTime = options.staleTime ?? Number.POSITIVE_INFINITY;
  const serializedKey = useMemo2(() => serializeQueryKey(queryKey), [queryKey]);
  const stableQueryKey = useMemo2(() => queryKey, [serializedKey]);
  const entry = useSyncExternalStore(
    cache.subscribe,
    () => cache.getEntry(serializedKey),
    () => void 0
  );
  const hasEntry = Boolean(entry);
  const rawData = entry?.data ?? options.initialData;
  const selectedData = useMemo2(() => {
    if (rawData === void 0) return void 0;
    return options.select ? options.select(rawData) : rawData;
  }, [options.select, rawData]);
  useEffect2(() => {
    if (!enabled) return void 0;
    const controller = new AbortController();
    void cache.fetch(stableQueryKey, () => fetcher(controller.signal), { staleTime });
    return () => controller.abort();
  }, [cache, enabled, fetcher, hasEntry, stableQueryKey, staleTime]);
  const refetch = useCallback3(() => {
    const controller = new AbortController();
    return cache.fetch(stableQueryKey, () => fetcher(controller.signal), { force: true, staleTime });
  }, [cache, fetcher, stableQueryKey, staleTime]);
  const invalidate = useCallback3(() => {
    cache.invalidate(stableQueryKey);
  }, [cache, stableQueryKey]);
  const status = entry?.status ?? (rawData !== void 0 ? "success" : "idle");
  const isFetching = status === "loading";
  const isLoading = isFetching && rawData === void 0;
  return {
    data: selectedData,
    rawData,
    error: entry?.error,
    status,
    isLoading,
    isFetching,
    isSuccess: status === "success",
    isError: status === "error",
    refetch,
    invalidate
  };
}

// src/hooks/api/useWorkspaceRoles.ts
function useRolesWorkspaceQuery(options = {}) {
  const { hasApiSession } = useAuth();
  const fetcher = useCallback4((signal) => apiClient.getRolesWorkspace(signal), []);
  return useApiQuery(queryKeys.settings.roles(), fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 3e4
  });
}

// src/hooks/useWorkspaceAccess.ts
function useWorkspaceAccess(permissionId) {
  const rolesQuery = useRolesWorkspaceQuery();
  const allowed = useMemo3(() => {
    if (!permissionId) return true;
    const perms = rolesQuery.data?.effectivePermissions;
    if (!perms) return true;
    return Boolean(perms[permissionId]);
  }, [permissionId, rolesQuery.data?.effectivePermissions]);
  return {
    ...rolesQuery,
    allowed,
    effectivePermissions: rolesQuery.data?.effectivePermissions ?? {},
    currentMember: rolesQuery.data?.currentMember ?? null
  };
}

// src/components/PermissionGate.tsx
import { Fragment as Fragment2, jsx as jsx4, jsxs as jsxs2 } from "react/jsx-runtime";
function PermissionGate({ permission, pageTitle, subtitle, children }) {
  const access = useWorkspaceAccess(permission);
  if (access.isLoading) {
    return /* @__PURE__ */ jsxs2("div", { className: "min-h-screen bg-[#f2f2f2] dark:bg-slate-950 transition-colors", children: [
      /* @__PURE__ */ jsx4(PageHeader, { pageTitle, mobileViewType: "hide" }),
      /* @__PURE__ */ jsx4("main", { className: "px-4 py-6 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsx4("section", { className: "rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-sm text-slate-500 dark:text-slate-400 shadow-sm", children: "Loading role permissions..." }) })
    ] });
  }
  if (!access.allowed) {
    return /* @__PURE__ */ jsxs2("div", { className: "min-h-screen bg-[#f2f2f2] dark:bg-slate-950 transition-colors", children: [
      /* @__PURE__ */ jsx4(PageHeader, { pageTitle, mobileViewType: "hide" }),
      /* @__PURE__ */ jsx4("main", { className: "px-4 py-6 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsx4("section", { className: "rounded-3xl border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-slate-900 p-8 shadow-sm", children: /* @__PURE__ */ jsxs2("div", { className: "flex items-start gap-3", children: [
        /* @__PURE__ */ jsx4(ShieldAlert, { className: "mt-0.5 h-5 w-5 text-[#f77f00]" }),
        /* @__PURE__ */ jsxs2("div", { children: [
          /* @__PURE__ */ jsx4("div", { className: "text-base font-bold text-slate-900 dark:text-slate-100", children: "Access restricted by role" }),
          /* @__PURE__ */ jsx4("div", { className: "mt-2 text-sm text-slate-600 dark:text-slate-400", children: subtitle }),
          /* @__PURE__ */ jsxs2("div", { className: "mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-2 text-sm text-slate-700 dark:text-slate-200", children: [
            /* @__PURE__ */ jsx4(Link, { className: "h-4 w-4" }),
            "Ask the workspace owner to enable this page from Roles & Permissions."
          ] })
        ] })
      ] }) }) })
    ] });
  }
  return /* @__PURE__ */ jsx4(Fragment2, { children });
}

// src/hooks/api/useFinance.ts
import { useCallback as useCallback5, useMemo as useMemo4 } from "react";
function useSubscriptionQuery(options = {}) {
  const { hasApiSession } = useAuth();
  const fetcher = useCallback5((signal) => apiClient.getSubscription(signal), []);
  return useApiQuery(queryKeys.finance.subscription(), fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 45e3
  });
}
function useUpdateSubscriptionMutation() {
  return useApiMutation((payload) => apiClient.updateSubscription(payload), {
    invalidate: () => [
      queryKeys.finance.subscription(),
      queryKeys.app.bootstrap(),
      queryKeys.workspace.feed(),
      queryKeys.workspace.myDay(),
      queryKeys.settings.root()
    ]
  });
}

// src/pages/creator/MySubscriptionPage.tsx
import { Fragment as Fragment3, jsx as jsx5, jsxs as jsxs3 } from "react/jsx-runtime";
var ORANGE = "#f77f00";
function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}
function formatMoney(value) {
  return value === 0 ? "Free" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}
function formatDate(value) {
  if (!value) return "\u2014";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(date);
}
function formatDateTime(value) {
  if (!value) return "\u2014";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
function csvEscape(value) {
  const clean = value.replace(/"/g, '""');
  return /[",\n]/.test(clean) ? `"${clean}"` : clean;
}
function downloadInvoicesCsv(subscription) {
  if (typeof window === "undefined" || !subscription.invoices.length) return;
  const rows = subscription.invoices.map((invoice) => ({
    Invoice: invoice.id,
    IssuedAt: invoice.issuedAt,
    Description: invoice.description || "",
    Status: invoice.status,
    Amount: invoice.amountLabel || `${invoice.amount} ${invoice.currency}`,
    BilledTo: invoice.billedTo || subscription.billingEmail || ""
  }));
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((header) => csvEscape(String(row[header] ?? ""))).join(","));
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `mylivedealz-subscription-invoices-${subscription.plan}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
function statusTone(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("active") || normalized.includes("paid")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20";
  }
  if (normalized.includes("pending") || normalized.includes("review")) {
    return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20";
  }
  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700";
}
function comparisonTone(cell) {
  if (cell.value === "included") {
    return { icon: /* @__PURE__ */ jsx5(CheckCircle2, { className: "h-4 w-4 text-emerald-500" }), label: "Included" };
  }
  if (cell.value === "limited") {
    return { icon: /* @__PURE__ */ jsx5(BadgeCheck, { className: "h-4 w-4", style: { color: ORANGE } }), label: "Limited" };
  }
  return { icon: /* @__PURE__ */ jsx5(XCircle, { className: "h-4 w-4 text-slate-400" }), label: "Not included" };
}
function SectionCard({
  title,
  subtitle,
  icon,
  right,
  children
}) {
  return /* @__PURE__ */ jsxs3("section", { className: "rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4 sm:p-5", children: [
    /* @__PURE__ */ jsxs3("div", { className: "flex items-start justify-between gap-3 mb-4", children: [
      /* @__PURE__ */ jsxs3("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsxs3("div", { className: "flex items-center gap-2", children: [
          icon ? /* @__PURE__ */ jsx5("div", { className: "shrink-0", children: icon }) : null,
          /* @__PURE__ */ jsx5("h2", { className: "text-base font-bold text-slate-900 dark:text-slate-50", children: title })
        ] }),
        subtitle ? /* @__PURE__ */ jsx5("p", { className: "mt-1 text-sm text-slate-500 dark:text-slate-400", children: subtitle }) : null
      ] }),
      right
    ] }),
    children
  ] });
}
function PlanPill({ plan }) {
  return /* @__PURE__ */ jsxs3("div", { className: "inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200", children: [
    /* @__PURE__ */ jsx5("span", { children: plan.emoji }),
    /* @__PURE__ */ jsx5("span", { children: plan.name })
  ] });
}
function StatTile({ label, value, hint, icon }) {
  return /* @__PURE__ */ jsxs3("div", { className: "rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-4", children: [
    /* @__PURE__ */ jsxs3("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ jsx5("div", { className: "flex h-10 w-10 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100", children: icon }),
      /* @__PURE__ */ jsxs3("div", { children: [
        /* @__PURE__ */ jsx5("div", { className: "text-xs text-slate-500 dark:text-slate-400", children: label }),
        /* @__PURE__ */ jsx5("div", { className: "text-lg font-bold text-slate-900 dark:text-slate-50", children: value })
      ] })
    ] }),
    hint ? /* @__PURE__ */ jsx5("div", { className: "mt-2 text-xs text-slate-500 dark:text-slate-400", children: hint }) : null
  ] });
}
function UsageCard({ usage }) {
  const percentage = usage.utilizationPct ?? 0;
  return /* @__PURE__ */ jsxs3("div", { className: "rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-4", children: [
    /* @__PURE__ */ jsxs3("div", { className: "flex items-start justify-between gap-3", children: [
      /* @__PURE__ */ jsxs3("div", { children: [
        /* @__PURE__ */ jsx5("div", { className: "text-sm font-semibold text-slate-900 dark:text-slate-50", children: usage.label }),
        /* @__PURE__ */ jsx5("div", { className: "mt-1 text-xs text-slate-500 dark:text-slate-400", children: usage.helper })
      ] }),
      /* @__PURE__ */ jsxs3("div", { className: "text-right", children: [
        /* @__PURE__ */ jsx5("div", { className: "text-sm font-bold text-slate-900 dark:text-slate-50", children: usage.usedLabel }),
        /* @__PURE__ */ jsx5("div", { className: "text-xs text-slate-500 dark:text-slate-400", children: usage.limitLabel })
      ] })
    ] }),
    /* @__PURE__ */ jsx5("div", { className: "mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden", children: /* @__PURE__ */ jsx5(
      "div",
      {
        className: "h-full rounded-full transition-all",
        style: { width: `${usage.cap ? percentage : 100}%`, background: usage.cap ? ORANGE : "#10b981" }
      }
    ) }),
    /* @__PURE__ */ jsx5("div", { className: "mt-2 text-xs text-slate-500 dark:text-slate-400", children: usage.remainingLabel })
  ] });
}
function PlanCard({
  plan,
  currentPlan,
  cycle,
  canManage,
  pending,
  onSelect
}) {
  const isCurrent = plan.id === currentPlan;
  return /* @__PURE__ */ jsxs3(
    "div",
    {
      className: cx(
        "rounded-3xl border p-4 sm:p-5 shadow-sm transition-colors",
        isCurrent ? "border-transparent text-white" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50"
      ),
      style: isCurrent ? { background: `linear-gradient(135deg, ${ORANGE}, #ea580c)` } : void 0,
      children: [
        /* @__PURE__ */ jsxs3("div", { className: "flex items-start justify-between gap-3", children: [
          /* @__PURE__ */ jsxs3("div", { children: [
            /* @__PURE__ */ jsxs3("div", { className: "text-sm font-semibold opacity-90", children: [
              plan.emoji,
              " ",
              plan.name
            ] }),
            /* @__PURE__ */ jsxs3("div", { className: cx("mt-1 text-2xl font-black", isCurrent ? "text-white" : "text-slate-900 dark:text-slate-50"), children: [
              formatMoney(plan.pricing[cycle]),
              plan.pricing[cycle] === 0 ? null : /* @__PURE__ */ jsxs3("span", { className: "text-sm font-semibold opacity-80", children: [
                " / ",
                cycle
              ] })
            ] }),
            /* @__PURE__ */ jsx5("p", { className: cx("mt-2 text-sm", isCurrent ? "text-white/85" : "text-slate-600 dark:text-slate-300"), children: plan.tagline })
          ] }),
          plan.recommended ? /* @__PURE__ */ jsx5("span", { className: cx(
            "inline-flex rounded-full px-3 py-1 text-[11px] font-bold border",
            isCurrent ? "border-white/30 bg-white/10 text-white" : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
          ), children: "Recommended" }) : null
        ] }),
        /* @__PURE__ */ jsxs3("div", { className: cx("mt-4 rounded-2xl p-3", isCurrent ? "bg-white/10 border border-white/15" : "bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800"), children: [
          /* @__PURE__ */ jsx5("div", { className: cx("text-xs uppercase tracking-wide", isCurrent ? "text-white/75" : "text-slate-500 dark:text-slate-400"), children: "Best for" }),
          /* @__PURE__ */ jsx5("div", { className: cx("mt-1 text-sm font-medium", isCurrent ? "text-white" : "text-slate-700 dark:text-slate-200"), children: plan.bestFor })
        ] }),
        /* @__PURE__ */ jsx5("div", { className: "mt-4 space-y-2", children: plan.highlights.map((entry) => /* @__PURE__ */ jsxs3("div", { className: "flex items-start gap-2", children: [
          /* @__PURE__ */ jsx5(CheckCircle2, { className: cx("mt-0.5 h-4 w-4", isCurrent ? "text-white" : "text-emerald-500") }),
          /* @__PURE__ */ jsx5("span", { className: cx("text-sm", isCurrent ? "text-white/90" : "text-slate-700 dark:text-slate-200"), children: entry })
        ] }, entry)) }),
        /* @__PURE__ */ jsx5(
          "button",
          {
            type: "button",
            disabled: !canManage || pending || isCurrent,
            onClick: () => onSelect(plan.id),
            className: cx(
              "mt-5 w-full rounded-2xl px-4 py-3 text-sm font-bold transition-colors border",
              isCurrent ? "border-white/25 bg-white/10 text-white cursor-default" : canManage ? "border-slate-200 dark:border-slate-700 bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90" : "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
            ),
            children: isCurrent ? "Current plan" : canManage ? `Switch to ${plan.name}` : "View only"
          }
        )
      ]
    }
  );
}
function ComparisonTable({ rows }) {
  return /* @__PURE__ */ jsx5("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs3("table", { className: "min-w-full border-separate border-spacing-y-2 text-sm", children: [
    /* @__PURE__ */ jsx5("thead", { children: /* @__PURE__ */ jsxs3("tr", { children: [
      /* @__PURE__ */ jsx5("th", { className: "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400", children: "Feature" }),
      /* @__PURE__ */ jsx5("th", { className: "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400", children: "Basic" }),
      /* @__PURE__ */ jsx5("th", { className: "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400", children: "Pro" }),
      /* @__PURE__ */ jsx5("th", { className: "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400", children: "Enterprise" })
    ] }) }),
    /* @__PURE__ */ jsx5("tbody", { children: rows.map((row) => {
      const basic = comparisonTone(row.basic);
      const pro = comparisonTone(row.pro);
      const enterprise = comparisonTone(row.enterprise);
      return /* @__PURE__ */ jsxs3("tr", { className: "bg-slate-50 dark:bg-slate-950/40", children: [
        /* @__PURE__ */ jsxs3("td", { className: "rounded-l-2xl px-3 py-3 align-top", children: [
          /* @__PURE__ */ jsx5("div", { className: "text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400", children: row.category }),
          /* @__PURE__ */ jsx5("div", { className: "mt-1 font-semibold text-slate-900 dark:text-slate-50", children: row.feature })
        ] }),
        [{ cell: row.basic, meta: basic }, { cell: row.pro, meta: pro }, { cell: row.enterprise, meta: enterprise }].map(({ cell, meta }, idx) => /* @__PURE__ */ jsxs3("td", { className: cx("px-3 py-3 align-top", idx === 2 ? "rounded-r-2xl" : ""), children: [
          /* @__PURE__ */ jsxs3("div", { className: "flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-50", children: [
            meta.icon,
            /* @__PURE__ */ jsx5("span", { children: meta.label })
          ] }),
          cell.note ? /* @__PURE__ */ jsx5("div", { className: "mt-1 text-xs text-slate-500 dark:text-slate-400", children: cell.note }) : null
        ] }, idx))
      ] }, `${row.category}-${row.feature}`);
    }) })
  ] }) });
}
function SubscriptionPageContent() {
  const navigate = useNavigate();
  const subscriptionQuery = useSubscriptionQuery();
  const updateSubscription = useUpdateSubscriptionMutation();
  const [feedback, setFeedback] = useState3(null);
  const subscription = subscriptionQuery.data;
  const currentPlan = subscription?.currentPlanMeta;
  const topAction = useMemo5(() => {
    if (!subscription || !currentPlan) return null;
    if (!subscription.canManageBilling) {
      return /* @__PURE__ */ jsx5(
        "button",
        {
          type: "button",
          onClick: () => navigate("/settings"),
          className: "rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-100",
          children: "View billing settings"
        }
      );
    }
    return subscription.plan !== "pro" ? /* @__PURE__ */ jsx5(
      "button",
      {
        type: "button",
        onClick: () => {
          void handlePlanChange("pro");
        },
        className: "rounded-full px-3 py-1.5 text-sm font-semibold text-white",
        style: { background: ORANGE },
        children: "Upgrade to Pro"
      }
    ) : /* @__PURE__ */ jsx5(
      "button",
      {
        type: "button",
        onClick: () => navigate("/settings"),
        className: "rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-100",
        children: "Manage billing settings"
      }
    );
  }, [currentPlan, navigate, subscription]);
  async function handlePlanChange(plan) {
    if (!subscription || !subscription.canManageBilling || plan === subscription.plan) return;
    setFeedback(null);
    try {
      const updated = await updateSubscription.mutateAsync({ plan });
      setFeedback({ kind: "success", message: `${updated.currentPlanMeta.name} is now the active plan.` });
    } catch (error) {
      setFeedback({ kind: "error", message: error?.message || "Could not change the subscription plan." });
    }
  }
  async function handleCycleChange(cycle) {
    if (!subscription || !subscription.canManageBilling || cycle === subscription.cycle) return;
    setFeedback(null);
    try {
      const updated = await updateSubscription.mutateAsync({ cycle });
      setFeedback({ kind: "success", message: `Billing cycle updated to ${updated.cycle}.` });
    } catch (error) {
      setFeedback({ kind: "error", message: error?.message || "Could not change the billing cycle." });
    }
  }
  return /* @__PURE__ */ jsxs3("div", { className: "min-h-screen bg-[#f2f2f2] dark:bg-slate-950 transition-colors", children: [
    /* @__PURE__ */ jsx5(
      PageHeader,
      {
        pageTitle: "My Subscription",
        badge: currentPlan ? /* @__PURE__ */ jsx5(PlanPill, { plan: currentPlan }) : void 0,
        rightContent: topAction || void 0
      }
    ),
    /* @__PURE__ */ jsxs3("main", { className: "px-3 sm:px-4 md:px-6 lg:px-8 py-6 space-y-4", children: [
      subscriptionQuery.isLoading ? /* @__PURE__ */ jsxs3("section", { className: "rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm flex items-center gap-3 text-slate-600 dark:text-slate-300", children: [
        /* @__PURE__ */ jsx5(Loader2, { className: "h-5 w-5 animate-spin" }),
        "Loading backend-driven subscription details..."
      ] }) : null,
      subscriptionQuery.isError ? /* @__PURE__ */ jsxs3("section", { className: "rounded-3xl border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-slate-900 p-8 shadow-sm", children: [
        /* @__PURE__ */ jsx5("div", { className: "text-base font-bold text-slate-900 dark:text-slate-50", children: "Could not load the subscription workspace" }),
        /* @__PURE__ */ jsx5("div", { className: "mt-2 text-sm text-slate-600 dark:text-slate-300", children: subscriptionQuery.error?.message || "The subscription payload could not be loaded from the backend." }),
        /* @__PURE__ */ jsxs3(
          "button",
          {
            type: "button",
            onClick: () => void subscriptionQuery.refetch(),
            className: "mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-100",
            children: [
              /* @__PURE__ */ jsx5(RefreshCcw, { className: "h-4 w-4" }),
              "Retry"
            ]
          }
        )
      ] }) : null,
      subscription ? /* @__PURE__ */ jsxs3(Fragment3, { children: [
        /* @__PURE__ */ jsx5("section", { className: "rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4 sm:p-5", children: /* @__PURE__ */ jsxs3("div", { className: "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between", children: [
          /* @__PURE__ */ jsxs3("div", { className: "max-w-3xl", children: [
            /* @__PURE__ */ jsxs3("div", { className: "inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200", children: [
              /* @__PURE__ */ jsx5(ShieldCheck, { className: "h-4 w-4", style: { color: ORANGE } }),
              "Subscription unlocks tools. Rank stays performance-based."
            ] }),
            /* @__PURE__ */ jsxs3("h1", { className: "mt-3 text-2xl font-black text-slate-900 dark:text-slate-50", children: [
              currentPlan?.emoji,
              " ",
              currentPlan?.name,
              " plan"
            ] }),
            /* @__PURE__ */ jsxs3("p", { className: "mt-2 text-sm text-slate-600 dark:text-slate-300", children: [
              currentPlan?.tagline,
              " Your page visibility is controlled by Roles & Permissions, while this content is now coming directly from backend subscription data."
            ] }),
            subscription.notes?.length ? /* @__PURE__ */ jsx5("ul", { className: "mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300", children: subscription.notes.slice(0, 2).map((note) => /* @__PURE__ */ jsxs3("li", { className: "flex items-start gap-2", children: [
              /* @__PURE__ */ jsx5(CheckCircle2, { className: "mt-0.5 h-4 w-4 text-emerald-500" }),
              /* @__PURE__ */ jsx5("span", { children: note })
            ] }, note)) }) : null
          ] }),
          /* @__PURE__ */ jsxs3("div", { className: "rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-4 min-w-[280px]", children: [
            /* @__PURE__ */ jsxs3("div", { className: "flex items-center justify-between gap-3", children: [
              /* @__PURE__ */ jsxs3("div", { children: [
                /* @__PURE__ */ jsx5("div", { className: "text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400", children: "Billing cycle" }),
                /* @__PURE__ */ jsx5("div", { className: "mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50", children: subscription.cycle })
              ] }),
              /* @__PURE__ */ jsx5("div", { className: "inline-flex rounded-full border border-slate-200 dark:border-slate-700 p-1 bg-white dark:bg-slate-900", children: ["monthly", "yearly"].map((cycle) => /* @__PURE__ */ jsx5(
                "button",
                {
                  type: "button",
                  disabled: updateSubscription.isPending || !subscription.canManageBilling,
                  onClick: () => {
                    void handleCycleChange(cycle);
                  },
                  className: cx(
                    "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                    subscription.cycle === cycle ? "text-white" : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-50"
                  ),
                  style: subscription.cycle === cycle ? { background: ORANGE } : void 0,
                  children: cycle === "monthly" ? "Monthly" : "Yearly"
                },
                cycle
              )) })
            ] }),
            /* @__PURE__ */ jsx5("div", { className: "mt-3 text-xs text-slate-500 dark:text-slate-400", children: subscription.canManageBilling ? "Changing the cycle persists to backend billing records immediately." : "This role can view subscription status but cannot modify billing." })
          ] })
        ] }) }),
        feedback ? /* @__PURE__ */ jsx5("section", { className: cx(
          "rounded-3xl border px-4 py-3 shadow-sm text-sm font-medium",
          feedback.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200" : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200"
        ), children: feedback.message }) : null,
        /* @__PURE__ */ jsxs3("section", { className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4", children: [
          /* @__PURE__ */ jsx5(
            StatTile,
            {
              label: "Status",
              value: subscription.status,
              hint: `Last updated ${formatDateTime(subscription.lastUpdatedAt)}`,
              icon: /* @__PURE__ */ jsx5(BadgeCheck, { className: "h-5 w-5", style: { color: ORANGE } })
            }
          ),
          /* @__PURE__ */ jsx5(
            StatTile,
            {
              label: "Renews",
              value: subscription.renewalLabel || formatDate(subscription.renewsAt),
              hint: subscription.cancelAtPeriodEnd ? "Scheduled to cancel at period end" : "Auto-renew active",
              icon: /* @__PURE__ */ jsx5(CalendarClock, { className: "h-5 w-5", style: { color: ORANGE } })
            }
          ),
          /* @__PURE__ */ jsx5(
            StatTile,
            {
              label: "Workspace seats",
              value: `${subscription.workspaceSummary.activeSeats} active / ${subscription.workspaceSummary.invitedSeats} invited`,
              hint: subscription.workspaceSummary.seatLimitLabel,
              icon: /* @__PURE__ */ jsx5(Users, { className: "h-5 w-5", style: { color: ORANGE } })
            }
          ),
          /* @__PURE__ */ jsx5(
            StatTile,
            {
              label: "Billing contact",
              value: subscription.billingEmail || "\u2014",
              hint: subscription.support.managerName ? `Support owner: ${subscription.support.managerName}` : "Workspace billing contact",
              icon: /* @__PURE__ */ jsx5(Mail, { className: "h-5 w-5", style: { color: ORANGE } })
            }
          )
        ] }),
        /* @__PURE__ */ jsx5(
          SectionCard,
          {
            title: "Plan catalog",
            subtitle: "Choose the plan that matches your creator workflow. Switching plans now persists through the backend subscription record.",
            icon: /* @__PURE__ */ jsx5(Sparkles, { className: "h-5 w-5", style: { color: ORANGE } }),
            children: /* @__PURE__ */ jsx5("div", { className: "grid grid-cols-1 xl:grid-cols-3 gap-4", children: subscription.planCatalog.map((plan) => /* @__PURE__ */ jsx5(
              PlanCard,
              {
                plan,
                currentPlan: subscription.plan,
                cycle: subscription.cycle,
                canManage: subscription.canManageBilling,
                pending: updateSubscription.isPending,
                onSelect: handlePlanChange
              },
              plan.id
            )) })
          }
        ),
        /* @__PURE__ */ jsx5(
          SectionCard,
          {
            title: "Usage and entitlements",
            subtitle: "This is the live usage snapshot coming from backend state, not mock counters.",
            icon: /* @__PURE__ */ jsx5(Layers3, { className: "h-5 w-5", style: { color: ORANGE } }),
            children: /* @__PURE__ */ jsx5("div", { className: "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4", children: subscription.usage.map((usage) => /* @__PURE__ */ jsx5(UsageCard, { usage }, usage.id)) })
          }
        ),
        /* @__PURE__ */ jsxs3("div", { className: "grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4", children: [
          /* @__PURE__ */ jsx5(
            SectionCard,
            {
              title: "Billing history",
              subtitle: "Invoice rows are loaded from the backend subscription response.",
              icon: /* @__PURE__ */ jsx5(FileText, { className: "h-5 w-5", style: { color: ORANGE } }),
              right: /* @__PURE__ */ jsx5(
                "button",
                {
                  type: "button",
                  onClick: () => downloadInvoicesCsv(subscription),
                  disabled: !subscription.invoices.length,
                  className: "rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-100 disabled:opacity-50",
                  children: "Export CSV"
                }
              ),
              children: subscription.invoices.length ? /* @__PURE__ */ jsx5("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs3("table", { className: "min-w-full text-sm", children: [
                /* @__PURE__ */ jsx5("thead", { children: /* @__PURE__ */ jsxs3("tr", { className: "text-left text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide", children: [
                  /* @__PURE__ */ jsx5("th", { className: "py-2 pr-3", children: "Invoice" }),
                  /* @__PURE__ */ jsx5("th", { className: "py-2 pr-3", children: "Date" }),
                  /* @__PURE__ */ jsx5("th", { className: "py-2 pr-3", children: "Description" }),
                  /* @__PURE__ */ jsx5("th", { className: "py-2 pr-3", children: "Amount" }),
                  /* @__PURE__ */ jsx5("th", { className: "py-2", children: "Status" })
                ] }) }),
                /* @__PURE__ */ jsx5("tbody", { children: subscription.invoices.map((invoice) => /* @__PURE__ */ jsxs3("tr", { className: "border-t border-slate-100 dark:border-slate-800", children: [
                  /* @__PURE__ */ jsx5("td", { className: "py-3 pr-3 font-semibold text-slate-900 dark:text-slate-50", children: invoice.id }),
                  /* @__PURE__ */ jsx5("td", { className: "py-3 pr-3 text-slate-600 dark:text-slate-300", children: formatDate(invoice.issuedAt) }),
                  /* @__PURE__ */ jsx5("td", { className: "py-3 pr-3 text-slate-600 dark:text-slate-300", children: invoice.description || currentPlan?.name }),
                  /* @__PURE__ */ jsx5("td", { className: "py-3 pr-3 font-semibold text-slate-900 dark:text-slate-50", children: invoice.amountLabel || formatMoney(invoice.amount) }),
                  /* @__PURE__ */ jsx5("td", { className: "py-3", children: /* @__PURE__ */ jsx5("span", { className: cx("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", statusTone(invoice.status)), children: invoice.status }) })
                ] }, invoice.id)) })
              ] }) }) : /* @__PURE__ */ jsx5("div", { className: "rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/40 p-4 text-sm text-slate-500 dark:text-slate-400", children: "No paid invoices yet. The free plan does not create billing invoices." })
            }
          ),
          /* @__PURE__ */ jsx5(
            SectionCard,
            {
              title: "Billing profile",
              subtitle: "Subscription payment, support, and workspace governance status.",
              icon: /* @__PURE__ */ jsx5(CreditCard, { className: "h-5 w-5", style: { color: ORANGE } }),
              children: /* @__PURE__ */ jsxs3("div", { className: "space-y-3", children: [
                /* @__PURE__ */ jsxs3("div", { className: "rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-4", children: [
                  /* @__PURE__ */ jsx5("div", { className: "text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400", children: "Payment method" }),
                  /* @__PURE__ */ jsx5("div", { className: "mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50", children: subscription.paymentMethod?.label || subscription.billingMethod?.label || "Not set" }),
                  /* @__PURE__ */ jsx5("div", { className: "mt-1 text-xs text-slate-500 dark:text-slate-400", children: subscription.paymentMethod?.holderName || subscription.billingMethod?.holderName || subscription.billingEmail })
                ] }),
                /* @__PURE__ */ jsxs3("div", { className: "rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-4", children: [
                  /* @__PURE__ */ jsx5("div", { className: "text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400", children: "Workspace governance" }),
                  /* @__PURE__ */ jsxs3("div", { className: "mt-2 grid grid-cols-1 gap-2 text-sm text-slate-700 dark:text-slate-200", children: [
                    /* @__PURE__ */ jsxs3("div", { className: "flex items-center justify-between gap-3", children: [
                      /* @__PURE__ */ jsx5("span", { children: "Roles & permissions" }),
                      /* @__PURE__ */ jsx5("span", { className: "font-semibold", children: subscription.workspaceSummary.canManageRoles ? "Enabled" : "Limited" })
                    ] }),
                    /* @__PURE__ */ jsxs3("div", { className: "flex items-center justify-between gap-3", children: [
                      /* @__PURE__ */ jsx5("span", { children: "Approvals workflow" }),
                      /* @__PURE__ */ jsx5("span", { className: "font-semibold", children: subscription.workspaceSummary.approvalsEnabled ? "Enabled" : "Basic only" })
                    ] }),
                    /* @__PURE__ */ jsxs3("div", { className: "flex items-center justify-between gap-3", children: [
                      /* @__PURE__ */ jsx5("span", { children: "Audit exports" }),
                      /* @__PURE__ */ jsx5("span", { className: "font-semibold", children: subscription.workspaceSummary.auditExportsEnabled ? "Enabled" : "Not included" })
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ jsxs3("div", { className: "rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-4", children: [
                  /* @__PURE__ */ jsx5("div", { className: "text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400", children: "Support" }),
                  /* @__PURE__ */ jsxs3("div", { className: "mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-200", children: [
                    /* @__PURE__ */ jsxs3("div", { className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ jsx5(LifeBuoy, { className: "h-4 w-4", style: { color: ORANGE } }),
                      " ",
                      subscription.support.contactEmail
                    ] }),
                    /* @__PURE__ */ jsxs3("div", { className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ jsx5(Mail, { className: "h-4 w-4", style: { color: ORANGE } }),
                      " ",
                      subscription.support.salesEmail
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs3("div", { className: "mt-3 flex flex-wrap gap-2", children: [
                    /* @__PURE__ */ jsxs3(
                      "button",
                      {
                        type: "button",
                        onClick: () => {
                          if (typeof window !== "undefined") window.open(subscription.support.helpCenterUrl, "_blank", "noopener,noreferrer");
                        },
                        className: "inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-100",
                        children: [
                          "Open Help Center",
                          /* @__PURE__ */ jsx5(ExternalLink, { className: "h-4 w-4" })
                        ]
                      }
                    ),
                    /* @__PURE__ */ jsx5(
                      "button",
                      {
                        type: "button",
                        onClick: () => navigate("/roles-permissions"),
                        className: "inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-100",
                        children: "Manage roles"
                      }
                    )
                  ] })
                ] })
              ] })
            }
          )
        ] }),
        /* @__PURE__ */ jsx5(
          SectionCard,
          {
            title: "Feature comparison",
            subtitle: "Comparison content is now served from the backend subscription domain, so plan details stay consistent with runtime access logic.",
            icon: /* @__PURE__ */ jsx5(ShieldCheck, { className: "h-5 w-5", style: { color: ORANGE } }),
            children: /* @__PURE__ */ jsx5(ComparisonTable, { rows: subscription.comparisonRows })
          }
        ),
        /* @__PURE__ */ jsx5(
          SectionCard,
          {
            title: "Feature spotlights",
            subtitle: "Quick jump points into the tools unlocked or expanded by your subscription.",
            icon: /* @__PURE__ */ jsx5(Sparkles, { className: "h-5 w-5", style: { color: ORANGE } }),
            children: /* @__PURE__ */ jsx5("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4", children: subscription.featureSpotlights.map((feature) => /* @__PURE__ */ jsx5("div", { className: "rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-4", children: /* @__PURE__ */ jsxs3("div", { className: "flex items-start justify-between gap-3", children: [
              /* @__PURE__ */ jsxs3("div", { children: [
                /* @__PURE__ */ jsx5("div", { className: "text-sm font-bold text-slate-900 dark:text-slate-50", children: feature.title }),
                /* @__PURE__ */ jsx5("div", { className: "mt-1 text-sm text-slate-600 dark:text-slate-300", children: feature.description }),
                feature.minPlan ? /* @__PURE__ */ jsxs3("div", { className: "mt-2 text-xs text-slate-500 dark:text-slate-400", children: [
                  "Recommended from ",
                  feature.minPlan,
                  " and above"
                ] }) : null
              ] }),
              /* @__PURE__ */ jsxs3(
                "button",
                {
                  type: "button",
                  onClick: () => navigate(feature.route),
                  className: "inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-100",
                  children: [
                    "Open",
                    /* @__PURE__ */ jsx5(ExternalLink, { className: "h-3.5 w-3.5" })
                  ]
                }
              )
            ] }) }, feature.id)) })
          }
        )
      ] }) : null
    ] })
  ] });
}
function MySubscriptionPage() {
  return /* @__PURE__ */ jsx5(
    PermissionGate,
    {
      permission: "subscription.view",
      pageTitle: "My Subscription",
      subtitle: "Subscription access is controlled from Roles & Permissions for your workspace.",
      children: /* @__PURE__ */ jsx5(SubscriptionPageContent, {})
    }
  );
}
export {
  MySubscriptionPage as default
};
