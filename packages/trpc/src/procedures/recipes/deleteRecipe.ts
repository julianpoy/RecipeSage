import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { deleteRecipesAndEnqueueImageDeletion } from "@recipesage/util/server/db";

export const deleteRecipe = authenticatedProcedure
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
    const recipe = await prisma.recipe.findUnique({
      where: {
        id: input.id,
        userId: ctx.session.userId,
      },
    });

    if (!recipe) {
      throw new TRPCError({
        message: "Recipe not found",
        code: "NOT_FOUND",
      });
    }

    await prisma.$transaction(
      async (tx) => {
        await deleteRecipesAndEnqueueImageDeletion(
          ctx.session.userId,
          {
            id: recipe.id,
          },
          tx,
        );
      },
      {
        timeout: 60000,
      },
    );

    return "Ok";
  });
