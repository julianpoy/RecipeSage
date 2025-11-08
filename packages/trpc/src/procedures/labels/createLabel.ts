import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { labelSummary } from "@recipesage/prisma";
import { TRPCError } from "@trpc/server";
import { cleanLabelTitle } from "@recipesage/util/shared";

export const createLabel = publicProcedure
  .input(
    z.object({
      title: z.string().min(1).max(100),
      labelGroupId: z.uuid().nullable(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const title = cleanLabelTitle(input.title);
    if (!title.length) {
      throw new TRPCError({
        message: "Label title invalid",
        code: "BAD_REQUEST",
      });
    }

    const existingLabel = await prisma.label.findFirst({
      where: {
        userId: session.userId,
        title,
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

    const _label = await prisma.label.upsert({
      where: {
        userId_title: {
          title,
          userId: session.userId,
        },
      },
      create: {
        title,
        userId: session.userId,
        labelGroupId: input.labelGroupId,
      },
      update: {},
    });

    const label = await prisma.label.findUniqueOrThrow({
      where: {
        id: _label.id,
      },
      ...labelSummary,
    });

    return label;
  });
