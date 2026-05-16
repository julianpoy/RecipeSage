import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { deleteRecipes } from "@recipesage/util/server/search";

export const deleteRecipe = publicProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/recipes/deleteRecipe",
      tags: ["recipes"],
      summary: "Delete a recipe",
      protect: true,
    },
  })
  .input(
    z.object({
      id: z.uuid(),
    }),
  )
  .output(z.string())
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const recipe = await prisma.recipe.findUnique({
      where: {
        id: input.id,
        userId: session.userId,
      },
    });

    if (!recipe) {
      throw new TRPCError({
        message: "Recipe not found",
        code: "NOT_FOUND",
      });
    }

    await prisma.recipe.delete({
      where: {
        id: recipe.id,
      },
    });

    await deleteRecipes([recipe.id]);

    return "Ok";
  });
