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
  ShoppingListAccessLevel,
  getAccessToShoppingList,
} from "@recipesage/util/server/db";

export const updateShoppingList = publicProcedure
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

    const access = await getAccessToShoppingList(session.userId, input.id);

    if (access.level !== ShoppingListAccessLevel.Owner) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Shopping list not found or you do not own it",
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

    await prisma.shoppingListCollaborator.deleteMany({
      where: {
        shoppingListId: input.id,
      },
    });

    const updatedShoppingList = await prisma.shoppingList.update({
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
        updatedShoppingList.userId,
        // We need to notify both the old collaborators and the new collaborators of the update
        ...access.subscriberIds,
        ...input.collaboratorUserIds,
      ]),
    ];
    for (const subscriberId of subscriberIds) {
      broadcastWSEventIgnoringErrors(
        subscriberId,
        WSBoardcastEventType.ShoppingListUpdated,
        {
          reference,
          shoppingListId: updatedShoppingList.id,
        },
      );
    }

    return {
      reference,
      id: updatedShoppingList.id,
    };
  });
