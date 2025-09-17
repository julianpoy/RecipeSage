import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { mealOptionSummary } from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const remove = publicProcedure
  .input(
    z.object({
      id: z.string().min(1).max(100),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const mealOption = await prisma.mealOption.findUnique({
      where: {
        userId: session.userId,
        id: input.id,
      },
      ...mealOptionSummary,
    });

    if (!mealOption) {
      throw new TRPCError({
        message: "Meal option not found",
        code: "NOT_FOUND",
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.mealOption.delete({
        where: {
          userId: session.userId,
          id: input.id,
        },
      });
    });

    return mealOption;
  });
