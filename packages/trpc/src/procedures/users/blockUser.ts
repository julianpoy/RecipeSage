import { prisma, type Prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  WSBroadcastEventType,
  broadcastWSEventIgnoringErrors,
} from "@recipesage/util/server/general";

export const blockUser = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/users/blockUser",
      tags: ["users"],
      summary:
        "Block another user, removing friendships and shared collaborations between the caller and that user",
      protect: true,
    },
  })
  .input(
    z.object({
      userId: z.uuid(),
    }),
  )
  .output(z.string())
  .mutation(async ({ input, ctx }): Promise<string> => {
    if (input.userId === ctx.session.userId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You can't block yourself",
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: {
        id: input.userId,
      },
      select: {
        id: true,
      },
    });
    if (!targetUser) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No user found with that id",
      });
    }

    const shoppingListCollaboratorWhere = {
      OR: [
        {
          userId: input.userId,
          shoppingList: {
            userId: ctx.session.userId,
          },
        },
        {
          userId: ctx.session.userId,
          shoppingList: {
            userId: input.userId,
          },
        },
      ],
    } satisfies Prisma.ShoppingListCollaboratorWhereInput;

    const mealPlanCollaboratorWhere = {
      OR: [
        {
          userId: input.userId,
          mealPlan: {
            userId: ctx.session.userId,
          },
        },
        {
          userId: ctx.session.userId,
          mealPlan: {
            userId: input.userId,
          },
        },
      ],
    } satisfies Prisma.MealPlanCollaboratorWhereInput;

    const { shoppingListCollaborators, mealPlanCollaborators } =
      await prisma.$transaction(async (tx) => {
        await tx.userBlock.upsert({
          where: {
            blockerUserId_blockedUserId: {
              blockerUserId: ctx.session.userId,
              blockedUserId: input.userId,
            },
          },
          create: {
            blockerUserId: ctx.session.userId,
            blockedUserId: input.userId,
          },
          update: {},
        });

        await tx.friendship.deleteMany({
          where: {
            OR: [
              {
                userId: ctx.session.userId,
                friendId: input.userId,
              },
              {
                userId: input.userId,
                friendId: ctx.session.userId,
              },
            ],
          },
        });

        const shoppingListCollaborators =
          await tx.shoppingListCollaborator.findMany({
            where: shoppingListCollaboratorWhere,
            select: {
              shoppingListId: true,
              shoppingList: {
                select: {
                  userId: true,
                  collaboratorUsers: {
                    select: {
                      userId: true,
                    },
                  },
                },
              },
            },
          });
        await tx.shoppingListCollaborator.deleteMany({
          where: shoppingListCollaboratorWhere,
        });

        const mealPlanCollaborators = await tx.mealPlanCollaborator.findMany({
          where: mealPlanCollaboratorWhere,
          select: {
            mealPlanId: true,
            mealPlan: {
              select: {
                userId: true,
                collaboratorUsers: {
                  select: {
                    userId: true,
                  },
                },
              },
            },
          },
        });
        await tx.mealPlanCollaborator.deleteMany({
          where: mealPlanCollaboratorWhere,
        });

        return {
          shoppingListCollaborators,
          mealPlanCollaborators,
        };
      });

    const reference = crypto.randomUUID();
    for (const { shoppingListId, shoppingList } of shoppingListCollaborators) {
      const subscriberIds = [
        shoppingList.userId,
        ...shoppingList.collaboratorUsers.map(
          (collaboratorUser) => collaboratorUser.userId,
        ),
      ];
      for (const subscriberId of subscriberIds) {
        broadcastWSEventIgnoringErrors(
          subscriberId,
          WSBroadcastEventType.ShoppingListUpdated,
          {
            reference,
            shoppingListId,
          },
        );
      }
    }
    for (const { mealPlanId, mealPlan } of mealPlanCollaborators) {
      const subscriberIds = [
        mealPlan.userId,
        ...mealPlan.collaboratorUsers.map(
          (collaboratorUser) => collaboratorUser.userId,
        ),
      ];
      for (const subscriberId of subscriberIds) {
        broadcastWSEventIgnoringErrors(
          subscriberId,
          WSBroadcastEventType.MealPlanUpdated,
          {
            reference,
            mealPlanId,
          },
        );
      }
    }

    return "Blocked";
  });
