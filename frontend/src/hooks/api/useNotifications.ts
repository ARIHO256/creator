import { useCallback, useMemo } from "react";
import { apiClient } from "../../api/client";
import { queryKeys } from "../../api/queryKeys";
import { useAuth } from "../../contexts/AuthContext";
import type { NotificationRecord } from "../../api/types";
import { useApiMutation } from "./useApiMutation";
import { useApiQuery } from "./useApiQuery";

interface QueryOptions {
  enabled?: boolean;
  staleTime?: number;
}

export function useNotificationsQuery(options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const fetcher = useCallback((signal: AbortSignal) => apiClient.listNotifications(signal), []);

  return useApiQuery<NotificationRecord[]>(queryKeys.settings.notifications(), fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 30_000
  });
}

export function useUnreadNotificationsCount(): number {
  const query = useNotificationsQuery();

  return useMemo(() => {
    if (!query.data) return 0;
    return query.data.filter((notification) => !notification.read).length;
  }, [query.data]);
}

export function useMarkNotificationReadMutation() {
  return useApiMutation<NotificationRecord, string>((notificationId) => apiClient.markNotificationRead(notificationId), {
    invalidate: [queryKeys.settings.notifications(), queryKeys.app.bootstrap(), queryKeys.workspace.feed()]
  });
}

export function useMarkAllNotificationsReadMutation() {
  return useApiMutation<{ updated: number }, void>(() => apiClient.markAllNotificationsRead(), {
    invalidate: [queryKeys.settings.notifications(), queryKeys.app.bootstrap(), queryKeys.workspace.feed()]
  });
}
