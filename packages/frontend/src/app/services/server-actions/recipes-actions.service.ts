import { Injectable } from "@angular/core";
import type {
  NutritionFilter,
  NutritionRange,
  RecipeSummary,
} from "@recipesage/prisma";
import { stripNumberedRecipeTitle } from "@recipesage/util/shared";

const passesNutritionRange = (
  value: number | null,
  range: NutritionRange | undefined,
): boolean => {
  if (!range) return true;
  const hasRange = range.min != null || range.max != null;
  if (!hasRange && !range.matchMissing) return true;
  if (value == null) return !!range.matchMissing;
  if (range.min != null && value < range.min) return false;
  if (range.max != null && value > range.max) return false;
  return hasRange;
};

const passesNutritionFilter = (
  recipe: RecipeSummary,
  filter: NutritionFilter | undefined,
): boolean => {
  if (!filter) return true;
  return (
    passesNutritionRange(recipe.nutritionCalories, filter.calories) &&
    passesNutritionRange(recipe.nutritionProtein, filter.protein) &&
    passesNutritionRange(recipe.nutritionTotalCarbs, filter.totalCarbs) &&
    passesNutritionRange(recipe.nutritionTotalFat, filter.totalFat) &&
    passesNutritionRange(recipe.nutritionSodium, filter.sodium)
  );
};

import { ErrorHandlers } from "../http-error-handler.service";
import { ActionsBase, RouterInputs, RouterOutputs } from "./actions-base";
import {
  getKvStoreEntry,
  getLocalDb,
  KVStoreKeys,
  ObjectStoreName,
} from "../../utils/localDb";
import { appIdbStorageManager } from "../../utils/appIdbStorageManager";

@Injectable({
  providedIn: "root",
})
export class RecipesActionsService extends ActionsBase {
  getRecipe(
    input: RouterInputs["recipes"]["getRecipe"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["recipes"]["getRecipe"] | undefined> {
    return this.executeQuery(
      () => this.trpc.recipes.getRecipe.query(input),
      async () => {
        const localDb = await getLocalDb();
        return localDb.get(ObjectStoreName.Recipes, input.id);
      },
      errorHandlers,
    );
  }

  getRecipeCount(
    input: RouterInputs["recipes"]["getRecipeCount"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["recipes"]["getRecipeCount"] | undefined> {
    return this.executeQuery(
      () => this.trpc.recipes.getRecipeCount.query(input),
      async () => {
        const localDb = await getLocalDb();
        const session = await appIdbStorageManager.getSession();
        if (!session) return undefined;

        const recipes = await localDb.getAll(ObjectStoreName.Recipes);
        const count = recipes.filter(
          (recipe) =>
            recipe.userId === session.userId &&
            (!input.folder || recipe.folder === input.folder),
        ).length;

        return { count };
      },
      errorHandlers,
    );
  }

  getRecipes(
    input: RouterInputs["recipes"]["getRecipes"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["recipes"]["getRecipes"] | undefined> {
    return this.executeQuery(
      () => this.trpc.recipes.getRecipes.query(input),
      async () => {
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
          nutritionFilter,
        } = input;

        const localDb = await getLocalDb();
        const session = await appIdbStorageManager.getSession();
        if (!session) return undefined;

        let recipes = await localDb.getAll(ObjectStoreName.Recipes);

        if (userIds) {
          const friendships = await getKvStoreEntry(KVStoreKeys.MyFriends);
          if (!friendships) return undefined;
          const friendUserIds = new Set(
            friendships.friends.map((friend) => friend.id),
          );
          const allQueriedAreFriends = userIds.every((userId) =>
            friendUserIds.has(userId),
          );
          if (!allQueriedAreFriends) return undefined;
        }
        const queriedUserIdsSet = new Set(userIds || [session.userId]);

        recipes = recipes.filter((recipe) => recipe.folder === folder);

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

        if (recipeIds) {
          const recipeIdsSet = new Set(recipeIds);
          recipes = recipes.filter((recipe) => recipeIdsSet.has(recipe.id));
        }

        if (labels) {
          const labelsSet = new Set(labels);
          recipes = recipes.filter((recipe) => {
            if (labelIntersection) {
              return recipe.recipeLabels.some((recipeLabel) => {
                labelsSet.has(recipeLabel.label.title);
              });
            }
            for (const requiredLabel of labelsSet) {
              const hasLabel = recipe.recipeLabels.some((recipeLabel) => {
                return recipeLabel.label.title === requiredLabel;
              });
              if (!hasLabel) return false;
            }
            return true;
          });
        }

        if (!includeAllFriends) {
          recipes = recipes.filter((recipe) => {
            return queriedUserIdsSet.has(recipe.userId);
          });
        }

        if (ratings) {
          recipes = recipes.filter((recipe) => {
            return ratings.includes(recipe.rating);
          });
        }

        if (nutritionFilter) {
          recipes = recipes.filter((recipe) =>
            passesNutritionFilter(recipe, nutritionFilter),
          );
        }

        const totalCount = recipes.length;
        recipes = recipes.slice(offset, offset + limit);

        return { recipes, totalCount };
      },
      errorHandlers,
    );
  }

  getSimilarRecipes(
    input: RouterInputs["recipes"]["getSimilarRecipes"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["recipes"]["getSimilarRecipes"] | undefined> {
    return this.executeQuery(
      () => this.trpc.recipes.getSimilarRecipes.query(input),
      async () => {
        const { recipeIds } = input;

        const localDb = await getLocalDb();
        const session = await appIdbStorageManager.getSession();
        if (!session) return undefined;

        const originRecipeTitles = new Set<string>();
        const originRecipeIngredients = new Set<string>();
        const originRecipeInstructions = new Set<string>();
        for (const recipeId of recipeIds) {
          const recipe = await localDb.get(ObjectStoreName.Recipes, recipeId);
          if (recipe) {
            originRecipeTitles.add(stripNumberedRecipeTitle(recipe.title));
            if (recipe.ingredients.trim().length) {
              originRecipeIngredients.add(recipe.ingredients);
            }
            if (recipe.instructions.trim().length) {
              originRecipeInstructions.add(recipe.instructions);
            }
          }
        }

        const recipes = await localDb.getAll(ObjectStoreName.Recipes);

        return recipes
          .filter((recipe) => recipe.userId === session.userId)
          .filter((recipe) => {
            return (
              originRecipeTitles.has(stripNumberedRecipeTitle(recipe.title)) ||
              originRecipeIngredients.has(recipe.ingredients) ||
              originRecipeInstructions.has(recipe.instructions)
            );
          });
      },
      errorHandlers,
    );
  }

  getRecipesByIds(
    input: RouterInputs["recipes"]["getRecipesByIds"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["recipes"]["getRecipesByIds"] | undefined> {
    return this.executeQuery(
      () => this.trpc.recipes.getRecipesByIds.query(input),
      async () => {
        const { ids } = input;

        const localDb = await getLocalDb();
        const session = await appIdbStorageManager.getSession();
        if (!session) return undefined;

        const recipes: RecipeSummary[] = [];
        for (const id of ids) {
          const recipe = await localDb.get(ObjectStoreName.Recipes, id);
          if (recipe) recipes.push(recipe);
        }
        return recipes;
      },
      errorHandlers,
    );
  }

  getRecipesByTitle(
    input: RouterInputs["recipes"]["getRecipesByTitle"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["recipes"]["getRecipesByTitle"] | undefined> {
    return this.executeQuery(
      () => this.trpc.recipes.getRecipesByTitle.query(input),
      async () => {
        const { title } = input;

        const localDb = await getLocalDb();
        const session = await appIdbStorageManager.getSession();
        if (!session) return undefined;

        const recipes = await localDb.getAll(ObjectStoreName.Recipes);
        return recipes.filter((recipe) => {
          return recipe.userId === session.userId && recipe.title === title;
        });
      },
      errorHandlers,
    );
  }

  getUniqueRecipeTitle(
    input: RouterInputs["recipes"]["getUniqueRecipeTitle"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["recipes"]["getUniqueRecipeTitle"] | undefined> {
    return this.executeQuery(
      () => this.trpc.recipes.getUniqueRecipeTitle.query(input),
      async () => {
        const { title, ignoreIds } = input;

        const localDb = await getLocalDb();
        const session = await appIdbStorageManager.getSession();
        if (!session) return undefined;

        const recipes = await localDb.getAll(ObjectStoreName.Recipes);

        const ignoreIdsSet = new Set(ignoreIds);
        const recipeTitles = new Set(
          recipes
            .filter((recipe) => !ignoreIdsSet.has(recipe.id))
            .filter((recipe) => recipe.userId === session.userId)
            .map((recipe) => recipe.title),
        );

        const strippedRecipeTitle = stripNumberedRecipeTitle(title);
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

        return uniqueTitle;
      },
      errorHandlers,
    );
  }

  searchRecipes(
    input: RouterInputs["recipes"]["searchRecipes"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["recipes"]["searchRecipes"] | undefined> {
    return this.executeQuery(
      () => this.trpc.recipes.searchRecipes.query(input),
      async () => {
        const {
          searchTerm,
          userIds,
          folder,
          labels,
          labelIntersection,
          includeAllFriends,
          ratings,
          nutritionFilter,
        } = input;

        const localDb = await getLocalDb();
        const session = await appIdbStorageManager.getSession();
        if (!session) return undefined;

        const searchManager = await this.searchService.getManager();
        const searchResults = searchManager.search(searchTerm);

        let recipes: RecipeSummary[] = [];
        for (const searchResult of searchResults) {
          const recipe = await localDb.get(
            ObjectStoreName.Recipes,
            searchResult.recipeId,
          );
          if (recipe) recipes.push(recipe);
        }

        if (userIds) {
          const friendships = await getKvStoreEntry(KVStoreKeys.MyFriends);
          if (!friendships) return undefined;
          const friendUserIds = new Set(
            friendships.friends.map((friend) => friend.id),
          );
          const allQueriedAreFriends = userIds.every((userId) =>
            friendUserIds.has(userId),
          );
          if (!allQueriedAreFriends) return undefined;
        }
        const queriedUserIdsSet = new Set(userIds || [session.userId]);

        recipes = recipes.filter((recipe) => recipe.folder === folder);

        if (labels) {
          const labelsSet = new Set(labels);
          recipes = recipes.filter((recipe) => {
            if (labelIntersection) {
              return recipe.recipeLabels.some((recipeLabel) => {
                labelsSet.has(recipeLabel.label.title);
              });
            }
            for (const requiredLabel of labelsSet) {
              const hasLabel = recipe.recipeLabels.some((recipeLabel) => {
                return recipeLabel.label.title === requiredLabel;
              });
              if (!hasLabel) return false;
            }
            return true;
          });
        }

        if (!includeAllFriends) {
          recipes = recipes.filter((recipe) => {
            return queriedUserIdsSet.has(recipe.userId);
          });
        }

        if (ratings) {
          recipes = recipes.filter((recipe) => {
            return ratings.includes(recipe.rating);
          });
        }

        if (nutritionFilter) {
          recipes = recipes.filter((recipe) =>
            passesNutritionFilter(recipe, nutritionFilter),
          );
        }

        return { recipes, totalCount: recipes.length };
      },
      errorHandlers,
    );
  }

  createRecipe(
    input: RouterInputs["recipes"]["createRecipe"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["recipes"]["createRecipe"] | undefined> {
    return this.executeMutation(
      () => this.trpc.recipes.createRecipe.mutate(input),
      (result) => {
        void this.syncService.syncRecipe(result.id);
      },
      errorHandlers,
    );
  }

  updateRecipe(
    input: RouterInputs["recipes"]["updateRecipe"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["recipes"]["updateRecipe"] | undefined> {
    return this.executeMutation(
      () => this.trpc.recipes.updateRecipe.mutate(input),
      (result) => {
        void this.syncService.syncRecipe(result.id);
      },
      errorHandlers,
    );
  }

  deleteRecipe(
    input: RouterInputs["recipes"]["deleteRecipe"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["recipes"]["deleteRecipe"] | undefined> {
    return this.executeMutation(
      () => this.trpc.recipes.deleteRecipe.mutate(input),
      () => {
        void this.syncService.syncRecipes();
      },
      errorHandlers,
    );
  }

  deleteRecipesByIds(
    input: RouterInputs["recipes"]["deleteRecipesByIds"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["recipes"]["deleteRecipesByIds"] | undefined> {
    return this.executeMutation(
      () => this.trpc.recipes.deleteRecipesByIds.mutate(input),
      () => {
        void this.syncService.syncRecipes();
      },
      errorHandlers,
    );
  }

  deleteRecipesByLabelIds(
    input: RouterInputs["recipes"]["deleteRecipesByLabelIds"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["recipes"]["deleteRecipesByLabelIds"] | undefined> {
    return this.executeMutation(
      () => this.trpc.recipes.deleteRecipesByLabelIds.mutate(input),
      () => {
        void this.syncService.syncRecipes();
      },
      errorHandlers,
    );
  }

  deleteAllRecipes(
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["recipes"]["deleteAllRecipes"] | undefined> {
    return this.executeMutation(
      () => this.trpc.recipes.deleteAllRecipes.mutate(),
      () => {
        void this.syncService.syncRecipes();
      },
      errorHandlers,
    );
  }
}
