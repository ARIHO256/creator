import { readAuthToken } from "./storage";
import type {
  AdBuilderCampaignRecord,
  ApprovalApplicationRecord,
  AdBuilderSummaryInput,
  AdzCampaignListFilters,
  AdzMarketplaceFilters,
  AdzMarketplaceRecord,
  AdzPerformanceRecord,
  ApiEnvelope,
  ApiErrorShape,
  ApiPaginationMeta,
  ApiResult,
  SaveAdBuilderInput,
  SaveLiveBuilderInput,
  AssetListFilters,
  AssetRecord,
  AuthSession,
  AuthUser,
  AppRole,
  BootstrapData,
  CrewAssignmentRecord,
  CrewWorkspaceRecord,
  DashboardFeedRecord,
  LandingContentRecord,
  MyDayWorkspaceRecord,
  CampaignBoardListFilters,
  CampaignBoardRow,
  CampaignListFilters,
  DealzMarketplaceFilters,
  DealzMarketplaceRecord,
  EndLiveSessionResult,
  CampaignRecord,
  ContractListFilters,
  ContractRecord,
  ContractTerminationInput,
  CreateAssetInput,
  ContentApprovalRecord,
  CreateContentApprovalInput,
  CreateUploadInput,
  CreateProposalInput,
  CreateTaskInput,
  CreatorSettings,
  AudienceNotificationsToolConfigRecord,
  AnalyticsOverviewRecord,
  EarningsSummaryRecord,
  SubscriptionRecord,
  UpdateSubscriptionInput,
  AuditLogRecord,
  LiveAlertsToolConfigRecord,
  LiveBuilderSessionRecord,
  LiveBuilderSummaryInput,
  LiveMomentInput,
  LiveReplayFilters,
  LiveReplayRecord,
  LiveSessionListFilters,
  LiveStudioWorkspace,
  OpportunityListFilters,
  OpportunityRecord,
  PayoutListFilters,
  PayoutRecord,
  PayoutSettingsActionInput,
  RequestPayoutInput,
  InviteListFilters,
  LinkListFilters,
  LinkRecord,
  CreateLinkInput,
  UpdateLinkInput,
  LoginInput,
  NotificationRecord,
  InviteRecord,
  OnboardingWorkflowRecord,
  PaginatedResult,
  PromoAdDetailRecord,
  PublicCreatorProfileRecord,
  ProposalListFilters,
  ProposalMessageInput,
  ProposalRecord,
  ProposalTransitionResult,
  RegisterInput,
  RespondInviteInput,
  ReviewsDashboardFilters,
  ReviewsDashboardRecord,
  ResubmitApprovalInput,
  SaveOnboardingDraftInput,
  SellerListFilters,
  SellerRecord,
  SubmitOnboardingInput,
  TaskAttachmentInput,
  TaskCommentInput,
  TaskListFilters,
  TaskRecord,
  TransitionProposalInput,
  UpdateApprovalDraftInput,
  UpdateAdzCampaignInput,
  UpdateAssetReviewInput,
  UpdateContentApprovalInput,
  UpdateLiveReplayInput,
  UploadListFilters,
  UploadRecord,
  UpdateProposalInput,
  UpdateTaskInput,
  RolesWorkspaceRecord,
  WorkspaceSecurityPolicy,
  UpdateWorkspaceSecurityInput,
  LiveCampaignGiveawayInventoryRecord,
  OverlayToolConfigRecord,
  StreamingToolConfigRecord,
  SafetyModerationToolConfigRecord,
  CreateWorkspaceRoleInput,
  UpdateWorkspaceRoleInput,
  DeleteWorkspaceRoleResult,
  InviteWorkspaceMemberInput,
  UpdateWorkspaceMemberInput,
  WorkspaceRoleRecord,
  WorkspaceMemberRecord
} from "./types";

const DEFAULT_API_BASE_URL = ((import.meta.env.VITE_MLDZ_API_BASE_URL as string | undefined) ?? "http://127.0.0.1:4010").replace(/\/$/, "");

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  query?: object;
  auth?: boolean;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function appendQueryValue(searchParams: URLSearchParams, key: string, value: unknown): void {
  if (value === undefined || value === null || value === "") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => appendQueryValue(searchParams, key, entry));
    return;
  }

  searchParams.append(key, String(value));
}

function buildUrl(baseUrl: string, path: string, query?: object): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalizedPath, `${baseUrl}/`);

  if (query) {
    Object.entries(query as Record<string, unknown>).forEach(([key, value]) => appendQueryValue(url.searchParams, key, value));
  }

  return url.toString();
}

function parseJsonSafe<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function isApiEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  return isObject(value) && value.ok === true && "data" in value;
}

function isApiErrorShape(value: unknown): value is ApiErrorShape {
  return isObject(value) && value.ok === false && isObject(value.error);
}

function normalizePaginatedResult<T>(result: ApiResult<T[]>): PaginatedResult<T> {
  return {
    items: result.data,
    meta: result.meta
  };
}

function isAbortLikeError(error: unknown): boolean {
  if (typeof DOMException !== "undefined" && error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  const name = typeof error === "object" && error !== null && "name" in error ? String((error as { name?: unknown }).name || "") : "";
  const message =
    typeof error === "object" && error !== null && "message" in error ? String((error as { message?: unknown }).message || "") : String(error || "");

  return name === "AbortError" || /aborted/i.test(message);
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly getToken: () => string | null;

  constructor(baseUrl = DEFAULT_API_BASE_URL, getToken: () => string | null = readAuthToken) {
    this.baseUrl = baseUrl;
    this.getToken = getToken;
  }

  private async requestResponse<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
    const url = buildUrl(this.baseUrl, path, options.query);
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");

    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }

    if (options.auth !== false) {
      const token = this.getToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    let response: Response;

    try {
      response = await fetch(url, {
        method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: options.signal
      });
    } catch (error) {
      if (isAbortLikeError(error)) {
        throw new ApiClientError(0, "REQUEST_ABORTED", "Request aborted.", error);
      }
      const message = error instanceof Error ? error.message : "Network request failed.";
      throw new ApiClientError(0, "NETWORK_ERROR", message, error);
    }

    if (response.status === 204) {
      return { data: undefined as T };
    }

    const rawText = await response.text();
    const parsed = rawText ? parseJsonSafe<unknown>(rawText) : null;

    if (!response.ok) {
      if (isApiErrorShape(parsed)) {
        throw new ApiClientError(response.status, parsed.error.code, parsed.error.message, parsed.error.details);
      }

      throw new ApiClientError(response.status, "HTTP_ERROR", response.statusText || "The request failed.", parsed);
    }

    if (isApiEnvelope<T>(parsed)) {
      return {
        data: parsed.data,
        meta: parsed.meta as ApiPaginationMeta | undefined
      };
    }

    return {
      data: parsed as T
    };
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const result = await this.requestResponse<T>(path, options);
    return result.data;
  }

  async get<T>(path: string, options: Omit<RequestOptions, "method" | "body"> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  async post<T>(path: string, body?: unknown, options: Omit<RequestOptions, "method" | "body"> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: "POST", body });
  }

  async patch<T>(path: string, body?: unknown, options: Omit<RequestOptions, "method" | "body"> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: "PATCH", body });
  }

  async login(payload: LoginInput, signal?: AbortSignal): Promise<AuthSession> {
    return this.post<AuthSession>("/api/auth/login", payload, { auth: false, signal });
  }

  async register(payload: RegisterInput, signal?: AbortSignal): Promise<AuthSession> {
    return this.post<AuthSession>("/api/auth/register", payload, { auth: false, signal });
  }

  async logout(signal?: AbortSignal): Promise<void> {
    await this.post<void>("/api/auth/logout", undefined, { signal });
  }

  async getMe(signal?: AbortSignal): Promise<{ user: AuthUser }> {
    return this.get<{ user: AuthUser }>("/api/me", { signal });
  }

  async switchRole(role: AppRole, signal?: AbortSignal): Promise<{ user: AuthUser }> {
    return this.post<{ user: AuthUser }>("/api/auth/switch-role", { role }, { signal });
  }

  async getBootstrap(signal?: AbortSignal): Promise<BootstrapData> {
    return this.get<BootstrapData>("/api/app/bootstrap", { signal });
  }

  async getLandingContent(signal?: AbortSignal): Promise<LandingContentRecord> {
    return this.get<LandingContentRecord>("/api/landing/content", { signal, auth: false });
  }

  async getDashboardFeed(signal?: AbortSignal): Promise<DashboardFeedRecord> {
    return this.get<DashboardFeedRecord>("/api/dashboard/feed", { signal });
  }

  async getMyDayWorkspace(signal?: AbortSignal): Promise<MyDayWorkspaceRecord> {
    return this.get<MyDayWorkspaceRecord>("/api/dashboard/my-day", { signal });
  }

  async getPublicCreatorProfile(handle: string, signal?: AbortSignal): Promise<PublicCreatorProfileRecord> {
    return this.get<PublicCreatorProfileRecord>(`/api/public-profile/${encodeURIComponent(handle)}`, { signal, auth: false });
  }

  async getReviewsDashboard(filters: ReviewsDashboardFilters = {}, signal?: AbortSignal): Promise<ReviewsDashboardRecord> {
    return this.get<ReviewsDashboardRecord>("/api/reviews/dashboard", { query: filters, signal });
  }

  async getSettings(signal?: AbortSignal): Promise<CreatorSettings> {
    return this.get<CreatorSettings>("/api/settings", { signal });
  }

  async getRolesWorkspace(signal?: AbortSignal): Promise<RolesWorkspaceRecord> {
    return this.get<RolesWorkspaceRecord>("/api/roles", { signal });
  }

  async updateWorkspaceSecurity(payload: UpdateWorkspaceSecurityInput, signal?: AbortSignal): Promise<WorkspaceSecurityPolicy> {
    return this.patch<WorkspaceSecurityPolicy>("/api/roles/security", payload, { signal });
  }

  async listAuditLogs(signal?: AbortSignal): Promise<AuditLogRecord[]> {
    return this.get<AuditLogRecord[]>("/api/audit-logs", { signal });
  }

  async createWorkspaceRole(payload: CreateWorkspaceRoleInput, signal?: AbortSignal): Promise<WorkspaceRoleRecord> {
    return this.post<WorkspaceRoleRecord>("/api/roles", payload, { signal });
  }

  async updateWorkspaceRole(roleId: string, payload: UpdateWorkspaceRoleInput, signal?: AbortSignal): Promise<WorkspaceRoleRecord> {
    return this.patch<WorkspaceRoleRecord>(`/api/roles/${encodeURIComponent(roleId)}`, payload, { signal });
  }

  async deleteWorkspaceRole(roleId: string, signal?: AbortSignal): Promise<DeleteWorkspaceRoleResult> {
    return this.request<DeleteWorkspaceRoleResult>(`/api/roles/${encodeURIComponent(roleId)}`, { method: "DELETE", signal });
  }

  async inviteWorkspaceMember(payload: InviteWorkspaceMemberInput, signal?: AbortSignal): Promise<WorkspaceMemberRecord> {
    return this.post<WorkspaceMemberRecord>("/api/roles/invites", payload, { signal });
  }

  async updateWorkspaceMember(memberId: string, payload: UpdateWorkspaceMemberInput, signal?: AbortSignal): Promise<WorkspaceMemberRecord> {
    return this.patch<WorkspaceMemberRecord>(`/api/roles/members/${encodeURIComponent(memberId)}`, payload, { signal });
  }

  async getLiveCampaignGiveawayInventory(campaignId: string, options: { sessionId?: string; signal?: AbortSignal } = {}): Promise<LiveCampaignGiveawayInventoryRecord> {
    return this.get<LiveCampaignGiveawayInventoryRecord>(`/api/live/campaigns/${encodeURIComponent(campaignId)}/giveaways`, {
      query: options.sessionId ? { sessionId: options.sessionId } : undefined,
      signal: options.signal
    });
  }

  async updateSettings(patch: Partial<CreatorSettings>, signal?: AbortSignal): Promise<CreatorSettings> {
    return this.patch<CreatorSettings>("/api/settings", patch, { signal });
  }

  async sendPayoutVerificationCode(payload: PayoutSettingsActionInput = {}, signal?: AbortSignal): Promise<CreatorSettings> {
    return this.post<CreatorSettings>("/api/settings/payout/send-code", payload, { signal });
  }

  async verifyPayoutSettings(payload: PayoutSettingsActionInput = {}, signal?: AbortSignal): Promise<CreatorSettings> {
    return this.post<CreatorSettings>("/api/settings/payout/verify", payload, { signal });
  }

  async removeSettingsDevice(deviceId: string, signal?: AbortSignal): Promise<CreatorSettings> {
    return this.request<CreatorSettings>(`/api/settings/devices/${encodeURIComponent(deviceId)}`, { method: "DELETE", signal });
  }

  async signOutAllSettingsDevices(signal?: AbortSignal): Promise<CreatorSettings> {
    return this.post<CreatorSettings>("/api/settings/devices/sign-out-all", undefined, { signal });
  }

  async listUploads(filters: UploadListFilters = {}, signal?: AbortSignal): Promise<UploadRecord[]> {
    return this.get<UploadRecord[]>("/api/uploads", { query: filters, signal });
  }

  async createUpload(payload: CreateUploadInput, signal?: AbortSignal): Promise<UploadRecord> {
    return this.post<UploadRecord>("/api/uploads", payload, { signal });
  }

  async getOnboardingWorkflow(signal?: AbortSignal): Promise<OnboardingWorkflowRecord> {
    return this.get<OnboardingWorkflowRecord>("/api/onboarding", { signal });
  }

  async saveOnboardingDraft(payload: SaveOnboardingDraftInput, signal?: AbortSignal): Promise<OnboardingWorkflowRecord> {
    return this.patch<OnboardingWorkflowRecord>("/api/onboarding", payload, { signal });
  }

  async resetOnboardingWorkflow(signal?: AbortSignal): Promise<OnboardingWorkflowRecord> {
    return this.post<OnboardingWorkflowRecord>("/api/onboarding/reset", undefined, { signal });
  }

  async submitOnboarding(payload: SubmitOnboardingInput, signal?: AbortSignal): Promise<{ onboarding: OnboardingWorkflowRecord; approval: ApprovalApplicationRecord }> {
    return this.post<{ onboarding: OnboardingWorkflowRecord; approval: ApprovalApplicationRecord }>("/api/onboarding/submit", payload, { signal });
  }

  async getAccountApproval(signal?: AbortSignal): Promise<ApprovalApplicationRecord> {
    return this.get<ApprovalApplicationRecord>("/api/account-approval", { signal });
  }

  async updateAccountApprovalDraft(payload: UpdateApprovalDraftInput, signal?: AbortSignal): Promise<ApprovalApplicationRecord> {
    return this.patch<ApprovalApplicationRecord>("/api/account-approval", payload, { signal });
  }

  async refreshAccountApproval(signal?: AbortSignal): Promise<ApprovalApplicationRecord> {
    return this.post<ApprovalApplicationRecord>("/api/account-approval/refresh", undefined, { signal });
  }

  async resubmitAccountApproval(payload: ResubmitApprovalInput, signal?: AbortSignal): Promise<ApprovalApplicationRecord> {
    return this.post<ApprovalApplicationRecord>("/api/account-approval/resubmit", payload, { signal });
  }

  async devApproveAccountApproval(signal?: AbortSignal): Promise<ApprovalApplicationRecord> {
    return this.post<ApprovalApplicationRecord>("/api/account-approval/dev-approve", undefined, { signal });
  }

  async listContentApprovals(signal?: AbortSignal): Promise<ContentApprovalRecord[]> {
    return this.get<ContentApprovalRecord[]>("/api/content-approvals", { signal });
  }

  async getContentApproval(submissionId: string, signal?: AbortSignal): Promise<ContentApprovalRecord> {
    return this.get<ContentApprovalRecord>(`/api/content-approvals/${encodeURIComponent(submissionId)}`, { signal });
  }

  async createContentApproval(payload: CreateContentApprovalInput, signal?: AbortSignal): Promise<ContentApprovalRecord> {
    return this.post<ContentApprovalRecord>("/api/content-approvals", payload, { signal });
  }

  async updateContentApproval(submissionId: string, payload: UpdateContentApprovalInput, signal?: AbortSignal): Promise<ContentApprovalRecord> {
    return this.patch<ContentApprovalRecord>(`/api/content-approvals/${encodeURIComponent(submissionId)}`, payload, { signal });
  }

  async nudgeContentApproval(submissionId: string, signal?: AbortSignal): Promise<ContentApprovalRecord> {
    return this.post<ContentApprovalRecord>(`/api/content-approvals/${encodeURIComponent(submissionId)}/nudge`, undefined, { signal });
  }

  async withdrawContentApproval(submissionId: string, signal?: AbortSignal): Promise<ContentApprovalRecord> {
    return this.post<ContentApprovalRecord>(`/api/content-approvals/${encodeURIComponent(submissionId)}/withdraw`, undefined, { signal });
  }

  async resubmitContentApproval(submissionId: string, payload: UpdateContentApprovalInput = {}, signal?: AbortSignal): Promise<ContentApprovalRecord> {
    return this.post<ContentApprovalRecord>(`/api/content-approvals/${encodeURIComponent(submissionId)}/resubmit`, payload, { signal });
  }

  async listNotifications(signal?: AbortSignal): Promise<NotificationRecord[]> {
    return this.get<NotificationRecord[]>("/api/notifications", { signal });
  }

  async markNotificationRead(id: string, signal?: AbortSignal): Promise<NotificationRecord> {
    return this.patch<NotificationRecord>(`/api/notifications/${encodeURIComponent(id)}/read`, undefined, { signal });
  }

  async markAllNotificationsRead(signal?: AbortSignal): Promise<{ updated: number }> {
    return this.post<{ updated: number }>("/api/notifications/read-all", undefined, { signal });
  }

  async getEarningsSummary(signal?: AbortSignal): Promise<EarningsSummaryRecord> {
    return this.get<EarningsSummaryRecord>("/api/earnings/summary", { signal });
  }

  async listPayouts(filters: PayoutListFilters = {}, signal?: AbortSignal): Promise<PaginatedResult<PayoutRecord>> {
    const result = await this.requestResponse<PayoutRecord[]>("/api/earnings/payouts", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }

  async requestPayout(payload: RequestPayoutInput, signal?: AbortSignal): Promise<PayoutRecord> {
    return this.post<PayoutRecord>("/api/earnings/payouts/request", payload, { signal });
  }

  async getAnalyticsOverview(signal?: AbortSignal): Promise<AnalyticsOverviewRecord> {
    return this.get<AnalyticsOverviewRecord>("/api/analytics/overview", { signal });
  }

  async getSubscription(signal?: AbortSignal): Promise<SubscriptionRecord> {
    return this.get<SubscriptionRecord>("/api/subscription", { signal });
  }

  async updateSubscription(payload: UpdateSubscriptionInput, signal?: AbortSignal): Promise<SubscriptionRecord> {
    return this.patch<SubscriptionRecord>("/api/subscription", payload, { signal });
  }

  async listOpportunities(filters: OpportunityListFilters = {}, signal?: AbortSignal): Promise<PaginatedResult<OpportunityRecord>> {
    const result = await this.requestResponse<OpportunityRecord[]>("/api/opportunities", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }

  async listInvites(filters: InviteListFilters = {}, signal?: AbortSignal): Promise<PaginatedResult<InviteRecord>> {
    const result = await this.requestResponse<InviteRecord[]>("/api/invites", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }

  async respondToInvite(inviteId: string, payload: RespondInviteInput, signal?: AbortSignal): Promise<InviteRecord> {
    return this.post<InviteRecord>(`/api/invites/${encodeURIComponent(inviteId)}/respond`, payload, { signal });
  }

  async setOpportunitySaved(opportunityId: string, saved: boolean, signal?: AbortSignal): Promise<OpportunityRecord> {
    return this.post<OpportunityRecord>(`/api/opportunities/${encodeURIComponent(opportunityId)}/save`, { saved }, { signal });
  }

  async listSellers(filters: SellerListFilters = {}, signal?: AbortSignal): Promise<PaginatedResult<SellerRecord>> {
    const result = await this.requestResponse<SellerRecord[]>("/api/sellers", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }

  async listMySellers(filters: SellerListFilters = {}, signal?: AbortSignal): Promise<PaginatedResult<SellerRecord>> {
    const result = await this.requestResponse<SellerRecord[]>("/api/my-sellers", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }

  async setSellerFollow(sellerId: string, follow: boolean, signal?: AbortSignal): Promise<SellerRecord> {
    return this.post<SellerRecord>(`/api/sellers/${encodeURIComponent(sellerId)}/follow`, { follow }, { signal });
  }

  async listProposals(filters: ProposalListFilters = {}, signal?: AbortSignal): Promise<PaginatedResult<ProposalRecord>> {
    const result = await this.requestResponse<ProposalRecord[]>("/api/proposals", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }

  async getProposal(proposalId: string, signal?: AbortSignal): Promise<ProposalRecord> {
    return this.get<ProposalRecord>(`/api/proposals/${encodeURIComponent(proposalId)}`, { signal });
  }

  async updateProposal(proposalId: string, payload: UpdateProposalInput, signal?: AbortSignal): Promise<ProposalRecord> {
    return this.patch<ProposalRecord>(`/api/proposals/${encodeURIComponent(proposalId)}`, payload, { signal });
  }

  async createProposal(payload: CreateProposalInput, signal?: AbortSignal): Promise<ProposalRecord> {
    return this.post<ProposalRecord>("/api/proposals", payload, { signal });
  }

  async sendProposalMessage(proposalId: string, payload: ProposalMessageInput, signal?: AbortSignal): Promise<ProposalRecord> {
    return this.post<ProposalRecord>(`/api/proposals/${encodeURIComponent(proposalId)}/messages`, payload, { signal });
  }

  async transitionProposal(proposalId: string, payload: TransitionProposalInput, signal?: AbortSignal): Promise<ProposalTransitionResult> {
    return this.post<ProposalTransitionResult>(`/api/proposals/${encodeURIComponent(proposalId)}/transition`, payload, { signal });
  }

  async listCampaigns(filters: CampaignListFilters = {}, signal?: AbortSignal): Promise<PaginatedResult<CampaignRecord>> {
    const result = await this.requestResponse<CampaignRecord[]>("/api/campaigns", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }

  async listCampaignBoard(filters: CampaignBoardListFilters = {}, signal?: AbortSignal): Promise<PaginatedResult<CampaignBoardRow>> {
    const result = await this.requestResponse<CampaignBoardRow[]>("/api/campaign-board", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }

  async listDealzMarketplace(filters: DealzMarketplaceFilters = {}, signal?: AbortSignal): Promise<PaginatedResult<DealzMarketplaceRecord>> {
    const result = await this.requestResponse<DealzMarketplaceRecord[]>("/api/dealz-marketplace", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }

  async listContracts(filters: ContractListFilters = {}, signal?: AbortSignal): Promise<PaginatedResult<ContractRecord>> {
    const result = await this.requestResponse<ContractRecord[]>("/api/contracts", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }

  async getContract(contractId: string, signal?: AbortSignal): Promise<ContractRecord> {
    return this.get<ContractRecord>(`/api/contracts/${encodeURIComponent(contractId)}`, { signal });
  }

  async requestContractTermination(contractId: string, payload: ContractTerminationInput, signal?: AbortSignal): Promise<ContractRecord> {
    return this.post<ContractRecord>(`/api/contracts/${encodeURIComponent(contractId)}/terminate-request`, payload, { signal });
  }

  async listTasks(filters: TaskListFilters = {}, signal?: AbortSignal): Promise<PaginatedResult<TaskRecord>> {
    const result = await this.requestResponse<TaskRecord[]>("/api/tasks", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }

  async getTask(taskId: string, signal?: AbortSignal): Promise<TaskRecord> {
    return this.get<TaskRecord>(`/api/tasks/${encodeURIComponent(taskId)}`, { signal });
  }

  async createTask(payload: CreateTaskInput, signal?: AbortSignal): Promise<TaskRecord> {
    return this.post<TaskRecord>("/api/tasks", payload, { signal });
  }

  async updateTask(taskId: string, payload: UpdateTaskInput, signal?: AbortSignal): Promise<TaskRecord> {
    return this.patch<TaskRecord>(`/api/tasks/${encodeURIComponent(taskId)}`, payload, { signal });
  }

  async addTaskComment(taskId: string, payload: TaskCommentInput, signal?: AbortSignal): Promise<TaskRecord> {
    return this.post<TaskRecord>(`/api/tasks/${encodeURIComponent(taskId)}/comments`, payload, { signal });
  }

  async addTaskAttachment(taskId: string, payload: TaskAttachmentInput, signal?: AbortSignal): Promise<TaskRecord> {
    return this.post<TaskRecord>(`/api/tasks/${encodeURIComponent(taskId)}/attachments`, payload, { signal });
  }

  async listAssets(filters: AssetListFilters = {}, signal?: AbortSignal): Promise<PaginatedResult<AssetRecord>> {
    const result = await this.requestResponse<AssetRecord[]>("/api/assets", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }

  async getAsset(assetId: string, signal?: AbortSignal): Promise<AssetRecord> {
    return this.get<AssetRecord>(`/api/assets/${encodeURIComponent(assetId)}`, { signal });
  }

  async createAsset(payload: CreateAssetInput, signal?: AbortSignal): Promise<AssetRecord> {
    return this.post<AssetRecord>("/api/assets", payload, { signal });
  }

  async updateAssetReview(assetId: string, payload: UpdateAssetReviewInput, signal?: AbortSignal): Promise<AssetRecord> {
    return this.patch<AssetRecord>(`/api/assets/${encodeURIComponent(assetId)}/review`, payload, { signal });
  }

  async getLiveBuilderSession(sessionId: string, signal?: AbortSignal): Promise<LiveBuilderSessionRecord> {
    return this.get<LiveBuilderSessionRecord>(`/api/live/builder/${encodeURIComponent(sessionId)}`, { signal });
  }

  async saveLiveBuilderSession(payload: SaveLiveBuilderInput, signal?: AbortSignal): Promise<LiveBuilderSessionRecord> {
    return this.post<LiveBuilderSessionRecord>("/api/live/builder/save", payload, { signal });
  }

  async publishLiveBuilderSession(
    sessionId: string,
    payload?: { status?: string; summary?: LiveBuilderSummaryInput },
    signal?: AbortSignal
  ): Promise<LiveBuilderSessionRecord> {
    return this.post<LiveBuilderSessionRecord>(`/api/live/builder/${encodeURIComponent(sessionId)}/publish`, payload, { signal });
  }

  async getAdBuilderCampaign(adId: string, signal?: AbortSignal): Promise<AdBuilderCampaignRecord> {
    return this.get<AdBuilderCampaignRecord>(`/api/adz/builder/${encodeURIComponent(adId)}`, { signal });
  }

  async saveAdBuilderCampaign(payload: SaveAdBuilderInput, signal?: AbortSignal): Promise<AdBuilderCampaignRecord> {
    return this.post<AdBuilderCampaignRecord>("/api/adz/builder/save", payload, { signal });
  }

  async publishAdBuilderCampaign(
    adId: string,
    payload?: { status?: string; summary?: AdBuilderSummaryInput },
    signal?: AbortSignal
  ): Promise<AdBuilderCampaignRecord> {
    return this.post<AdBuilderCampaignRecord>(`/api/adz/builder/${encodeURIComponent(adId)}/publish`, payload, { signal });
  }

  async listLiveSessions(filters: LiveSessionListFilters = {}, signal?: AbortSignal): Promise<PaginatedResult<LiveBuilderSessionRecord>> {
    const result = await this.requestResponse<LiveBuilderSessionRecord[]>("/api/live/sessions", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }

  async getLiveSession(sessionId: string, signal?: AbortSignal): Promise<LiveBuilderSessionRecord> {
    return this.get<LiveBuilderSessionRecord>(`/api/live/sessions/${encodeURIComponent(sessionId)}`, { signal });
  }

  async getLiveStudio(sessionId: string, signal?: AbortSignal): Promise<LiveStudioWorkspace> {
    return this.get<LiveStudioWorkspace>(`/api/live/studio/${encodeURIComponent(sessionId)}`, { signal });
  }

  async getDefaultLiveStudio(signal?: AbortSignal): Promise<LiveStudioWorkspace> {
    return this.get<LiveStudioWorkspace>("/api/live/studio/default", { signal });
  }

  async startLiveSession(sessionId: string, signal?: AbortSignal): Promise<LiveBuilderSessionRecord> {
    return this.post<LiveBuilderSessionRecord>(`/api/live/studio/${encodeURIComponent(sessionId)}/start`, undefined, { signal });
  }

  async endLiveSession(sessionId: string, signal?: AbortSignal): Promise<EndLiveSessionResult> {
    return this.post<EndLiveSessionResult>(`/api/live/studio/${encodeURIComponent(sessionId)}/end`, undefined, { signal });
  }

  async addLiveMoment(sessionId: string, payload: LiveMomentInput, signal?: AbortSignal): Promise<LiveBuilderSessionRecord> {
    return this.post<LiveBuilderSessionRecord>(`/api/live/studio/${encodeURIComponent(sessionId)}/moments`, payload, { signal });
  }

  async listLiveReplays(filters: LiveReplayFilters = {}, signal?: AbortSignal): Promise<PaginatedResult<LiveReplayRecord>> {
    const result = await this.requestResponse<LiveReplayRecord[]>("/api/live/replays", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }

  async getReplay(replayId: string, signal?: AbortSignal): Promise<LiveReplayRecord> {
    return this.get<LiveReplayRecord>(`/api/live/replays/${encodeURIComponent(replayId)}`, { signal });
  }

  async getReplayBySession(sessionId: string, signal?: AbortSignal): Promise<LiveReplayRecord> {
    return this.get<LiveReplayRecord>(`/api/live/replays/by-session/${encodeURIComponent(sessionId)}`, { signal });
  }

  async updateReplay(replayId: string, payload: UpdateLiveReplayInput, signal?: AbortSignal): Promise<LiveReplayRecord> {
    return this.patch<LiveReplayRecord>(`/api/live/replays/${encodeURIComponent(replayId)}`, payload, { signal });
  }

  async publishReplay(replayId: string, payload?: UpdateLiveReplayInput, signal?: AbortSignal): Promise<LiveReplayRecord> {
    return this.post<LiveReplayRecord>(`/api/live/replays/${encodeURIComponent(replayId)}/publish`, payload, { signal });
  }

  async listAdzCampaigns(filters: AdzCampaignListFilters = {}, signal?: AbortSignal): Promise<PaginatedResult<AdBuilderCampaignRecord>> {
    const result = await this.requestResponse<AdBuilderCampaignRecord[]>("/api/adz/campaigns", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }

  async listAdzMarketplace(filters: AdzMarketplaceFilters = {}, signal?: AbortSignal): Promise<PaginatedResult<AdzMarketplaceRecord>> {
    const result = await this.requestResponse<AdzMarketplaceRecord[]>("/api/adz/marketplace", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }

  async getAdzCampaign(campaignId: string, signal?: AbortSignal): Promise<AdBuilderCampaignRecord> {
    return this.get<AdBuilderCampaignRecord>(`/api/adz/campaigns/${encodeURIComponent(campaignId)}`, { signal });
  }

  async updateAdzCampaign(campaignId: string, payload: UpdateAdzCampaignInput, signal?: AbortSignal): Promise<AdBuilderCampaignRecord> {
    return this.patch<AdBuilderCampaignRecord>(`/api/adz/campaigns/${encodeURIComponent(campaignId)}`, payload, { signal });
  }

  async getAdzPerformance(campaignId: string, signal?: AbortSignal): Promise<AdzPerformanceRecord> {
    return this.get<AdzPerformanceRecord>(`/api/adz/campaigns/${encodeURIComponent(campaignId)}/performance`, { signal });
  }

  async getPromoAdDetail(campaignId: string, signal?: AbortSignal): Promise<PromoAdDetailRecord> {
    return this.get<PromoAdDetailRecord>(`/api/promo-ads/${encodeURIComponent(campaignId)}`, { signal });
  }

  async getCrewWorkspace(signal?: AbortSignal): Promise<CrewWorkspaceRecord> {
    return this.get<CrewWorkspaceRecord>("/api/crew", { signal });
  }

  async updateCrewSession(sessionId: string, payload: { assignments: CrewAssignmentRecord[] }, signal?: AbortSignal): Promise<{ sessionId: string; assignments: CrewAssignmentRecord[]; updatedAt?: string }> {
    return this.patch<{ sessionId: string; assignments: CrewAssignmentRecord[]; updatedAt?: string }>(`/api/crew/sessions/${encodeURIComponent(sessionId)}`, payload, { signal });
  }

  async getAudienceNotificationsTool(signal?: AbortSignal): Promise<AudienceNotificationsToolConfigRecord> {
    return this.get<AudienceNotificationsToolConfigRecord>("/api/tools/audience-notifications", { signal });
  }

  async updateAudienceNotificationsTool(payload: Partial<AudienceNotificationsToolConfigRecord>, signal?: AbortSignal): Promise<AudienceNotificationsToolConfigRecord> {
    return this.patch<AudienceNotificationsToolConfigRecord>("/api/tools/audienceNotifications", payload, { signal });
  }

  async getLiveAlertsTool(signal?: AbortSignal): Promise<LiveAlertsToolConfigRecord> {
    return this.get<LiveAlertsToolConfigRecord>("/api/tools/live-alerts", { signal });
  }

  async updateLiveAlertsTool(payload: Partial<LiveAlertsToolConfigRecord>, signal?: AbortSignal): Promise<LiveAlertsToolConfigRecord> {
    return this.patch<LiveAlertsToolConfigRecord>("/api/tools/liveAlerts", payload, { signal });
  }

  async getOverlaysTool(signal?: AbortSignal): Promise<OverlayToolConfigRecord> {
    return this.get<OverlayToolConfigRecord>("/api/tools/overlays", { signal });
  }

  async updateOverlaysTool(payload: Partial<OverlayToolConfigRecord>, signal?: AbortSignal): Promise<OverlayToolConfigRecord> {
    return this.patch<OverlayToolConfigRecord>("/api/tools/overlays", payload, { signal });
  }

  async getStreamingTool(signal?: AbortSignal): Promise<StreamingToolConfigRecord> {
    return this.get<StreamingToolConfigRecord>("/api/tools/streaming", { signal });
  }

  async updateStreamingTool(payload: Partial<StreamingToolConfigRecord>, signal?: AbortSignal): Promise<StreamingToolConfigRecord> {
    return this.patch<StreamingToolConfigRecord>("/api/tools/streaming", payload, { signal });
  }

  async getSafetyTool(signal?: AbortSignal): Promise<SafetyModerationToolConfigRecord> {
    return this.get<SafetyModerationToolConfigRecord>("/api/tools/safety", { signal });
  }

  async updateSafetyTool(payload: Partial<SafetyModerationToolConfigRecord>, signal?: AbortSignal): Promise<SafetyModerationToolConfigRecord> {
    return this.patch<SafetyModerationToolConfigRecord>("/api/tools/safety", payload, { signal });
  }

  async listLinks(filters: LinkListFilters = {}, signal?: AbortSignal): Promise<PaginatedResult<LinkRecord>> {
    const result = await this.requestResponse<LinkRecord[]>("/api/links", { method: "GET", query: filters, signal });
    return normalizePaginatedResult(result);
  }

  async getLink(linkId: string, signal?: AbortSignal): Promise<LinkRecord> {
    return this.get<LinkRecord>(`/api/links/${encodeURIComponent(linkId)}`, { signal });
  }

  async createLink(payload: CreateLinkInput, signal?: AbortSignal): Promise<LinkRecord> {
    return this.post<LinkRecord>("/api/links", payload, { signal });
  }

  async updateLink(linkId: string, payload: UpdateLinkInput, signal?: AbortSignal): Promise<LinkRecord> {
    return this.patch<LinkRecord>(`/api/links/${encodeURIComponent(linkId)}`, payload, { signal });
  }
}

export const apiClient = new ApiClient();
