import { publicProcedure } from "../../trpc";
import {
  WSBroadcastEventType,
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
import {
  MEAL_PLAN_ITEMS_MEAL_LENGTH_LIMIT,
  MEAL_PLAN_ITEMS_NOTES_LENGTH_LIMIT,
  MEAL_PLAN_ITEMS_TITLE_LENGTH_LIMIT,
} from "@recipesage/util/shared";

/** @deprecated Use updateMealPlanItems instead */
export const updateMealPlanItem = publicProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/mealPlans/updateMealPlanItem",
      tags: ["mealPlans"],
      summary: "Update a single meal plan item (deprecated)",
      protect: true,
    },
  })
  .input(
    z.object({
      id: z.uuid(),
      title: z.string().min(1).max(MEAL_PLAN_ITEMS_TITLE_LENGTH_LIMIT),
      scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      meal: z.string().min(1).max(MEAL_PLAN_ITEMS_MEAL_LENGTH_LIMIT),
      recipeId: z.uuid().nullable(),
      notes: z.string().max(MEAL_PLAN_ITEMS_NOTES_LENGTH_LIMIT).optional(),
    }),
  )
  .output(
    z.object({
      reference: z.uuid(),
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

    const updatedMealPlanItem = await prisma.mealPlanItem.update({
      where: {
        id: input.id,
      },
      data: {
        title: input.title,
        scheduled: null, // Remove legacy scheduling
        scheduledDate: new Date(input.scheduledDate),
        meal: input.meal,
        recipeId: input.recipeId,
        notes: input.notes,
      },
    });

    const reference = crypto.randomUUID();
    for (const subscriberId of access.subscriberIds) {
      broadcastWSEventIgnoringErrors(
        subscriberId,
        WSBroadcastEventType.MealPlanUpdated,
        {
          reference,
          mealPlanId: mealPlanItem.mealPlanId,
        },
      );
    }

    return {
      reference,
      id: updatedMealPlanItem.id,
    };
  });
