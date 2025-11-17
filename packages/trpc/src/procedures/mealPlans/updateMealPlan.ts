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

export const updateMealPlan = publicProcedure
  .input(
    z.object({
      id: z.uuid(),
      title: z.string().min(1).max(254),
      collaboratorUserIds: z.array(z.uuid()),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const access = await getAccessToMealPlan(session.userId, input.id);

    if (access.level !== MealPlanAccessLevel.Owner) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Meal plan not found or you do not own it",
      });
    }

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
        ...access.subscriberIds,
        ...input.collaboratorUserIds,
      ]),
    ];
    for (const subscriberId of subscriberIds) {
      broadcastWSEventIgnoringErrors(
        subscriberId,
        WSBoardcastEventType.MealPlanUpdated,
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
