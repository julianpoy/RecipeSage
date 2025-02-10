import { publicProcedure } from "../../trpc";
import {
  WSBoardcastEventType,
  broadcastWSEventIgnoringErrors,
  validateTrpcSession,
} from "@recipesage/util/server/general";
import { prisma } from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  MealPlanAccessLevel,
  getAccessToMealPlan,
} from "@recipesage/util/server/db";

export const deleteMealPlanItems = publicProcedure
  .input(
    z.object({
      mealPlanId: z.string().uuid(),
      ids: z.array(z.string().uuid()),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const mealPlanItems = await prisma.mealPlanItem.findMany({
      where: {
        id: {
          in: input.ids,
        },
        mealPlanId: input.mealPlanId,
      },
      select: {
        mealPlanId: true,
      },
    });

    if (mealPlanItems.length !== input.ids.length) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "One or more of the items you've passed do not exist, or do not belong to the meal plan id",
      });
    }

    const access = await getAccessToMealPlan(session.userId, input.mealPlanId);

    if (access.level === MealPlanAccessLevel.None) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "Meal plan with that id does not exist or you do not have access",
      });
    }

    await prisma.mealPlanItem.deleteMany({
      where: {
        id: { in: input.ids },
      },
    });

    const reference = crypto.randomUUID();
    for (const subscriberId of access.subscriberIds) {
      broadcastWSEventIgnoringErrors(
        subscriberId,
        WSBoardcastEventType.MealPlanUpdated,
        {
          reference,
          mealPlanId: input.mealPlanId,
        },
      );
    }

    return {
      reference,
    };
  });
