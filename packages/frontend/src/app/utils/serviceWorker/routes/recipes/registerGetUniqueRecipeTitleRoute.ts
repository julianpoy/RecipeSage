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
import { stripNumberedRecipeTitle } from "@recipesage/util/shared";

export const registerGetUniqueRecipeTitleRoute = () => {
  registerRoute(
    /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/recipes\.getUniqueRecipeTitle/,
    async (event) => {
      try {
        const response = await fetch(event.request);

        swAssertStatusCacheDivert(response);

        return response;
      } catch (e) {
        const input =
          getTrpcInputForEvent<
            Parameters<typeof trpc.recipes.getUniqueRecipeTitle.query>[0]
          >(event);
        if (!input) return swCacheReject(SWCacheRejectReason.NoInput, e);

        const { title, ignoreIds } = input;

        const localDb = await getLocalDb();

        const session = await appIdbStorageManager.getSession();
        if (!session) {
          return swCacheReject(SWCacheRejectReason.NoSession, e);
        }

        const recipes = await localDb.getAll(ObjectStoreName.Recipes);

        const ignoreIdsSet = new Set(ignoreIds);
        const recipeTitles = new Set(
          recipes
            .filter((recipe) => !ignoreIdsSet.has(recipe.id))
            .filter((recipe) => recipe.userId === session.userId)
            .map((recipe) => recipe.title),
        );

        const strippedRecipeTitle = stripNumberedRecipeTitle(title);

        // Request may have been for "Spaghetti (3)", while "Spaghetti" is unused.
        const strippedConflict = recipeTitles.has(strippedRecipeTitle);

        let uniqueTitle: string | undefined;
        if (strippedConflict) {
          let count = 1;
          while (count < 1000) {
            uniqueTitle = `${strippedRecipeTitle} (${count})`;

            const isConflict = recipeTitles.has(title);
            if (!isConflict) break;

            count++;
          }
        } else {
          uniqueTitle = strippedRecipeTitle;
        }

        return encodeCacheResultForTrpc(
          uniqueTitle satisfies Awaited<
            ReturnType<typeof trpc.recipes.getUniqueRecipeTitle.query>
          >,
        );
      }
    },
    "GET",
  );
};
