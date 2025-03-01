import { router } from "../../trpc";
import { createRecipe } from "./createRecipe";
import { deleteAllRecipes } from "./deleteAllRecipes";
import { deleteRecipe } from "./deleteRecipe";
import { deleteRecipesByIds } from "./deleteRecipesByIds";
import { deleteRecipesByLabelIds } from "./deleteRecipesByLabelIds";
import { getAllVisibleRecipesManifest } from "./getAllVisibleRecipesManifest";
import { getRecipeSyncManifest } from "./getRecipeSyncManifest";
import { getRecipe } from "./getRecipe";
import { getRecipes } from "./getRecipes";
import { getRecipesByIds } from "./getRecipesByIds";
import { getRecipesByTitle } from "./getRecipesByTitle";
import { getSimilarRecipes } from "./getSimilarRecipes";
import { getUniqueRecipeTitle } from "./getUniqueRecipeTitle";
import { searchRecipes } from "./searchRecipes";
import { updateRecipe } from "./updateRecipe";

export const recipesRouter = router({
  createRecipe,
  getRecipe,
  updateRecipe,
  deleteRecipe,
  deleteRecipesByIds,
  deleteRecipesByLabelIds,
  deleteAllRecipes,
  getRecipes,
  getRecipesByIds,
  getAllVisibleRecipesManifest,
  getRecipeSyncManifest,
  searchRecipes,
  getSimilarRecipes,
  getRecipesByTitle,
  getUniqueRecipeTitle,
});
