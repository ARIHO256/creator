import { useCallback } from "react";
import { apiClient } from "../../api/client";
import { queryKeys } from "../../api/queryKeys";
import { useAuth } from "../../contexts/AuthContext";
import type {
  AuditLogRecord,
  CreateWorkspaceRoleInput,
  DeleteWorkspaceRoleResult,
  InviteWorkspaceMemberInput,
  RolesWorkspaceRecord,
  UpdateWorkspaceSecurityInput,
  UpdateWorkspaceMemberInput,
  UpdateWorkspaceRoleInput,
  WorkspaceSecurityPolicy,
  WorkspaceMemberRecord,
  WorkspaceRoleRecord
} from "../../api/types";
import { useApiMutation } from "./useApiMutation";
import { useApiQuery } from "./useApiQuery";

interface QueryOptions {
  enabled?: boolean;
  staleTime?: number;
}

export function useRolesWorkspaceQuery(options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const fetcher = useCallback((signal: AbortSignal) => apiClient.getRolesWorkspace(signal), []);

  return useApiQuery<RolesWorkspaceRecord>(queryKeys.settings.roles(), fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 30_000
  });
}

export function useAuditLogsQuery(options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const fetcher = useCallback((signal: AbortSignal) => apiClient.listAuditLogs(signal), []);

  return useApiQuery<AuditLogRecord[]>(queryKeys.settings.auditLogs(), fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 20_000
  });
}

export function useUpdateWorkspaceSecurityMutation() {
  return useApiMutation<WorkspaceSecurityPolicy, UpdateWorkspaceSecurityInput>((payload) => apiClient.updateWorkspaceSecurity(payload));
}

export function useCreateWorkspaceRoleMutation() {
  return useApiMutation<WorkspaceRoleRecord, CreateWorkspaceRoleInput>((payload) => apiClient.createWorkspaceRole(payload));
}

interface UpdateWorkspaceRoleVariables {
  roleId: string;
  payload: UpdateWorkspaceRoleInput;
}

export function useUpdateWorkspaceRoleMutation() {
  return useApiMutation<WorkspaceRoleRecord, UpdateWorkspaceRoleVariables>(({ roleId, payload }) => apiClient.updateWorkspaceRole(roleId, payload));
}

export function useDeleteWorkspaceRoleMutation() {
  return useApiMutation<DeleteWorkspaceRoleResult, { roleId: string }>(({ roleId }) => apiClient.deleteWorkspaceRole(roleId));
}

export function useInviteWorkspaceMemberMutation() {
  return useApiMutation<WorkspaceMemberRecord, InviteWorkspaceMemberInput>((payload) => apiClient.inviteWorkspaceMember(payload));
}

interface UpdateWorkspaceMemberVariables {
  memberId: string;
  payload: UpdateWorkspaceMemberInput;
}

export function useUpdateWorkspaceMemberMutation() {
  return useApiMutation<WorkspaceMemberRecord, UpdateWorkspaceMemberVariables>(({ memberId, payload }) => apiClient.updateWorkspaceMember(memberId, payload));
}
