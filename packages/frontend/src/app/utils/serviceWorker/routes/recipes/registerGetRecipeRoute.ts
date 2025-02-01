import { registerRoute } from "workbox-routing";
import {
  swAssertStatusCacheDivert,
  swCacheReject,
} from "../../swErrorHandling";
import { getLocalDb, ObjectStoreName } from "../../../localDb";
import type { RecipeSummary } from "@recipesage/prisma";
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
        if (!input) return swCacheReject("No input provided", e);

        const { id } = input;

        const localDb = await getLocalDb();

        const recipe: RecipeSummary | undefined = await localDb.get(
          ObjectStoreName.Recipes,
          id,
        );

        if (!recipe) {
          return swCacheReject("No cache result found", e);
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
