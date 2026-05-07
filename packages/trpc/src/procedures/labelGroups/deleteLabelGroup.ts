import {
  labelGroupSummary,
  labelGroupSummarySchema,
  prisma,
} from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const deleteLabelGroup = publicProcedure
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
    const session = ctx.session;
    validateTrpcSession(session);

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
