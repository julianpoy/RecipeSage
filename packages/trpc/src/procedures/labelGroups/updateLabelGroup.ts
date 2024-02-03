import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateSession } from "../../utils/validateSession";
import { labelGroupSummary } from "../../types/labelGroupSummary";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const updateLabelGroup = publicProcedure
  .input(
    z.object({
      id: z.string().min(1).max(100),
      title: z.string().min(1).max(100),
      labelIds: z.array(z.string()),
      warnWhenNotPresent: z.boolean(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateSession(session);

    const existingLabelGroup = await prisma.labelGroup.findFirst({
      where: {
        id: {
          not: input.id,
        },
        userId: session.userId,
        title: input.title,
      },
    });

    if (existingLabelGroup) {
      throw new TRPCError({
        message: "Conflicting labelGroup title",
        code: "CONFLICT",
      });
    }

    await prisma.labelGroup.update({
      where: {
        userId: session.userId,
        id: input.id,
      },
      data: {
        title: input.title,
        warnWhenNotPresent: input.warnWhenNotPresent,
      },
    });

    await prisma.label.updateMany({
      where: {
        userId: session.userId,
        labelGroupId: input.id,
      },
      data: {
        labelGroupId: null,
      },
    });

    await prisma.label.updateMany({
      where: {
        userId: session.userId,
        id: {
          in: input.labelIds,
        },
      },
      data: {
        labelGroupId: input.id,
      },
    });

    const labelGroup = await prisma.labelGroup.findUniqueOrThrow({
      where: {
        userId: session.userId,
        id: input.id,
      },
      ...labelGroupSummary,
    });

    return labelGroup;
  });
