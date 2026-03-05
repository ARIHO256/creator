export type FrontendUserStatus = "GUEST" | "AWAITING_APPROVAL" | "NEEDS_ONBOARDING" | "APPROVED";
export type AppRole = "Creator" | "Seller" | "Buyer" | "Provider";

export interface ApiPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiEnvelope<T> {
  ok: true;
  data: T;
  meta?: ApiPaginationMeta;
}

export interface ApiErrorShape {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiResult<T> {
  data: T;
  meta?: ApiPaginationMeta;
}

export interface PaginatedResult<T> {
  items: T[];
  meta?: ApiPaginationMeta;
}

export interface CreatorProfileLite {
  id: string;
  name: string;
  handle: string;
  tier: string;
  categories: string[];
  regions: string[];
  isKycVerified: boolean;
}

export interface CreatorPublicMetrics {
  liveSessionsCompleted: number;
  replaysPublished: number;
  conversionRate: number;
  avgOrderValue: number;
}

export interface CreatorProfile extends CreatorProfileLite {
  userId: string;
  tagline: string;
  bio: string;
  languages: string[];
  followers: number;
  rating: number;
  avgViews: number;
  totalSalesDriven: number;
  followingSellerIds: string[];
  publicMetrics?: CreatorPublicMetrics;
}

export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
  approvalStatus: string;
  onboardingCompleted: boolean;
  currentRole: AppRole;
  creatorProfile: CreatorProfileLite | null;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  name: string;
  handle?: string;
}

export interface BootstrapUser {
  id: string;
  email: string;
  approvalStatus: string;
  onboardingCompleted: boolean;
  currentRole: AppRole;
}

export interface BootstrapFeatureFlags {
  proUnlocked: boolean;
  canMultiStream: boolean;
  canUseOverlaysPro: boolean;
}

export interface BootstrapData {
  user: BootstrapUser;
  creatorProfile: CreatorProfile | null;
  navBadges: Record<string, number>;
  featureFlags: BootstrapFeatureFlags;
}

export interface LandingStatRecord {
  id: string;
  label: string;
  value: string | number;
  detail?: string;
}

export interface LandingFeatureRecord {
  id: string;
  tag?: string;
  title: string;
  description: string;
}

export interface LandingWorkflowStepRecord {
  id: string;
  title: string;
  description: string;
}

export interface LandingStoryRecord {
  id: string;
  title: string;
  seller: string;
  value: number;
  stage?: string;
  note?: string;
}

export interface LandingFaqRecord {
  id: string;
  question: string;
  answer: string;
}

export interface LandingBrandRecord {
  id: string;
  name: string;
  category?: string;
  badge?: string;
}

export interface LandingContentRecord {
  hero: {
    eyebrow?: string;
    title: string;
    subtitle: string;
    primaryCta?: { label: string; href: string };
    secondaryCta?: { label: string; href: string };
  };
  stats: LandingStatRecord[];
  features: LandingFeatureRecord[];
  workflow: LandingWorkflowStepRecord[];
  featuredBrands?: LandingBrandRecord[];
  stories?: LandingStoryRecord[];
  faq: LandingFaqRecord[];
  lastUpdatedAt?: string;
}

export interface DashboardQuickStatRecord {
  id: string;
  label: string;
  value: string | number;
  hint?: string;
}

export interface DashboardFeedLiveItemRecord {
  id: string;
  title: string;
  seller: string;
  campaign?: string;
  sellerId?: string;
  category?: string;
  status?: string;
  scheduledFor?: string;
  timeLabel?: string;
  location?: string;
  role?: string;
  viewers?: number;
  targetUnits?: number;
  soldUnits?: number;
  route?: string;
}

export interface DashboardFeedReplayRecord {
  id: string;
  sessionId: string;
  title: string;
  seller: string;
  campaign?: string;
  views?: number;
  sales?: number;
  published?: boolean;
  updatedAt?: string;
  route?: string;
}

export interface DashboardFeedFollowedSellerRecord {
  id: string;
  name: string;
  type?: string;
  category?: string;
  region?: string;
  fitScore?: number;
  relationship?: string;
  status?: string;
  isFollowing?: boolean;
  route?: string;
}

export interface DashboardFeedOpportunityRecord {
  id: string;
  title: string;
  seller: string;
  category?: string;
  payBand?: string;
  matchScore?: string;
  route?: string;
}

export interface DashboardFeedActionRecord {
  id: string;
  label: string;
  target: string;
  context?: string;
}

export interface DashboardFeedRecord {
  hero: {
    title: string;
    subtitle: string;
    tier?: string;
    categories?: string[];
  };
  quickStats: DashboardQuickStatRecord[];
  liveNow: DashboardFeedLiveItemRecord[];
  upcoming: DashboardFeedLiveItemRecord[];
  featuredReplays: DashboardFeedReplayRecord[];
  followedSellers: DashboardFeedFollowedSellerRecord[];
  openOpportunities: DashboardFeedOpportunityRecord[];
  pipeline?: Record<string, number>;
  recommendedActions: DashboardFeedActionRecord[];
  insights?: string[];
  lastUpdatedAt?: string;
}

export interface MyDayKpiRecord {
  id: string;
  label: string;
  value: string | number;
  hint?: string;
  target?: string;
}

export interface MyDayAgendaItemRecord {
  id: string;
  kind: string;
  title: string;
  subtitle?: string;
  startsAtISO?: string;
  target?: string;
}

export interface CrewSummaryRecord {
  sessionId: string;
  assignments: number;
}

export interface MyDayReminderRecord {
  label: string;
  target: string;
  tone?: string;
}

export interface MyDayWorkspaceRecord {
  hero: {
    title: string;
    subtitle: string;
    focus?: string;
  };
  kpis: MyDayKpiRecord[];
  agenda: MyDayAgendaItemRecord[];
  tasks: TaskRecord[];
  sessions: LiveBuilderSessionRecord[];
  proposals: ProposalRecord[];
  earningsSnapshot?: EarningsSummaryRecord;
  reminders: MyDayReminderRecord[];
  crewSummary?: CrewSummaryRecord[];
  lastUpdatedAt?: string;
}

export interface PublicProfileCampaignRecord extends CampaignRecord {
  proposalId?: string | null;
  contractId?: string | null;
}

export interface PublicProfileSessionRecord {
  id: string;
  title: string;
  seller: string;
  scheduledFor?: string;
  status?: string;
  route?: string;
}

export interface PublicProfileReplayRecord {
  id: string;
  title: string;
  published?: boolean;
  views?: number;
  sales?: number;
  route?: string;
}

export interface PublicProfileSocialRecord {
  id: string;
  label: string;
  followers: number;
}

export interface PublicProfileReviewRecord {
  id: string;
  dimension: string;
  score: number;
  note: string;
}

export interface PublicCreatorProfileRecord extends CreatorProfile {
  latestCampaigns: PublicProfileCampaignRecord[];
  recentSessions: PublicProfileSessionRecord[];
  recentReplays: PublicProfileReplayRecord[];
  socials: PublicProfileSocialRecord[];
  reviews: PublicProfileReviewRecord[];
}

export type ReviewTransactionIntent = "bought" | "added_to_cart" | "booked" | "requested_quote" | "just_watched" | null;
export type ReviewVisibilityScope = "all" | "public" | "private";
export type ReviewTimeWindow = "30" | "90" | "all";

export interface ReviewCategoryRatings {
  presentation: number;
  helpfulness: number;
  productKnowledge: number;
  interaction: number;
  trust: number;
}

export interface ReviewRecord {
  id: string;
  userId?: string;
  creatorId: string;
  creatorName: string;
  creatorHandle: string;
  memberId?: string;
  sessionId: string;
  sessionTitle: string;
  endedAt: string;
  overallRating: number;
  categoryRatings: ReviewCategoryRatings;
  quickTags: string[];
  issueTags: string[];
  reviewText: string;
  note?: string;
  dimension?: string;
  score?: number;
  wouldJoinAgain: boolean | null;
  transactionIntent: ReviewTransactionIntent;
  publicReview: boolean;
  anonymous: boolean;
  createdAt: string;
}

export interface ReviewsDashboardCreatorRecord {
  id: string;
  name: string;
  handle: string;
  reviewCount: number;
  avgRating: number;
  isSelf?: boolean;
  isWorkspace?: boolean;
}

export interface ReviewsDashboardFilters {
  creatorId?: string;
  scope?: ReviewVisibilityScope;
  timeWindow?: ReviewTimeWindow;
  minRating?: number;
  q?: string;
}

export interface ReviewsDashboardRecord {
  canViewWorkspace: boolean;
  creators: ReviewsDashboardCreatorRecord[];
  selectedCreator: ReviewsDashboardCreatorRecord;
  reviews: ReviewRecord[];
  lastUpdatedAt?: string;
}

export interface CreatorSettings {
  userId: string;
  profile?: Record<string, unknown>;
  socials?: Record<string, unknown>;
  preferences?: Record<string, unknown>;
  kyc?: Record<string, unknown>;
  payout?: Record<string, unknown>;
  review?: Record<string, unknown>;
  notifications?: Record<string, unknown>;
  security?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface PayoutSettingsActionInput {
  payout?: Record<string, unknown>;
  code?: string;
}

export interface UploadRecord {
  id: string;
  userId?: string;
  name: string;
  fileName?: string;
  mimeType?: string;
  kind?: string;
  size?: number;
  purpose?: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  status?: string;
  createdAt?: string;
  url?: string;
  [key: string]: unknown;
}

export interface CreateUploadInput {
  name: string;
  type?: string;
  mimeType?: string;
  size?: number;
  purpose?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  url?: string;
}

export interface UploadListFilters {
  purpose?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export interface OnboardingWorkflowRecord {
  userId: string;
  stepIndex: number;
  maxUnlocked: number;
  savedAt?: string;
  submittedAt?: string | null;
  approvalApplicationId?: string | null;
  submissionStatus?: string;
  form: Record<string, unknown>;
}

export interface SaveOnboardingDraftInput {
  form: Record<string, unknown>;
  stepIndex: number;
  maxUnlocked: number;
}

export interface SubmitOnboardingInput extends SaveOnboardingDraftInput {}

export interface ApprovalChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface ApprovalAdminDocument {
  name: string;
  url: string;
  type?: string;
}

export interface ApprovalHistoryRecord {
  atISO?: string;
  status?: string;
  msg: string;
}

export interface ApprovalCommunicationPreferences {
  email: boolean;
  inApp: boolean;
}

export interface ApprovalApplicationRecord {
  id: string;
  userId: string;
  status: string;
  etaMin: number;
  submittedAt: string;
  creatorId: string;
  displayName: string;
  creatorHandle: string;
  primaryLine: string;
  adminReason: string;
  adminDocs: ApprovalAdminDocument[];
  items: ApprovalChecklistItem[];
  note: string;
  attachments: UploadRecord[];
  preferences: ApprovalCommunicationPreferences;
  onboardingSnapshot?: Record<string, unknown> | null;
  history?: ApprovalHistoryRecord[];
}

export interface UpdateApprovalDraftInput {
  note?: string;
  items?: ApprovalChecklistItem[];
  attachments?: UploadRecord[];
  preferences?: ApprovalCommunicationPreferences;
  onboardingSnapshot?: Record<string, unknown>;
}

export interface ResubmitApprovalInput {
  note?: string;
  items?: ApprovalChecklistItem[];
  attachmentIds?: string[];
  preferences?: ApprovalCommunicationPreferences;
}

export interface ContentApprovalAssetRecord {
  name: string;
  type: string;
  size: string;
  uploadId?: string;
}

export interface ContentApprovalAuditRecord {
  atISO: string;
  msg: string;
}

export interface ContentApprovalRecord {
  id: string;
  userId?: string;
  title: string;
  campaign: string;
  supplier: {
    name: string;
    type: string;
  };
  channel: string;
  type: string;
  desk: string;
  status: string;
  riskScore: number;
  submittedAtISO: string;
  dueAtISO: string;
  notesFromCreator: string;
  caption: string;
  assets: ContentApprovalAssetRecord[];
  flags: {
    missingDisclosure: boolean;
    sensitiveClaim: boolean;
    brandRestriction: boolean;
  };
  lastUpdatedISO: string;
  audit: ContentApprovalAuditRecord[];
}

export interface CreateContentApprovalInput {
  title?: string;
  campaign?: string;
  supplier?: {
    name?: string;
    type?: string;
  };
  channel?: string;
  type?: string;
  desk?: string;
  status?: string;
  notesFromCreator?: string;
  caption?: string;
  assets?: UploadRecord[];
}

export interface UpdateContentApprovalInput extends Partial<CreateContentApprovalInput> {
  status?: string;
}

export interface NotificationRecord {
  id: string;
  userId?: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt?: string;
  time?: string;
  priority?: string;
  link?: string;
  brand?: string;
  campaign?: string;
  meta?: Record<string, unknown>;
  cta?: string;
}

export interface InviteRecord {
  id: string;
  userId?: string;
  sellerId: string;
  seller: string;
  sellerInitials?: string;
  sellerDescription?: string;
  sellerRating?: number;
  sellerBadge?: string;
  campaign: string;
  type: string;
  category?: string;
  region?: string;
  timing?: string;
  fitReason?: string;
  status: "pending" | "negotiating" | "accepted" | "declined" | "expired";
  lastActivity?: string;
  baseFee?: number;
  currency?: string;
  commissionPct?: number;
  estimatedValue?: number;
  messageShort?: string;
  link?: string;
  [key: string]: unknown;
}

export interface InviteListFilters {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface RespondInviteInput {
  decision: "accepted" | "declined" | "negotiating";
}

export interface AuditLogRecord {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail?: string;
  severity: "info" | "warn" | "warning" | "error" | "critical" | string;
  module?: string;
  outcome?: string;
  entityType?: string;
  entityId?: string;
  location?: string;
  ip?: string;
  [key: string]: unknown;
}


export interface EarningsBreakdownRow {
  label: string;
  total: number;
  category?: string;
  seller?: string;
  projected?: number;
  growth?: number;
}

export interface EarningsForecastRecord {
  month: string;
  current: number;
  projected: number;
  growth: number;
}

export interface EarningsCompositionRecord {
  flatFees: number;
  commission: number;
  bonuses: number;
}

export interface EarningsPayoutMethodRecord {
  method: string;
  methodType?: string;
  detail: string;
  verificationStatus?: string;
}

export interface PayoutRecord {
  id: string;
  userId?: string;
  date: string;
  requestedAt?: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  recipient?: string;
  reference: string;
  estimatedSettlement?: string;
  fee?: number;
  netAmount?: number;
  notes?: string;
  [key: string]: unknown;
}

export interface PayoutListFilters {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface RequestPayoutInput {
  amount: number;
  method: string;
  currency?: string;
  recipient?: string;
  notes?: string;
}

export interface AnalyticsMetricRecord {
  avgViewers: number;
  ctr: number;
  conversion: number;
  salesDriven: number;
}

export interface AnalyticsRankRecord {
  currentTier: string;
  nextTier: string;
  progressPercent: number;
  pointsCurrent: number;
  pointsToNext: number;
  benefits?: Record<string, string[]>;
}

export interface AnalyticsBenchmarkRecord {
  viewersPercentile: number;
  ctrPercentile: number;
  conversionPercentile: number;
  salesPercentile: number;
}

export interface AnalyticsCampaignRecord {
  id: string;
  name: string;
  seller: string;
  category: string;
  sales: number;
  engagements: number;
  convRate: number;
}

export interface AnalyticsTrendCategoryMetricRecord {
  sales: number;
  conversions: number;
}

export interface AnalyticsTrendPointRecord {
  label: string;
  views: number;
  clicks: number;
  conversions: number;
  sales: number;
  categories?: Record<string, AnalyticsTrendCategoryMetricRecord>;
}

export interface AnalyticsGoalRecord {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: string;
}

export interface AnalyticsLeaderboardRow {
  creator: string;
  score: number;
  tier: string;
}

export interface AnalyticsOverviewRecord {
  userId?: string;
  availableRanges: string[];
  availableCategories: string[];
  rank: AnalyticsRankRecord;
  benchmarks: AnalyticsBenchmarkRecord;
  metricsByCategory: Record<string, Record<string, AnalyticsMetricRecord>>;
  campaigns: AnalyticsCampaignRecord[];
  trend: AnalyticsTrendPointRecord[];
  goals: AnalyticsGoalRecord[];
  recommendations?: string[];
  leaderboard?: AnalyticsLeaderboardRow[];
  lastUpdatedAt?: string;
  [key: string]: unknown;
}

export interface EarningsSummaryRecord {
  userId?: string;
  summary: {
    available: number;
    pending: number;
    projected: number;
    lifetime?: number;
    currency: string;
    [key: string]: unknown;
  };
  composition?: EarningsCompositionRecord;
  byCampaign?: EarningsBreakdownRow[];
  bySeller?: EarningsBreakdownRow[];
  byMonth?: EarningsBreakdownRow[];
  forecast?: EarningsForecastRecord;
  payoutPolicy?: {
    feeLabel?: string;
    settlementWindow?: string;
    [key: string]: unknown;
  };
  notes?: string[];
  payoutMethod?: EarningsPayoutMethodRecord;
  recentPayouts?: PayoutRecord[];
  lastUpdatedAt?: string;
  [key: string]: unknown;
}

export type SubscriptionPlanKey = "basic" | "pro" | "enterprise";
export type SubscriptionCycle = "monthly" | "yearly";
export type SubscriptionFeatureValue = "included" | "limited" | "not";

export interface SubscriptionFeatureCell {
  value: SubscriptionFeatureValue;
  note?: string;
}

export interface SubscriptionPlanCatalogEntry {
  id: SubscriptionPlanKey;
  name: string;
  emoji: string;
  tagline: string;
  bestFor: string;
  pricing: {
    monthly: number;
    yearly: number;
  };
  recommended?: boolean;
  highlights: string[];
  includes: string[];
  limits: {
    liveSessionz: string;
    shoppableAdz: string;
    livePlusShoppables: string;
    crewPerLive: string;
    streamDestinations: string;
    storage: string;
    analyticsHistory: string;
    notifications: string;
    seats: string;
  };
  caps: {
    liveSessionz: number | null;
    shoppableAdz: number | null;
    livePlusShoppables: number | null;
    crewPerLive: number | null;
    streamDestinations: number | null;
    storageGb: number | null;
    analyticsMonths: number | null;
    notifications: number | null;
    seats: number | null;
  };
}

export interface SubscriptionComparisonRow {
  category: string;
  feature: string;
  basic: SubscriptionFeatureCell;
  pro: SubscriptionFeatureCell;
  enterprise: SubscriptionFeatureCell;
}

export interface SubscriptionUsageRecord {
  id: string;
  label: string;
  used: number;
  usedLabel: string;
  limitLabel: string;
  cap: number | null;
  helper?: string;
  utilizationPct?: number | null;
  remainingLabel?: string;
}

export interface SubscriptionInvoiceRecord {
  id: string;
  issuedAt: string;
  amount: number;
  currency: string;
  amountLabel?: string;
  status: string;
  description?: string;
  billedTo?: string;
}

export interface SubscriptionBillingMethodRecord {
  type: string;
  label: string;
  brand?: string;
  last4?: string;
  holderName?: string;
  expMonth?: number;
  expYear?: number;
}

export interface SubscriptionWorkspaceSummaryRecord {
  activeSeats: number;
  invitedSeats: number;
  seatLimitLabel: string;
  canManageRoles: boolean;
  approvalsEnabled: boolean;
  auditExportsEnabled: boolean;
}

export interface SubscriptionFeatureSpotlightRecord {
  id: string;
  title: string;
  description: string;
  route: string;
  minPlan?: SubscriptionPlanKey;
}

export interface SubscriptionSupportRecord {
  contactEmail: string;
  salesEmail: string;
  helpCenterUrl: string;
  managerName?: string;
}

export interface SubscriptionRecord {
  userId?: string;
  plan: SubscriptionPlanKey;
  cycle: SubscriptionCycle;
  status: string;
  renewsAt: string;
  renewalLabel?: string;
  cancelAtPeriodEnd?: boolean;
  billingEmail?: string;
  billingMethod?: SubscriptionBillingMethodRecord;
  paymentMethod?: SubscriptionBillingMethodRecord;
  planCatalog: SubscriptionPlanCatalogEntry[];
  comparisonRows: SubscriptionComparisonRow[];
  featureSpotlights: SubscriptionFeatureSpotlightRecord[];
  currentPlanMeta: SubscriptionPlanCatalogEntry;
  usage: SubscriptionUsageRecord[];
  invoices: SubscriptionInvoiceRecord[];
  workspaceSummary: SubscriptionWorkspaceSummaryRecord;
  support: SubscriptionSupportRecord;
  canManageBilling: boolean;
  notes?: string[];
  lastUpdatedAt?: string;
}

export interface UpdateSubscriptionInput {
  plan?: SubscriptionPlanKey;
  cycle?: SubscriptionCycle;
  cancelAtPeriodEnd?: boolean;
}

export interface SellerRecord {
  id: string;
  name: string;
  initials: string;
  type: "Seller" | "Provider" | string;
  brand: string;
  tagline: string;
  categories: string[];
  region: string;
  followers: number;
  livesCompleted: number;
  avgOrderValue: number;
  rating: number;
  badge: string;
  relationship: string;
  collabStatus: string;
  fitScore: number;
  fitReason: string;
  openToCollabs: boolean;
  inviteOnly: boolean;
  trustBadges: string[];
  isFollowing: boolean;
}

export interface SellerListFilters {
  q?: string;
  region?: string;
  relationship?: string;
  openOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface OpportunityRecord {
  id: string;
  title: string;
  sellerId: string;
  seller: string;
  sellerInitials: string;
  category: string;
  categories: string[];
  region: string;
  language: string;
  payBand: string;
  budgetMin: number;
  budgetMax: number;
  commission: number;
  matchScore: string;
  matchReason: string;
  deliverables: string[];
  liveWindow: string;
  timeline: string[];
  summary: string;
  tags: string[];
  supplierType: string;
  status?: string;
  sellerRating?: number;
  sellerBadge?: string;
  collaborationStatus?: string;
  opportunityStatus?: string;
  trustBadges?: string[];
  isFollowing?: boolean;
  isSaved?: boolean;
  latestProposalId?: string | null;
  latestProposalStatus?: string | null;
  inviteId?: string | null;
  inviteStatus?: string | null;
  openToCollabs?: boolean;
  inviteOnly?: boolean;
}

export interface OpportunityListFilters {
  q?: string;
  category?: string;
  region?: string;
  language?: string;
  sellerId?: string;
  supplierType?: string;
  status?: string;
  minBudget?: number | string;
  maxBudget?: number | string;
  commission?: string;
  minRating?: number | string;
  currentOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CampaignBoardRow {
  id: string;
  source?: string;
  sellerId: string;
  title: string;
  seller: string;
  type: string;
  stage: string;
  origin: string;
  estValue: number;
  currency: string;
  region?: string;
  nextAction?: string;
  promoCount?: number;
  liveCount?: number;
  health?: string;
  lastActivity?: string;
  proposalId?: string | null;
  contractId?: string | null;
  latestLiveSessionId?: string | null;
  latestAdCampaignId?: string | null;
  sellerBadge?: string;
  status?: string;
}

export interface CampaignBoardListFilters {
  q?: string;
  stage?: string;
  origin?: string;
  page?: number;
  pageSize?: number;
}

export interface DealzMarketplaceRecord {
  id: string;
  kind: "live" | "shoppable" | "hybrid" | string;
  title: string;
  subtitle?: string;
  sellerId?: string | null;
  sellerName: string;
  campaignId?: string | null;
  status: string;
  startsAtISO?: string | null;
  endsAtISO?: string | null;
  platforms: string[];
  liveSessionId?: string | null;
  adCampaignId?: string | null;
  liveCount?: number;
  adCount?: number;
  productCount?: number;
  performance?: {
    clicks?: number;
    purchases?: number;
    earnings?: number;
    conversionPct?: number;
    currency?: string;
  };
  sellerBadge?: string;
  hasReplay?: boolean;
  replayId?: string | null;
}

export interface DealzMarketplaceFilters {
  q?: string;
  kind?: string;
  status?: string;
  sellerId?: string;
  page?: number;
  pageSize?: number;
}

export interface ProposalListFilters {
  q?: string;
  status?: string;
  origin?: string;
  page?: number;
  pageSize?: number;
}

export interface ContractListFilters {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface ProposalTermBlock {
  deliverables: string;
  schedule: string;
  compensation: string;
  exclusivityWindow: string;
  killFee: string;
}

export interface ProposalMessage {
  id: string;
  from: string;
  name: string;
  avatar: string;
  time: string;
  body: string;
}

export interface ProposalRecord {
  id: string;
  userId: string;
  sellerId: string;
  brand: string;
  initials: string;
  campaign: string;
  origin: string;
  offerType: string;
  category: string;
  region: string;
  baseFeeMin: number;
  baseFeeMax: number;
  currency: string;
  commissionPct: number;
  estimatedValue: number;
  status: string;
  lastActivity: string;
  notesShort: string;
  terms: ProposalTermBlock;
  messages: ProposalMessage[];
}

export interface CreateProposalInput {
  sellerId: string;
  campaign: string;
  offerType: string;
  category: string;
  region: string;
  baseFeeMin?: number;
  baseFeeMax?: number;
  currency?: string;
  commissionPct?: number;
  estimatedValue?: number;
  origin?: string;
  notesShort?: string;
  deliverables?: string;
  schedule?: string;
  compensation?: string;
  exclusivityWindow?: string;
  killFee?: string;
}

export interface ProposalMessageInput {
  body: string;
}

export interface TransitionProposalInput {
  status: string;
  note?: string;
}

export interface UpdateProposalInput {
  campaign?: string;
  offerType?: string;
  category?: string;
  region?: string;
  baseFeeMin?: number;
  baseFeeMax?: number;
  currency?: string;
  commissionPct?: number;
  estimatedValue?: number;
  notesShort?: string;
  status?: string;
  terms?: Partial<ProposalTermBlock>;
}

export interface ContractDeliverable {
  id: string;
  label: string;
  done: boolean;
  type?: string;
  dueAt?: string;
}

export interface ContractTimelineEvent {
  id?: string;
  when: string;
  what: string;
}

export interface ContractPartyRecord {
  name: string;
  handle?: string;
  manager?: string;
}

export interface ContractTerminationRecord {
  requested: boolean;
  reason: string | null;
  explanation: string | null;
}

export interface ContractRecord {
  id: string;
  userId: string;
  sellerId: string;
  campaignId: string | null;
  proposalId: string | null;
  title: string;
  status: string;
  health: string;
  value: number;
  currency: string;
  startDate: string;
  endDate: string;
  brand?: string;
  sellerName?: string;
  campaignTitle?: string;
  deliverables?: ContractDeliverable[];
  deliverablesCompleted?: number;
  deliverablesTotal?: number;
  linkedTasks?: number;
  linkedTasksOpen?: number;
  timeline?: ContractTimelineEvent[];
  parties?: {
    creator: ContractPartyRecord;
    seller: ContractPartyRecord;
  };
  termination?: ContractTerminationRecord;
}

export interface ProposalTransitionResult {
  proposal: ProposalRecord;
  contract: ContractRecord | null;
}

export interface CampaignRecord {
  id: string;
  sellerId: string;
  title: string;
  seller: string;
  type: string;
  status: string;
  stage: string;
  note?: string;
  value?: number;
}

export interface CampaignListFilters {
  q?: string;
  stage?: string;
  page?: number;
  pageSize?: number;
}

export type TaskColumn = "todo" | "in_progress" | "submitted" | "approved" | "needs_changes";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface TaskCommentRecord {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface TaskAttachmentRecord {
  id: string;
  name: string;
  url?: string;
  sizeLabel?: string;
  note?: string;
  kind?: string;
  createdAt?: string;
}

export interface TaskChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface TaskRecord {
  id: string;
  userId: string;
  contractId: string | null;
  campaign: string;
  supplier: string;
  supplierInitials: string;
  brand: string;
  column: TaskColumn | string;
  title: string;
  type: string;
  priority: TaskPriority | string;
  dueLabel: string;
  dueAt: string;
  overdue: boolean;
  earnings: number;
  currency: string;
  description?: string;
  assignee?: string;
  watchers?: string[];
  checklist?: TaskChecklistItem[];
  dependencyIds?: string[];
  refLinks?: string[];
  reminder?: string;
  comments: TaskCommentRecord[];
  attachments: TaskAttachmentRecord[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskListFilters {
  q?: string;
  column?: string;
  contractId?: string;
  overdueOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateTaskInput {
  contractId?: string | null;
  campaign?: string;
  supplier?: string;
  brand?: string;
  column?: TaskColumn | string;
  title: string;
  type?: string;
  priority?: TaskPriority | string;
  dueLabel?: string;
  dueAt?: string;
  overdue?: boolean;
  earnings?: number;
  currency?: string;
  description?: string;
  assignee?: string;
  watchers?: string[];
  checklist?: TaskChecklistItem[];
  dependencyIds?: string[];
  refLinks?: string[];
  reminder?: string;
  attachments?: TaskAttachmentRecord[];
}

export interface UpdateTaskInput {
  contractId?: string | null;
  campaign?: string;
  supplier?: string;
  brand?: string;
  column?: TaskColumn | string;
  title?: string;
  type?: string;
  priority?: TaskPriority | string;
  dueLabel?: string;
  dueAt?: string;
  overdue?: boolean;
  earnings?: number;
  currency?: string;
  description?: string;
  assignee?: string;
  watchers?: string[];
  checklist?: TaskChecklistItem[];
  dependencyIds?: string[];
  refLinks?: string[];
  reminder?: string;
  attachments?: TaskAttachmentRecord[];
}

export interface TaskCommentInput {
  body: string;
}

export interface TaskAttachmentInput {
  name?: string;
  url?: string;
  sizeLabel?: string;
  note?: string;
  kind?: string;
}

export type AssetReviewStatus = "draft" | "pending_supplier" | "pending_admin" | "approved" | "changes_requested" | "rejected";
export type AssetMediaType = "video" | "image" | "template" | "script" | "overlay" | "link" | "doc";

export interface AssetRecord {
  id: string;
  userId?: string;
  title: string;
  subtitle?: string;
  campaignId: string | null;
  supplierId: string | null;
  brand?: string;
  tags: string[];
  mediaType: AssetMediaType | string;
  source: string;
  ownerLabel: string;
  status: AssetReviewStatus | string;
  lastUpdatedLabel?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  previewKind?: "image" | "video";
  role?: string;
  usageNotes?: string;
  restrictions?: string;
  reviewNote?: string;
  relatedDealId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssetListFilters {
  q?: string;
  status?: string;
  mediaType?: string;
  campaignId?: string;
  source?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateAssetInput {
  title: string;
  mediaType: AssetMediaType | string;
  subtitle?: string;
  campaignId?: string | null;
  supplierId?: string | null;
  brand?: string;
  tags?: string[] | string;
  source?: string;
  status?: AssetReviewStatus | string;
  previewUrl?: string;
  thumbnailUrl?: string;
  previewKind?: "image" | "video";
  role?: string;
  usageNotes?: string;
  restrictions?: string;
  reviewNote?: string;
  relatedDealId?: string | null;
  linkUrl?: string;
  notes?: string;
}

export interface UpdateAssetReviewInput {
  status: AssetReviewStatus | string;
  note?: string;
}

export interface ContractTerminationInput {
  reason: string;
  explanation: string;
}

export interface LiveBuilderPersistedState {
  ts?: number;
  step?: string;
  draft: Record<string, unknown>;
  externalAssets?: Record<string, unknown>;
  activeFeaturedItemId?: string | null;
  activeFeaturedItemKey?: string | null;
  giveawayUi?: Record<string, unknown>;
}

export interface LiveBuilderSummaryInput {
  title?: string;
  sellerId?: string | null;
  sellerName?: string;
  campaignId?: string | null;
  campaignName?: string;
  hostId?: string | null;
  hostName?: string;
  scheduledFor?: string;
  time?: string;
  location?: string;
  simulcast?: string[];
  status?: string;
  durationMin?: number;
  productsCount?: number;
  scriptsReady?: boolean;
  assetsReady?: boolean;
  role?: string;
}

export interface SaveLiveBuilderInput {
  sessionId?: string;
  builderState: LiveBuilderPersistedState;
  summary?: LiveBuilderSummaryInput;
}

export interface LiveBuilderSessionRecord {
  id: string;
  userId?: string;
  title: string;
  campaignId?: string | null;
  campaign?: string;
  sellerId?: string | null;
  seller?: string;
  weekday?: string;
  dateLabel?: string;
  scheduledFor?: string;
  time?: string;
  location?: string;
  simulcast?: string[];
  status: string;
  role?: string;
  durationMin?: number;
  scriptsReady?: boolean;
  assetsReady?: boolean;
  productsCount?: number;
  workloadScore?: number;
  conflict?: boolean;
  studio?: Record<string, unknown>;
  builderState?: LiveBuilderPersistedState;
  [key: string]: unknown;
}

export interface AdBuilderPersistedState {
  ts?: number;
  step?: string;
  builder: Record<string, unknown>;
  externalAssets?: Record<string, unknown>;
  isGenerated?: boolean;
  showSharePanel?: boolean;
}

export interface AdBuilderSummaryInput {
  title?: string;
  subtitle?: string;
  sellerId?: string | null;
  sellerName?: string;
  campaignId?: string | null;
  campaignName?: string;
  platforms?: string[];
  startISO?: string;
  endISO?: string;
  timezone?: string;
  heroImageUrl?: string;
  heroIntroVideoUrl?: string;
  offers?: Array<Record<string, unknown>>;
  shortLink?: string;
  generated?: boolean;
  status?: string;
}

export interface SaveAdBuilderInput {
  adId?: string;
  builderState: AdBuilderPersistedState;
  summary?: AdBuilderSummaryInput;
}

export interface AdzPerformanceByPlatformRecord {
  platform: string;
  clicks: number;
  purchases: number;
}

export interface AdzPerformanceRecord {
  period?: string;
  clicks: number;
  purchases: number;
  conversionPct: number;
  earnings: number;
  byPlatform?: AdzPerformanceByPlatformRecord[];
  [key: string]: unknown;
}

export interface AdBuilderCampaignRecord {
  id: string;
  userId?: string;
  campaignId?: string | null;
  campaignName: string;
  campaignSubtitle?: string;
  sellerId?: string | null;
  supplier?: {
    name: string;
    category?: string;
    logoUrl?: string;
  };
  creator?: {
    name: string;
    handle?: string;
    avatarUrl?: string;
    verified?: boolean;
  };
  compensation?: {
    model?: string;
    flatFee?: number;
    commissionPct?: number;
    currency?: string;
    [key: string]: unknown;
  };
  status: string;
  platforms: string[];
  startISO?: string;
  endISO?: string;
  timezone?: string;
  heroImageUrl?: string;
  heroIntroVideoUrl?: string;
  offers?: Array<Record<string, unknown>>;
  generated?: boolean;
  hasBrokenLink?: boolean;
  lowStock?: boolean;
  performance?: AdzPerformanceRecord | Record<string, unknown>;
  builderState?: AdBuilderPersistedState;
  [key: string]: unknown;
}

export interface LiveBuilderStateRecord {
  step?: string;
  externalAssets?: Record<string, unknown>;
  giveawayUi?: Record<string, unknown>;
  prefillDealId?: string;
  savedAt?: string;
  publishedAt?: string;
  [key: string]: unknown;
}

export interface LiveSessionBuilderRecord {
  id: string;
  userId?: string;
  title: string;
  status: string;
  sellerId?: string | null;
  seller?: string;
  campaignId?: string | null;
  campaign?: string;
  scheduledFor?: string;
  time?: string;
  location?: string;
  simulcast?: string[];
  durationMin?: number;
  productsCount?: number;
  publicJoinUrl?: string;
  heroImageUrl?: string;
  heroVideoUrl?: string;
  builderDraft?: Record<string, unknown> | null;
  builderState?: LiveBuilderStateRecord;
  studio?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SaveLiveSessionDraftInput {
  draft: Record<string, unknown>;
  step?: string;
  externalAssets?: Record<string, unknown>;
  giveawayUi?: Record<string, unknown>;
  prefillDealId?: string;
  sellerId?: string | null;
  sellerName?: string;
  campaignId?: string | null;
  campaignName?: string;
  scheduledFor?: string;
  time?: string;
  location?: string;
  simulcast?: string[];
  durationMin?: number;
  productsCount?: number;
  scriptsReady?: boolean;
  assetsReady?: boolean;
  publicJoinUrl?: string;
  heroImageUrl?: string;
  heroVideoUrl?: string;
  status?: string;
}

export interface PublishLiveSessionInput {
  status?: string;
}

export interface AdBuilderStateRecord {
  step?: string;
  externalAssets?: Record<string, unknown>;
  savedAt?: string;
  publishedAt?: string;
  [key: string]: unknown;
}

export interface AdzCampaignBuilderRecord {
  id: string;
  userId?: string;
  campaignId?: string | null;
  campaignName: string;
  campaignSubtitle?: string;
  sellerId?: string | null;
  supplier?: {
    name?: string;
    category?: string;
    logoUrl?: string;
    [key: string]: unknown;
  };
  status: string;
  platforms: string[];
  startISO?: string;
  endISO?: string;
  timezone?: string;
  heroImageUrl?: string;
  heroIntroVideoUrl?: string;
  offers?: Array<Record<string, unknown>>;
  generated: boolean;
  shortLink?: string;
  hasBrokenLink?: boolean;
  lowStock?: boolean;
  builderDraft?: Record<string, unknown> | null;
  builderState?: AdBuilderStateRecord;
  performance?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SaveAdzCampaignDraftInput {
  builder: Record<string, unknown>;
  step?: string;
  externalAssets?: Record<string, unknown>;
  sellerId?: string | null;
  sellerName?: string;
  campaignId?: string | null;
  campaignName?: string;
  campaignSubtitle?: string;
  platforms?: string[];
  startISO?: string;
  endISO?: string;
  timezone?: string;
  heroImageUrl?: string;
  heroIntroVideoUrl?: string;
  offers?: Array<Record<string, unknown>>;
  shortLink?: string;
  status?: string;
  generated?: boolean;
}

export interface PublishAdzCampaignInput {
  status?: string;
}

export interface LiveSessionListFilters {
  q?: string;
  status?: string;
  campaignId?: string;
  page?: number;
  pageSize?: number;
}

export interface CrewAssignmentRecord {
  memberId: string;
  roleId: string;
  [key: string]: unknown;
}

export interface CrewSessionAssignmentsRecord {
  sessionId: string;
  assignments: CrewAssignmentRecord[];
  updatedAt?: string;
  [key: string]: unknown;
}

export interface CrewAvailabilityEventRecord {
  id: string;
  startISO: string;
  endISO: string;
  title: string;
  [key: string]: unknown;
}

export interface CrewWorkspaceRecord {
  crew: {
    userId?: string;
    sessions: CrewSessionAssignmentsRecord[];
    availabilityByMember: Record<string, CrewAvailabilityEventRecord[]>;
    [key: string]: unknown;
  };
  liveSessions: LiveBuilderSessionRecord[];
  members: WorkspaceMemberRecord[];
  roles: WorkspaceRoleRecord[];
}

export interface AudienceNotificationsToolConfigRecord {
  userId?: string;
  sessionId?: string;
  enabledChannels: string[];
  enabledReminders: string[];
  replayDelayMinutes: number;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface LiveAlertsToolConfigRecord {
  userId?: string;
  sessionId?: string;
  enabledDestinations: string[];
  draftText: string;
  frequencyCapMinutes: number;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface OverlayToolConfigRecord {
  userId?: string;
  sessionId?: string;
  variant: string;
  qrEnabled: boolean;
  qrLabel: string;
  qrUrl: string;
  destUrl: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface StreamingToolConfigRecord {
  userId?: string;
  sessionId?: string;
  selectedDestinations: string[];
  advancedOpen: boolean;
  recordMaster: boolean;
  autoReplay: boolean;
  autoHighlights: boolean;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface SafetyModerationToolConfigRecord {
  userId?: string;
  sessionId?: string;
  roleMode: string;
  muteChat: boolean;
  slowMode: boolean;
  linkBlocking: boolean;
  keywordRules: string[];
  updatedAt?: string;
  [key: string]: unknown;
}

export interface LiveStudioWorkspace {
  session: LiveBuilderSessionRecord;
  audienceNotifications?: Record<string, unknown>;
  liveAlerts?: Record<string, unknown>;
  overlays?: Record<string, unknown>;
  streaming?: Record<string, unknown>;
  safety?: Record<string, unknown>;
}

export interface LiveMomentInput {
  label: string;
  time?: string;
}

export interface LiveReplayClipRecord {
  id: string;
  title: string;
  startSec: number;
  endSec: number;
  format: string;
  status: string;
}

export interface LiveReplayRecord {
  id: string;
  sessionId: string;
  title: string;
  date: string;
  hook: string;
  retention: string;
  notes: string[];
  published: boolean;
  replayUrl?: string;
  coverUrl?: string;
  allowComments?: boolean;
  showProductStrip?: boolean;
  clips?: LiveReplayClipRecord[];
  updatedAt?: string;
  publishedAt?: string | null;
  scheduledPublishAt?: string | null;
  [key: string]: unknown;
}

export interface LiveReplayFilters {
  q?: string;
  published?: boolean | string;
  sessionId?: string;
  page?: number;
  pageSize?: number;
}

export interface UpdateLiveReplayInput {
  title?: string;
  hook?: string;
  retention?: string;
  notes?: string[];
  replayUrl?: string;
  coverUrl?: string;
  allowComments?: boolean;
  showProductStrip?: boolean;
  clips?: LiveReplayClipRecord[];
  scheduledPublishAt?: string | null;
  published?: boolean;
}

export interface EndLiveSessionResult {
  session: LiveBuilderSessionRecord;
  replay: LiveReplayRecord;
}

export interface AdzCampaignListFilters {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface AdzMarketplaceRecord extends AdBuilderCampaignRecord {
  seller?: string;
  offerCount?: number;
  linkedLinks?: number;
  clicks?: number;
  purchases?: number;
  earnings?: number;
  currency?: string;
}

export interface AdzMarketplaceFilters {
  q?: string;
  status?: string;
  sellerId?: string;
  generated?: boolean | string;
  lowStock?: boolean | string;
  page?: number;
  pageSize?: number;
}

export interface UpdateAdzCampaignInput {
  campaignName?: string;
  campaignSubtitle?: string;
  status?: string;
  platforms?: string[];
  offers?: Array<Record<string, unknown>>;
}

export interface PromoAdDetailRecord {
  campaign: AdBuilderCampaignRecord;
  links: Array<Record<string, unknown>>;
}



export interface LinkChannelRecord {
  name: string;
  url: string;
  hint?: string;
  [key: string]: unknown;
}

export interface LinkRegionVariantRecord {
  region: string;
  url: string;
  note?: string;
  [key: string]: unknown;
}

export interface LinkMetricRecord {
  clicks: number;
  purchases: number;
  conversionPct: number;
  earnings: number;
  currency: string;
  [key: string]: unknown;
}

export interface LinkRegionMetricRecord extends LinkMetricRecord {
  region: string;
}

export interface LinkShareCaptionRecord {
  platform: string;
  text: string;
}

export interface LinkSharePackRecord {
  headline: string;
  bullets: string[];
  captions: LinkShareCaptionRecord[];
  hashtags: string[];
}

export interface LinkRecord {
  id: string;
  userId?: string;
  tab: string;
  title: string;
  subtitle?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string | null;
  campaign?: {
    id?: string;
    name?: string;
    [key: string]: unknown;
  };
  supplier?: {
    name?: string;
    type?: string;
    [key: string]: unknown;
  };
  primaryUrl: string;
  shortUrl?: string;
  channels?: LinkChannelRecord[];
  metrics?: LinkMetricRecord;
  regionVariants?: LinkRegionVariantRecord[];
  regionMetrics?: LinkRegionMetricRecord[];
  sharePack?: LinkSharePackRecord;
  pinned?: boolean;
  note?: string;
  thumbnailUrl?: string;
  [key: string]: unknown;
}

export interface LinkListFilters {
  q?: string;
  status?: string;
  tab?: string;
  campaignId?: string;
  pinned?: boolean | string;
  page?: number;
  pageSize?: number;
}

export interface CreateLinkInput {
  tab?: string;
  title: string;
  subtitle?: string;
  status?: string;
  expiresAt?: string | null;
  campaign?: {
    id?: string;
    name?: string;
    [key: string]: unknown;
  };
  supplier?: {
    name?: string;
    type?: string;
    [key: string]: unknown;
  };
  primaryUrl: string;
  shortUrl?: string;
  channels?: LinkChannelRecord[];
  metrics?: Partial<LinkMetricRecord>;
  regionVariants?: LinkRegionVariantRecord[];
  regionMetrics?: LinkRegionMetricRecord[];
  sharePack?: Partial<LinkSharePackRecord>;
  pinned?: boolean;
  note?: string;
  thumbnailUrl?: string;
}

export interface UpdateLinkInput extends Partial<CreateLinkInput> {}


export interface WorkspaceRoleRecord {
  id: string;
  name: string;
  badge?: string;
  description?: string;
  perms: Record<string, boolean>;
  [key: string]: unknown;
}

export interface WorkspaceMemberRecord {
  id: string;
  name?: string;
  email?: string;
  roleId?: string;
  status?: string;
  seat?: string;
  lastActiveLabel?: string;
  twoFA?: string;
  [key: string]: unknown;
}

export interface RolesWorkspaceRecord {
  roles: WorkspaceRoleRecord[];
  members: WorkspaceMemberRecord[];
  invites: WorkspaceMemberRecord[];
  currentMember?: WorkspaceMemberRecord | null;
  effectivePermissions?: Record<string, boolean>;
  workspaceSecurity?: WorkspaceSecurityPolicy;
}

export interface WorkspaceSecurityPolicy {
  require2FA: boolean;
  allowExternalInvites: boolean;
  supplierGuestExpiryHours: number;
  inviteDomainAllowlist?: string[];
  [key: string]: unknown;
}

export interface UpdateWorkspaceSecurityInput {
  require2FA?: boolean;
  allowExternalInvites?: boolean;
  supplierGuestExpiryHours?: number;
  inviteDomainAllowlist?: string[];
}

export interface CreateWorkspaceRoleInput {
  id?: string;
  name: string;
  badge?: string;
  description?: string;
  perms?: Record<string, boolean>;
}

export interface UpdateWorkspaceRoleInput {
  name?: string;
  badge?: string;
  description?: string;
  perms?: Record<string, boolean>;
}

export interface DeleteWorkspaceRoleResult {
  id: string;
  deleted: boolean;
}

export interface InviteWorkspaceMemberInput {
  name: string;
  email: string;
  roleId: string;
  seat?: string;
}

export interface UpdateWorkspaceMemberInput {
  roleId?: string;
  status?: string;
  seat?: string;
}

export interface LiveCampaignGiveawayInventoryEntry {
  id: string;
  campaignId: string;
  type: "featured" | "custom";
  itemId?: string;
  title: string;
  imageUrl?: string;
  notes?: string;
  totalQuantity: number;
  allocatedQuantity: number;
  availableQuantity: number;
}

export interface LiveCampaignGiveawayInventoryRecord {
  campaignId: string;
  featuredItems: LiveCampaignGiveawayInventoryEntry[];
  customGiveaways: LiveCampaignGiveawayInventoryEntry[];
}
