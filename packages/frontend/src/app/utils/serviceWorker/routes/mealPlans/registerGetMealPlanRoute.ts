import { registerRoute } from "workbox-routing";
import {
  swAssertStatusCacheDivert,
  swCacheReject,
  SWCacheRejectReason,
} from "../../swErrorHandling";
import { getLocalDb, ObjectStoreName } from "../../../localDb";
import { getTrpcInputForEvent } from "../../getTrpcInputForEvent";
import { trpcClient as trpc } from "../../../trpcClient";
import { encodeCacheResultForTrpc } from "../../encodeCacheResultForTrpc";

export const registerGetMealPlanRoute = () => {
  registerRoute(
    /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/mealPlans\.getMealPlan/,
    async (event) => {
      try {
        const response = await fetch(event.request);

        swAssertStatusCacheDivert(response);

        return response;
      } catch (e) {
        const input =
          getTrpcInputForEvent<
            Parameters<typeof trpc.mealPlans.getMealPlan.query>[0]
          >(event);
        if (!input) return swCacheReject(SWCacheRejectReason.NoInput, e);

        const { id } = input;

        const localDb = await getLocalDb();

        const mealPlan = await localDb.get(ObjectStoreName.MealPlans, id);

        if (!mealPlan) {
          return swCacheReject(SWCacheRejectReason.NoCacheResult, e);
        }

        return encodeCacheResultForTrpc(
          mealPlan satisfies Awaited<
            ReturnType<typeof trpc.mealPlans.getMealPlan.query>
          >,
        );
      }
    },
    "GET",
  );
};
