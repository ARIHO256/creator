type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: {
    message?: string;
  };
};

type EarningsSummary = {
  available?: number;
  pending?: number;
  lifetime?: number;
};

type PayoutRecord = {
  id?: string;
  date?: string;
  requestedAt?: string;
  amount?: number;
  currency?: string;
  status?: string;
  method?: string;
  reference?: string;
  recipient?: string;
};

type SellerRecord = {
  id: string;
  name: string;
  type?: string;
  category?: string | null;
  region?: string | null;
  rating?: number;
  isVerified?: boolean;
};

type OpportunityRecord = {
  id: string;
  title?: string;
  description?: string | null;
  payBand?: string | null;
  status?: string;
  seller?: SellerRecord;
};

type InviteRecord = {
  id?: string;
  seller?: string;
  sellerInitials?: string;
  campaign?: string;
  type?: string;
  category?: string;
  region?: string;
  baseFee?: number;
  currency?: string;
  commissionPct?: number;
  estimatedValue?: number;
  status?: string;
  messageShort?: string;
  lastActivity?: string;
  supplierDescription?: string;
  supplierRating?: number;
  fitScore?: number;
  fitReason?: string;
};

type CampaignRecord = {
  id?: string;
  title?: string;
  seller?: string;
  type?: string;
  stage?: string;
  status?: string;
  note?: string;
  value?: number;
  currency?: string;
  region?: string;
  origin?: string;
  lastActivity?: string;
};

type ProposalRecord = {
  id?: string;
  brand?: string;
  initials?: string;
  campaign?: string;
  origin?: string;
  offerType?: string;
  category?: string;
  region?: string;
  baseFeeMin?: number;
  baseFeeMax?: number;
  currency?: string;
  commissionPct?: number;
  estimatedValue?: number;
  status?: string;
  lastActivity?: string;
  notesShort?: string;
};

type ContractRecord = {
  id?: string;
  title?: string;
  status?: string;
  health?: string;
  value?: number;
  currency?: string;
  startDate?: string;
  endDate?: string;
  deliverables?: Array<{
    id?: string;
    label?: string;
    due?: string;
    done?: boolean;
    type?: string;
  }>;
  timeline?: Array<{
    when?: string;
    what?: string;
    date?: string;
    label?: string;
  }>;
  parties?: {
    seller?: {
      name?: string;
    };
  };
};

type TaskRecord = {
  id?: string;
  title?: string;
  column?: string;
  campaign?: string;
  supplier?: string;
  type?: string;
  status?: string;
  priority?: string;
  dueAt?: string;
  dueLabel?: string;
};

type AssetRecord = {
  id?: string;
  title?: string;
  subtitle?: string;
  campaignId?: string;
  supplierId?: string;
  brand?: string;
  mediaType?: string;
  status?: string;
  source?: string;
  tags?: string[];
};

type NotificationRecord = {
  id?: string;
  type?: string;
  title?: string;
  message?: string;
  brand?: string;
  campaign?: string;
  createdAt?: string;
  read?: boolean;
  link?: string;
};

type SubscriptionRecord = {
  plan?: string;
  cycle?: string;
  status?: string;
  renewsAt?: string;
  cancelAtPeriodEnd?: boolean;
  billingEmail?: string;
  billingMethod?: {
    type?: string;
    label?: string;
    brand?: string;
    last4?: string;
    holderName?: string;
    expMonth?: number;
    expYear?: number;
  };
  support?: {
    contactEmail?: string;
    salesEmail?: string;
    helpCenterUrl?: string;
    managerName?: string;
  };
  notes?: string[];
  limits?: Record<string, unknown>;
  updatedAt?: string;
};

type LiveSessionRecord = {
  id?: string;
  title?: string;
  campaign?: string;
  seller?: string;
  weekday?: string;
  dateLabel?: string;
  scheduledFor?: string;
  time?: string;
  location?: string;
  simulcast?: string[] | string;
  status?: string;
  role?: string;
  durationMin?: number;
  scriptsReady?: boolean;
  assetsReady?: boolean;
  productsCount?: number;
  workloadScore?: number;
  conflict?: boolean;
};

type LiveReplayRecord = {
  id?: string;
  sessionId?: string;
  title?: string;
  date?: string;
  views?: number;
  sales?: number;
  durationSec?: number;
  published?: boolean;
  notes?: string[];
  status?: string;
  replayUrl?: string;
};

type AuditLogRecord = {
  id?: string;
  at?: string;
  when?: string;
  ts?: string;
  actor?: string;
  action?: string;
  detail?: string;
  severity?: string;
  outcome?: string;
  module?: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  meta?: Record<string, unknown>;
};

type AnalyticsOverviewRecord = {
  rank?: string;
  score?: number;
  benchmarks?: {
    viewersPercentile?: number;
    ctrPercentile?: number;
    conversionPercentile?: number;
    salesPercentile?: number;
  };
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

const toUrl = (path: string) => `${API_BASE_URL}${path}`;

const getStoredAccessToken = () =>
  localStorage.getItem("mldz_access_token") ||
  localStorage.getItem("accessToken") ||
  localStorage.getItem("token") ||
  "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  const token = getStoredAccessToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(toUrl(path), {
    ...init,
    headers
  });

  const text = await response.text();
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const message =
      (payload as { error?: { message?: string }; message?: string } | null)?.error?.message ||
      (payload as { message?: string } | null)?.message ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  if (payload && typeof payload === "object" && "success" in (payload as Record<string, unknown>)) {
    const envelope = payload as ApiEnvelope<T>;
    if (!envelope.success) {
      throw new Error(envelope.error?.message || "Request failed");
    }
    return envelope.data;
  }

  return payload as T;
}

export const backendApi = {
  getByPath: <T>(path: string) => request<T>(path),
  prefetch: (path: string) => request<unknown>(path),
  getDashboardFeed: () => request<{ hero?: { title?: string }; quickStats?: Array<{ label?: string; value?: number }> }>("/api/dashboard/feed"),
  getDashboardMyDay: () => request<{ agenda?: unknown[]; tasks?: unknown[] }>("/api/dashboard/my-day"),
  getSellers: () => request<SellerRecord[]>("/api/sellers"),
  getMySellers: () => request<SellerRecord[]>("/api/my-sellers"),
  getOpportunities: () => request<OpportunityRecord[]>("/api/opportunities"),
  getInvites: () => request<InviteRecord[]>("/api/invites"),
  respondInvite: (id: string, status: string) =>
    request<unknown>(`/api/invites/${id}/respond`, {
      method: "POST",
      body: JSON.stringify({ status })
    }),
  getCampaigns: () => request<CampaignRecord[]>("/api/campaigns"),
  getProposals: () => request<ProposalRecord[]>("/api/proposals"),
  transitionProposal: (id: string, status: string) =>
    request<unknown>(`/api/proposals/${id}/transition`, {
      method: "POST",
      body: JSON.stringify({ status })
    }),
  getContracts: () => request<ContractRecord[]>("/api/contracts"),
  terminateContract: (id: string, body: unknown) =>
    request<unknown>(`/api/contracts/${id}/terminate-request`, {
      method: "POST",
      body: JSON.stringify(body)
    }),
  getTasks: () => request<TaskRecord[]>("/api/tasks"),
  getAssets: () => request<AssetRecord[]>("/api/assets"),
  getEarningsSummary: () => request<EarningsSummary>("/api/earnings/summary"),
  getPayouts: () => request<PayoutRecord[]>("/api/earnings/payouts"),
  requestPayout: (body: { amount: number; currency?: string }) =>
    request<PayoutRecord>("/api/earnings/payouts/request", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  getNotifications: () => request<NotificationRecord[]>("/api/notifications"),
  markNotificationRead: (id: string) =>
    request<unknown>(`/api/notifications/${id}/read`, {
      method: "PATCH"
    }),
  markAllNotificationsRead: () =>
    request<{ updated?: number }>("/api/notifications/read-all", {
      method: "POST"
    }),
  getSubscription: () => request<SubscriptionRecord>("/api/subscription"),
  updateSubscription: (body: { plan?: string; cycle?: string }) =>
    request<SubscriptionRecord>("/api/subscription", {
      method: "PATCH",
      body: JSON.stringify(body)
    }),
  getLiveSessions: () => request<LiveSessionRecord[]>("/api/live/sessions"),
  getLiveReplays: () => request<LiveReplayRecord[]>("/api/live/replays"),
  publishReplay: (id: string, body?: Record<string, unknown>) =>
    request<unknown>(`/api/live/replays/${id}/publish`, {
      method: "POST",
      body: JSON.stringify(body ?? {})
    }),
  updateReplay: (id: string, body: Record<string, unknown>) =>
    request<unknown>(`/api/live/replays/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body)
    }),
  getAuditLogs: () => request<AuditLogRecord[]>("/api/audit-logs"),
  getAnalyticsOverview: () => request<AnalyticsOverviewRecord>("/api/analytics/overview")
};

export type {
  EarningsSummary,
  PayoutRecord,
  SellerRecord,
  OpportunityRecord,
  InviteRecord,
  CampaignRecord,
  ProposalRecord,
  ContractRecord,
  TaskRecord,
  AssetRecord,
  NotificationRecord,
  SubscriptionRecord,
  LiveSessionRecord,
  LiveReplayRecord,
  AuditLogRecord,
  AnalyticsOverviewRecord
};
