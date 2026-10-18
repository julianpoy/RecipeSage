import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  shouldAttemptFallback,
  type OfflineFirstQueryDefinition,
} from "../services/server-actions/ActionsBase";
import { offlineModeState } from "../services/offlineModeState";
import { trpcHandle } from "../services/trpcHandle";

const SLOW_READ_PROMPT_MS = 5_000;

export const useOfflineFirstQuery = <T>(
  definition: OfflineFirstQueryDefinition<T>,
  options?: { enabled?: boolean },
) => {
  const queryClient = useQueryClient();
  const { queryKey, invoke, fallback, errorHandlers } = definition;

  const query = useQuery({
    queryKey,
    enabled: options?.enabled,
    refetchOnMount: "always",
    queryFn: async (): Promise<T | null> => {
      const cachePromise = fallback().catch((fe) => {
        console.warn("Local fallback failed", fe);
        return undefined;
      });

      void cachePromise.then((cached) => {
        if (cached === undefined) return;
        if (queryClient.getQueryData<T | null>(queryKey) !== undefined) return;
        queryClient.setQueryData<T | null>(queryKey, cached);
      });

      const slowHandle = setTimeout(() => {
        offlineModeState.notifySlowRead();
      }, SLOW_READ_PROMPT_MS);

      try {
        return await invoke();
      } catch (e) {
        const cached = await cachePromise;
        const current = queryClient.getQueryData<T | null>(queryKey) ?? cached;
        if (current == null || !shouldAttemptFallback(e)) {
          void trpcHandle(Promise.reject(e), errorHandlers);
        } else {
          console.warn("Network fetch failed; using cached value", e);
        }
        return current ?? null;
      } finally {
        clearTimeout(slowHandle);
      }
    },
  });

  return {
    data: query.data ?? undefined,
    isPending: query.isPending,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
};
