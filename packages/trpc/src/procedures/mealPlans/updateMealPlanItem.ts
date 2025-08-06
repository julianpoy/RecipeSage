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

export const updateMealPlanItem = publicProcedure
  .input(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
      scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      meal: z.string().min(5).max(5).regex(
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        "Invalid time format. Expected HH:MM (e.g., 09:30 or 23:59)"
      ),
      recipeId: z.string().uuid().nullable(),
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
      id: updatedMealPlanItem.id,
    };
  });
