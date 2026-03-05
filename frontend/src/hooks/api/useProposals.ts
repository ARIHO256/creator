import { useCallback, useMemo } from "react";
import { apiClient } from "../../api/client";
import { normalizeProposalFilters, queryKeys } from "../../api/queryKeys";
import { useAuth } from "../../contexts/AuthContext";
import type {
  CreateProposalInput,
  PaginatedResult,
  ProposalListFilters,
  ProposalMessageInput,
  ProposalRecord,
  ProposalTransitionResult,
  TransitionProposalInput,
  UpdateProposalInput
} from "../../api/types";
import { useApiMutation } from "./useApiMutation";
import { useApiQuery } from "./useApiQuery";

interface QueryOptions {
  enabled?: boolean;
  staleTime?: number;
}

export function useProposalsQuery(filters: ProposalListFilters = {}, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const normalizedFilters = useMemo(
    () => normalizeProposalFilters(filters),
    [filters.origin, filters.page, filters.pageSize, filters.q, filters.status]
  );
  const queryKey = useMemo(() => queryKeys.collaboration.proposals(normalizedFilters), [normalizedFilters]);
  const fetcher = useCallback((signal: AbortSignal) => apiClient.listProposals(normalizedFilters, signal), [normalizedFilters]);

  return useApiQuery<PaginatedResult<ProposalRecord>>(queryKey, fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 30_000
  });
}

export function useProposalQuery(proposalId: string | undefined, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const safeProposalId = proposalId?.trim();
  const queryKey = useMemo(() => queryKeys.collaboration.proposal(safeProposalId), [safeProposalId]);
  const fetcher = useCallback(
    (signal: AbortSignal) => {
      if (!safeProposalId) {
        return Promise.reject(new Error("A proposal id is required."));
      }
      return apiClient.getProposal(safeProposalId, signal);
    },
    [safeProposalId]
  );

  return useApiQuery<ProposalRecord>(queryKey, fetcher, {
    enabled: options.enabled ?? (hasApiSession && Boolean(safeProposalId)),
    staleTime: options.staleTime ?? 15_000
  });
}

export function useProposalRoomQuery(proposalId: string | undefined, options: QueryOptions = {}) {
  return useProposalQuery(proposalId, options);
}

export function useCreateProposalMutation() {
  return useApiMutation<ProposalRecord, CreateProposalInput>((payload) => apiClient.createProposal(payload), {
    invalidate: [queryKeys.collaboration.proposals(), queryKeys.discovery.opportunities(), queryKeys.discovery.campaignBoard(), queryKeys.app.bootstrap()]
  });
}

interface UpdateProposalVariables {
  proposalId: string;
  payload: UpdateProposalInput;
}

export function useUpdateProposalMutation() {
  return useApiMutation<ProposalRecord, UpdateProposalVariables>(
    ({ proposalId, payload }) => apiClient.updateProposal(proposalId, payload),
    {
      invalidate: (_result, variables) => [
        queryKeys.collaboration.proposal(variables.proposalId),
        queryKeys.collaboration.proposals(),
        queryKeys.app.bootstrap()
      ]
    }
  );
}

interface SendProposalMessageVariables {
  proposalId: string;
  payload: ProposalMessageInput;
}

export function useSendProposalMessageMutation() {
  return useApiMutation<ProposalRecord, SendProposalMessageVariables>(
    ({ proposalId, payload }) => apiClient.sendProposalMessage(proposalId, payload),
    {
      invalidate: (_result, variables) => [
        queryKeys.collaboration.proposal(variables.proposalId),
        queryKeys.collaboration.proposals(),
        queryKeys.app.bootstrap()
      ]
    }
  );
}

interface TransitionProposalVariables {
  proposalId: string;
  payload: TransitionProposalInput;
}

export function useTransitionProposalMutation() {
  return useApiMutation<ProposalTransitionResult, TransitionProposalVariables>(
    ({ proposalId, payload }) => apiClient.transitionProposal(proposalId, payload),
    {
      invalidate: (_result, variables) => [
        queryKeys.collaboration.proposal(variables.proposalId),
        queryKeys.collaboration.proposals(),
        queryKeys.collaboration.contracts(),
        queryKeys.app.bootstrap()
      ]
    }
  );
}
