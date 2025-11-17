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

export const deleteMealPlanItem = publicProcedure
  .input(
    z.object({
      id: z.uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const mealPlanItem = await prisma.mealPlanItem.findUnique({
      where: {
        id: input.id,
      },
      select: {
        mealPlanId: true,
      },
    });

    if (!mealPlanItem) {
      throw new TRPCError({
        code: "NOT_FOUND",
      });
    }

    const access = await getAccessToMealPlan(
      session.userId,
      mealPlanItem.mealPlanId,
    );

    if (access.level === MealPlanAccessLevel.None) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "Meal plan with that id does not exist or you do not have access",
      });
    }

    const deletedMealPlanItem = await prisma.mealPlanItem.delete({
      where: {
        id: input.id,
      },
    });

    const reference = crypto.randomUUID();
    for (const subscriberId of access.subscriberIds) {
      broadcastWSEventIgnoringErrors(
        subscriberId,
        WSBoardcastEventType.MealPlanUpdated,
        {
          reference,
          mealPlanId: mealPlanItem.mealPlanId,
        },
      );
    }

    return {
      reference,
      id: deletedMealPlanItem.id,
    };
  });
