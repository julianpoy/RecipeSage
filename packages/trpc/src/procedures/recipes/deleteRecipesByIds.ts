import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { deleteRecipes } from "@recipesage/util/server/search";

export const deleteRecipesByIds = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/recipes/deleteRecipesByIds",
      tags: ["recipes"],
      summary: "Delete multiple recipes by id",
      protect: true,
    },
  })
  .input(
    z.object({
      ids: z.array(z.uuid()).min(1),
    }),
  )
  .output(z.string())
  .mutation(async ({ ctx, input }) => {
    const where = {
      userId: ctx.session.userId,
      id: {
        in: input.ids,
      },
    };

    await prisma.$transaction(async (tx) => {
      const recipes = await tx.recipe.findMany({
        where,
        select: {
          id: true,
        },
      });

      await tx.recipe.deleteMany({
        where,
      });

      await deleteRecipes(recipes.map((el) => el.id));
    });

    return "Ok";
  });
