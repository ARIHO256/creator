import { ApiError, api } from "./api";

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
  collaborationStatus?: string | null;
  isSaved?: boolean;
  isFollowing?: boolean;
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

export type DealzMarketplaceWorkspaceResponse = {
  deals?: Array<Record<string, unknown>>;
  suppliers?: Array<Record<string, unknown>>;
  creators?: Array<Record<string, unknown>>;
  selectedId?: string;
  cart?: Record<string, number>;
  liveCart?: Record<string, number>;
  templates?: Record<string, unknown>;
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

export type CreateTaskPayload = {
  campaignId?: string;
  contractId?: string;
  assigneeUserId?: string;
  title: string;
  description?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status?: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "APPROVED" | "BLOCKED" | "COMPLETED";
  dueAt?: string;
  metadata?: Record<string, unknown>;
};

export type CreateTaskCommentPayload = {
  body: string;
};

export type CreateTaskAttachmentPayload = {
  name: string;
  kind: string;
  mimeType?: string;
  sizeBytes?: number;
  extension?: string;
  checksum?: string;
  storageProvider?: string;
  storageKey?: string;
  url?: string;
  metadata?: Record<string, unknown>;
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

export type LiveBuilderRecord = {
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

export type LiveCampaignGiveawayRecord = {
  id: string;
  campaignId?: string | null;
  status?: string | null;
  title?: string | null;
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

export type ContentApprovalRecord = {
  id: string;
  title?: string | null;
  campaignId?: string | null;
  channel?: string | null;
  status?: string | null;
  priority?: string | null;
  dueAt?: string | null;
  payload?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  createdAt?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
};

export type AdzCampaignRecord = {
  id: string;
  title?: string | null;
  status?: string | null;
  budget?: number | null;
  currency?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
};

export type AdzLinkRecord = {
  id: string;
  status?: string | null;
  url?: string | null;
  data?: Record<string, unknown>;
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

export type MediaAssetRecord = {
  id: string;
  userId?: string;
  name: string;
  kind?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  extension?: string | null;
  checksum?: string | null;
  storageProvider?: string | null;
  storageKey?: string | null;
  url?: string | null;
  isPublic?: boolean;
  metadata?: Record<string, unknown>;
  createdAt?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
};

export type MediaWorkspaceResponse = {
  creators?: Array<Record<string, unknown>>;
  suppliers?: Array<Record<string, unknown>>;
  campaigns?: Array<Record<string, unknown>>;
  deliverables?: Array<Record<string, unknown>>;
  collections?: Record<string, unknown>;
  activity?: Record<string, unknown>;
  [key: string]: unknown;
};

export type UploadSessionRecord = {
  id: string;
  name: string;
  kind?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  extension?: string | null;
  checksum?: string | null;
  storageProvider?: string | null;
  storageKey?: string | null;
  url?: string | null;
  visibility?: string | null;
  purpose?: string | null;
  domain?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string | null;
};

export type MyDayDashboardResponse = {
  header?: {
    isLiveRunning?: boolean;
    liveViewers?: number;
    statusLabel?: string;
  };
  recentLive?: {
    peakViewers?: number;
    conversionRate?: number;
    sales?: number;
    currency?: string;
  } | null;
  kpis?: {
    lives?: number;
    tasks?: number;
    proposals?: number;
    approvals?: number;
  };
  smartPlan?: Array<{
    id: string;
    title: string;
    context?: string;
    duration?: string;
    impact?: string;
  }>;
  timeline?: Array<{
    time: string;
    label: string;
    type: "light" | "medium" | "live";
  }>;
  nextLive?: {
    title?: string;
    startsAtISO?: string | null;
    timeLabel?: string;
  } | null;
  crew?: {
    title?: string;
    rows?: Array<{
      role: string;
      name: string;
      status: string;
    }>;
  };
  tasks?: Array<{
    id: string;
    title: string;
    deal: string;
    due: string;
    status: "open" | "done";
    type: string;
    campaign: string;
  }>;
  proposals?: Array<{
    id: string;
    brand: string;
    title?: string;
    budget?: string;
    status?: string;
  }>;
  earnings?: {
    today?: number;
    todayFlat?: number;
    todayCommission?: number;
    todaySpark?: number[];
    last7?: number;
    last7Avg?: number;
    last7Spark?: number[];
    mtd?: number;
    mtdGoal?: number;
    mtdSpark?: number[];
    currency?: string;
    available?: number;
    pending?: number;
    lifetime?: number;
  };
  counts?: {
    dueToday?: number;
    completedToday?: number;
  };
  lastUpdatedAt?: string;
};

export type AnalyticsRankDetailResponse = {
  range?: string;
  category?: string;
  rank?: {
    currentTier?: "Bronze" | "Silver" | "Gold";
    nextTier?: "Silver" | "Gold" | "Platinum";
    progressPercent?: number;
    pointsCurrent?: number;
    pointsToNext?: number;
    benefits?: Record<string, string[]>;
  };
  metrics?: {
    avgViewers?: number;
    ctr?: number;
    conversion?: number;
    salesDriven?: number;
  };
  benchmarks?: {
    viewersPercentile?: number;
    ctrPercentile?: number;
    conversionPercentile?: number;
    salesPercentile?: number;
  };
  campaigns?: Array<{
    id?: number;
    campaignId?: string;
    name?: string;
    seller?: string;
    category?: string;
    sales?: number;
    engagements?: number;
    conversions?: number;
    convRate?: number;
  }>;
  goals?: Array<{
    id?: string;
    label?: string;
    current?: number;
    target?: number;
    unit?: "viewers" | "%" | "USD";
  }>;
  trend?: Array<{
    label?: string;
    views?: number;
    clicks?: number;
    conversions?: number;
    sales?: number;
  }>;
  [key: string]: unknown;
};

export const creatorApi = {
  dashboardFeed() {
    return api.get<Record<string, unknown>>("/dashboard/feed");
  },
  creatorHome() {
    return api.get<Record<string, unknown>>("/dashboard/creator-home");
  },
  myDay() {
    return api.get<MyDayDashboardResponse>("/dashboard/my-day");
  },
  analyticsRankDetail(params?: { range?: "7" | "30" | "90"; category?: string }) {
    return api.get<AnalyticsRankDetailResponse>(withQuery("/analytics/rank-detail", params));
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
  createInvite(body: Record<string, unknown>) {
    return api.post<InviteRecord>("/invites", body);
  },
  respondInvite(id: string, status: string) {
    return api.post<InviteRecord>(`/invites/${id}/respond`, { status });
  },
  campaigns() {
    return api.get<CollaborationCampaignRecord[]>("/campaigns");
  },
  dealzMarketplace() {
    return api.get<DealzMarketplaceWorkspaceResponse>("/campaigns/dealz-marketplace");
  },
  async updateDealzMarketplace(payload: Record<string, unknown>) {
    try {
      return await api.patch<DealzMarketplaceWorkspaceResponse>("/campaigns/dealz-marketplace", payload);
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        return api.patch<DealzMarketplaceWorkspaceResponse>("/campaigns/dealz-marketplace", { payload });
      }
      throw error;
    }
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
  createTask(body: CreateTaskPayload) {
    return api.post<TaskRecord>("/tasks", body);
  },
  updateTask(id: string, body: Record<string, unknown>) {
    return api.patch<TaskRecord>(`/tasks/${id}`, body);
  },
  taskComment(id: string, body: CreateTaskCommentPayload) {
    return api.post<Record<string, unknown>>(`/tasks/${id}/comments`, body);
  },
  taskAttachment(id: string, body: CreateTaskAttachmentPayload) {
    return api.post<Record<string, unknown>>(`/tasks/${id}/attachments`, body);
  },
  assets() {
    return api.get<AssetRecord[]>("/assets");
  },
  uploads() {
    return api.get<UploadSessionRecord[]>("/uploads");
  },
  createUpload(body: {
    id?: string;
    name: string;
    kind?: string;
    mimeType?: string;
    sizeBytes?: number;
    extension?: string;
    checksum?: string;
    storageProvider?: string;
    storageKey?: string;
    url?: string;
    visibility?: string;
    purpose?: string;
    domain?: string;
    entityType?: string;
    entityId?: string;
    status?: string;
    metadata?: Record<string, unknown>;
  }) {
    return api.post<UploadSessionRecord>("/uploads", body);
  },
  mediaWorkspace() {
    return api.get<MediaWorkspaceResponse>("/media/workspace");
  },
  mediaAssets() {
    return api.get<MediaAssetRecord[]>("/media/assets");
  },
  uploadMediaFile(body: {
    name: string;
    dataUrl: string;
    kind?: string;
    mimeType?: string;
    sizeBytes?: number;
    extension?: string;
    visibility?: string;
    purpose?: string;
    isPublic?: boolean;
    metadata?: Record<string, unknown>;
  }) {
    return api.post<MediaAssetRecord>("/media/files", body);
  },
  createMediaAsset(body: {
    name: string;
    kind?: string;
    mimeType?: string;
    sizeBytes?: number;
    extension?: string;
    checksum?: string;
    storageProvider?: string;
    storageKey?: string;
    url?: string;
    isPublic?: boolean;
    metadata?: Record<string, unknown>;
  }) {
    return api.post<MediaAssetRecord>("/media/assets", body);
  },
  updateMediaAsset(id: string, body: {
    name?: string;
    kind?: string;
    url?: string;
    metadata?: Record<string, unknown>;
  }) {
    return api.patch<MediaAssetRecord>(`/media/assets/${encodeURIComponent(id)}`, body);
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
  createLiveSession(body: {
    id?: string;
    status?: string;
    title?: string;
    scheduledAt?: string;
    startedAt?: string;
    endedAt?: string;
    data?: Record<string, unknown>;
  }) {
    return api.post<LiveSessionRecord>("/live/sessions", body);
  },
  updateLiveSession(id: string, body: {
    status?: string;
    title?: string;
    scheduledAt?: string;
    startedAt?: string;
    endedAt?: string;
    data?: Record<string, unknown>;
  }) {
    return api.patch<LiveSessionRecord>(`/live/sessions/${encodeURIComponent(id)}`, body);
  },
  liveBuilder(id: string) {
    return api.get<LiveBuilderRecord>(`/live/builder/${encodeURIComponent(id)}`);
  },
  saveLiveBuilder(body: Record<string, unknown>) {
    return api.post<LiveBuilderRecord>("/live/builder/save", body);
  },
  publishLiveBuilder(id: string, body: Record<string, unknown>) {
    return api.post<LiveBuilderRecord>(`/live/builder/${encodeURIComponent(id)}/publish`, body);
  },
  liveCampaignGiveaways(campaignId: string) {
    return api.get<LiveCampaignGiveawayRecord[]>(`/live/campaigns/${encodeURIComponent(campaignId)}/giveaways`);
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
  createRole(body: Record<string, unknown>) {
    return api.post<Record<string, unknown>>("/roles", body);
  },
  updateRole(id: string, body: Record<string, unknown>) {
    return api.patch<Record<string, unknown>>(`/roles/${encodeURIComponent(id)}`, body);
  },
  deleteRole(id: string) {
    return api.delete<Record<string, unknown>>(`/roles/${encodeURIComponent(id)}`);
  },
  createRoleInvite(body: Record<string, unknown>) {
    return api.post<Record<string, unknown>>("/roles/invites", body);
  },
  updateRoleMember(id: string, body: Record<string, unknown>) {
    return api.patch<Record<string, unknown>>(`/roles/members/${encodeURIComponent(id)}`, body);
  },
  deleteRoleMember(id: string) {
    return api.delete<Record<string, unknown>>(`/roles/members/${encodeURIComponent(id)}`);
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

  workflowScreenState(key: string) {
    return api.get<Record<string, unknown>>(`/workflow/screen-state/${encodeURIComponent(key)}`);
  },
  patchWorkflowScreenState(key: string, body: Record<string, unknown>) {
    return api.patch<Record<string, unknown>>(`/workflow/screen-state/${encodeURIComponent(key)}`, body);
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
  },

  adzCampaigns() {
    return api.get<AdzCampaignRecord[]>("/adz/campaigns");
  },
  adzCampaign(id: string) {
    return api.get<AdzCampaignRecord>(`/adz/campaigns/${encodeURIComponent(id)}`);
  },
  adzCampaignPerformance(id: string) {
    return api.get<Record<string, unknown>>(`/adz/campaigns/${encodeURIComponent(id)}/performance`);
  },
  adzLinks() {
    return api.get<AdzLinkRecord[]>("/links");
  },
  adzLink(id: string) {
    return api.get<AdzLinkRecord>(`/links/${encodeURIComponent(id)}`);
  },
  createAdzLink(body: Record<string, unknown>) {
    return api.post<AdzLinkRecord>("/links", body);
  },
  updateAdzLink(id: string, body: Record<string, unknown>) {
    return api.patch<AdzLinkRecord>(`/links/${encodeURIComponent(id)}`, body);
  },

  contentApprovals() {
    return api.get<ContentApprovalRecord[]>("/content-approvals");
  },
  contentApproval(id: string) {
    return api.get<ContentApprovalRecord>(`/content-approvals/${encodeURIComponent(id)}`);
  },
  createContentApproval(body: Record<string, unknown>) {
    return api.post<ContentApprovalRecord>("/content-approvals", body);
  },
  updateContentApproval(id: string, body: Record<string, unknown>) {
    return api.patch<ContentApprovalRecord>(`/content-approvals/${encodeURIComponent(id)}`, body);
  },
  nudgeContentApproval(id: string) {
    return api.post<Record<string, unknown>>(`/content-approvals/${encodeURIComponent(id)}/nudge`);
  },
  withdrawContentApproval(id: string) {
    return api.post<Record<string, unknown>>(`/content-approvals/${encodeURIComponent(id)}/withdraw`);
  },
  resubmitContentApproval(id: string, body: Record<string, unknown>) {
    return api.post<ContentApprovalRecord>(`/content-approvals/${encodeURIComponent(id)}/resubmit`, body);
  }
};
