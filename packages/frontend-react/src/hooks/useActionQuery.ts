import { useQuery } from "@tanstack/react-query";

export const useActionQuery = <T>(
  queryKey: readonly unknown[],
  fetcher: () => Promise<T | undefined>,
  options?: { enabled?: boolean },
) => {
  const query = useQuery({
    queryKey,
    enabled: options?.enabled,
    refetchOnMount: "always",
    queryFn: async (): Promise<T | null> => (await fetcher()) ?? null,
  });

  return {
    data: query.data ?? undefined,
    isPending: query.isPending,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
};
