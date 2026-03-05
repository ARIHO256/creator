import type {
  AssetListFilters,
  CampaignListFilters,
  CampaignBoardListFilters,
  ContractListFilters,
  DealzMarketplaceFilters,
  InviteListFilters,
  OpportunityListFilters,
  PayoutListFilters,
  ProposalListFilters,
  SellerListFilters,
  TaskListFilters,
  LiveSessionListFilters,
  LiveReplayFilters,
  AdzCampaignListFilters,
  AdzMarketplaceFilters,
  LinkListFilters,
  ReviewsDashboardFilters
} from "./types";

function compactRecord<T extends object>(value: T): Record<string, unknown> {
  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((accumulator, key) => {
      const record = value as Record<string, unknown>;
      const entry = record[key];
      if (entry !== undefined && entry !== null && entry !== "") {
        accumulator[key] = entry;
      }
      return accumulator;
    }, {});
}

function buildCollectionKey<T extends object>(prefix: readonly [string, string], filters?: T) {
  const normalizedFilters = compactRecord((filters ?? {}) as T);
  return Object.keys(normalizedFilters).length > 0
    ? ([...prefix, normalizedFilters] as const)
    : ([...prefix] as const);
}

export function normalizeOpportunityFilters(filters: OpportunityListFilters = {}): OpportunityListFilters {
  return compactRecord(filters) as OpportunityListFilters;
}

export function normalizeSellerFilters(filters: SellerListFilters = {}): SellerListFilters {
  return compactRecord(filters) as SellerListFilters;
}

export function normalizeCampaignBoardFilters(filters: CampaignBoardListFilters = {}): CampaignBoardListFilters {
  return compactRecord(filters) as CampaignBoardListFilters;
}

export function normalizeDealzMarketplaceFilters(filters: DealzMarketplaceFilters = {}): DealzMarketplaceFilters {
  return compactRecord(filters) as DealzMarketplaceFilters;
}

export function normalizeInviteFilters(filters: InviteListFilters = {}): InviteListFilters {
  return compactRecord(filters) as InviteListFilters;
}

export function normalizeProposalFilters(filters: ProposalListFilters = {}): ProposalListFilters {
  return compactRecord(filters) as ProposalListFilters;
}

export function normalizeContractFilters(filters: ContractListFilters = {}): ContractListFilters {
  return compactRecord(filters) as ContractListFilters;
}

export function normalizeCampaignFilters(filters: CampaignListFilters = {}): CampaignListFilters {
  return compactRecord(filters) as CampaignListFilters;
}

export function normalizeTaskFilters(filters: TaskListFilters = {}): TaskListFilters {
  return compactRecord(filters) as TaskListFilters;
}

export function normalizeAssetFilters(filters: AssetListFilters = {}): AssetListFilters {
  return compactRecord(filters) as AssetListFilters;
}


export function normalizeLiveSessionFilters(filters: LiveSessionListFilters = {}): LiveSessionListFilters {
  return compactRecord(filters) as LiveSessionListFilters;
}

export function normalizeLiveReplayFilters(filters: LiveReplayFilters = {}): LiveReplayFilters {
  return compactRecord(filters) as LiveReplayFilters;
}

export function normalizeAdzCampaignFilters(filters: AdzCampaignListFilters = {}): AdzCampaignListFilters {
  return compactRecord(filters) as AdzCampaignListFilters;
}

export function normalizeAdzMarketplaceFilters(filters: AdzMarketplaceFilters = {}): AdzMarketplaceFilters {
  return compactRecord(filters) as AdzMarketplaceFilters;
}

export function normalizeLinkFilters(filters: LinkListFilters = {}): LinkListFilters {
  return compactRecord(filters) as LinkListFilters;
}

export function normalizeUploadFilters<T extends object>(filters: T = {} as T): T {
  return compactRecord(filters) as T;
}

export function normalizePayoutFilters(filters: PayoutListFilters = {}): PayoutListFilters {
  return compactRecord(filters) as PayoutListFilters;
}

export function normalizeReviewsDashboardFilters(filters: ReviewsDashboardFilters = {}): ReviewsDashboardFilters {
  return compactRecord(filters) as ReviewsDashboardFilters;
}

export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const
  },
  app: {
    bootstrap: () => ["app", "bootstrap"] as const
  },
  workspace: {
    landing: () => ["workspace", "landing"] as const,
    feed: () => ["workspace", "feed"] as const,
    myDay: () => ["workspace", "my-day"] as const,
    publicProfile: (handle: string | undefined) => ["workspace", "public-profile", handle ?? "unknown"] as const
  },
  settings: {
    root: () => ["settings", "root"] as const,
    notifications: () => ["settings", "notifications"] as const,
    roles: () => ["settings", "roles"] as const,
    auditLogs: () => ["settings", "audit-logs"] as const
  },
  reviews: {
    dashboard: (filters: ReviewsDashboardFilters = {}) => buildCollectionKey(["reviews", "dashboard"], normalizeReviewsDashboardFilters(filters))
  },
  workflow: {
    uploads: (filters: Record<string, unknown> = {}) => buildCollectionKey(["workflow", "uploads"], normalizeUploadFilters(filters)),
    onboarding: () => ["workflow", "onboarding"] as const,
    accountApproval: () => ["workflow", "account-approval"] as const,
    contentApprovals: () => ["workflow", "content-approvals"] as const,
    contentApproval: (submissionId: string | undefined) => ["workflow", "content-approvals", "detail", submissionId ?? "unknown"] as const
  },
  finance: {
    earningsSummary: () => ["finance", "earnings", "summary"] as const,
    payouts: (filters: PayoutListFilters = {}) => buildCollectionKey(["finance", "payouts"], normalizePayoutFilters(filters)),
    analyticsOverview: () => ["finance", "analytics", "overview"] as const,
    subscription: () => ["finance", "subscription"] as const
  },
  discovery: {
    sellers: (filters: SellerListFilters = {}) => buildCollectionKey(["discovery", "sellers"], normalizeSellerFilters(filters)),
    mySellers: (filters: SellerListFilters = {}) => buildCollectionKey(["discovery", "my-sellers"], normalizeSellerFilters(filters)),
    opportunities: (filters: OpportunityListFilters = {}) => buildCollectionKey(["discovery", "opportunities"], normalizeOpportunityFilters(filters)),
    invites: (filters: InviteListFilters = {}) => buildCollectionKey(["discovery", "invites"], normalizeInviteFilters(filters)),
    campaignBoard: (filters: CampaignBoardListFilters = {}) => buildCollectionKey(["discovery", "campaign-board"], normalizeCampaignBoardFilters(filters)),
    dealzMarketplace: (filters: DealzMarketplaceFilters = {}) => buildCollectionKey(["discovery", "dealz-marketplace"], normalizeDealzMarketplaceFilters(filters))
  },
  collaboration: {
    proposals: (filters: ProposalListFilters = {}) => buildCollectionKey(["collaboration", "proposals"], normalizeProposalFilters(filters)),
    proposal: (proposalId: string | undefined) => ["collaboration", "proposals", "detail", proposalId ?? "unknown"] as const,
    campaigns: (filters: CampaignListFilters = {}) => buildCollectionKey(["collaboration", "campaigns"], normalizeCampaignFilters(filters)),
    contracts: (filters: ContractListFilters = {}) => buildCollectionKey(["collaboration", "contracts"], normalizeContractFilters(filters)),
    contract: (contractId: string | undefined) => ["collaboration", "contracts", "detail", contractId ?? "unknown"] as const,
    tasks: (filters: TaskListFilters = {}) => buildCollectionKey(["collaboration", "tasks"], normalizeTaskFilters(filters)),
    task: (taskId: string | undefined) => ["collaboration", "tasks", "detail", taskId ?? "unknown"] as const,
    assets: (filters: AssetListFilters = {}) => buildCollectionKey(["collaboration", "assets"], normalizeAssetFilters(filters)),
    asset: (assetId: string | undefined) => ["collaboration", "assets", "detail", assetId ?? "unknown"] as const
  },
  live: {
    builderSession: (sessionId: string | undefined) => ["live", "builder-session", sessionId ?? "unknown"] as const,
    campaignGiveaways: (campaignId: string | undefined, sessionId?: string | undefined) => ["live", "campaign-giveaways", campaignId ?? "unknown", sessionId ?? "none"] as const,
    crewWorkspace: () => ["live", "crew-workspace"] as const,
    tool: (toolKey: string) => ["live", "tools", toolKey] as const,
    sessions: (filters: LiveSessionListFilters = {}) => buildCollectionKey(["live", "sessions"], normalizeLiveSessionFilters(filters)),
    session: (sessionId: string | undefined) => ["live", "sessions", "detail", sessionId ?? "unknown"] as const,
    studio: (sessionId: string | undefined) => ["live", "studio", sessionId ?? "unknown"] as const,
    studioDefault: () => ["live", "studio", "default"] as const,
    replays: (filters: LiveReplayFilters = {}) => buildCollectionKey(["live", "replays"], normalizeLiveReplayFilters(filters)),
    replay: (replayId: string | undefined) => ["live", "replays", "detail", replayId ?? "unknown"] as const,
    replayBySession: (sessionId: string | undefined) => ["live", "replays", "by-session", sessionId ?? "unknown"] as const
  },
  adz: {
    builderCampaign: (adId: string | undefined) => ["adz", "builder-campaign", adId ?? "unknown"] as const,
    campaigns: (filters: AdzCampaignListFilters = {}) => buildCollectionKey(["adz", "campaigns"], normalizeAdzCampaignFilters(filters)),
    marketplace: (filters: AdzMarketplaceFilters = {}) => buildCollectionKey(["adz", "marketplace"], normalizeAdzMarketplaceFilters(filters)),
    campaign: (campaignId: string | undefined) => ["adz", "campaigns", "detail", campaignId ?? "unknown"] as const,
    performance: (campaignId: string | undefined) => ["adz", "campaigns", "performance", campaignId ?? "unknown"] as const,
    promo: (campaignId: string | undefined) => ["adz", "promo", campaignId ?? "unknown"] as const,
    links: (filters: LinkListFilters = {}) => buildCollectionKey(["adz", "links"], normalizeLinkFilters(filters)),
    link: (linkId: string | undefined) => ["adz", "links", "detail", linkId ?? "unknown"] as const
  }
};
