import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const mergeLabels = publicProcedure
  .input(
    z.object({
      sourceId: z.uuid(),
      targetId: z.uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    if (input.sourceId === input.targetId) {
      throw new TRPCError({
        message: "Source label id cannot match destination label id",
        code: "BAD_REQUEST",
      });
    }

    await prisma.$transaction(async (tx) => {
      const sourceLabel = await tx.label.findUnique({
        where: {
          id: input.sourceId,
          userId: session.userId,
        },
        select: {
          id: true,
          recipeLabels: {
            select: {
              recipeId: true,
            },
          },
        },
      });

      if (!sourceLabel) {
        throw new TRPCError({
          message: "Source label not found",
          code: "NOT_FOUND",
        });
      }

      const targetLabel = await tx.label.findUnique({
        where: {
          id: input.targetId,
          userId: session.userId,
        },
        select: {
          id: true,
          recipeLabels: {
            select: {
              recipeId: true,
            },
          },
        },
      });

      if (!targetLabel) {
        throw new TRPCError({
          message: "Target label not found",
          code: "NOT_FOUND",
        });
      }

      const sourceLabelRecipeIds = sourceLabel.recipeLabels.map(
        (recipeLabel) => recipeLabel.recipeId,
      );
      const targetLabelRecipeIds = targetLabel.recipeLabels.map(
        (recipeLabel) => recipeLabel.recipeId,
      );

      const recipeIdsToUpdate = sourceLabelRecipeIds.filter(
        (recipeId) => !targetLabelRecipeIds.includes(recipeId),
      );

      await tx.recipeLabel.updateMany({
        data: {
          labelId: input.targetId,
        },
        where: {
          labelId: input.sourceId,
          recipeId: {
            in: recipeIdsToUpdate,
          },
        },
      });

      await tx.label.deleteMany({
        where: {
          id: input.sourceId,
        },
      });
    });

    return "ok";
  });
