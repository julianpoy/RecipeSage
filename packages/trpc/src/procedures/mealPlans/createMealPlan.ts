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
  MEAL_PLAN_CUSTOM_MEAL_OPTIONS_LENGTH_LIMIT,
  MEAL_PLAN_TITLE_LENGTH_LIMIT,
} from "@recipesage/util/shared";

export const createMealPlan = publicProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/mealPlans/createMealPlan",
      tags: ["mealPlans"],
      summary: "Create a meal plan",
      protect: true,
    },
  })
  .input(
    z.object({
      title: z.string().min(1).max(MEAL_PLAN_TITLE_LENGTH_LIMIT),
      collaboratorUserIds: z.array(z.uuid()),
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
    const session = ctx.session;
    validateTrpcSession(session);

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
        message: "One or more of the collaborators you specified are not valid",
      });
    }

    const createdMealPlan = await prisma.mealPlan.create({
      data: {
        title: input.title,
        customMealOptions: input.customMealOptions,
        userId: session.userId,
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
    const notifyUsers = [createdMealPlan.userId, ...input.collaboratorUserIds];
    for (const notifyUser of notifyUsers) {
      broadcastWSEventIgnoringErrors(
        notifyUser,
        WSBroadcastEventType.MealPlanUpdated,
        {
          reference,
          mealPlanId: createdMealPlan.id,
        },
      );
    }

    return {
      reference,
      id: createdMealPlan.id,
    };
  });
