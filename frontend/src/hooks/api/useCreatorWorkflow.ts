import { useCallback } from "react";
import { apiClient } from "../../api/client";
import { queryKeys } from "../../api/queryKeys";
import { useAuth } from "../../contexts/AuthContext";
import type {
  ApprovalApplicationRecord,
  ContentApprovalRecord,
  CreateContentApprovalInput,
  CreateUploadInput,
  OnboardingWorkflowRecord,
  ResubmitApprovalInput,
  SaveOnboardingDraftInput,
  SubmitOnboardingInput,
  UpdateApprovalDraftInput,
  UpdateContentApprovalInput,
  UploadRecord
} from "../../api/types";
import { useApiMutation } from "./useApiMutation";
import { useApiQuery } from "./useApiQuery";

interface QueryOptions {
  enabled?: boolean;
  staleTime?: number;
}

export function useUploadsQuery(filters: Record<string, unknown> = {}, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const fetcher = useCallback((signal: AbortSignal) => apiClient.listUploads(filters, signal), [filters]);

  return useApiQuery<UploadRecord[]>(queryKeys.workflow.uploads(filters), fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 30_000
  });
}

export function useCreateUploadMutation() {
  return useApiMutation<UploadRecord, CreateUploadInput>((payload) => apiClient.createUpload(payload), {
    invalidate: [queryKeys.workflow.uploads()]
  });
}

export function useOnboardingWorkflowQuery(options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const fetcher = useCallback((signal: AbortSignal) => apiClient.getOnboardingWorkflow(signal), []);

  return useApiQuery<OnboardingWorkflowRecord>(queryKeys.workflow.onboarding(), fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 30_000
  });
}

export function useSaveOnboardingDraftMutation() {
  return useApiMutation<OnboardingWorkflowRecord, SaveOnboardingDraftInput>((payload) => apiClient.saveOnboardingDraft(payload));
}

export function useResetOnboardingMutation() {
  return useApiMutation<OnboardingWorkflowRecord, void>(() => apiClient.resetOnboardingWorkflow(), {
    invalidate: [queryKeys.workflow.onboarding(), queryKeys.workflow.accountApproval(), queryKeys.auth.me(), queryKeys.app.bootstrap()]
  });
}

export function useSubmitOnboardingMutation() {
  return useApiMutation<{ onboarding: OnboardingWorkflowRecord; approval: ApprovalApplicationRecord }, SubmitOnboardingInput>(
    (payload) => apiClient.submitOnboarding(payload),
    {
      invalidate: [queryKeys.workflow.onboarding(), queryKeys.workflow.accountApproval(), queryKeys.auth.me(), queryKeys.app.bootstrap()]
    }
  );
}

export function useAccountApprovalQuery(options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const fetcher = useCallback((signal: AbortSignal) => apiClient.getAccountApproval(signal), []);

  return useApiQuery<ApprovalApplicationRecord>(queryKeys.workflow.accountApproval(), fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 15_000
  });
}

export function useUpdateAccountApprovalDraftMutation() {
  return useApiMutation<ApprovalApplicationRecord, UpdateApprovalDraftInput>((payload) => apiClient.updateAccountApprovalDraft(payload), {
    invalidate: [queryKeys.workflow.accountApproval()]
  });
}

export function useRefreshAccountApprovalMutation() {
  return useApiMutation<ApprovalApplicationRecord, void>(() => apiClient.refreshAccountApproval(), {
    invalidate: [queryKeys.workflow.accountApproval(), queryKeys.auth.me(), queryKeys.app.bootstrap()]
  });
}

export function useResubmitAccountApprovalMutation() {
  return useApiMutation<ApprovalApplicationRecord, ResubmitApprovalInput>((payload) => apiClient.resubmitAccountApproval(payload), {
    invalidate: [queryKeys.workflow.accountApproval(), queryKeys.auth.me(), queryKeys.app.bootstrap()]
  });
}

export function useDevApproveAccountApprovalMutation() {
  return useApiMutation<ApprovalApplicationRecord, void>(() => apiClient.devApproveAccountApproval(), {
    invalidate: [queryKeys.workflow.accountApproval(), queryKeys.auth.me(), queryKeys.app.bootstrap()]
  });
}

export function useContentApprovalsQuery(options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const fetcher = useCallback((signal: AbortSignal) => apiClient.listContentApprovals(signal), []);

  return useApiQuery<ContentApprovalRecord[]>(queryKeys.workflow.contentApprovals(), fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 15_000
  });
}

export function useCreateContentApprovalMutation() {
  return useApiMutation<ContentApprovalRecord, CreateContentApprovalInput>((payload) => apiClient.createContentApproval(payload), {
    invalidate: [queryKeys.workflow.contentApprovals()]
  });
}

export function useUpdateContentApprovalMutation() {
  return useApiMutation<ContentApprovalRecord, { submissionId: string; payload: UpdateContentApprovalInput }>(
    ({ submissionId, payload }) => apiClient.updateContentApproval(submissionId, payload),
    {
      invalidate: (result) => [queryKeys.workflow.contentApprovals(), queryKeys.workflow.contentApproval(result.id)]
    }
  );
}

export function useNudgeContentApprovalMutation() {
  return useApiMutation<ContentApprovalRecord, string>((submissionId) => apiClient.nudgeContentApproval(submissionId), {
    invalidate: (result) => [queryKeys.workflow.contentApprovals(), queryKeys.workflow.contentApproval(result.id)]
  });
}

export function useWithdrawContentApprovalMutation() {
  return useApiMutation<ContentApprovalRecord, string>((submissionId) => apiClient.withdrawContentApproval(submissionId), {
    invalidate: (result) => [queryKeys.workflow.contentApprovals(), queryKeys.workflow.contentApproval(result.id)]
  });
}

export function useResubmitContentApprovalMutation() {
  return useApiMutation<ContentApprovalRecord, { submissionId: string; payload?: UpdateContentApprovalInput }>(
    ({ submissionId, payload }) => apiClient.resubmitContentApproval(submissionId, payload),
    {
      invalidate: (result) => [queryKeys.workflow.contentApprovals(), queryKeys.workflow.contentApproval(result.id)]
    }
  );
}
