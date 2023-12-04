import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateSession } from "../../utils/validateSession";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { labelSummary } from "../../types/labelSummary";
import { cleanLabelTitle } from "@recipesage/util";

export const createLabel = publicProcedure
  .input(
    z.object({
      title: z.string().min(1).max(100),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateSession(session);

    const title = cleanLabelTitle(input.title);
    if (!title.length) {
      throw new TRPCError({
        message: "Label title invalid",
        code: "BAD_REQUEST"
      });
    }

    const existingLabel = await prisma.label.findFirst({
      where: {
        userId: session.userId,
        title,
      }
    });

    if (existingLabel) {
      throw new TRPCError({
        message: "Conflicting label title",
        code: "CONFLICT"
      });
    }

    const _label = await prisma.label.create({
      data: {
        title,
        userId: session.userId,
      }
    });

    const label = await prisma.label.findUniqueOrThrow({
      where: {
        id: _label.id,
      },
      ...labelSummary
    });

    return label;
  });
