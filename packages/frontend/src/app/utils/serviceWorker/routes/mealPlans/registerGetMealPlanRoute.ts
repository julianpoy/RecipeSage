import { registerRoute } from "workbox-routing";
import {
  swAssertStatusCacheDivert,
  swCacheReject,
} from "../../swErrorHandling";
import { getLocalDb, ObjectStoreName } from "../../../localDb";
import { getTrpcInputForEvent } from "../../getTrpcInputForEvent";
import { trpcClient as trpc } from "../../../trpcClient";
import { encodeCacheResultForTrpc } from "../../encodeCacheResultForTrpc";
import type { MealPlanSummaryWithItems } from "@recipesage/prisma";

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
        if (!input) return swCacheReject("No input provided", e);

        const { id } = input;

        const localDb = await getLocalDb();

        const mealPlan: MealPlanSummaryWithItems | undefined =
          await localDb.get(ObjectStoreName.MealPlans, id);

        if (!mealPlan) {
          return swCacheReject("No cache result found", e);
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
