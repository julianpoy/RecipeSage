import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateSession } from "../../utils/validateSession";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { labelSummary } from "../../types/labelSummary";

export const deleteLabel = publicProcedure
  .input(
    z.object({
      id: z.string().min(1).max(100),
      includeAttachedRecipes: z.boolean().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateSession(session);

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

    await prisma.$transaction(async (tx) => {
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
    });

    return label;
  });
