import { useCallback, useMemo } from "react";
import { apiClient } from "../../api/client";
import { normalizeLiveReplayFilters, normalizeLiveSessionFilters, queryKeys } from "../../api/queryKeys";
import { useAuth } from "../../contexts/AuthContext";
import type {
  EndLiveSessionResult,
  LiveBuilderSessionRecord,
  LiveMomentInput,
  LiveReplayFilters,
  LiveReplayRecord,
  LiveSessionListFilters,
  LiveStudioWorkspace,
  PaginatedResult,
  UpdateLiveReplayInput
} from "../../api/types";
import { useApiMutation } from "./useApiMutation";
import { useApiQuery } from "./useApiQuery";

interface QueryOptions {
  enabled?: boolean;
  staleTime?: number;
}

export function useLiveSessionsQuery(filters: LiveSessionListFilters = {}, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const normalizedFilters = useMemo(
    () => normalizeLiveSessionFilters(filters),
    [filters.campaignId, filters.page, filters.pageSize, filters.q, filters.status]
  );
  const queryKey = useMemo(() => queryKeys.live.sessions(normalizedFilters), [normalizedFilters]);
  const fetcher = useCallback((signal: AbortSignal) => apiClient.listLiveSessions(normalizedFilters, signal), [normalizedFilters]);

  return useApiQuery<PaginatedResult<LiveBuilderSessionRecord>>(queryKey, fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 10_000
  });
}

export function useLiveSessionQuery(sessionId: string | undefined, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const safeSessionId = sessionId?.trim();
  const queryKey = useMemo(() => queryKeys.live.session(safeSessionId), [safeSessionId]);
  const fetcher = useCallback(
    (signal: AbortSignal) => {
      if (!safeSessionId) {
        return Promise.reject(new Error("A live session id is required."));
      }
      return apiClient.getLiveSession(safeSessionId, signal);
    },
    [safeSessionId]
  );

  return useApiQuery<LiveBuilderSessionRecord>(queryKey, fetcher, {
    enabled: options.enabled ?? (hasApiSession && Boolean(safeSessionId)),
    staleTime: options.staleTime ?? 5_000
  });
}

export function useLiveStudioQuery(sessionId: string | undefined, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const safeSessionId = sessionId?.trim();
  const queryKey = useMemo(() => queryKeys.live.studio(safeSessionId), [safeSessionId]);
  const fetcher = useCallback(
    (signal: AbortSignal) => {
      if (!safeSessionId) {
        return Promise.reject(new Error("A live studio session id is required."));
      }
      return apiClient.getLiveStudio(safeSessionId, signal);
    },
    [safeSessionId]
  );

  return useApiQuery<LiveStudioWorkspace>(queryKey, fetcher, {
    enabled: options.enabled ?? (hasApiSession && Boolean(safeSessionId)),
    staleTime: options.staleTime ?? 3_000
  });
}

export function useLiveStudioDefaultQuery(options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const queryKey = useMemo(() => queryKeys.live.studioDefault(), []);
  const fetcher = useCallback((signal: AbortSignal) => apiClient.getDefaultLiveStudio(signal), []);

  return useApiQuery<LiveStudioWorkspace>(queryKey, fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 3_000
  });
}

export function useStartLiveSessionMutation() {
  return useApiMutation<LiveBuilderSessionRecord, { sessionId: string }>(
    ({ sessionId }) => apiClient.startLiveSession(sessionId),
    {
      invalidate: (_result, variables) => [
        queryKeys.live.session(variables.sessionId),
        queryKeys.live.studio(variables.sessionId),
        queryKeys.live.sessions(),
        queryKeys.discovery.dealzMarketplace(),
        queryKeys.discovery.campaignBoard(),
        queryKeys.app.bootstrap()
      ]
    }
  );
}

export function useEndLiveSessionMutation() {
  return useApiMutation<EndLiveSessionResult, { sessionId: string }>(
    ({ sessionId }) => apiClient.endLiveSession(sessionId),
    {
      invalidate: (result, variables) => [
        queryKeys.live.session(variables.sessionId),
        queryKeys.live.studio(variables.sessionId),
        queryKeys.live.sessions(),
        queryKeys.live.replays(),
        queryKeys.live.replay(result.replay?.id),
        queryKeys.live.replayBySession(variables.sessionId),
        queryKeys.discovery.dealzMarketplace(),
        queryKeys.discovery.campaignBoard(),
        queryKeys.app.bootstrap()
      ]
    }
  );
}

export function useAddLiveMomentMutation() {
  return useApiMutation<LiveBuilderSessionRecord, { sessionId: string; payload: LiveMomentInput }>(
    ({ sessionId, payload }) => apiClient.addLiveMoment(sessionId, payload),
    {
      invalidate: (_result, variables) => [
        queryKeys.live.session(variables.sessionId),
        queryKeys.live.studio(variables.sessionId),
        queryKeys.live.sessions(),
        queryKeys.live.replayBySession(variables.sessionId),
        queryKeys.discovery.dealzMarketplace(),
        queryKeys.discovery.campaignBoard()
      ]
    }
  );
}

export function useLiveReplaysQuery(filters: LiveReplayFilters = {}, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const normalizedFilters = useMemo(
    () => normalizeLiveReplayFilters(filters),
    [filters.page, filters.pageSize, filters.published, filters.q, filters.sessionId]
  );
  const queryKey = useMemo(() => queryKeys.live.replays(normalizedFilters), [normalizedFilters]);
  const fetcher = useCallback((signal: AbortSignal) => apiClient.listLiveReplays(normalizedFilters, signal), [normalizedFilters]);

  return useApiQuery<PaginatedResult<LiveReplayRecord>>(queryKey, fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 10_000
  });
}

export function useReplayQuery(replayId: string | undefined, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const safeReplayId = replayId?.trim();
  const queryKey = useMemo(() => queryKeys.live.replay(safeReplayId), [safeReplayId]);
  const fetcher = useCallback(
    (signal: AbortSignal) => {
      if (!safeReplayId) {
        return Promise.reject(new Error("A replay id is required."));
      }
      return apiClient.getReplay(safeReplayId, signal);
    },
    [safeReplayId]
  );

  return useApiQuery<LiveReplayRecord>(queryKey, fetcher, {
    enabled: options.enabled ?? (hasApiSession && Boolean(safeReplayId)),
    staleTime: options.staleTime ?? 5_000
  });
}

export function useReplayBySessionQuery(sessionId: string | undefined, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const safeSessionId = sessionId?.trim();
  const queryKey = useMemo(() => queryKeys.live.replayBySession(safeSessionId), [safeSessionId]);
  const fetcher = useCallback(
    (signal: AbortSignal) => {
      if (!safeSessionId) {
        return Promise.reject(new Error("A live session id is required."));
      }
      return apiClient.getReplayBySession(safeSessionId, signal);
    },
    [safeSessionId]
  );

  return useApiQuery<LiveReplayRecord>(queryKey, fetcher, {
    enabled: options.enabled ?? (hasApiSession && Boolean(safeSessionId)),
    staleTime: options.staleTime ?? 5_000
  });
}

export function useUpdateReplayMutation() {
  return useApiMutation<LiveReplayRecord, { replayId: string; payload: UpdateLiveReplayInput }>(
    ({ replayId, payload }) => apiClient.updateReplay(replayId, payload),
    {
      invalidate: (result) => [
        queryKeys.live.replays(),
        queryKeys.live.replay(result.id),
        queryKeys.live.replayBySession(result.sessionId),
        queryKeys.discovery.dealzMarketplace()
      ]
    }
  );
}

export function usePublishReplayMutation() {
  return useApiMutation<LiveReplayRecord, { replayId: string; payload?: UpdateLiveReplayInput }>(
    ({ replayId, payload }) => apiClient.publishReplay(replayId, payload),
    {
      invalidate: (result) => [
        queryKeys.live.replays(),
        queryKeys.live.replay(result.id),
        queryKeys.live.replayBySession(result.sessionId),
        queryKeys.discovery.dealzMarketplace()
      ]
    }
  );
}
