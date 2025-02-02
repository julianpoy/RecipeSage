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

export const registerGetRecipeRoute = () => {
  registerRoute(
    /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/recipes\.getRecipe/,
    async (event) => {
      try {
        const response = await fetch(event.request);

        swAssertStatusCacheDivert(response);

        return response;
      } catch (e) {
        const input =
          getTrpcInputForEvent<
            Parameters<typeof trpc.recipes.getRecipe.query>[0]
          >(event);
        if (!input) return swCacheReject(SWCacheRejectReason.NoInput, e);

        const { id } = input;

        const localDb = await getLocalDb();

        const recipe = await localDb.get(ObjectStoreName.Recipes, id);

        if (!recipe) {
          return swCacheReject(SWCacheRejectReason.NoCacheResult, e);
        }

        return encodeCacheResultForTrpc(
          recipe satisfies Awaited<
            ReturnType<typeof trpc.recipes.getRecipe.query>
          >,
        );
      }
    },
    "GET",
  );
};
