import { registerRoute } from "workbox-routing";
import { swAssertStatusCacheDivert } from "../../swErrorHandling";
import { getLocalDb, ObjectStoreName } from "../../../localDb";
import type { LabelSummary } from "@recipesage/prisma";
import { trpcClient as trpc } from "../../../trpcClient";
import { encodeCacheResultForTrpc } from "../../encodeCacheResultForTrpc";

export const registerGetAllVisibleLabelsRoute = () => {
  registerRoute(
    /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/labels\.getAllVisibleLabels/,
    async (event) => {
      try {
        const response = await fetch(event.request);

        swAssertStatusCacheDivert(response);

        return response;
      } catch (e) {
        const localDb = await getLocalDb();

        let labels: LabelSummary[] = await localDb.getAll(
          ObjectStoreName.Labels,
        );

        return encodeCacheResultForTrpc(
          labels satisfies Awaited<
            ReturnType<typeof trpc.labels.getAllVisibleLabels.query>
          >,
        );
      }
    },
    "GET",
  );
};
