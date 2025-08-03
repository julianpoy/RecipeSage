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

export const updateMealPlanItems = publicProcedure
  .input(
    z.object({
      mealPlanId: z.string().uuid(),
      items: z
        .array(
          z.object({
            id: z.string().uuid(),
            title: z.string(),
            scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            meal: z.string(),
            recipeId: z.string().uuid().nullable(),
          }),
        )
        .min(1)
        .max(100), // These will be individual DB calls, so cap number of allowed items
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

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

    const access = await getAccessToMealPlan(session.userId, input.mealPlanId);

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
          },
        });
      }
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
