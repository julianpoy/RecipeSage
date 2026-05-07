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
import { createMealPlanItemInput } from "@recipesage/util/shared";
import { z } from "zod";

/** @deprecated Use createMealPlanItems instead */
export const createMealPlanItem = publicProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/mealPlans/createMealPlanItem",
      tags: ["mealPlans"],
      summary: "Create a single meal plan item (deprecated)",
      protect: true,
    },
  })
  .input(createMealPlanItemInput)
  .output(
    z.object({
      reference: z.uuid(),
      id: z.uuid(),
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

    const createdMealPlanItem = await prisma.mealPlanItem.create({
      data: {
        mealPlanId: input.mealPlanId,
        title: input.title,
        userId: session.userId,
        scheduledDate: new Date(input.scheduledDate),
        meal: input.meal,
        recipeId: input.recipeId,
        notes: input.notes ?? "",
      },
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
      id: createdMealPlanItem.id,
    };
  });
