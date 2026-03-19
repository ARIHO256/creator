import { api } from "./api";

function withQuery(path: string, params?: Record<string, string | number | boolean | undefined | null>) {
  if (!params) return path;
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export type CreatorNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  kind?: string | null;
  read: boolean;
  readAt?: string | null;
  brand?: string | null;
  campaign?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  metadata?: Record<string, unknown>;
};

export type EarningsSummary = {
  available: number;
  pending: number;
  lifetime: number;
};

export type PayoutMethodRecord = {
  id: string;
  kind?: string;
  type?: string;
  provider?: string;
  label?: string;
  currency?: string;
  status?: string;
  isDefault?: boolean;
  masked?: string;
  details?: Record<string, unknown>;
};

export type PayoutMethodsResponse = {
  methods: PayoutMethodRecord[];
  metadata?: Record<string, unknown>;
};

export type SubscriptionResponse = {
  plan: string;
  cycle: string;
  status: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type AccountApprovalResponse = {
  status?: string;
  progressPercent?: number;
  reviewer?: string;
  reviewNotes?: string;
  submittedAt?: string;
  reviewedAt?: string;
  approvedAt?: string;
  requiredActions?: Array<Record<string, unknown>>;
  documents?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
};

export type PublicSellerRecord = {
  id: string;
  handle?: string | null;
  name?: string | null;
  displayName?: string | null;
  storefrontName?: string | null;
  type?: string | null;
  kind?: string | null;
  category?: string | null;
  categories?: string[];
  region?: string | null;
  description?: string | null;
  languages?: string[];
  website?: string | null;
  rating?: number | null;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type OpportunityRecord = {
  id: string;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  budget?: number | null;
  currency?: string | null;
  region?: string | null;
  language?: string | null;
  category?: string | null;
  categories?: string[];
  metadata?: Record<string, unknown>;
  seller?: PublicSellerRecord | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type InviteRecord = {
  id: string;
  title?: string | null;
  message?: string | null;
  status?: string | null;
  seller?: string | null;
  sellerInitials?: string | null;
  campaign?: string | null;
  type?: string | null;
  category?: string | null;
  region?: string | null;
  baseFee?: number | null;
  currency?: string | null;
  commissionPct?: number | null;
  estimatedValue?: number | null;
  fitScore?: number | null;
  fitReason?: string | null;
  messageShort?: string | null;
  lastActivity?: string | null;
  supplierDescription?: string | null;
  supplierRating?: number | null;
  sender?: string | null;
  opportunityId?: string | null;
  campaignId?: string | null;
  proposalId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type CollaborationCampaignRecord = {
  id: string;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  budget?: number | null;
  currency?: string | null;
  seller?: string | null;
  creator?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
};

export type ProposalRecord = {
  id: string;
  title?: string | null;
  summary?: string | null;
  amount?: number | null;
  currency?: string | null;
  status?: string | null;
  sellerId?: string | null;
  sellerName?: string | null;
  creatorId?: string | null;
  creatorName?: string | null;
  campaignId?: string | null;
  campaignTitle?: string | null;
  metadata?: Record<string, unknown>;
  messages?: Array<Record<string, unknown>>;
  createdAt?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
};

export type ContractRecord = {
  id: string;
  status?: string | null;
  seller?: string | null;
  sellerName?: string | null;
  creator?: string | null;
  creatorName?: string | null;
  campaign?: string | null;
  campaignName?: string | null;
  brand?: string | null;
  currency?: string | null;
  value?: number | null;
  totalTasks?: number | null;
  deliverables?: unknown[];
  metadata?: Record<string, unknown>;
  createdAt?: string | null;
  updatedAt?: string | null;
  terminationReason?: string | null;
  [key: string]: unknown;
};

export type TaskRecord = {
  id: string;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  dueAt?: string | null;
  campaign?: Record<string, unknown> | null;
  contract?: ContractRecord | null;
  createdBy?: Record<string, unknown> | null;
  assignee?: Record<string, unknown> | null;
  comments?: Array<Record<string, unknown>>;
  attachments?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
  createdAt?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
};

export type AuditLogRecord = {
  id: string;
  action?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  route?: string | null;
  method?: string | null;
  statusCode?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  [key: string]: unknown;
};

export type FinancePayoutRecord = {
  id: string;
  createdAt?: string;
  amount?: number;
  currency?: string;
  note?: string | null;
  status?: string | null;
  type?: string | null;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type ReviewsDashboardResponse = {
  score?: number;
  trends?: Array<Record<string, unknown>>;
  total?: number;
};

export type ReviewsSummaryResponse = {
  total?: number;
  publicCount?: number;
  average?: number;
};

export type CreatorPublicProfileResponse = {
  creator?: {
    id?: string;
    profileId?: string;
    avatarUrl?: string | null;
    name?: string;
    handle?: string;
    tier?: string;
    verified?: boolean;
    region?: string;
    initials?: string;
    categories?: string[];
    tagline?: string;
    bio?: string;
    languages?: string[];
    markets?: string[];
    followers?: number;
    followersLabel?: string;
    avgLiveViewersLabel?: string;
    totalSalesDrivenLabel?: string;
    rating?: number;
    completedCollabs?: number;
    reviewCount?: number;
    isFollowing?: boolean;
  };
  performance?: Array<{ label?: string; value?: string; sub?: string }>;
  portfolio?: Array<{
    id?: string;
    brand?: string;
    category?: string;
    title?: string;
    body?: string;
    actionLabel?: string;
  }>;
  liveSlots?: Array<{ id?: string; label?: string; title?: string; time?: string; cta?: string }>;
  reviews?: Array<{ id?: string; brand?: string; quote?: string }>;
  socials?: Array<{
    id?: string;
    name?: string;
    handle?: string;
    tag?: string;
    color?: string;
    href?: string | null;
    followers?: string | number | null;
  }>;
  pastCampaigns?: Array<{
    id?: string;
    title?: string;
    period?: string;
    gmv?: string;
    ctr?: string;
    conv?: string;
  }>;
  tags?: string[];
  compatibility?: {
    score?: number;
    summary?: string;
    bullets?: string[];
  };
  quickFacts?: string[];
  deckContent?: string;
};

export type ReviewRecord = {
  id: string;
  subjectUserId?: string | null;
  reviewerUserId?: string | null;
  subjectId?: string | null;
  sessionId?: string | null;
  campaignId?: string | null;
  title?: string | null;
  buyerName?: string | null;
  buyerType?: string | null;
  roleTarget?: string | null;
  itemType?: string | null;
  channel?: string | null;
  marketplace?: string | null;
  mldzSurface?: string | null;
  sentiment?: string | null;
  requiresResponse?: boolean | null;
  ratingOverall?: number | null;
  ratingBreakdown?: Record<string, unknown> | null;
  quickTags?: unknown[];
  issueTags?: unknown[];
  reviewText?: string | null;
  wouldJoinAgain?: boolean | null;
  transactionIntent?: string | null;
  isPublic?: boolean | null;
  isAnonymous?: boolean | null;
  status?: string | null;
  metadata?: Record<string, unknown>;
  replies?: Array<Record<string, unknown>>;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type SecuritySettingsRecord = {
  twoFactor?: boolean;
  twoFactorMethod?: string | null;
  twoFactorConfig?: Record<string, unknown>;
  sessions?: Array<Record<string, unknown>>;
  passkeys?: Array<Record<string, unknown>>;
  trustedDevices?: Array<Record<string, unknown>>;
  alerts?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type LiveSessionRecord = {
  id: string;
  status?: string | null;
  title?: string | null;
  scheduledAt?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  data?: Record<string, unknown>;
  createdAt?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
};

export type LiveStudioRecord = {
  id: string;
  sessionId?: string | null;
  status?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  data?: Record<string, unknown>;
  createdAt?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
};

export type LiveReplayRecord = {
  id: string;
  sessionId?: string | null;
  status?: string | null;
  published?: boolean;
  publishedAt?: string | null;
  data?: Record<string, unknown>;
  createdAt?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
};

export type WorkspaceRolesResponse = {
  workspace?: Record<string, unknown>;
  roles?: Array<Record<string, unknown>>;
  members?: Array<Record<string, unknown>>;
  invites?: Array<Record<string, unknown>>;
  currentMember?: Record<string, unknown> | null;
  workspaceSecurity?: Record<string, unknown>;
  [key: string]: unknown;
};

export type CrewSessionRecord = {
  id: string;
  assignments?: Array<Record<string, unknown>>;
  createdAt?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
};

export type AssetRecord = {
  id: string;
  campaignId?: string | null;
  contractId?: string | null;
  ownerUserId?: string | null;
  title?: string | null;
  assetType?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  extension?: string | null;
  checksum?: string | null;
  storageProvider?: string | null;
  storageKey?: string | null;
  url?: string | null;
  status?: string | null;
  reviewNotes?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
};

export const creatorApi = {
  dashboardFeed() {
    return api.get<Record<string, unknown>>("/dashboard/feed");
  },
  creatorHome() {
    return api.get<Record<string, unknown>>("/dashboard/creator-home");
  },
  sellers(params?: { limit?: number; offset?: number }) {
    return api.get<PublicSellerRecord[]>(withQuery("/sellers", params));
  },
  followSeller(id: string, follow = true) {
    return api.post(`/sellers/${id}/follow`, { follow });
  },
  mySellers(params?: { limit?: number; offset?: number }) {
    return api.get<PublicSellerRecord[]>(withQuery("/my-sellers", params));
  },
  creatorPublicProfile(id: string) {
    return api.get<CreatorPublicProfileResponse>(`/creators/${id}/profile`);
  },
  followCreator(id: string, follow = true) {
    return api.post(`/creators/${id}/follow`, { follow });
  },
  opportunities(params?: { limit?: number; offset?: number }) {
    return api.get<OpportunityRecord[]>(withQuery("/opportunities", params));
  },
  opportunity(id: string) {
    return api.get<OpportunityRecord>(`/opportunities/${id}`);
  },
  saveOpportunity(id: string, save = true) {
    return api.post(`/opportunities/${id}/save`, { save });
  },
  campaignBoard() {
    return api.get<CollaborationCampaignRecord[]>("/campaign-board");
  },
  invites(params?: { limit?: number; offset?: number }) {
    return api.get<InviteRecord[]>(withQuery("/invites", params));
  },
  respondInvite(id: string, status: string) {
    return api.post<InviteRecord>(`/invites/${id}/respond`, { status });
  },
  campaigns() {
    return api.get<CollaborationCampaignRecord[]>("/campaigns");
  },
  proposals() {
    return api.get<ProposalRecord[]>("/proposals");
  },
  proposal(id: string) {
    return api.get<ProposalRecord>(`/proposals/${id}`);
  },
  updateProposal(id: string, body: Record<string, unknown>) {
    return api.patch<ProposalRecord>(`/proposals/${id}`, body);
  },
  proposalMessage(id: string, body: { body: string; messageType?: string }) {
    return api.post(`/proposals/${id}/messages`, body);
  },
  proposalTransition(id: string, status: string) {
    return api.post<ProposalRecord>(`/proposals/${id}/transition`, { status });
  },
  contracts() {
    return api.get<ContractRecord[]>("/contracts");
  },
  contract(id: string) {
    return api.get<ContractRecord>(`/contracts/${id}`);
  },
  terminateContract(id: string, reason?: string) {
    return api.post<ContractRecord>(`/contracts/${id}/terminate-request`, { reason });
  },
  tasks() {
    return api.get<TaskRecord[]>("/tasks");
  },
  task(id: string) {
    return api.get<TaskRecord>(`/tasks/${id}`);
  },
  assets() {
    return api.get<AssetRecord[]>("/assets");
  },
  asset(id: string) {
    return api.get<AssetRecord>(`/assets/${id}`);
  },
  reviewAsset(id: string, body: Record<string, unknown>) {
    return api.patch<AssetRecord>(`/assets/${id}/review`, body);
  },
  liveSessions() {
    return api.get<LiveSessionRecord[]>("/live/sessions");
  },
  liveScheduleWorkspace() {
    return api.get<Record<string, unknown>>("/live/schedule-workspace");
  },
  liveDashboardWorkspace() {
    return api.get<Record<string, unknown>>("/live/dashboard-workspace");
  },
  liveStudioDefault() {
    return api.get<LiveStudioRecord>("/live/studio/default");
  },
  liveStudio(id: string) {
    return api.get<LiveStudioRecord>(`/live/studio/${id}`);
  },
  updateLiveStudio(id: string, body: Record<string, unknown>) {
    return api.patch<LiveStudioRecord>(`/live/studio/${id}`, body);
  },
  startLiveStudio(id: string) {
    return api.post<Record<string, unknown>>(`/live/studio/${id}/start`);
  },
  endLiveStudio(id: string) {
    return api.post<Record<string, unknown>>(`/live/studio/${id}/end`);
  },
  liveReplays() {
    return api.get<LiveReplayRecord[]>("/live/replays");
  },
  liveReplay(id: string) {
    return api.get<LiveReplayRecord>(`/live/replays/${id}`);
  },
  replayBySession(sessionId: string) {
    return api.get<LiveReplayRecord>(`/live/replays/by-session/${sessionId}`);
  },
  updateLiveReplay(id: string, body: Record<string, unknown>) {
    return api.patch<LiveReplayRecord>(`/live/replays/${id}`, body);
  },
  publishLiveReplay(id: string, body: Record<string, unknown>) {
    return api.post<LiveReplayRecord>(`/live/replays/${id}/publish`, body);
  },
  liveTool(key: "audience-notifications" | "live-alerts" | "overlays" | "post-live" | "streaming" | "safety") {
    return api.get<Record<string, unknown>>(`/tools/${key}`);
  },
  patchLiveTool(key: "audience-notifications" | "live-alerts" | "overlays" | "post-live" | "streaming" | "safety", payload: Record<string, unknown>) {
    return api.patch<Record<string, unknown>>(`/tools/${key}`, { payload });
  },
  auditLogs() {
    return api.get<AuditLogRecord[]>("/audit-logs");
  },
  securitySettings() {
    return api.get<SecuritySettingsRecord>("/settings/security");
  },
  updateSecuritySettings(body: Record<string, unknown>) {
    return api.patch<SecuritySettingsRecord>("/settings/security", body);
  },
  roles() {
    return api.get<WorkspaceRolesResponse>("/roles");
  },
  updateRolesSecurity(body: Record<string, unknown>) {
    return api.patch<Record<string, unknown>>("/roles/security", body);
  },
  crew() {
    return api.get<CrewSessionRecord[]>("/crew");
  },
  updateCrewSession(id: string, body: Record<string, unknown>) {
    return api.patch<CrewSessionRecord>(`/crew/sessions/${id}`, body);
  },
  notifications() {
    return api.get<CreatorNotification[]>("/notifications");
  },
  markNotificationRead(id: string) {
    return api.patch(`/notifications/${id}/read`);
  },
  markNotificationUnread(id: string) {
    return api.patch(`/notifications/${id}/unread`);
  },
  markAllNotificationsRead() {
    return api.post("/notifications/read-all");
  },

  earningsSummary() {
    return api.get<EarningsSummary>("/earnings/summary");
  },
  payouts() {
    return api.get<FinancePayoutRecord[]>("/earnings/payouts");
  },
  requestPayout(body: {
    amount: number;
    currency: string;
    note?: string;
    metadata?: Record<string, unknown>;
  }) {
    return api.post<{ id: string; status: string; amount: number; currency: string }>(
      "/earnings/payouts/request",
      body
    );
  },

  payoutMethods() {
    return api.get<PayoutMethodsResponse>("/settings/payout-methods");
  },
  updatePayoutMethods(body: PayoutMethodsResponse) {
    return api.patch<PayoutMethodsResponse>("/settings/payout-methods", body);
  },

  subscription() {
    return api.get<SubscriptionResponse>("/subscription");
  },
  updateSubscription(body: {
    plan?: string;
    cycle?: string;
    status?: string;
    metadata?: Record<string, unknown>;
  }) {
    return api.patch<SubscriptionResponse>("/subscription", body);
  },

  onboarding() {
    return api.get<Record<string, unknown>>("/onboarding");
  },
  onboardingLookups() {
    return api.get<Record<string, unknown>>("/onboarding/lookups");
  },
  saveOnboarding(body: Record<string, unknown>) {
    return api.patch<Record<string, unknown>>("/onboarding", body);
  },
  resetOnboarding() {
    return api.post<Record<string, unknown>>("/onboarding/reset");
  },
  submitOnboarding(body: Record<string, unknown>) {
    return api.post<Record<string, unknown>>("/onboarding/submit", body);
  },

  accountApproval() {
    return api.get<AccountApprovalResponse>("/account-approval");
  },
  refreshAccountApproval() {
    return api.post<AccountApprovalResponse>("/account-approval/refresh");
  },
  resubmitAccountApproval(body: Record<string, unknown>) {
    return api.post<AccountApprovalResponse>("/account-approval/resubmit", body);
  },

  reviewsDashboard() {
    return api.get<ReviewsDashboardResponse>("/reviews/dashboard");
  },
  reviewsSummary() {
    return api.get<ReviewsSummaryResponse>("/reviews/summary");
  },
  reviews(params?: { scope?: "received" | "authored"; limit?: number }) {
    return api.get<ReviewRecord[]>(withQuery("/reviews", params));
  }
};
