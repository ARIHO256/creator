import { api } from "./api";

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

export const creatorApi = {
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
  }
};
