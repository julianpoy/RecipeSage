import { registerRoute } from "workbox-routing";
import {
  swAssertStatusCacheDivert,
  swCacheReject,
  SWCacheRejectReason,
} from "../../swErrorHandling";
import { appIdbStorageManager } from "../../../appIdbStorageManager";
import { getLocalDb, ObjectStoreName } from "../../../localDb";
import { trpcClient as trpc } from "../../../trpcClient";
import { encodeCacheResultForTrpc } from "../../encodeCacheResultForTrpc";

export const registerGetJobsRoute = () => {
  registerRoute(
    /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/jobs\.getJobs/,
    async (event) => {
      try {
        const response = await fetch(event.request);

        swAssertStatusCacheDivert(response);

        return response;
      } catch (e) {
        const localDb = await getLocalDb();

        const session = await appIdbStorageManager.getSession();
        if (!session) {
          return swCacheReject(SWCacheRejectReason.NoSession, e);
        }

        let jobs = await localDb.getAll(ObjectStoreName.Jobs);

        jobs = jobs.filter((job) => job.userId === session.userId);

        return encodeCacheResultForTrpc(
          jobs satisfies Awaited<ReturnType<typeof trpc.jobs.getJobs.query>>,
        );
      }
    },
    "GET",
  );
};
