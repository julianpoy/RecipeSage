import { publicProcedure, router } from "../../trpc";
import { z } from "zod";
import { prisma } from "@recipesage/prisma";

export const getRecipes = publicProcedure
  .input(
    z.object({
      example: z.string(),
    })
  )
  .query(async ({ input }) => {
    const recipes = await prisma.recipe.findMany({});

    return recipes[0];
  });
