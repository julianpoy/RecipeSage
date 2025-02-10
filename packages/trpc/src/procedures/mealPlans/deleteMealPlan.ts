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

export const deleteMealPlan = publicProcedure
  .input(
    z.object({
      id: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const access = await getAccessToMealPlan(session.userId, input.id);

    if (access.level !== MealPlanAccessLevel.Owner) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Meal plan with that id does not exist or you do not own it",
      });
    }

    await prisma.mealPlan.delete({
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
          mealPlanId: input.id,
        },
      );
    }

    return {
      reference,
      id: input.id,
    };
  });
