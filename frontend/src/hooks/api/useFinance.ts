import { useCallback, useMemo } from "react";
import { apiClient } from "../../api/client";
import { normalizePayoutFilters, queryKeys } from "../../api/queryKeys";
import { useAuth } from "../../contexts/AuthContext";
import type {
  AnalyticsOverviewRecord,
  EarningsSummaryRecord,
  PaginatedResult,
  PayoutListFilters,
  PayoutRecord,
  RequestPayoutInput,
  SubscriptionRecord,
  UpdateSubscriptionInput
} from "../../api/types";
import { useApiMutation } from "./useApiMutation";
import { useApiQuery } from "./useApiQuery";

interface QueryOptions {
  enabled?: boolean;
  staleTime?: number;
}

export function useEarningsSummaryQuery(options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const fetcher = useCallback((signal: AbortSignal) => apiClient.getEarningsSummary(signal), []);

  return useApiQuery<EarningsSummaryRecord>(queryKeys.finance.earningsSummary(), fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 45_000
  });
}

export function usePayoutsQuery(filters: PayoutListFilters = {}, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const normalizedFilters = useMemo(
    () => normalizePayoutFilters(filters),
    [filters.page, filters.pageSize, filters.q, filters.status]
  );
  const queryKey = useMemo(() => queryKeys.finance.payouts(normalizedFilters), [normalizedFilters]);
  const fetcher = useCallback((signal: AbortSignal) => apiClient.listPayouts(normalizedFilters, signal), [normalizedFilters]);

  return useApiQuery<PaginatedResult<PayoutRecord>>(queryKey, fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 20_000
  });
}

export function useAnalyticsOverviewQuery(options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const fetcher = useCallback((signal: AbortSignal) => apiClient.getAnalyticsOverview(signal), []);

  return useApiQuery<AnalyticsOverviewRecord>(queryKeys.finance.analyticsOverview(), fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 30_000
  });
}

export function useSubscriptionQuery(options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const fetcher = useCallback((signal: AbortSignal) => apiClient.getSubscription(signal), []);

  return useApiQuery<SubscriptionRecord>(queryKeys.finance.subscription(), fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 45_000
  });
}

export function useUpdateSubscriptionMutation() {
  return useApiMutation<SubscriptionRecord, UpdateSubscriptionInput>((payload) => apiClient.updateSubscription(payload), {
    invalidate: () => [
      queryKeys.finance.subscription(),
      queryKeys.app.bootstrap(),
      queryKeys.workspace.feed(),
      queryKeys.workspace.myDay(),
      queryKeys.settings.root()
    ]
  });
}

export function useRequestPayoutMutation() {
  return useApiMutation<PayoutRecord, RequestPayoutInput>((payload) => apiClient.requestPayout(payload), {
    invalidate: () => [queryKeys.finance.earningsSummary(), queryKeys.finance.payouts(), queryKeys.app.bootstrap()]
  });
}
