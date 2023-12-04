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
    })
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateSession(session);

    const existingLabel = await prisma.label.findFirst({
      where: {
        userId: session.userId,
        title: input.title,
      }
    });

    if (existingLabel) {
      throw new TRPCError({
        message: "Conflicting label title",
        code: "CONFLICT"
      });
    }

    await prisma.label.update({
      where: {
        userId: session.userId,
        id: input.id,
      },
      data: {
        title: input.title,
      }
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
