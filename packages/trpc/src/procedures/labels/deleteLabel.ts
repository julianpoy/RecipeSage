import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { labelSummary } from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const deleteLabel = publicProcedure
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
    const session = ctx.session;
    validateTrpcSession(session);

    const label = await prisma.label.findUnique({
      where: {
        userId: session.userId,
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
        if (input.includeAttachedRecipes) {
          const recipeLabels = await tx.recipeLabel.findMany({
            where: {
              labelId: input.id,
            },
            select: {
              recipeId: true,
            },
          });

          await tx.recipe.deleteMany({
            where: {
              id: {
                in: recipeLabels.map((label) => label.recipeId),
              },
            },
          });
        }

        await tx.label.delete({
          where: {
            userId: session.userId,
            id: input.id,
          },
        });
      },
      {
        timeout: 30000,
      },
    );

    return "Ok";
  });
