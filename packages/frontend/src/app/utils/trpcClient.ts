import { createTRPCProxyClient, httpLink, loggerLink } from "@trpc/client";
import { getBase } from "./getBase";
import type { AppRouter } from "@recipesage/trpc";
import { appIdbStorageManager } from "./appIdbStorageManager";
import { customTrpcTransformer } from "@recipesage/util/shared";
import { captureTrpcRequest } from "../services/debugStore.service";

export const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    loggerLink({
      console: {
        log: (...args) => {
          const info = {
            methodInfo: args[0],
            elapsedMs: args[1]?.elapsedMs,
            input: args[1]?.input,
            result: {
              response: {
                code: args[1]?.result?.context?.response?.status,
                ok: args[1]?.result?.context?.response?.ok,
                redirected: args[1]?.result?.context?.response?.redirected,
                type: args[1]?.result?.context?.response?.type,
                url: args[1]?.result?.context?.response?.url,
                headers: Object.fromEntries(
                  args[1]?.result?.context?.response?.headers?.entries() || [],
                ),
              },
              resultType: args[1]?.result?.result?.type,
            },
          };
          captureTrpcRequest(info);
        },
        error: (...args) => {
          const info = {
            methodInfo: args[0],
            elapsedMs: args[1]?.elapsedMs,
            input: args[1]?.input,
            result: {
              response: {
                code: args[1]?.result?.meta?.response?.status,
                ok: args[1]?.result?.meta?.response?.ok,
                redirected: args[1]?.result?.meta?.response?.redirected,
                type: args[1]?.result?.meta?.response?.type,
                url: args[1]?.result?.meta?.response?.url,
                headers: Object.fromEntries(
                  args[1]?.result?.meta?.response?.headers?.entries() || [],
                ),
              },
              error: {
                name: args[1]?.result?.name,
                message: args[1]?.result?.message,
                cause: args[1]?.result?.cause,
                lineNumber: args[1]?.result?.lineNumber,
                columnNumber: args[1]?.result?.columnNumber,
                fileName: args[1]?.result?.fileName,
                data: args[1]?.result?.data,
                stack: args[1]?.result?.stack,
                shape: args[1]?.result?.shape,
              },
              resultType: "error",
            },
          };
          captureTrpcRequest(info);
        },
      },
      enabled: (opts) => {
        return opts.direction === "down";
      },
      colorMode: "none",
    }),
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
      transformer: customTrpcTransformer,
    }),
  ],
});
