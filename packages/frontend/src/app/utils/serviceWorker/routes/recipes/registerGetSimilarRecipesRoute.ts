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

export const registerGetSimilarRecipesRoute = () => {
  registerRoute(
    /((https:\/\/api(\.beta)?\.recipesage\.com)|(\/api))\/trpc\/recipes\.getSimilarRecipes/,
    async (event) => {
      try {
        const response = await fetch(event.request);

        swAssertStatusCacheDivert(response);

        return response;
      } catch (e) {
        const input =
          getTrpcInputForEvent<
            Parameters<typeof trpc.recipes.getSimilarRecipes.query>[0]
          >(event);
        if (!input) return swCacheReject("No input provided", e);

        const { recipeIds } = input;

        const localDb = await getLocalDb();

        const originRecipeTitles = new Set<string>();
        const originRecipeIngredients = new Set<string>();
        const originRecipeInstructions = new Set<string>();
        for (const recipeId of recipeIds) {
          const recipe: RecipeSummary | undefined = await localDb.get(
            ObjectStoreName.Recipes,
            recipeId,
          );

          if (recipe) {
            originRecipeTitles.add(recipe.title);
            originRecipeIngredients.add(recipe.ingredients);
            originRecipeInstructions.add(recipe.instructions);
          }
        }

        const recipes: RecipeSummary[] = await localDb.getAll(
          ObjectStoreName.Recipes,
        );

        const similarRecipes = recipes.filter((recipe) => {
          return (
            originRecipeTitles.has(recipe.title) ||
            originRecipeIngredients.has(recipe.ingredients) ||
            originRecipeInstructions.has(recipe.instructions)
          );
        });

        return encodeCacheResultForTrpc(
          similarRecipes satisfies Awaited<
            ReturnType<typeof trpc.recipes.getSimilarRecipes.query>
          >,
        );
      }
    },
    "GET",
  );
};
