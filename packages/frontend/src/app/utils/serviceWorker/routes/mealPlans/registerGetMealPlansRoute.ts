import { registerRoute } from "workbox-routing";
import { swAssertStatusCacheDivert } from "../../swErrorHandling";
import { getLocalDb, ObjectStoreName } from "../../../localDb";
import { trpcClient as trpc } from "../../../trpcClient";
import { encodeCacheResultForTrpc } from "../../encodeCacheResultForTrpc";

export const registerGetMealPlansRoute = () => {
  registerRoute(
    /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/mealPlans\.getMealPlans/,
    async (event) => {
      try {
        const response = await fetch(event.request);

        swAssertStatusCacheDivert(response);

        return response;
      } catch (_e) {
        const localDb = await getLocalDb();

        const mealPlans = await localDb.getAll(ObjectStoreName.MealPlans);

        return encodeCacheResultForTrpc(
          mealPlans satisfies Awaited<
            ReturnType<typeof trpc.mealPlans.getMealPlans.query>
          >,
        );
      }
    },
    "GET",
  );
};
