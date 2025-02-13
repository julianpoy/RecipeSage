import { createTRPCProxyClient, httpLink } from "@trpc/client";
import { getBase } from "./getBase";
import type { AppRouter } from "@recipesage/trpc";
import { appIdbStorageManager } from "./appIdbStorageManager";
import { customTrpcTransformer } from "@recipesage/util/shared";

export const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpLink({
      url: getBase() + "trpc",
      headers: async () => {
        let token: string | undefined;
        try {
          token = localStorage.getItem("token") || undefined;
        } catch (e) {
          const session = await appIdbStorageManager.getSession();
          token = session?.token;
        }

        return {
          Authorization: token ? `Bearer ${token}` : undefined,
        };
      },
    }),
  ],
  transformer: customTrpcTransformer,
});
