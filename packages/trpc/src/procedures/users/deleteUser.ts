import { authenticatedProcedure } from "../../trpc";
import { prisma } from "@recipesage/prisma";
import { deleteHangingImagesForUser } from "@recipesage/util/server/storage";
import { deleteRecipes as deleteRecipesFromSearch } from "@recipesage/util/server/search";
import * as Sentry from "@sentry/node";
import { z } from "zod";

export const deleteUser = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/users/deleteUser",
      tags: ["users"],
      summary: "Delete the caller's account and all associated data",
      protect: true,
    },
  })
  .output(z.string())
  .mutation(async ({ ctx }): Promise<string> => {
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
        await tx.userProfileImage.deleteMany({
          where: {
            userId: ctx.session.userId,
          },
        });

        await deleteHangingImagesForUser(ctx.session.userId, tx);

        await tx.user.delete({
          where: {
            id: ctx.session.userId,
          },
        });

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

    return "Deleted";
  });
