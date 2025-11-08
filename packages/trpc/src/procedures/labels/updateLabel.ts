import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const updateLabel = publicProcedure
  .input(
    z.object({
      id: z.uuid(),
      title: z.string().min(1).max(100).optional(),
      labelGroupId: z.uuid().nullable().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    if (!input.title && input.labelGroupId === undefined) {
      throw new TRPCError({
        message: "You must provide at least one of: title, labelGroupId",
        code: "BAD_REQUEST",
      });
    }

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

    return "Ok";
  });
