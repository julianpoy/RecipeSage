import { createTRPCProxyClient, httpLink } from "@trpc/client";
import type { AppRouter } from "@recipesage/trpc";
import { customTrpcTransformer } from "@recipesage/util/shared";

export const createTrpc = (apiBase: string, token?: string) =>
  createTRPCProxyClient<AppRouter>({
    links: [
      httpLink({
        url: `${apiBase}/trpc`,
        headers: () => ({
          Authorization: token ? `Bearer ${token}` : undefined,
        }),
        transformer: customTrpcTransformer,
      }),
    ],
  });

export type TrpcClient = ReturnType<typeof createTrpc>;
