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

export const detachMealPlan = publicProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/mealPlans/detachMealPlan",
      tags: ["mealPlans"],
      summary: "Detach the caller as a collaborator from a meal plan",
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
    const session = ctx.session;
    validateTrpcSession(session);

    const access = await getAccessToMealPlan(session.userId, input.id);

    if (access.level !== MealPlanAccessLevel.Collaborator) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "Meal plan with that id does not exist or you are not a collaborator for it",
      });
    }

    await prisma.mealPlanCollaborator.delete({
      where: {
        mealPlanId_userId: {
          mealPlanId: input.id,
          userId: session.userId,
        },
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
