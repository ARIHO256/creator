import { useCallback, useMemo } from "react";
import { apiClient } from "../../api/client";
import { normalizeSellerFilters, queryKeys } from "../../api/queryKeys";
import { useAuth } from "../../contexts/AuthContext";
import type { PaginatedResult, SellerListFilters, SellerRecord } from "../../api/types";
import { useApiMutation } from "./useApiMutation";
import { useApiQuery } from "./useApiQuery";

interface QueryOptions {
  enabled?: boolean;
  staleTime?: number;
}

export function useSellersQuery(filters: SellerListFilters = {}, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const normalizedFilters = useMemo(
    () => normalizeSellerFilters(filters),
    [filters.openOnly, filters.page, filters.pageSize, filters.q, filters.region, filters.relationship]
  );
  const queryKey = useMemo(() => queryKeys.discovery.sellers(normalizedFilters), [normalizedFilters]);
  const fetcher = useCallback((signal: AbortSignal) => apiClient.listSellers(normalizedFilters, signal), [normalizedFilters]);

  return useApiQuery<PaginatedResult<SellerRecord>>(queryKey, fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 60_000
  });
}

export function useMySellersQuery(filters: SellerListFilters = {}, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const normalizedFilters = useMemo(
    () => normalizeSellerFilters(filters),
    [filters.openOnly, filters.page, filters.pageSize, filters.q, filters.region, filters.relationship]
  );
  const queryKey = useMemo(() => queryKeys.discovery.mySellers(normalizedFilters), [normalizedFilters]);
  const fetcher = useCallback((signal: AbortSignal) => apiClient.listMySellers(normalizedFilters, signal), [normalizedFilters]);

  return useApiQuery<PaginatedResult<SellerRecord>>(queryKey, fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 60_000
  });
}

interface ToggleFollowVariables {
  sellerId: string;
  follow: boolean;
}

export function useToggleSellerFollowMutation() {
  return useApiMutation<SellerRecord, ToggleFollowVariables>(
    ({ sellerId, follow }) => apiClient.setSellerFollow(sellerId, follow),
    {
      invalidate: [queryKeys.discovery.sellers(), queryKeys.discovery.mySellers(), queryKeys.discovery.opportunities(), queryKeys.discovery.campaignBoard(), queryKeys.app.bootstrap()]
    }
  );
}
