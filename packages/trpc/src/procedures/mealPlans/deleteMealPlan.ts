import { authenticatedProcedure } from "../../trpc";
import {
  WSBroadcastEventType,
  broadcastWSEventIgnoringErrors,
} from "@recipesage/util/server/general";
import { prisma } from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  MealPlanAccessLevel,
  getAccessToMealPlan,
} from "@recipesage/util/server/db";

export const deleteMealPlan = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/mealPlans/deleteMealPlan",
      tags: ["mealPlans"],
      summary: "Delete a meal plan",
      protect: true,
    },
  })
  .input(
    z.object({
      id: z.uuid(),
    }),
  )
  .output(
    z.object({
      reference: z.uuid(),
      id: z.uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const access = await getAccessToMealPlan(ctx.session.userId, input.id);

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
        WSBroadcastEventType.MealPlanUpdated,
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
