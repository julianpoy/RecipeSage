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
import { appIdbStorageManager } from "../../../appIdbStorageManager";

export const registerGetRecipesByTitleRoute = () => {
  registerRoute(
    /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/recipes\.getRecipesByTitle/,
    async (event) => {
      try {
        const response = await fetch(event.request);

        swAssertStatusCacheDivert(response);

        return response;
      } catch (e) {
        const input =
          getTrpcInputForEvent<
            Parameters<typeof trpc.recipes.getRecipesByTitle.query>[0]
          >(event);
        if (!input) return swCacheReject(SWCacheRejectReason.NoInput, e);

        const { title } = input;

        const localDb = await getLocalDb();

        const session = await appIdbStorageManager.getSession();
        if (!session) {
          return swCacheReject(SWCacheRejectReason.NoSession, e);
        }

        let recipes = await localDb.getAll(ObjectStoreName.Recipes);

        recipes = recipes.filter((recipe) => {
          return recipe.userId === session.userId && recipe.title === title;
        });

        return encodeCacheResultForTrpc(
          recipes satisfies Awaited<
            ReturnType<typeof trpc.recipes.getRecipesByTitle.query>
          >,
        );
      }
    },
    "GET",
  );
};
