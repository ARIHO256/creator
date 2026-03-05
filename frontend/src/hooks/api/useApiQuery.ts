import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { serializeQueryKey, useApiCache, type QueryKey, type QueryStatus } from "../../api/cache";

export interface UseApiQueryOptions<TData, TSelected = TData> {
  enabled?: boolean;
  staleTime?: number;
  initialData?: TData;
  select?: (data: TData) => TSelected;
}

export interface UseApiQueryResult<TData, TSelected = TData> {
  data: TSelected | undefined;
  rawData: TData | undefined;
  error: unknown;
  status: QueryStatus;
  isLoading: boolean;
  isFetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  refetch: () => Promise<TData>;
  invalidate: () => void;
}

export function useApiQuery<TData, TSelected = TData>(
  queryKey: QueryKey,
  fetcher: (signal: AbortSignal) => Promise<TData>,
  options: UseApiQueryOptions<TData, TSelected> = {}
): UseApiQueryResult<TData, TSelected> {
  const cache = useApiCache();
  const enabled = options.enabled ?? true;
  const staleTime = options.staleTime ?? Number.POSITIVE_INFINITY;
  const serializedKey = useMemo(() => serializeQueryKey(queryKey), [queryKey]);
  const stableQueryKey = useMemo(() => queryKey, [serializedKey]);

  const entry = useSyncExternalStore(
    cache.subscribe,
    () => cache.getEntry<TData>(serializedKey),
    () => undefined
  );

  const hasEntry = Boolean(entry);
  const rawData = entry?.data ?? options.initialData;
  const selectedData = useMemo(() => {
    if (rawData === undefined) return undefined;
    return options.select ? options.select(rawData) : ((rawData as unknown) as TSelected);
  }, [options.select, rawData]);

  useEffect(() => {
    if (!enabled) return undefined;

    const controller = new AbortController();
    void cache.fetch(stableQueryKey, () => fetcher(controller.signal), { staleTime }).catch(() => {
      // The cache already stores errors; swallow promise rejections for fire-and-forget query fetches.
    });
    return () => controller.abort();
  }, [cache, enabled, fetcher, hasEntry, stableQueryKey, staleTime]);

  const refetch = useCallback(() => {
    const controller = new AbortController();
    return cache.fetch(stableQueryKey, () => fetcher(controller.signal), { force: true, staleTime });
  }, [cache, fetcher, stableQueryKey, staleTime]);

  const invalidate = useCallback(() => {
    cache.invalidate(stableQueryKey);
  }, [cache, stableQueryKey]);

  const status: QueryStatus = entry?.status ?? (rawData !== undefined ? "success" : "idle");
  const isFetching = status === "loading";
  const isLoading = isFetching && rawData === undefined;

  return {
    data: selectedData,
    rawData,
    error: entry?.error,
    status,
    isLoading,
    isFetching,
    isSuccess: status === "success",
    isError: status === "error",
    refetch,
    invalidate
  };
}
