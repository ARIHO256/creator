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
    })
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
  AssetRecord
};
