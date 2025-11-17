import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { mealPlanSummary, prisma } from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  MealPlanAccessLevel,
  getAccessToMealPlan,
} from "@recipesage/util/server/db";

export const getMealPlan = publicProcedure
  .input(
    z.object({
      id: z.uuid(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const access = await getAccessToMealPlan(session.userId, input.id);

    if (access.level === MealPlanAccessLevel.None) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Meal plan not found or you do not have access to it",
      });
    }

    const mealPlan = await prisma.mealPlan.findUniqueOrThrow({
      where: {
        id: input.id,
      },
      ...mealPlanSummary,
    });

    return mealPlan;
  });
