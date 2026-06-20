import { authenticatedProcedure } from "../../trpc";
import {
  WSBroadcastEventType,
  broadcastWSEventIgnoringErrors,
} from "@recipesage/util/server/general";
import { prisma } from "@recipesage/prisma";
import { TRPCError } from "@trpc/server";
import {
  MealPlanAccessLevel,
  getAccessToMealPlan,
} from "@recipesage/util/server/db";
import { deleteMealPlanItemsInput } from "@recipesage/util/shared";
import { z } from "zod";

export const deleteMealPlanItems = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/mealPlans/deleteMealPlanItems",
      tags: ["mealPlans"],
      summary: "Delete multiple meal plan items",
      protect: true,
    },
  })
  .input(deleteMealPlanItemsInput)
  .output(
    z.object({
      reference: z.uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const access = await getAccessToMealPlan(
      ctx.session.userId,
      input.mealPlanId,
    );

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
        mealPlanId: input.mealPlanId,
      },
    });

    const reference = input.reference ?? crypto.randomUUID();
    for (const subscriberId of access.subscriberIds) {
      broadcastWSEventIgnoringErrors(
        subscriberId,
        WSBroadcastEventType.MealPlanUpdated,
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
