import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { mealOptionSummary } from "@recipesage/prisma";
import { TRPCError } from "@trpc/server";

export const create = publicProcedure
  .input(
    z.object({
      title: z.string().min(1).max(100),
      mealTime: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const title = input.title;
    const mealTime = input.mealTime;

    if (!title.length) {
      throw new TRPCError({
        message: "Meal option title invalid",
        code: "BAD_REQUEST",
      });
    }

    if (!mealTime.length) {
      throw new TRPCError({
        message: "Meal option time invalid",
        code: "BAD_REQUEST",
      });
    }

    const existingMealTime = await prisma.mealOption.findFirst({
      where: {
        userId: session.userId,
        mealTime: mealTime,
        title: title,
      },
    });

    if (existingMealTime) {
      throw new TRPCError({
        message: "Conflicting meal option",
        code: "CONFLICT",
      });
    }

    const _mealOption = await prisma.mealOption.create({
      data: {
        title,
        mealTime: input.mealTime,
        userId: session.userId,
      },
    });

    const mealOption = await prisma.mealOption.findUniqueOrThrow({
      where: {
        id: _mealOption.id,
      },
      ...mealOptionSummary,
    });

    return mealOption;
  });
