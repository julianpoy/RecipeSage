import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { mealPlanSummary, prisma } from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const getMealPlan = publicProcedure
  .input(
    z.object({
      id: z.string().uuid(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const collabRelationships = await prisma.mealPlanCollaborator.findMany({
      where: {
        mealPlanId: input.id,
        userId: session.userId,
      },
      select: {
        mealPlanId: true,
      },
    });

    const mealPlan = await prisma.mealPlan.findFirst({
      where: {
        OR: [
          {
            id: input.id,
            userId: session.userId,
          },
          {
            id: {
              in: collabRelationships.map((el) => el.mealPlanId),
            },
          },
        ],
      },
      ...mealPlanSummary,
    });

    if (!mealPlan) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Meal plan with that id not found or you do not have access",
      });
    }

    return mealPlan;
  });
