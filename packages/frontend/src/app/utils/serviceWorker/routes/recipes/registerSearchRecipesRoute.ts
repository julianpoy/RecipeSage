import { registerRoute } from "workbox-routing";
import {
  swAssertStatusCacheDivert,
  swCacheReject,
  SWCacheRejectReason,
} from "../../swErrorHandling";
import { appIdbStorageManager } from "../../../appIdbStorageManager";
import {
  getKvStoreEntry,
  getLocalDb,
  KVStoreKeys,
  ObjectStoreName,
} from "../../../localDb";
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
        if (!input) return swCacheReject(SWCacheRejectReason.NoInput, e);

        const {
          searchTerm,
          userIds,
          folder,
          labels,
          labelIntersection,
          includeAllFriends,
          ratings,
        } = input;

        const localDb = await getLocalDb();

        const session = await appIdbStorageManager.getSession();
        if (!session) {
          return swCacheReject(SWCacheRejectReason.NoSession, e);
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

        // userIds (only partially functional, since we only have friends recipes cached)
        if (userIds) {
          const friendships = await getKvStoreEntry(KVStoreKeys.MyFriends);

          if (!friendships) {
            return swCacheReject(SWCacheRejectReason.NoCacheResult, e);
          }

          const friendUserIds = new Set(
            friendships.friends.map((friend) => friend.id),
          );
          const allQueriedAreFriends = userIds.every((userId) =>
            friendUserIds.has(userId),
          );
          if (!allQueriedAreFriends) {
            return swCacheReject(SWCacheRejectReason.NoCacheResult, e);
          }
        }
        const queriedUserIdsSet = new Set(userIds || [session.userId]);

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
            return queriedUserIdsSet.has(recipe.userId);
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
