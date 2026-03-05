import { useCallback, useMemo } from "react";
import { apiClient } from "../../api/client";
import { queryKeys } from "../../api/queryKeys";
import { useAuth } from "../../contexts/AuthContext";
import type { LiveBuilderSessionRecord, SaveLiveBuilderInput, LiveCampaignGiveawayInventoryRecord } from "../../api/types";
import { useApiMutation } from "./useApiMutation";
import { useApiQuery } from "./useApiQuery";

interface QueryOptions {
  enabled?: boolean;
  staleTime?: number;
}

export function useLiveBuilderSessionQuery(sessionId: string | undefined, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const safeSessionId = sessionId?.trim();
  const queryKey = useMemo(() => queryKeys.live.builderSession(safeSessionId), [safeSessionId]);
  const fetcher = useCallback(
    (signal: AbortSignal) => {
      if (!safeSessionId) {
        return Promise.reject(new Error("A live builder session id is required."));
      }
      return apiClient.getLiveBuilderSession(safeSessionId, signal);
    },
    [safeSessionId]
  );

  return useApiQuery<LiveBuilderSessionRecord>(queryKey, fetcher, {
    enabled: options.enabled ?? (hasApiSession && Boolean(safeSessionId)),
    staleTime: options.staleTime ?? 10_000
  });
}

export function useLiveCampaignGiveawayInventoryQuery(campaignId: string | undefined, sessionId: string | undefined, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const safeCampaignId = campaignId?.trim();
  const safeSessionId = sessionId?.trim();
  const queryKey = useMemo(() => queryKeys.live.campaignGiveaways(safeCampaignId, safeSessionId), [safeCampaignId, safeSessionId]);
  const fetcher = useCallback(
    (signal: AbortSignal) => {
      if (!safeCampaignId) {
        return Promise.reject(new Error("A campaign id is required."));
      }
      return apiClient.getLiveCampaignGiveawayInventory(safeCampaignId, { sessionId: safeSessionId, signal });
    },
    [safeCampaignId, safeSessionId]
  );

  return useApiQuery<LiveCampaignGiveawayInventoryRecord>(queryKey, fetcher, {
    enabled: options.enabled ?? (hasApiSession && Boolean(safeCampaignId)),
    staleTime: options.staleTime ?? 5_000
  });
}

export function useSaveLiveBuilderSessionMutation() {
  return useApiMutation<LiveBuilderSessionRecord, SaveLiveBuilderInput>((payload) => apiClient.saveLiveBuilderSession(payload), {
    invalidate: (_result, variables) => [
      queryKeys.live.builderSession(variables.sessionId ?? String(variables.builderState?.draft?.id || "unknown")),
      queryKeys.live.sessions(),
      queryKeys.discovery.dealzMarketplace(),
      queryKeys.discovery.campaignBoard(),
      queryKeys.app.bootstrap()
    ]
  });
}

interface PublishLiveBuilderVariables {
  sessionId: string;
  payload?: {
    status?: string;
  };
}

export function usePublishLiveBuilderSessionMutation() {
  return useApiMutation<LiveBuilderSessionRecord, PublishLiveBuilderVariables>(
    ({ sessionId, payload }) => apiClient.publishLiveBuilderSession(sessionId, payload),
    {
      invalidate: (_result, variables) => [
        queryKeys.live.builderSession(variables.sessionId),
        queryKeys.live.sessions(),
        queryKeys.discovery.dealzMarketplace(),
        queryKeys.discovery.campaignBoard(),
        queryKeys.app.bootstrap()
      ]
    }
  );
}
