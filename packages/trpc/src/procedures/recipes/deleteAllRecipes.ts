import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { deleteHangingImagesForUser } from "@recipesage/util/server/storage";
import { deleteRecipes as deleteRecipesFromSearch } from "@recipesage/util/server/search";
import * as Sentry from "@sentry/node";
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
        const allRecipeIds = await tx.recipe.findMany({
          where: {
            userId: ctx.session.userId,
          },
          select: {
            id: true,
          },
        });

        await tx.recipe.deleteMany({
          where: {
            userId: ctx.session.userId,
          },
        });

        await deleteHangingImagesForUser(ctx.session.userId, tx);
        await deleteRecipesFromSearch(allRecipeIds.map((el) => el.id)).catch(
          (e) => {
            Sentry.captureException(e);
          },
        );
      },
      {
        timeout: 60000,
      },
    );

    return "Ok";
  });
