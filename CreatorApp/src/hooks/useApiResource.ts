import { useCallback, useEffect, useRef, useState } from "react";
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
  const initialDataRef = useRef<T>(initialData);
  const loaderRef = useRef(loader);
  const onErrorRef = useRef(onError);
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<ApiError | Error | null>(null);

  useEffect(() => {
    initialDataRef.current = initialData;
  }, [initialData]);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const reload = useCallback(async () => {
    if (!enabled) return initialDataRef.current;

    setLoading(true);
    setError(null);

    try {
      const next = await loaderRef.current();
      setData(next);
      return next;
    } catch (caught) {
      const nextError = caught instanceof Error ? caught : new Error("Request failed");
      setError(nextError);
      onErrorRef.current?.(nextError);
      return initialDataRef.current;
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void reload();
  }, [enabled, reload]);

  return {
    data,
    setData,
    loading,
    error,
    reload
  };
}
