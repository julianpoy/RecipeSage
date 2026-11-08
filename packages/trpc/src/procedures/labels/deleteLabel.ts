import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { labelSummary } from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { deleteRecipesAndEnqueueImageDeletion } from "@recipesage/util/server/db";

export const deleteLabel = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/labels/deleteLabel",
      tags: ["labels"],
      summary: "Delete a label",
      protect: true,
    },
  })
  .input(
    z.object({
      id: z.uuid(),
      includeAttachedRecipes: z.boolean().optional(),
    }),
  )
  .output(z.string())
  .mutation(async ({ ctx, input }) => {
    const label = await prisma.label.findUnique({
      where: {
        userId: ctx.session.userId,
        id: input.id,
      },
      ...labelSummary,
    });

    if (!label) {
      throw new TRPCError({
        message: "Label not found",
        code: "NOT_FOUND",
      });
    }

    await prisma.$transaction(
      async (tx) => {
        const recipeLabels = input.includeAttachedRecipes
          ? await tx.recipeLabel.findMany({
              where: {
                labelId: input.id,
              },
              select: {
                recipeId: true,
              },
            })
          : [];

        await tx.label.delete({
          where: {
            userId: ctx.session.userId,
            id: input.id,
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
        timeout: 30000,
      },
    );

    return "Ok";
  });
