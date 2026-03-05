import { useCallback } from "react";
import { apiClient } from "../../api/client";
import { queryKeys } from "../../api/queryKeys";
import { useAuth } from "../../contexts/AuthContext";
import type { ReviewsDashboardFilters, ReviewsDashboardRecord } from "../../api/types";
import { useApiQuery } from "./useApiQuery";

interface QueryOptions {
  enabled?: boolean;
  staleTime?: number;
}

export function useReviewsDashboardQuery(filters: ReviewsDashboardFilters = {}, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const fetcher = useCallback((signal: AbortSignal) => apiClient.getReviewsDashboard(filters, signal), [filters]);

  return useApiQuery<ReviewsDashboardRecord>(queryKeys.reviews.dashboard(filters), fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 20_000
  });
}
