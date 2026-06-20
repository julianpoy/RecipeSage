import { authenticatedProcedure } from "../../trpc";
import {
  MealPlanItemSummary,
  mealPlanItemSummary,
  mealPlanItemSummarySchema,
  prisma,
} from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  MealPlanAccessLevel,
  convertPrismaDateToDatestamp,
  getAccessToMealPlan,
  getMealPlanHistoryDateLimit,
} from "@recipesage/util/server/db";

const MEAL_PLAN_ITEMS_SAFETY_LIMIT = 100000;

export const getMealPlanItems = authenticatedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/mealPlans/getMealPlanItems",
      tags: ["mealPlans"],
      summary: "Get the items belonging to a meal plan",
      protect: true,
    },
  })
  .input(
    z.object({
      mealPlanId: z.uuid(),
    }),
  )
  .output(z.array(mealPlanItemSummarySchema))
  .query(async ({ ctx, input }) => {
    const access = await getAccessToMealPlan(
      ctx.session.userId,
      input.mealPlanId,
    );

    if (access.level === MealPlanAccessLevel.None) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Meal plan not found or you do not have access",
      });
    }

    const mealPlanItems = await prisma.mealPlanItem.findMany({
      where: {
        mealPlanId: input.mealPlanId,
        scheduledDate: {
          gte: getMealPlanHistoryDateLimit(),
        },
      },
      ...mealPlanItemSummary,
      orderBy: {
        scheduledDate: "desc",
      },
      take: MEAL_PLAN_ITEMS_SAFETY_LIMIT,
    });

    const resultMealPlanItems = mealPlanItems.map((mealPlanItem) =>
      convertPrismaDateToDatestamp(mealPlanItem, "scheduledDate"),
    );

    return resultMealPlanItems satisfies MealPlanItemSummary[];
  });
