import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import {
  MealPlanItemSummary,
  mealPlanItemSummary,
  prisma,
} from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  MealPlanAccessLevel,
  convertPrismaDateToDatestamp,
  getAccessToMealPlan,
} from "@recipesage/util/server/db";

export const getMealPlanItems = publicProcedure
  .input(
    z.object({
      mealPlanId: z.uuid(),
      limit: z.number().min(1).max(4000).default(1000),
    }),
  )
  .query(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const access = await getAccessToMealPlan(session.userId, input.mealPlanId);

    if (access.level === MealPlanAccessLevel.None) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Meal plan not found or you do not have access",
      });
    }

    const mealPlanItems = await prisma.mealPlanItem.findMany({
      where: {
        mealPlanId: input.mealPlanId,
      },
      ...mealPlanItemSummary,
      orderBy: {
        scheduled: "desc",
      },
      take: input.limit,
    });

    const resultMealPlanItems = mealPlanItems.map((mealPlanItem) =>
      convertPrismaDateToDatestamp(mealPlanItem, "scheduledDate"),
    );

    return resultMealPlanItems satisfies MealPlanItemSummary[];
  });
