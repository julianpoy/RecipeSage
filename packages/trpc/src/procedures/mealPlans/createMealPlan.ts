import { publicProcedure } from "../../trpc";
import {
  WSBoardcastEventType,
  broadcastWSEventIgnoringErrors,
  validateTrpcSession,
} from "@recipesage/util/server/general";
import { prisma } from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const createMealPlan = publicProcedure
  .input(
    z.object({
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

    const createdMealPlan = await prisma.mealPlan.create({
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
    const notifyUsers = [createdMealPlan.userId, ...input.collaboratorUserIds];
    for (const notifyUser of notifyUsers) {
      broadcastWSEventIgnoringErrors(
        notifyUser,
        WSBoardcastEventType.MealPlanUpdated,
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
