import { registerRoute } from "workbox-routing";
import {
  swAssertStatusCacheDivert,
  swCacheReject,
  SWCacheRejectReason,
} from "../../swErrorHandling";
import { getKvStoreEntry, KVStoreKeys } from "../../../localDb";
import { trpcClient as trpc } from "../../../trpcClient";
import { encodeCacheResultForTrpc } from "../../encodeCacheResultForTrpc";

export const registerGetMyStatsRoute = () => {
  registerRoute(
    /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/users\.getMyStats/,
    async (event) => {
      try {
        const response = await fetch(event.request);

        swAssertStatusCacheDivert(response);

        return response;
      } catch (e) {
        const myStats = await getKvStoreEntry(KVStoreKeys.MyStats);

        if (!myStats) {
          return swCacheReject(SWCacheRejectReason.NoCacheResult, e);
        }

        return encodeCacheResultForTrpc(
          myStats satisfies Awaited<
            ReturnType<typeof trpc.users.getMyStats.query>
          >,
        );
      }
    },
    "GET",
  );
};
