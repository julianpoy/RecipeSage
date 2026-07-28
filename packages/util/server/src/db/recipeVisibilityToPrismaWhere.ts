import { Prisma } from "@recipesage/prisma";
import { RecipeVisibility } from "./resolveRecipeVisibility";

/**
 * Gets the Prisma filters that should be applied to get all recipes
 * a user can access given some parameters.
 * The result of this function should be ORd together
 */
export const recipeVisibilityToPrismaWhere = (
  visibility: RecipeVisibility,
): Prisma.RecipeWhereInput[] => {
  const queryFilters: Prisma.RecipeWhereInput[] = [];

  for (const partialShare of visibility.partialShares) {
    const userOrFilters: Prisma.RecipeWhereInput[] = [];

    if (partialShare.labelIds.length) {
      userOrFilters.push({
        recipeLabels: {
          some: {
            labelId: { in: partialShare.labelIds },
          },
        },
      });
    }

    if (partialShare.recipeIds.length) {
      userOrFilters.push({ id: { in: partialShare.recipeIds } });
    }

    if (userOrFilters.length) {
      queryFilters.push({
        userId: partialShare.userId,
        OR: userOrFilters,
      });
    }
  }

  if (visibility.allRecipesUserIds.length) {
    queryFilters.push({ userId: { in: visibility.allRecipesUserIds } });
  }

  return queryFilters;
};
