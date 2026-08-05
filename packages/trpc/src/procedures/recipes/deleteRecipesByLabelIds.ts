import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { deleteHangingImagesByIds } from "@recipesage/util/server/storage";

export const deleteRecipesByLabelIds = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/recipes/deleteRecipesByLabelIds",
      tags: ["recipes"],
      summary: "Delete every recipe that has at least one of the given labels",
      protect: true,
    },
  })
  .input(
    z.object({
      labelIds: z.array(z.uuid()).min(1),
    }),
  )
  .output(z.string())
  .mutation(async ({ ctx, input }) => {
    const where = {
      userId: ctx.session.userId,
      recipeLabels: {
        some: {
          label: {
            id: {
              in: input.labelIds,
            },
          },
        },
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

    const purgeFromStorage = await deleteHangingImagesByIds(
      ctx.session.userId,
      recipeImages.map((recipeImage) => recipeImage.imageId),
    );

    await purgeFromStorage();

    return "Ok";
  });
