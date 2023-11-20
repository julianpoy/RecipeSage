import { prisma } from "@recipesage/prisma";
import { recipeSummary } from "../types/queryTypes";

/**
 * Removes the duplicate-numbered recipe title
 * `Chicken Soup (2)` would become `Chicken Soup`
 */
const stripNumberedRecipeTitle = (title: string) => {
  return title.replace(/\s?\(\d\)$/, "");
};

export const getSimilarRecipes = async (
  userId: string,
  recipeIds: string[],
) => {
  const recipes = await prisma.recipe.findMany({
    where: {
      id: {
        in: recipeIds,
      },
    },
  });

  if (recipes.length === 0) {
    return [];
  }

  const relatedRecipes = await prisma.recipe.findMany({
    where: {
      id: {
        notIn: recipeIds,
      },
      userId,
      OR: [
        ...recipes.map((recipe) => ({
          title: {
            startsWith: stripNumberedRecipeTitle(recipe.title as string),
          },
        })),
        ...recipes
          .filter((recipe) => recipe.ingredients)
          .map((recipe) => ({
            ingredients: recipe.ingredients,
          })),
        ...recipes
          .filter((recipe) => recipe.instructions)
          .map((recipe) => ({
            instructions: recipe.instructions,
          })),
      ],
    },
    ...recipeSummary,
    take: 100,
    orderBy: {
      title: "asc",
    },
  });

  return relatedRecipes;
};
