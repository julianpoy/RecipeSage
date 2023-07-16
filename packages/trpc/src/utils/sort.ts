export const sortRecipeImages = <
  T extends {
    recipeImages: {
      order: number;
    }[];
  }
>(
  recipe: T
): T => {
  recipe.recipeImages = recipe.recipeImages.sort((a, b) => {
    return a.order - b.order;
  });
  return recipe;
};
