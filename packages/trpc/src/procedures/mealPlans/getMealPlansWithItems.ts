import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import {
  mealPlanItemSummary,
  mealPlanSummary,
  MealPlanSummaryWithItems,
  prisma,
} from "@recipesage/prisma";
import { convertPrismaDateToDatestamp } from "@recipesage/util/server/db";

const HISTORICAL_DATE_LIMIT_DAYS = 60; // We return this number of past days of meal plan items

export const getMealPlansWithItems = publicProcedure.query(
  async ({ ctx }): Promise<MealPlanSummaryWithItems[]> => {
    const session = ctx.session;
    validateTrpcSession(session);

    const collabRelationships = await prisma.mealPlanCollaborator.findMany({
      where: {
        userId: session.userId,
      },
      select: {
        mealPlanId: true,
      },
    });

    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - HISTORICAL_DATE_LIMIT_DAYS);

    const mealPlans = await prisma.mealPlan.findMany({
      where: {
        OR: [
          {
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
      orderBy: {
        createdAt: "desc",
      },
    });

    const mealPlanItems = await prisma.mealPlanItem.findMany({
      where: {
        mealPlanId: {
          in: mealPlans.map((mealPlan) => mealPlan.id),
        },
        scheduledDate: {
          gte: dateLimit,
        },
      },
      ...mealPlanItemSummary,
    });

    const mealPlanItemsByMealPlanId = mealPlanItems.reduce(
      (acc, mealPlanItem) => {
        if (!acc[mealPlanItem.mealPlanId]) {
          acc[mealPlanItem.mealPlanId] = [];
        }
        acc[mealPlanItem.mealPlanId].push(mealPlanItem);
        return acc;
      },
      {} as Record<string, typeof mealPlanItems>,
    );

    const resultMealPlans = mealPlans.map((_mealPlan) => {
      const mealPlan = {
        ..._mealPlan,
        items: mealPlanItemsByMealPlanId[_mealPlan.id] || [],
      };

      const resultItems = mealPlan.items.map((mealPlanItem) =>
        convertPrismaDateToDatestamp(mealPlanItem, "scheduledDate"),
      );

      return {
        ...mealPlan,
        items: resultItems,
      };
    });

    return resultMealPlans satisfies MealPlanSummaryWithItems[];
  },
);
