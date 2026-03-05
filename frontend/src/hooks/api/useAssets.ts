import { useCallback, useMemo } from "react";
import { apiClient } from "../../api/client";
import { normalizeAssetFilters, queryKeys } from "../../api/queryKeys";
import { useAuth } from "../../contexts/AuthContext";
import type {
  AssetListFilters,
  AssetRecord,
  CreateAssetInput,
  PaginatedResult,
  UpdateAssetReviewInput
} from "../../api/types";
import { useApiMutation } from "./useApiMutation";
import { useApiQuery } from "./useApiQuery";

interface QueryOptions {
  enabled?: boolean;
  staleTime?: number;
}

export function useAssetsQuery(filters: AssetListFilters = {}, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const normalizedFilters = useMemo(
    () => normalizeAssetFilters(filters),
    [filters.campaignId, filters.mediaType, filters.page, filters.pageSize, filters.q, filters.source, filters.status]
  );
  const queryKey = useMemo(() => queryKeys.collaboration.assets(normalizedFilters), [normalizedFilters]);
  const fetcher = useCallback((signal: AbortSignal) => apiClient.listAssets(normalizedFilters, signal), [normalizedFilters]);

  return useApiQuery<PaginatedResult<AssetRecord>>(queryKey, fetcher, {
    enabled: options.enabled ?? hasApiSession,
    staleTime: options.staleTime ?? 20_000
  });
}

export function useAssetQuery(assetId: string | undefined, options: QueryOptions = {}) {
  const { hasApiSession } = useAuth();
  const safeAssetId = assetId?.trim();
  const queryKey = useMemo(() => queryKeys.collaboration.asset(safeAssetId), [safeAssetId]);
  const fetcher = useCallback(
    (signal: AbortSignal) => {
      if (!safeAssetId) {
        return Promise.reject(new Error("An asset id is required."));
      }
      return apiClient.getAsset(safeAssetId, signal);
    },
    [safeAssetId]
  );

  return useApiQuery<AssetRecord>(queryKey, fetcher, {
    enabled: options.enabled ?? (hasApiSession && Boolean(safeAssetId)),
    staleTime: options.staleTime ?? 15_000
  });
}

export function useCreateAssetMutation() {
  return useApiMutation<AssetRecord, CreateAssetInput>((payload) => apiClient.createAsset(payload), {
    invalidate: [queryKeys.collaboration.assets(), queryKeys.collaboration.campaigns()]
  });
}

interface UpdateAssetReviewVariables {
  assetId: string;
  payload: UpdateAssetReviewInput;
}

export function useUpdateAssetReviewMutation() {
  return useApiMutation<AssetRecord, UpdateAssetReviewVariables>(
    ({ assetId, payload }) => apiClient.updateAssetReview(assetId, payload),
    {
      invalidate: (_result, variables) => [
        queryKeys.collaboration.assets(),
        queryKeys.collaboration.asset(variables.assetId)
      ]
    }
  );
}
