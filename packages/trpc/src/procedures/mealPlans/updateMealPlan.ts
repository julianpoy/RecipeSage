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
import {
  MEAL_PLAN_CUSTOM_MEAL_OPTIONS_LENGTH_LIMIT,
  MEAL_PLAN_TITLE_LENGTH_LIMIT,
} from "@recipesage/util/shared";

export const updateMealPlan = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/mealPlans/updateMealPlan",
      tags: ["mealPlans"],
      summary: "Update a meal plan",
      protect: true,
    },
  })
  .input(
    z.object({
      id: z.uuid(),
      title: z.string().min(1).max(MEAL_PLAN_TITLE_LENGTH_LIMIT).optional(),
      collaboratorUserIds: z.array(z.uuid()).optional(),
      customMealOptions: z
        .string()
        .max(MEAL_PLAN_CUSTOM_MEAL_OPTIONS_LENGTH_LIMIT)
        .nullable()
        .optional(),
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
        message: "Meal plan not found or you do not own it",
      });
    }

    if (input.collaboratorUserIds !== undefined) {
      const collaboratorUsers = await prisma.user.findMany({
        where: {
          id: {
            in: input.collaboratorUserIds,
          },
        },
        select: {
          id: true,
        },
      });

      if (collaboratorUsers.length < input.collaboratorUserIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "One or more of the collaborators you specified are not valid",
        });
      }

      await prisma.mealPlanCollaborator.deleteMany({
        where: {
          mealPlanId: input.id,
        },
      });

      const updatedMealPlan = await prisma.mealPlan.update({
        where: {
          id: input.id,
        },
        data: {
          title: input.title,
          customMealOptions: input.customMealOptions,
          userId: ctx.session.userId,
          collaboratorUsers: {
            createMany: {
              data: collaboratorUsers.map((collaboratorUser) => ({
                userId: collaboratorUser.id,
              })),
            },
          },
        },
      });

      const reference = crypto.randomUUID();
      const subscriberIds = [
        ...new Set([
          updatedMealPlan.userId,
          ...access.subscriberIds,
          ...input.collaboratorUserIds,
        ]),
      ];
      for (const subscriberId of subscriberIds) {
        broadcastWSEventIgnoringErrors(
          subscriberId,
          WSBroadcastEventType.MealPlanUpdated,
          {
            reference,
            mealPlanId: updatedMealPlan.id,
          },
        );
      }

      return {
        reference,
        id: updatedMealPlan.id,
      };
    }

    const updatedMealPlan = await prisma.mealPlan.update({
      where: {
        id: input.id,
      },
      data: {
        title: input.title,
        customMealOptions: input.customMealOptions,
        userId: ctx.session.userId,
      },
    });

    const reference = crypto.randomUUID();
    for (const subscriberId of access.subscriberIds) {
      broadcastWSEventIgnoringErrors(
        subscriberId,
        WSBroadcastEventType.MealPlanUpdated,
        {
          reference,
          mealPlanId: updatedMealPlan.id,
        },
      );
    }

    return {
      reference,
      id: updatedMealPlan.id,
    };
  });
