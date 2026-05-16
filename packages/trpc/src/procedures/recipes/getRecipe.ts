import { prisma, recipeSummary, recipeSummarySchema } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { convertPrismaRecipeSummaryToRecipeSummary } from "@recipesage/util/server/db";

export const getRecipe = publicProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/recipes/getRecipe",
      tags: ["recipes"],
      summary: "Fetch a single recipe by id",
      protect: true,
    },
  })
  .input(
    z.object({
      id: z.uuid(),
    }),
  )
  .output(recipeSummarySchema)
  .query(async ({ input }) => {
    const recipe = await prisma.recipe.findUnique({
      where: {
        id: input.id,
      },
      ...recipeSummary,
    });

    if (!recipe) {
      throw new TRPCError({
        message: "Recipe not found",
        code: "NOT_FOUND",
      });
    }

    return convertPrismaRecipeSummaryToRecipeSummary(recipe);
  });
