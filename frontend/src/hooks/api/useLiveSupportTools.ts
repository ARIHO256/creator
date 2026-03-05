import { useCallback } from "react";
import { apiClient } from "../../api/client";
import { queryKeys } from "../../api/queryKeys";
import { useAuth } from "../../contexts/AuthContext";
import type {
  AudienceNotificationsToolConfigRecord,
  CrewAssignmentRecord,
  CrewSessionAssignmentsRecord,
  CrewWorkspaceRecord,
  LiveAlertsToolConfigRecord,
  OverlayToolConfigRecord,
  SafetyModerationToolConfigRecord,
  StreamingToolConfigRecord
} from "../../api/types";
import { useApiMutation } from "./useApiMutation";
import { useApiQuery } from "./useApiQuery";

interface QueryOptions {
  enabled?: boolean;
  staleTime?: number;
}

export function useCrewWorkspaceQuery(options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const fetcher = useCallback((signal: AbortSignal) => apiClient.getCrewWorkspace(signal), []);

  return useApiQuery<CrewWorkspaceRecord>(queryKeys.live.crewWorkspace(), fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 10_000
  });
}

export function useUpdateCrewSessionMutation() {
  return useApiMutation<CrewSessionAssignmentsRecord, { sessionId: string; assignments: CrewAssignmentRecord[] }>(
    ({ sessionId, assignments }) => apiClient.updateCrewSession(sessionId, { assignments }),
    {
      invalidate: (_result, variables) => [
        queryKeys.live.crewWorkspace(),
        queryKeys.live.session(variables.sessionId),
        queryKeys.live.studio(variables.sessionId)
      ]
    }
  );
}

function useToolQuery<TResult>(toolKey: string, fetcher: (signal: AbortSignal) => Promise<TResult>, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  return useApiQuery<TResult>(queryKeys.live.tool(toolKey), fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 10_000
  });
}

export function useAudienceNotificationsToolQuery(options: QueryOptions = {}) {
  return useToolQuery<AudienceNotificationsToolConfigRecord>(
    "audience-notifications",
    (signal) => apiClient.getAudienceNotificationsTool(signal),
    options
  );
}

export function useUpdateAudienceNotificationsToolMutation() {
  return useApiMutation<AudienceNotificationsToolConfigRecord, Partial<AudienceNotificationsToolConfigRecord>>(
    (payload) => apiClient.updateAudienceNotificationsTool(payload),
    {
      invalidate: (result) => [
        queryKeys.live.tool("audience-notifications"),
        queryKeys.live.studio(result.sessionId),
        queryKeys.live.session(result.sessionId)
      ]
    }
  );
}

export function useLiveAlertsToolQuery(options: QueryOptions = {}) {
  return useToolQuery<LiveAlertsToolConfigRecord>("live-alerts", (signal) => apiClient.getLiveAlertsTool(signal), options);
}

export function useUpdateLiveAlertsToolMutation() {
  return useApiMutation<LiveAlertsToolConfigRecord, Partial<LiveAlertsToolConfigRecord>>((payload) => apiClient.updateLiveAlertsTool(payload), {
    invalidate: (result) => [
      queryKeys.live.tool("live-alerts"),
      queryKeys.live.studio(result.sessionId),
      queryKeys.live.session(result.sessionId)
    ]
  });
}

export function useOverlaysToolQuery(options: QueryOptions = {}) {
  return useToolQuery<OverlayToolConfigRecord>("overlays", (signal) => apiClient.getOverlaysTool(signal), options);
}

export function useUpdateOverlaysToolMutation() {
  return useApiMutation<OverlayToolConfigRecord, Partial<OverlayToolConfigRecord>>((payload) => apiClient.updateOverlaysTool(payload), {
    invalidate: (result) => [queryKeys.live.tool("overlays"), queryKeys.live.studio(result.sessionId)]
  });
}

export function useStreamingToolQuery(options: QueryOptions = {}) {
  return useToolQuery<StreamingToolConfigRecord>("streaming", (signal) => apiClient.getStreamingTool(signal), options);
}

export function useUpdateStreamingToolMutation() {
  return useApiMutation<StreamingToolConfigRecord, Partial<StreamingToolConfigRecord>>((payload) => apiClient.updateStreamingTool(payload), {
    invalidate: (result) => [
      queryKeys.live.tool("streaming"),
      queryKeys.live.studio(result.sessionId),
      queryKeys.live.session(result.sessionId)
    ]
  });
}

export function useSafetyToolQuery(options: QueryOptions = {}) {
  return useToolQuery<SafetyModerationToolConfigRecord>("safety", (signal) => apiClient.getSafetyTool(signal), options);
}

export function useUpdateSafetyToolMutation() {
  return useApiMutation<SafetyModerationToolConfigRecord, Partial<SafetyModerationToolConfigRecord>>((payload) => apiClient.updateSafetyTool(payload), {
    invalidate: (result) => [queryKeys.live.tool("safety"), queryKeys.live.studio(result.sessionId)]
  });
}
