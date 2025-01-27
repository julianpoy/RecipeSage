import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import {
  MealPlanSummaryWithItems,
  mealPlanSummaryWithItems,
  prisma,
} from "@recipesage/prisma";
import { convertPrismaDateToDatestamp } from "@recipesage/util/server/db";

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
      ...mealPlanSummaryWithItems,
      orderBy: {
        createdAt: "desc",
      },
    });

    const resultMealPlans = mealPlans.map((mealPlan) => {
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
