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
import { updateMealPlanItemsInput } from "@recipesage/util/shared";
import { z } from "zod";

export const updateMealPlanItems = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/mealPlans/updateMealPlanItems",
      tags: ["mealPlans"],
      summary: "Update multiple meal plan items",
      protect: true,
    },
  })
  .input(updateMealPlanItemsInput)
  .output(
    z.object({
      reference: z.uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const mealPlanItems = await prisma.mealPlanItem.findMany({
      where: {
        id: {
          in: input.items.map((el) => el.id),
        },
        mealPlanId: input.mealPlanId,
      },
      select: {
        id: true,
      },
    });

    if (mealPlanItems.length !== input.items.length) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "One or more of the items you've passed do not exist, or do not belong to the meal plan id",
      });
    }

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

    await prisma.$transaction(async (tx) => {
      for (const item of input.items) {
        await tx.mealPlanItem.update({
          where: {
            id: item.id,
          },
          data: {
            title: item.title,
            scheduled: null, // Remove legacy scheduling
            scheduledDate: new Date(item.scheduledDate),
            meal: item.meal,
            recipeId: item.recipeId,
            notes: item.notes,
          },
        });
      }
    });

    const reference = crypto.randomUUID();
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
