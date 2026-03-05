import { useCallback } from "react";
import { apiClient } from "../../api/client";
import { queryKeys } from "../../api/queryKeys";
import { useAuth } from "../../contexts/AuthContext";
import type {
  DashboardFeedRecord,
  LandingContentRecord,
  MyDayWorkspaceRecord,
  PublicCreatorProfileRecord
} from "../../api/types";
import { useApiQuery } from "./useApiQuery";

interface QueryOptions {
  enabled?: boolean;
  staleTime?: number;
}

export function useLandingContentQuery(options: QueryOptions = {}) {
  const fetcher = useCallback((signal: AbortSignal) => apiClient.getLandingContent(signal), []);

  return useApiQuery<LandingContentRecord>(queryKeys.workspace.landing(), fetcher, {
    enabled: options.enabled ?? true,
    staleTime: options.staleTime ?? 120_000
  });
}

export function useDashboardFeedQuery(options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const fetcher = useCallback((signal: AbortSignal) => apiClient.getDashboardFeed(signal), []);

  return useApiQuery<DashboardFeedRecord>(queryKeys.workspace.feed(), fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 30_000
  });
}

export function useMyDayWorkspaceQuery(options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const fetcher = useCallback((signal: AbortSignal) => apiClient.getMyDayWorkspace(signal), []);

  return useApiQuery<MyDayWorkspaceRecord>(queryKeys.workspace.myDay(), fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 30_000
  });
}

export function usePublicCreatorProfileQuery(handle: string | undefined, options: QueryOptions = {}) {
  const fetcher = useCallback(
    (signal: AbortSignal) => {
      if (!handle) {
        return Promise.reject(new Error("Creator handle is required."));
      }
      return apiClient.getPublicCreatorProfile(handle, signal);
    },
    [handle]
  );

  return useApiQuery<PublicCreatorProfileRecord>(queryKeys.workspace.publicProfile(handle), fetcher, {
    enabled: options.enabled ?? Boolean(handle),
    staleTime: options.staleTime ?? 45_000
  });
}
