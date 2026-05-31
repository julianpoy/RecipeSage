import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { getSimilarRecipes as _getSimilarRecipes } from "@recipesage/util/server/db";
import { recipeSummaryLiteSchema } from "@recipesage/prisma";

export const getSimilarRecipes = authenticatedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/recipes/getSimilarRecipes",
      tags: ["recipes"],
      summary:
        "Find the caller's recipes that look similar to the supplied ones",
      protect: true,
    },
  })
  .input(
    z.object({
      recipeIds: z.array(z.uuid()).min(1),
    }),
  )
  .output(z.array(recipeSummaryLiteSchema))
  .query(async ({ ctx, input }) => {
    const similarRecipes = await _getSimilarRecipes(
      ctx.session.userId,
      input.recipeIds,
    );

    return similarRecipes;
  });
