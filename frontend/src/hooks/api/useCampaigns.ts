import { useCallback, useMemo } from "react";
import { apiClient } from "../../api/client";
import { normalizeCampaignFilters, queryKeys } from "../../api/queryKeys";
import { useAuth } from "../../contexts/AuthContext";
import type { CampaignListFilters, CampaignRecord, PaginatedResult } from "../../api/types";
import { useApiQuery } from "./useApiQuery";

interface QueryOptions {
  enabled?: boolean;
  staleTime?: number;
}

export function useCampaignsQuery(filters: CampaignListFilters = {}, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const normalizedFilters = useMemo(
    () => normalizeCampaignFilters(filters),
    [filters.page, filters.pageSize, filters.q, filters.stage]
  );
  const queryKey = useMemo(() => queryKeys.collaboration.campaigns(normalizedFilters), [normalizedFilters]);
  const fetcher = useCallback((signal: AbortSignal) => apiClient.listCampaigns(normalizedFilters, signal), [normalizedFilters]);

  return useApiQuery<PaginatedResult<CampaignRecord>>(queryKey, fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 60_000
  });
}
