import { registerRoute } from "workbox-routing";
import {
  swAssertStatusCacheDivert,
  swCacheReject,
} from "../../swErrorHandling";
import { appIdbStorageManager } from "../../../appIdbStorageManager";
import { getLocalDb, ObjectStoreName } from "../../../localDb";
import { SearchManager } from "../../../SearchManager";
import type { RecipeSummary } from "@recipesage/prisma";
import { getTrpcInputForEvent } from "../../getTrpcInputForEvent";
import { trpcClient as trpc } from "../../../trpcClient";
import { encodeCacheResultForTrpc } from "../../encodeCacheResultForTrpc";

export const registerSearchRecipesRoute = (
  searchManagerP: SearchManager | Promise<SearchManager>,
) => {
  registerRoute(
    /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/recipes\.searchRecipes/,
    async (event) => {
      try {
        const response = await fetch(event.request);

        swAssertStatusCacheDivert(response);

        return response;
      } catch (e) {
        const input =
          getTrpcInputForEvent<
            Parameters<typeof trpc.recipes.searchRecipes.query>[0]
          >(event);
        if (!input) return swCacheReject("No input provided", e);

        const {
          searchTerm,
          userIds,
          folder,
          labels,
          labelIntersection,
          includeAllFriends,
          ratings,
        } = input;

        if (userIds) {
          return swCacheReject("Cannot query other userIds while offline", e);
        }

        const localDb = await getLocalDb();

        const session = await appIdbStorageManager.getSession();
        if (!session) {
          return swCacheReject("Not logged in, can't operate offline", e);
        }

        const searchManager = await searchManagerP;
        const searchResults = searchManager.search(searchTerm);

        let recipes: RecipeSummary[] = [];
        for (const searchResult of searchResults) {
          const recipe = await localDb.get(
            ObjectStoreName.Recipes,
            searchResult.recipeId,
          );
          if (recipe) {
            recipes.push(recipe);
          }
        }

        // folder
        recipes = recipes.filter((recipe) => recipe.folder === folder);

        // labels
        if (labels) {
          const labelsSet = new Set(labels);
          recipes = recipes.filter((recipe) => {
            if (labelIntersection) {
              return recipe.recipeLabels.some((recipeLabel) => {
                labelsSet.has(recipeLabel.label.title);
              });
            } else {
              for (const requiredLabel of labelsSet) {
                const hasLabel = recipe.recipeLabels.some((recipeLabel) => {
                  return recipeLabel.label.title === requiredLabel;
                });
                if (!hasLabel) {
                  return false;
                }
              }
              return true;
            }
          });
        }

        // includeAllFriends
        if (!includeAllFriends) {
          recipes = recipes.filter((recipe) => {
            return recipe.userId === session.userId;
          });
        }

        // ratings
        if (ratings) {
          recipes = recipes.filter((recipe) => {
            return ratings.includes(recipe.rating);
          });
        }

        return encodeCacheResultForTrpc({
          recipes,
          totalCount: recipes.length,
        } satisfies Awaited<
          ReturnType<typeof trpc.recipes.searchRecipes.query>
        >);
      }
    },
    "GET",
  );
};
