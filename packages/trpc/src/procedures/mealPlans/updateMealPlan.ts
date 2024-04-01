import { publicProcedure } from "../../trpc";
import {
  WSBoardcastEventType,
  broadcastWSEvent,
  validateTrpcSession,
} from "@recipesage/util/server/general";
import { prisma } from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const updateMealPlan = publicProcedure
  .input(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
      collaboratorUserIds: z.array(z.string().uuid()),
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

    const mealPlan = await prisma.mealPlan.findUnique({
      where: {
        id: input.id,
        userId: session.userId,
      },
      select: {
        id: true,
        collaboratorUsers: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!mealPlan) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "Meal plan with that id does not exist or you do not have access",
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
    const subscriberIds = [
      ...new Set([
        updatedMealPlan.userId,
        // We need to notify both the old collaborators and the new collaborators of the update
        ...input.collaboratorUserIds,
        ...mealPlan.collaboratorUsers.map((el) => el.userId),
      ]),
    ];
    for (const subscriberId of subscriberIds) {
      broadcastWSEvent(subscriberId, WSBoardcastEventType.MealPlanUpdated, {
        reference,
        mealPlanId: updatedMealPlan.id,
      });
    }

    return {
      reference,
      id: updatedMealPlan.id,
    };
  });
