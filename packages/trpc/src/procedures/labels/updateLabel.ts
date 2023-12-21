import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateSession } from "../../utils/validateSession";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { labelSummary } from "../../types/labelSummary";

export const updateLabel = publicProcedure
  .input(
    z.object({
      id: z.string().min(1).max(100),
      title: z.string().min(1).max(100),
      labelGroupId: z.string().min(1).max(100).nullable(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateSession(session);

    const existingLabel = await prisma.label.findFirst({
      where: {
        userId: session.userId,
        title: input.title,
      },
    });

    if (existingLabel) {
      throw new TRPCError({
        message: "Conflicting label title",
        code: "CONFLICT",
      });
    }

    if (input.labelGroupId) {
      const labelGroup = await prisma.labelGroup.findFirst({
        where: {
          userId: session.userId,
          id: input.labelGroupId,
        },
      });

      if (!labelGroup) {
        throw new TRPCError({
          message: "Label group not found",
          code: "NOT_FOUND",
        });
      }
    }

    await prisma.label.update({
      where: {
        userId: session.userId,
        id: input.id,
      },
      data: {
        title: input.title,
        labelGroupId: input.labelGroupId,
      },
    });

    const label = await prisma.label.findUniqueOrThrow({
      where: {
        userId: session.userId,
        id: input.id,
      },
      ...labelSummary,
    });

    return label;
  });
