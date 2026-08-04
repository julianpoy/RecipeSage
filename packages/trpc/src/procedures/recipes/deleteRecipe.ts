import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { deleteHangingImagesByIds } from "@recipesage/util/server/storage";

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

    const recipeImages = await prisma.recipeImage.findMany({
      where: {
        recipeId: recipe.id,
      },
      select: {
        imageId: true,
      },
    });

    await prisma.recipe.delete({
      where: {
        id: recipe.id,
      },
    });

    await deleteHangingImagesByIds(
      ctx.session.userId,
      recipeImages.map((recipeImage) => recipeImage.imageId),
    );

    return "Ok";
  });
