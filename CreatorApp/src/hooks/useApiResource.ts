import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../lib/api";

type UseApiResourceOptions<T> = {
  enabled?: boolean;
  initialData: T;
  loader: () => Promise<T>;
  onError?: (error: ApiError | Error) => void;
};

export function useApiResource<T>({
  enabled = true,
  initialData,
  loader,
  onError
}: UseApiResourceOptions<T>) {
  const stableInitialData = useMemo(() => initialData, [initialData]);
  const [data, setData] = useState<T>(stableInitialData);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<ApiError | Error | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) return stableInitialData;

    setLoading(true);
    setError(null);

    try {
      const next = await loader();
      setData(next);
      return next;
    } catch (caught) {
      const nextError = caught instanceof Error ? caught : new Error("Request failed");
      setError(nextError);
      onError?.(nextError);
      return stableInitialData;
    } finally {
      setLoading(false);
    }
  }, [enabled, loader, onError, stableInitialData]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    data,
    setData,
    loading,
    error,
    reload
  };
}
