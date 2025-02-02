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
import { getTrpcInputForEvent } from "../../getTrpcInputForEvent";
import { trpcClient as trpc } from "../../../trpcClient";
import { encodeCacheResultForTrpc } from "../../encodeCacheResultForTrpc";

export const registerGetRecipesRoute = () => {
  registerRoute(
    /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/recipes\.getRecipes/,
    async (event) => {
      try {
        const response = await fetch(event.request);

        swAssertStatusCacheDivert(response);

        return response;
      } catch (e) {
        const input =
          getTrpcInputForEvent<
            Parameters<typeof trpc.recipes.getRecipes.query>[0]
          >(event);
        if (!input) return swCacheReject(SWCacheRejectReason.NoInput, e);

        const {
          userIds,
          folder,
          orderBy,
          orderDirection,
          offset,
          limit,
          recipeIds,
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

        let recipes = await localDb.getAll(ObjectStoreName.Recipes);

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

        // orderBy and orderDirection
        recipes = recipes.sort((_a, _b) => {
          const a = orderDirection === "asc" ? _a : _b;
          const b = orderDirection === "asc" ? _b : _a;

          if (orderBy === "title") {
            return a.title.localeCompare(b.title);
          }

          if (orderBy === "createdAt") {
            return b.createdAt.getTime() - a.createdAt.getTime();
          }

          if (orderBy === "updatedAt") {
            return b.updatedAt.getTime() - a.updatedAt.getTime();
          }

          return 0;
        });

        // recipeIds
        if (recipeIds) {
          const recipeIdsSet = new Set(recipeIds);
          recipes = recipes.filter((recipe) => recipeIdsSet.has(recipe.id));
        }

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

        const totalCount = recipes.length;
        // offset and limit
        recipes = recipes.slice(offset, offset + limit);

        return encodeCacheResultForTrpc({
          recipes,
          totalCount,
        } satisfies Awaited<ReturnType<typeof trpc.recipes.getRecipes.query>>);
      }
    },
    "GET",
  );
};
