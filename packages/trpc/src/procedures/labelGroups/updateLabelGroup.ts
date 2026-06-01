import {
  labelGroupSummary,
  labelGroupSummarySchema,
  prisma,
} from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const updateLabelGroup = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/labelGroups/updateLabelGroup",
      tags: ["labelGroups"],
      summary: "Update a label group",
      protect: true,
    },
  })
  .input(
    z.object({
      id: z.uuid(),
      title: z.string().min(1).max(254),
      labelIds: z.array(z.uuid()),
      warnWhenNotPresent: z.boolean(),
    }),
  )
  .output(labelGroupSummarySchema)
  .mutation(async ({ ctx, input }) => {
    const existingLabelGroup = await prisma.labelGroup.findFirst({
      where: {
        id: {
          not: input.id,
        },
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

    await prisma.labelGroup.update({
      where: {
        userId: ctx.session.userId,
        id: input.id,
      },
      data: {
        title: input.title,
        warnWhenNotPresent: input.warnWhenNotPresent,
      },
    });

    await prisma.label.updateMany({
      where: {
        userId: ctx.session.userId,
        labelGroupId: input.id,
      },
      data: {
        labelGroupId: null,
      },
    });

    await prisma.label.updateMany({
      where: {
        userId: ctx.session.userId,
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
        userId: ctx.session.userId,
        id: input.id,
      },
      ...labelGroupSummary,
    });

    return labelGroup;
  });
