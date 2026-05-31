import { authenticatedProcedure } from "../../trpc";
import {
  mealPlanSummary,
  mealPlanSummarySchema,
  prisma,
} from "@recipesage/prisma";
import { z } from "zod";

export const getMealPlans = authenticatedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/mealPlans/getMealPlans",
      tags: ["mealPlans"],
      summary: "Get the caller's meal plans (without items)",
      protect: true,
    },
  })
  .output(z.array(mealPlanSummarySchema))
  .query(async ({ ctx }) => {
    const collabRelationships = await prisma.mealPlanCollaborator.findMany({
      where: {
        userId: ctx.session.userId,
      },
      select: {
        mealPlanId: true,
      },
    });

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

    return mealPlans;
  });
