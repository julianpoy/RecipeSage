import { Recipe, RecipeImage } from "@prisma/client";

export const sortRecipeImages = <
  T extends Recipe & {
    recipeImages: RecipeImage[];
  }
>(
  recipe: T
): T => {
  recipe.recipeImages = recipe.recipeImages.sort((a, b) => {
    return a.order - b.order;
  });
  return recipe;
};
