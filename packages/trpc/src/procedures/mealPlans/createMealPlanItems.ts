import { publicProcedure } from "../../trpc";
import {
  WSBroadcastEventType,
  broadcastWSEventIgnoringErrors,
  validateTrpcSession,
} from "@recipesage/util/server/general";
import { prisma } from "@recipesage/prisma";
import { TRPCError } from "@trpc/server";
import {
  MealPlanAccessLevel,
  getAccessToMealPlan,
} from "@recipesage/util/server/db";
import { createMealPlanItemsInput } from "@recipesage/util/shared";
import { z } from "zod";

export const createMealPlanItems = publicProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/mealPlans/createMealPlanItems",
      tags: ["mealPlans"],
      summary: "Create multiple meal plan items",
      protect: true,
    },
  })
  .input(createMealPlanItemsInput)
  .output(
    z.object({
      reference: z.uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const access = await getAccessToMealPlan(session.userId, input.mealPlanId);

    if (access.level === MealPlanAccessLevel.None) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "Meal plan with that id does not exist or you do not have access",
      });
    }

    await prisma.mealPlanItem.createMany({
      data: input.items.map((el) => ({
        mealPlanId: input.mealPlanId,
        title: el.title,
        userId: session.userId,
        scheduledDate: new Date(el.scheduledDate),
        meal: el.meal,
        recipeId: el.recipeId,
        notes: el.notes ?? "",
      })),
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
