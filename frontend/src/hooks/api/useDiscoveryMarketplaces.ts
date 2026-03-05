import { useCallback, useMemo } from "react";
import { apiClient } from "../../api/client";
import {
  normalizeAdzMarketplaceFilters,
  normalizeCampaignBoardFilters,
  normalizeDealzMarketplaceFilters,
  normalizeInviteFilters,
  normalizeOpportunityFilters,
  queryKeys
} from "../../api/queryKeys";
import { useAuth } from "../../contexts/AuthContext";
import type {
  AdzMarketplaceFilters,
  AdzMarketplaceRecord,
  CampaignBoardListFilters,
  CampaignBoardRow,
  DealzMarketplaceFilters,
  DealzMarketplaceRecord,
  InviteListFilters,
  InviteRecord,
  OpportunityListFilters,
  RespondInviteInput,
  OpportunityRecord,
  PaginatedResult
} from "../../api/types";
import { useApiMutation } from "./useApiMutation";
import { useApiQuery } from "./useApiQuery";

interface QueryOptions {
  enabled?: boolean;
  staleTime?: number;
}

export function useOpportunitiesQuery(filters: OpportunityListFilters = {}, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const normalizedFilters = useMemo(
    () => normalizeOpportunityFilters(filters),
    [
      filters.category,
      filters.commission,
      filters.currentOnly,
      filters.language,
      filters.maxBudget,
      filters.minBudget,
      filters.minRating,
      filters.page,
      filters.pageSize,
      filters.q,
      filters.region,
      filters.sellerId,
      filters.status,
      filters.supplierType
    ]
  );
  const queryKey = useMemo(() => queryKeys.discovery.opportunities(normalizedFilters), [normalizedFilters]);
  const fetcher = useCallback((signal: AbortSignal) => apiClient.listOpportunities(normalizedFilters, signal), [normalizedFilters]);

  return useApiQuery<PaginatedResult<OpportunityRecord>>(queryKey, fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 30_000
  });
}

export function useToggleOpportunitySavedMutation() {
  return useApiMutation<OpportunityRecord, { opportunityId: string; saved: boolean }>(
    ({ opportunityId, saved }) => apiClient.setOpportunitySaved(opportunityId, saved),
    {
      invalidate: () => [queryKeys.discovery.opportunities(), queryKeys.app.bootstrap()]
    }
  );
}

export function useInvitesQuery(filters: InviteListFilters = {}, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const normalizedFilters = useMemo(
    () => normalizeInviteFilters(filters),
    [filters.page, filters.pageSize, filters.q, filters.status]
  );
  const queryKey = useMemo(() => queryKeys.discovery.invites(normalizedFilters), [normalizedFilters]);
  const fetcher = useCallback((signal: AbortSignal) => apiClient.listInvites(normalizedFilters, signal), [normalizedFilters]);

  return useApiQuery<PaginatedResult<InviteRecord>>(queryKey, fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 20_000
  });
}

export function useRespondInviteMutation() {
  return useApiMutation<InviteRecord, { inviteId: string; payload: RespondInviteInput }>(
    ({ inviteId, payload }) => apiClient.respondToInvite(inviteId, payload),
    {
      invalidate: () => [
        queryKeys.discovery.invites(),
        queryKeys.discovery.campaignBoard(),
        queryKeys.collaboration.proposals(),
        queryKeys.workspace.feed(),
        queryKeys.workspace.myDay(),
        queryKeys.app.bootstrap()
      ]
    }
  );
}

export function useCampaignBoardQuery(filters: CampaignBoardListFilters = {}, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const normalizedFilters = useMemo(
    () => normalizeCampaignBoardFilters(filters),
    [filters.origin, filters.page, filters.pageSize, filters.q, filters.stage]
  );
  const queryKey = useMemo(() => queryKeys.discovery.campaignBoard(normalizedFilters), [normalizedFilters]);
  const fetcher = useCallback((signal: AbortSignal) => apiClient.listCampaignBoard(normalizedFilters, signal), [normalizedFilters]);

  return useApiQuery<PaginatedResult<CampaignBoardRow>>(queryKey, fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 20_000
  });
}

export function useDealzMarketplaceQuery(filters: DealzMarketplaceFilters = {}, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const normalizedFilters = useMemo(
    () => normalizeDealzMarketplaceFilters(filters),
    [filters.kind, filters.page, filters.pageSize, filters.q, filters.sellerId, filters.status]
  );
  const queryKey = useMemo(() => queryKeys.discovery.dealzMarketplace(normalizedFilters), [normalizedFilters]);
  const fetcher = useCallback((signal: AbortSignal) => apiClient.listDealzMarketplace(normalizedFilters, signal), [normalizedFilters]);

  return useApiQuery<PaginatedResult<DealzMarketplaceRecord>>(queryKey, fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 15_000
  });
}

export function useAdzMarketplaceQuery(filters: AdzMarketplaceFilters = {}, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const normalizedFilters = useMemo(
    () => normalizeAdzMarketplaceFilters(filters),
    [filters.generated, filters.lowStock, filters.page, filters.pageSize, filters.q, filters.sellerId, filters.status]
  );
  const queryKey = useMemo(() => queryKeys.adz.marketplace(normalizedFilters), [normalizedFilters]);
  const fetcher = useCallback((signal: AbortSignal) => apiClient.listAdzMarketplace(normalizedFilters, signal), [normalizedFilters]);

  return useApiQuery<PaginatedResult<AdzMarketplaceRecord>>(queryKey, fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 15_000
  });
}
