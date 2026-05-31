import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import {
  prisma,
  recipeSummaryLite,
  recipeSummaryLiteSchema,
} from "@recipesage/prisma";
import { convertPrismaRecipeSummaryLitesToRecipeSummaryLites } from "@recipesage/util/server/db";

export const getRecipesByTitle = authenticatedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/recipes/getRecipesByTitle",
      tags: ["recipes"],
      summary: "Find the caller's recipes that match a title exactly",
      protect: true,
    },
  })
  .input(
    z.object({
      title: z.string().min(1),
    }),
  )
  .output(z.array(recipeSummaryLiteSchema))
  .query(async ({ ctx, input }) => {
    const recipes = await prisma.recipe.findMany({
      where: {
        userId: ctx.session.userId,
        title: input.title,
      },
      ...recipeSummaryLite,
    });

    return convertPrismaRecipeSummaryLitesToRecipeSummaryLites(recipes);
  });
