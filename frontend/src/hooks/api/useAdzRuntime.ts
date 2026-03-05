import { useCallback, useMemo } from "react";
import { apiClient } from "../../api/client";
import { normalizeAdzCampaignFilters, normalizeLinkFilters, queryKeys } from "../../api/queryKeys";
import { useAuth } from "../../contexts/AuthContext";
import type {
  AdBuilderCampaignRecord,
  AdzCampaignListFilters,
  AdzPerformanceRecord,
  CreateLinkInput,
  LinkListFilters,
  LinkRecord,
  PaginatedResult,
  PromoAdDetailRecord,
  UpdateAdzCampaignInput,
  UpdateLinkInput
} from "../../api/types";
import { useApiMutation } from "./useApiMutation";
import { useApiQuery } from "./useApiQuery";

interface QueryOptions {
  enabled?: boolean;
  staleTime?: number;
}

export function useAdzCampaignsQuery(filters: AdzCampaignListFilters = {}, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const normalizedFilters = useMemo(
    () => normalizeAdzCampaignFilters(filters),
    [filters.page, filters.pageSize, filters.q, filters.status]
  );
  const queryKey = useMemo(() => queryKeys.adz.campaigns(normalizedFilters), [normalizedFilters]);
  const fetcher = useCallback((signal: AbortSignal) => apiClient.listAdzCampaigns(normalizedFilters, signal), [normalizedFilters]);

  return useApiQuery<PaginatedResult<AdBuilderCampaignRecord>>(queryKey, fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 10_000
  });
}

export function useAdzCampaignQuery(campaignId: string | undefined, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const safeCampaignId = campaignId?.trim();
  const queryKey = useMemo(() => queryKeys.adz.campaign(safeCampaignId), [safeCampaignId]);
  const fetcher = useCallback(
    (signal: AbortSignal) => {
      if (!safeCampaignId) {
        return Promise.reject(new Error("An ad campaign id is required."));
      }
      return apiClient.getAdzCampaign(safeCampaignId, signal);
    },
    [safeCampaignId]
  );

  return useApiQuery<AdBuilderCampaignRecord>(queryKey, fetcher, {
    enabled: options.enabled ?? (hasApiSession && Boolean(safeCampaignId)),
    staleTime: options.staleTime ?? 10_000
  });
}

export function useAdzPerformanceQuery(campaignId: string | undefined, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const safeCampaignId = campaignId?.trim();
  const queryKey = useMemo(() => queryKeys.adz.performance(safeCampaignId), [safeCampaignId]);
  const fetcher = useCallback(
    (signal: AbortSignal) => {
      if (!safeCampaignId) {
        return Promise.reject(new Error("An ad campaign id is required."));
      }
      return apiClient.getAdzPerformance(safeCampaignId, signal);
    },
    [safeCampaignId]
  );

  return useApiQuery<AdzPerformanceRecord>(queryKey, fetcher, {
    enabled: options.enabled ?? (hasApiSession && Boolean(safeCampaignId)),
    staleTime: options.staleTime ?? 10_000
  });
}

export function usePromoAdDetailQuery(campaignId: string | undefined, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const safeCampaignId = campaignId?.trim();
  const queryKey = useMemo(() => queryKeys.adz.promo(safeCampaignId), [safeCampaignId]);
  const fetcher = useCallback(
    (signal: AbortSignal) => {
      if (!safeCampaignId) {
        return Promise.reject(new Error("An ad campaign id is required."));
      }
      return apiClient.getPromoAdDetail(safeCampaignId, signal);
    },
    [safeCampaignId]
  );

  return useApiQuery<PromoAdDetailRecord>(queryKey, fetcher, {
    enabled: options.enabled ?? (hasApiSession && Boolean(safeCampaignId)),
    staleTime: options.staleTime ?? 10_000
  });
}

export function useUpdateAdzCampaignMutation() {
  return useApiMutation<AdBuilderCampaignRecord, { campaignId: string; payload: UpdateAdzCampaignInput }>(
    ({ campaignId, payload }) => apiClient.updateAdzCampaign(campaignId, payload),
    {
      invalidate: (result, variables) => [
        queryKeys.adz.campaigns(),
        queryKeys.adz.marketplace(),
        queryKeys.adz.campaign(variables.campaignId),
        queryKeys.adz.performance(variables.campaignId),
        queryKeys.adz.promo(variables.campaignId),
        queryKeys.discovery.dealzMarketplace(),
        queryKeys.discovery.campaignBoard(),
        queryKeys.app.bootstrap()
      ]
    }
  );
}


export function useLinksQuery(filters: LinkListFilters = {}, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const normalizedFilters = useMemo(
    () => normalizeLinkFilters(filters),
    [filters.campaignId, filters.page, filters.pageSize, filters.pinned, filters.q, filters.status, filters.tab]
  );
  const queryKey = useMemo(() => queryKeys.adz.links(normalizedFilters), [normalizedFilters]);
  const fetcher = useCallback((signal: AbortSignal) => apiClient.listLinks(normalizedFilters, signal), [normalizedFilters]);

  return useApiQuery<PaginatedResult<LinkRecord>>(queryKey, fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 10_000
  });
}

export function useLinkQuery(linkId: string | undefined, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const safeLinkId = linkId?.trim();
  const queryKey = useMemo(() => queryKeys.adz.link(safeLinkId), [safeLinkId]);
  const fetcher = useCallback(
    (signal: AbortSignal) => {
      if (!safeLinkId) {
        return Promise.reject(new Error("A link id is required."));
      }
      return apiClient.getLink(safeLinkId, signal);
    },
    [safeLinkId]
  );

  return useApiQuery<LinkRecord>(queryKey, fetcher, {
    enabled: options.enabled ?? (hasApiSession && Boolean(safeLinkId)),
    staleTime: options.staleTime ?? 10_000
  });
}

export function useCreateLinkMutation() {
  return useApiMutation<LinkRecord, { payload: CreateLinkInput }>(
    ({ payload }) => apiClient.createLink(payload),
    {
      invalidate: () => [queryKeys.adz.links(), queryKeys.adz.marketplace(), queryKeys.app.bootstrap()]
    }
  );
}

export function useUpdateLinkMutation() {
  return useApiMutation<LinkRecord, { linkId: string; payload: UpdateLinkInput }>(
    ({ linkId, payload }) => apiClient.updateLink(linkId, payload),
    {
      invalidate: (result) => [queryKeys.adz.links(), queryKeys.adz.link(result.id), queryKeys.adz.marketplace(), queryKeys.app.bootstrap()]
    }
  );
}
