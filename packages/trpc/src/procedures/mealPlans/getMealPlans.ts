import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { mealPlanSummary, prisma } from "@recipesage/prisma";

export const getMealPlans = publicProcedure.query(async ({ ctx }) => {
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
