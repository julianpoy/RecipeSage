import { router } from "../../trpc";
import { searchDiscoverRecipes } from "./searchDiscoverRecipes";
import { getDiscoverRecipe } from "./getDiscoverRecipe";
import { getDiscoverRecipesByAuthor } from "./getDiscoverRecipesByAuthor";
import { publishDiscoverRecipe } from "./publishDiscoverRecipe";
import { updateDiscoverRecipe } from "./updateDiscoverRecipe";
import { unpublishDiscoverRecipe } from "./unpublishDiscoverRecipe";
import { rateDiscoverRecipe } from "./rateDiscoverRecipe";
import { saveDiscoverRecipe } from "./saveDiscoverRecipe";
import { reportDiscoverRecipe } from "./reportDiscoverRecipe";

export const discoverRouter = router({
  searchDiscoverRecipes,
  getDiscoverRecipe,
  getDiscoverRecipesByAuthor,
  publishDiscoverRecipe,
  updateDiscoverRecipe,
  unpublishDiscoverRecipe,
  rateDiscoverRecipe,
  saveDiscoverRecipe,
  reportDiscoverRecipe,
});
