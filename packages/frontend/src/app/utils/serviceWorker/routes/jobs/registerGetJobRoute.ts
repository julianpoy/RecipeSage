import { registerRoute } from "workbox-routing";
import {
  swAssertStatusCacheDivert,
  swCacheReject,
  SWCacheRejectReason,
} from "../../swErrorHandling";
import { getLocalDb, ObjectStoreName } from "../../../localDb";
import { trpcClient as trpc } from "../../../trpcClient";
import { encodeCacheResultForTrpc } from "../../encodeCacheResultForTrpc";
import { getTrpcInputForEvent } from "../../getTrpcInputForEvent";

export const registerGetJobRoute = () => {
  registerRoute(
    /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/jobs\.getJob/,
    async (event) => {
      try {
        const response = await fetch(event.request);

        swAssertStatusCacheDivert(response);

        return response;
      } catch (e) {
        const input =
          getTrpcInputForEvent<Parameters<typeof trpc.jobs.getJob.query>[0]>(
            event,
          );
        if (!input) return swCacheReject(SWCacheRejectReason.NoInput, e);

        const { id } = input;

        const localDb = await getLocalDb();

        const job = await localDb.get(ObjectStoreName.Jobs, id);

        if (!job) {
          return swCacheReject(SWCacheRejectReason.NoCacheResult, e);
        }

        return encodeCacheResultForTrpc(
          job satisfies Awaited<ReturnType<typeof trpc.jobs.getJob.query>>,
        );
      }
    },
    "GET",
  );
};
