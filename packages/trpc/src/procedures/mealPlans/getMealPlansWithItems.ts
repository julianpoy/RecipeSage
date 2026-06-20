import { authenticatedProcedure } from "../../trpc";
import {
  mealPlanItemSummary,
  mealPlanSummary,
  MealPlanSummaryWithItems,
  mealPlanSummaryWithItemsSchema,
  prisma,
} from "@recipesage/prisma";
import {
  convertPrismaDateToDatestamp,
  getMealPlanHistoryDateLimit,
} from "@recipesage/util/server/db";
import { z } from "zod";

export const getMealPlansWithItems = authenticatedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/mealPlans/getMealPlansWithItems",
      tags: ["mealPlans"],
      summary: "Get the caller's meal plans, including recent items",
      protect: true,
    },
  })
  .output(z.array(mealPlanSummaryWithItemsSchema))
  .query(async ({ ctx }): Promise<MealPlanSummaryWithItems[]> => {
    const collabRelationships = await prisma.mealPlanCollaborator.findMany({
      where: {
        userId: ctx.session.userId,
      },
      select: {
        mealPlanId: true,
      },
    });

    const dateLimit = getMealPlanHistoryDateLimit();

    const mealPlans = await prisma.mealPlan.findMany({
      where: {
        OR: [
          {
            userId: ctx.session.userId,
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
  });
