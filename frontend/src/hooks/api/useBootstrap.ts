import { useCallback } from "react";
import { apiClient } from "../../api/client";
import { queryKeys } from "../../api/queryKeys";
import { useAuth } from "../../contexts/AuthContext";
import type { BootstrapData } from "../../api/types";
import { useApiQuery } from "./useApiQuery";

interface QueryOptions {
  enabled?: boolean;
  staleTime?: number;
}

export function useBootstrapQuery(options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const fetcher = useCallback((signal: AbortSignal) => apiClient.getBootstrap(signal), []);

  return useApiQuery<BootstrapData>(queryKeys.app.bootstrap(), fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 60_000
  });
}

export function useNavBadges() {
  const query = useBootstrapQuery();

  return {
    ...query,
    data: query.data?.navBadges ?? {}
  };
}
