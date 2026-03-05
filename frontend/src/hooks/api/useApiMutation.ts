import { useCallback, useState } from "react";
import { useApiCache, type QueryKey } from "../../api/cache";

interface UseApiMutationOptions<TResult, TVariables> {
  invalidate?: QueryKey[] | ((result: TResult, variables: TVariables) => QueryKey[]);
  onSuccess?: (result: TResult, variables: TVariables) => void;
  onError?: (error: unknown, variables: TVariables) => void;
}

export interface UseApiMutationResult<TResult, TVariables> {
  data: TResult | undefined;
  error: unknown;
  isPending: boolean;
  mutateAsync: (variables: TVariables) => Promise<TResult>;
  reset: () => void;
}

export function useApiMutation<TResult, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
  options: UseApiMutationOptions<TResult, TVariables> = {}
): UseApiMutationResult<TResult, TVariables> {
  const cache = useApiCache();
  const [data, setData] = useState<TResult | undefined>(undefined);
  const [error, setError] = useState<unknown>(undefined);
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(
    async (variables: TVariables) => {
      setIsPending(true);
      setError(undefined);

      try {
        const result = await mutationFn(variables);
        setData(result);

        const invalidationKeys = typeof options.invalidate === "function" ? options.invalidate(result, variables) : options.invalidate;
        invalidationKeys?.forEach((queryKey) => cache.invalidate(queryKey));
        options.onSuccess?.(result, variables);

        return result;
      } catch (mutationError) {
        setError(mutationError);
        options.onError?.(mutationError, variables);
        throw mutationError;
      } finally {
        setIsPending(false);
      }
    },
    [cache, mutationFn, options]
  );

  const reset = useCallback(() => {
    setData(undefined);
    setError(undefined);
    setIsPending(false);
  }, []);

  return {
    data,
    error,
    isPending,
    mutateAsync,
    reset
  };
}
