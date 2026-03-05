import { useCallback, useMemo } from "react";
import { apiClient } from "../../api/client";
import { normalizeTaskFilters, queryKeys } from "../../api/queryKeys";
import { useAuth } from "../../contexts/AuthContext";
import type {
  CreateTaskInput,
  PaginatedResult,
  TaskAttachmentInput,
  TaskCommentInput,
  TaskListFilters,
  TaskRecord,
  UpdateTaskInput
} from "../../api/types";
import { useApiMutation } from "./useApiMutation";
import { useApiQuery } from "./useApiQuery";

interface QueryOptions {
  enabled?: boolean;
  staleTime?: number;
}

export function useTasksQuery(filters: TaskListFilters = {}, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const normalizedFilters = useMemo(
    () => normalizeTaskFilters(filters),
    [filters.column, filters.contractId, filters.overdueOnly, filters.page, filters.pageSize, filters.q]
  );
  const queryKey = useMemo(() => queryKeys.collaboration.tasks(normalizedFilters), [normalizedFilters]);
  const fetcher = useCallback((signal: AbortSignal) => apiClient.listTasks(normalizedFilters, signal), [normalizedFilters]);

  return useApiQuery<PaginatedResult<TaskRecord>>(queryKey, fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 15_000
  });
}

export function useTaskQuery(taskId: string | undefined, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const safeTaskId = taskId?.trim();
  const queryKey = useMemo(() => queryKeys.collaboration.task(safeTaskId), [safeTaskId]);
  const fetcher = useCallback(
    (signal: AbortSignal) => {
      if (!safeTaskId) {
        return Promise.reject(new Error("A task id is required."));
      }
      return apiClient.getTask(safeTaskId, signal);
    },
    [safeTaskId]
  );

  return useApiQuery<TaskRecord>(queryKey, fetcher, {
    enabled: options.enabled ?? (hasApiSession && Boolean(safeTaskId)),
    staleTime: options.staleTime ?? 10_000
  });
}

export function useCreateTaskMutation() {
  return useApiMutation<TaskRecord, CreateTaskInput>((payload) => apiClient.createTask(payload), {
    invalidate: [queryKeys.collaboration.tasks(), queryKeys.collaboration.contracts(), queryKeys.app.bootstrap()]
  });
}

interface UpdateTaskVariables {
  taskId: string;
  payload: UpdateTaskInput;
}

export function useUpdateTaskMutation() {
  return useApiMutation<TaskRecord, UpdateTaskVariables>(
    ({ taskId, payload }) => apiClient.updateTask(taskId, payload),
    {
      invalidate: (_result, variables) => [
        queryKeys.collaboration.tasks(),
        queryKeys.collaboration.task(variables.taskId),
        queryKeys.collaboration.contracts(),
        queryKeys.app.bootstrap()
      ]
    }
  );
}

interface AddTaskCommentVariables {
  taskId: string;
  payload: TaskCommentInput;
}

export function useAddTaskCommentMutation() {
  return useApiMutation<TaskRecord, AddTaskCommentVariables>(
    ({ taskId, payload }) => apiClient.addTaskComment(taskId, payload),
    {
      invalidate: (_result, variables) => [
        queryKeys.collaboration.tasks(),
        queryKeys.collaboration.task(variables.taskId)
      ]
    }
  );
}

interface AddTaskAttachmentVariables {
  taskId: string;
  payload: TaskAttachmentInput;
}

export function useAddTaskAttachmentMutation() {
  return useApiMutation<TaskRecord, AddTaskAttachmentVariables>(
    ({ taskId, payload }) => apiClient.addTaskAttachment(taskId, payload),
    {
      invalidate: (_result, variables) => [
        queryKeys.collaboration.tasks(),
        queryKeys.collaboration.task(variables.taskId)
      ]
    }
  );
}
