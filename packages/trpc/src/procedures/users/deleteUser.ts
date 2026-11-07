import { authenticatedProcedure } from "../../trpc";
import { prisma } from "@recipesage/prisma";
import {
  enqueueImageDeletion,
  revokeAppleAuthTokens,
} from "@recipesage/util/server/general";
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
    const appleAuthTokens = await prisma.appleAuthToken.findMany({
      where: {
        userId: ctx.session.userId,
      },
    });

    await prisma.$transaction(
      async (tx) => {
        const images = await tx.image.findMany({
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
        await tx.discoverRecipe.deleteMany({
          where: {
            authorId: ctx.session.userId,
          },
        });

        await tx.user.delete({
          where: {
            id: ctx.session.userId,
          },
        });

        await enqueueImageDeletion(
          images.map((image) => image.id),
          null,
        );
      },
      {
        timeout: 300000,
      },
    );

    await revokeAppleAuthTokens(appleAuthTokens);

    return "Deleted";
  });
