import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { deleteHangingImagesByIds } from "@recipesage/util/server/storage";

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

    const recipeImages = await prisma.recipeImage.findMany({
      where: {
        recipe: where,
      },
      select: {
        imageId: true,
      },
    });

    await prisma.recipe.deleteMany({
      where,
    });

    await deleteHangingImagesByIds(
      ctx.session.userId,
      recipeImages.map((recipeImage) => recipeImage.imageId),
    );

    return "Ok";
  });
