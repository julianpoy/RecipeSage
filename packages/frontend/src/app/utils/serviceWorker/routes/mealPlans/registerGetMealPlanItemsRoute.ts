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

export const registerGetMealPlanItemsRoute = () => {
  registerRoute(
    /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/mealPlans\.getMealPlanItems/,
    async (event) => {
      try {
        const response = await fetch(event.request);

        swAssertStatusCacheDivert(response);

        return response;
      } catch (e) {
        const input =
          getTrpcInputForEvent<
            Parameters<typeof trpc.mealPlans.getMealPlanItems.query>[0]
          >(event);
        if (!input) return swCacheReject("No input provided", e);

        const { mealPlanId } = input;

        const localDb = await getLocalDb();

        const mealPlan: MealPlanSummaryWithItems | undefined =
          await localDb.get(ObjectStoreName.MealPlans, mealPlanId);

        if (!mealPlan) {
          return swCacheReject("No cache result found", e);
        }

        return encodeCacheResultForTrpc(
          mealPlan.items satisfies Awaited<
            ReturnType<typeof trpc.mealPlans.getMealPlanItems.query>
          >,
        );
      }
    },
    "GET",
  );
};
