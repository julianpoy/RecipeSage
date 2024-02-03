import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { recipeSummary } from "../../types/recipeSummary";

export const getRecipe = publicProcedure
  .input(
    z.object({
      id: z.string(),
    }),
  )
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

    return recipe;
  });
