import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { enqueueImageDeletion } from "@recipesage/util/server/general";
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

        const images = await tx.image.findMany({
          where: {
            userId: ctx.session.userId,
          },
          select: {
            id: true,
          },
        });

        await enqueueImageDeletion(
          images.map((image) => image.id),
          ctx.session.userId,
        );
      },
      {
        timeout: 60000,
      },
    );

    return "Ok";
  });
