import { useCallback, useMemo } from "react";
import { apiClient } from "../../api/client";
import { queryKeys } from "../../api/queryKeys";
import { useAuth } from "../../contexts/AuthContext";
import type { AdBuilderCampaignRecord, SaveAdBuilderInput } from "../../api/types";
import { useApiMutation } from "./useApiMutation";
import { useApiQuery } from "./useApiQuery";

interface QueryOptions {
  enabled?: boolean;
  staleTime?: number;
}

export function useAdBuilderCampaignQuery(adId: string | undefined, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const safeAdId = adId?.trim();
  const queryKey = useMemo(() => queryKeys.adz.builderCampaign(safeAdId), [safeAdId]);
  const fetcher = useCallback(
    (signal: AbortSignal) => {
      if (!safeAdId) {
        return Promise.reject(new Error("An ad builder campaign id is required."));
      }
      return apiClient.getAdBuilderCampaign(safeAdId, signal);
    },
    [safeAdId]
  );

  return useApiQuery<AdBuilderCampaignRecord>(queryKey, fetcher, {
    enabled: options.enabled ?? (hasApiSession && Boolean(safeAdId)),
    staleTime: options.staleTime ?? 10_000
  });
}

export function useSaveAdBuilderCampaignMutation() {
  return useApiMutation<AdBuilderCampaignRecord, SaveAdBuilderInput>((payload) => apiClient.saveAdBuilderCampaign(payload), {
    invalidate: (_result, variables) => [
      queryKeys.adz.builderCampaign(variables.adId ?? String((variables.builderState?.builder as Record<string, unknown> | undefined)?.id || "unknown")),
      queryKeys.adz.campaigns(),
      queryKeys.adz.marketplace(),
      queryKeys.discovery.dealzMarketplace(),
      queryKeys.discovery.campaignBoard(),
      queryKeys.app.bootstrap()
    ]
  });
}

interface PublishAdBuilderVariables {
  adId: string;
  payload?: {
    status?: string;
  };
}

export function usePublishAdBuilderCampaignMutation() {
  return useApiMutation<AdBuilderCampaignRecord, PublishAdBuilderVariables>(
    ({ adId, payload }) => apiClient.publishAdBuilderCampaign(adId, payload),
    {
      invalidate: (_result, variables) => [
        queryKeys.adz.builderCampaign(variables.adId),
        queryKeys.adz.campaigns(),
        queryKeys.adz.marketplace(),
        queryKeys.discovery.dealzMarketplace(),
        queryKeys.discovery.campaignBoard(),
        queryKeys.app.bootstrap()
      ]
    }
  );
}
