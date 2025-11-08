import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const deleteLabels = publicProcedure
  .input(
    z.object({
      ids: z.array(z.uuid()).min(1).max(100),
      includeAttachedRecipes: z.boolean().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const labelIdsToDelete = new Set(input.ids);

    const labels = await prisma.label.findMany({
      where: {
        userId: session.userId,
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
        if (input.includeAttachedRecipes) {
          const recipeLabels = await tx.recipeLabel.findMany({
            where: {
              labelId: {
                in: input.ids,
              },
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

        await tx.label.deleteMany({
          where: {
            userId: session.userId,
            id: {
              in: input.ids,
            },
          },
        });
      },
      {
        timeout: 60000,
      },
    );

    return "Ok";
  });
