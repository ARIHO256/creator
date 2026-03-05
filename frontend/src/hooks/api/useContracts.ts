import { useCallback, useMemo } from "react";
import { apiClient } from "../../api/client";
import { normalizeContractFilters, queryKeys } from "../../api/queryKeys";
import { useAuth } from "../../contexts/AuthContext";
import type {
  ContractListFilters,
  ContractRecord,
  ContractTerminationInput,
  PaginatedResult
} from "../../api/types";
import { useApiMutation } from "./useApiMutation";
import { useApiQuery } from "./useApiQuery";

interface QueryOptions {
  enabled?: boolean;
  staleTime?: number;
}

export function useContractsQuery(filters: ContractListFilters = {}, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const normalizedFilters = useMemo(
    () => normalizeContractFilters(filters),
    [filters.page, filters.pageSize, filters.q, filters.status]
  );
  const queryKey = useMemo(() => queryKeys.collaboration.contracts(normalizedFilters), [normalizedFilters]);
  const fetcher = useCallback(
    (signal: AbortSignal) => apiClient.listContracts(normalizedFilters, signal),
    [normalizedFilters]
  );

  return useApiQuery<PaginatedResult<ContractRecord>>(queryKey, fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 30_000
  });
}

export function useContractQuery(contractId: string | undefined, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const safeContractId = contractId?.trim();
  const queryKey = useMemo(() => queryKeys.collaboration.contract(safeContractId), [safeContractId]);
  const fetcher = useCallback(
    (signal: AbortSignal) => {
      if (!safeContractId) {
        return Promise.reject(new Error("A contract id is required."));
      }
      return apiClient.getContract(safeContractId, signal);
    },
    [safeContractId]
  );

  return useApiQuery<ContractRecord>(queryKey, fetcher, {
    enabled: options.enabled ?? (hasApiSession && Boolean(safeContractId)),
    staleTime: options.staleTime ?? 15_000
  });
}

interface RequestTerminationVariables {
  contractId: string;
  payload: ContractTerminationInput;
}

export function useRequestContractTerminationMutation() {
  return useApiMutation<ContractRecord, RequestTerminationVariables>(
    ({ contractId, payload }) => apiClient.requestContractTermination(contractId, payload),
    {
      invalidate: (_result, variables) => [
        queryKeys.collaboration.contracts(),
        queryKeys.collaboration.contract(variables.contractId),
        queryKeys.collaboration.tasks(),
        queryKeys.app.bootstrap()
      ]
    }
  );
}
