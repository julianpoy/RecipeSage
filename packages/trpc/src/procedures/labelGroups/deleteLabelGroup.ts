import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateSession } from "../../utils/validateSession";
import { labelGroupSummary } from "../../types/labelGroupSummary";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const deleteLabelGroup = publicProcedure
  .input(
    z.object({
      id: z.string().min(1).max(100),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateSession(session);

    const labelGroup = await prisma.labelGroup.findUnique({
      where: {
        userId: session.userId,
        id: input.id,
      },
      ...labelGroupSummary,
    });

    if (!labelGroup) {
      throw new TRPCError({
        message: "Label group not found",
        code: "NOT_FOUND",
      });
    }

    await prisma.labelGroup.delete({
      where: {
        userId: session.userId,
        id: input.id,
      },
    });

    return labelGroup;
  });
