import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { deleteRecipesAndEnqueueImageDeletion } from "@recipesage/util/server/db";

export const deleteLabels = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/labels/deleteLabels",
      tags: ["labels"],
      summary: "Delete multiple labels",
      protect: true,
    },
  })
  .input(
    z.object({
      ids: z.array(z.uuid()).min(1).max(100),
      includeAttachedRecipes: z.boolean().optional(),
    }),
  )
  .output(z.string())
  .mutation(async ({ ctx, input }) => {
    const labelIdsToDelete = new Set(input.ids);

    const labels = await prisma.label.findMany({
      where: {
        userId: ctx.session.userId,
        id: {
          in: [...labelIdsToDelete],
        },
      },
      select: {
        id: true,
      },
    });

    const labelIdsWithPermissions = new Set(labels.map((el) => el.id));

    if (
      labelIdsToDelete.symmetricDifference(labelIdsWithPermissions).size !== 0
    ) {
      throw new TRPCError({
        message: "One of the labels you specified was not found",
        code: "NOT_FOUND",
      });
    }

    await prisma.$transaction(
      async (tx) => {
        const recipeLabels = input.includeAttachedRecipes
          ? await tx.recipeLabel.findMany({
              where: {
                labelId: {
                  in: input.ids,
                },
              },
              select: {
                recipeId: true,
              },
            })
          : [];

        await tx.label.deleteMany({
          where: {
            userId: ctx.session.userId,
            id: {
              in: input.ids,
            },
          },
        });

        await deleteRecipesAndEnqueueImageDeletion(
          ctx.session.userId,
          {
            id: {
              in: recipeLabels.map((recipeLabel) => recipeLabel.recipeId),
            },
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
