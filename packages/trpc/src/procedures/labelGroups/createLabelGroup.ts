import {
  labelGroupSummary,
  labelGroupSummarySchema,
  prisma,
} from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const createLabelGroup = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/labelGroups/createLabelGroup",
      tags: ["labelGroups"],
      summary: "Create a label group",
      protect: true,
    },
  })
  .input(
    z.object({
      title: z.string().min(1).max(254),
      labelIds: z.array(z.uuid()),
      warnWhenNotPresent: z.boolean(),
    }),
  )
  .output(labelGroupSummarySchema)
  .mutation(async ({ ctx, input }) => {
    const existingLabelGroup = await prisma.labelGroup.findFirst({
      where: {
        userId: ctx.session.userId,
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
        userId: ctx.session.userId,
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
          userId: ctx.session.userId,
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
