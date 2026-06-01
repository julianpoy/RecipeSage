import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import {
  prisma,
  recipeSummaryLite,
  recipeSummaryLiteSchema,
} from "@recipesage/prisma";
import { convertPrismaRecipeSummaryLitesToRecipeSummaryLites } from "@recipesage/util/server/db";

export const getRecipesByUrl = authenticatedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/recipes/getRecipesByUrl",
      tags: ["recipes"],
      summary: "Find the caller's recipes that match a source URL exactly",
      protect: true,
    },
  })
  .input(
    z.object({
      url: z.string().min(1),
    }),
  )
  .output(z.array(recipeSummaryLiteSchema))
  .query(async ({ ctx, input }) => {
    const recipes = await prisma.recipe.findMany({
      where: {
        userId: ctx.session.userId,
        url: input.url,
      },
      ...recipeSummaryLite,
    });

    return convertPrismaRecipeSummaryLitesToRecipeSummaryLites(recipes);
  });
