import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { labelGroupSummary } from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const createLabelGroup = publicProcedure
  .input(
    z.object({
      title: z.string().min(1).max(254),
      labelIds: z.array(z.uuid()),
      warnWhenNotPresent: z.boolean(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const existingLabelGroup = await prisma.labelGroup.findFirst({
      where: {
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

    const _labelGroup = await prisma.labelGroup.create({
      data: {
        title: input.title,
        userId: session.userId,
        warnWhenNotPresent: input.warnWhenNotPresent,
      },
    });

    if (input.labelIds.length) {
      await prisma.label.updateMany({
        data: {
          labelGroupId: _labelGroup.id,
        },
        where: {
          id: {
            in: input.labelIds,
          },
          userId: session.userId,
        },
      });
    }

    const labelGroup = await prisma.labelGroup.findUniqueOrThrow({
      where: {
        id: _labelGroup.id,
      },
      ...labelGroupSummary,
    });

    return labelGroup;
  });
