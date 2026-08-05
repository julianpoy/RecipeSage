import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { deleteHangingImagesForUser } from "@recipesage/util/server/storage";
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
    const purgeFromStorage = await prisma.$transaction(
      async (tx) => {
        await tx.recipe.deleteMany({
          where: {
            userId: ctx.session.userId,
          },
        });

        return deleteHangingImagesForUser(ctx.session.userId, tx);
      },
      {
        timeout: 60000,
      },
    );

    await purgeFromStorage();

    return "Ok";
  });
