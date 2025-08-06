import { mealOptionSummary, prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const update = publicProcedure
  .input(
    z.object({
      id: z.string().min(1).max(100),
      title: z.string().min(1).max(100),
      mealTime: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const existing = await prisma.mealOption.findFirst({
      where: {
        userId: session.userId,
        title: input.title,
        mealTime: input.mealTime,
      },
    });

    if (existing) {
      throw new TRPCError({
        message: "Conflicting meal option title and time",
        code: "CONFLICT",
      });
    }

    if (input.id) {
      const mealOption = await prisma.mealOption.findFirst({
        where: {
          userId: session.userId,
          id: input.id,
        },
      });

      if (!mealOption) {
        throw new TRPCError({
          message: "Meal option not found",
          code: "NOT_FOUND",
        });
      }
    }

    await prisma.mealOption.update({
      where: {
        userId: session.userId,
        id: input.id,
      },
      data: {
        title: input.title,
        mealTime: input.mealTime,
      },
    });

    const mealOption = await prisma.mealOption.findUniqueOrThrow({
      where: {
        userId: session.userId,
        id: input.id,
      },
      ...mealOptionSummary,
    });

    return mealOption;
  });
