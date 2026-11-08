import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { enqueueImageDeletion } from "@recipesage/util/server/general";
import { hangingImageWhere } from "@recipesage/util/server/db";
import { z } from "zod";

export const deleteAllRecipes = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/recipes/deleteAllRecipes",
      tags: ["recipes"],
      summary: "Delete all recipes belonging to the caller",
      protect: true,
    },
  })
  .output(z.string())
  .mutation(async ({ ctx }) => {
    await prisma.$transaction(
      async (tx) => {
        await tx.recipe.deleteMany({
          where: {
            userId: ctx.session.userId,
          },
        });

        const hangingImages = await tx.image.findMany({
          where: {
            userId: ctx.session.userId,
            ...hangingImageWhere,
          },
          select: {
            id: true,
          },
        });

        await enqueueImageDeletion(
          hangingImages.map((image) => image.id),
          ctx.session.userId,
        );
      },
      {
        timeout: 60000,
      },
    );

    return "Ok";
  });
