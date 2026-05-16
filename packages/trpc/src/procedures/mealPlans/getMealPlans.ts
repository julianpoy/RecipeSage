import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import {
  mealPlanSummary,
  mealPlanSummarySchema,
  prisma,
} from "@recipesage/prisma";
import { z } from "zod";

export const getMealPlans = publicProcedure
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
      ...mealPlanSummary,
      orderBy: {
        createdAt: "desc",
      },
    });

    return mealPlans;
  });
