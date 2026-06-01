import { authenticatedProcedure } from "../../trpc";
import {
  mealPlanSummary,
  mealPlanSummarySchema,
  prisma,
} from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  MealPlanAccessLevel,
  getAccessToMealPlan,
} from "@recipesage/util/server/db";

export const getMealPlan = authenticatedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/mealPlans/getMealPlan",
      tags: ["mealPlans"],
      summary: "Get a single meal plan by id",
      protect: true,
    },
  })
  .input(
    z.object({
      id: z.uuid(),
    }),
  )
  .output(mealPlanSummarySchema)
  .query(async ({ ctx, input }) => {
    const access = await getAccessToMealPlan(ctx.session.userId, input.id);

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
