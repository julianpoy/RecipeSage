import cors from "cors";
import { z } from "zod";
import { prisma, recipeSummary } from "@recipesage/prisma";
import { NotFoundError } from "../../errors";
import { AuthenticationEnforcement } from "../../authenticationEnforcement";
import { defineHandler } from "../../defineHandler";
import {
  recipeToJSONLD,
  sortRecipeImages,
} from "@recipesage/util/server/general";
import { convertPrismaRecipeSummaryToRecipeSummary } from "@recipesage/util/server/db";

const schema = {
  params: z.object({
    recipeId: z.uuid(),
  }),
};

export const recipesJsonLdHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.None,
    beforeHandlers: [cors()],
  },
  async (req) => {
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

    return {
      statusCode: 200,
      data: recipeToJSONLD(sorted),
    };
  },
);
