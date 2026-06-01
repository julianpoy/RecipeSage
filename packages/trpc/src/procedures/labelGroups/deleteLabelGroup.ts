import {
  labelGroupSummary,
  labelGroupSummarySchema,
  prisma,
} from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const deleteLabelGroup = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/labelGroups/deleteLabelGroup",
      tags: ["labelGroups"],
      summary: "Delete a label group",
      protect: true,
    },
  })
  .input(
    z.object({
      id: z.uuid().min(1).max(100),
    }),
  )
  .output(labelGroupSummarySchema)
  .mutation(async ({ ctx, input }) => {
    const labelGroup = await prisma.labelGroup.findUnique({
      where: {
        userId: ctx.session.userId,
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
        userId: ctx.session.userId,
        id: input.id,
      },
    });

    return labelGroup;
  });
