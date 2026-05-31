import { prisma, recipeSummary } from "@recipesage/prisma";
import { z } from "zod";
import { NotFoundError } from "../../errors";
import { AuthenticationEnforcement, defineHandler } from "../../defineHandler";
import {
  sanitizeRemoveHtmlFromString,
  sortRecipeImages,
} from "@recipesage/util/server/general";
import { convertPrismaRecipeSummaryToRecipeSummary } from "@recipesage/util/server/db";

const schema = {
  params: z.object({
    recipeId: z.uuid(),
  }),
};

export const shareRecipeHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.None,
  },
  async (req, res) => {
    const recipe = await prisma.recipe.findUnique({
      where: {
        id: req.params.recipeId,
      },
      ...recipeSummary,
    });

    if (!recipe) {
      throw new NotFoundError("Recipe not found");
    }

    const sorted = sortRecipeImages(
      convertPrismaRecipeSummaryToRecipeSummary(recipe),
    );
    const image = sorted.recipeImages[0]?.image.location;

    const appuiOrigin = process.env.APP_UI_BASE_URL || "https://recipesage.com";
    const shareURL = `${appuiOrigin}/api/share/recipe/${sorted.id}`;
    const redirectURL = `${appuiOrigin}/app/recipe/${sorted.id}`;

    res.render("recipe-share", {
      recipe: {
        id: sorted.id,
        title: sorted.title,
        description: sanitizeRemoveHtmlFromString(sorted.description),
        image,
      },
      shareURL,
      redirectURL,
    });
  },
);
