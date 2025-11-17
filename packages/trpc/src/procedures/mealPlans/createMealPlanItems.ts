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

export const createMealPlanItems = publicProcedure
  .input(
    z.object({
      mealPlanId: z.uuid(),
      items: z
        .array(
          z.object({
            title: z.string().min(1).max(254),
            scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            meal: z.union([
              z.literal("breakfast"),
              z.literal("lunch"),
              z.literal("dinner"),
              z.literal("snacks"),
              z.literal("other"),
            ]),
            recipeId: z.uuid().nullable(),
          }),
        )
        .min(1),
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
      })),
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
