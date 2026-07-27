import { Prisma } from "@recipesage/prisma";
import { RecipeVisibility } from "./resolveRecipeVisibility";

export const recipeVisibilityToSql = (
  visibility: RecipeVisibility,
): Prisma.Sql => {
  const queryFilters: Prisma.Sql[] = [];

  for (const partialShare of visibility.partialShares) {
    const userOrFilters: Prisma.Sql[] = [];

    if (partialShare.labelIds.length) {
      userOrFilters.push(
        Prisma.sql`EXISTS (
          SELECT 1
          FROM "Recipe_Labels" rl
          WHERE rl."recipeId" = "Recipes".id
            AND rl."labelId" = ANY(${partialShare.labelIds}::uuid[])
        )`,
      );
    }

    if (partialShare.recipeIds.length) {
      userOrFilters.push(
        Prisma.sql`"Recipes".id = ANY(${partialShare.recipeIds}::uuid[])`,
      );
    }

    if (userOrFilters.length) {
      queryFilters.push(
        Prisma.sql`("Recipes"."userId" = ${partialShare.userId}::uuid AND (${Prisma.join(userOrFilters, " OR ")}))`,
      );
    }
  }

  if (visibility.allRecipesUserIds.length) {
    queryFilters.push(
      Prisma.sql`"Recipes"."userId" = ANY(${visibility.allRecipesUserIds}::uuid[])`,
    );
  }

  if (!queryFilters.length) return Prisma.sql`false`;

  return Prisma.sql`(${Prisma.join(queryFilters, " OR ")})`;
};
