import { publicProcedure } from "../../trpc";
import {
  WSBroadcastEventType,
  broadcastWSEventIgnoringErrors,
  validateTrpcSession,
} from "@recipesage/util/server/general";
import { prisma } from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { SHOPPING_LIST_TITLE_LENGTH_LIMIT } from "@recipesage/util/shared";

export const createShoppingList = publicProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/shoppingLists/createShoppingList",
      tags: ["shoppingLists"],
      summary: "Create a shopping list",
      protect: true,
    },
  })
  .input(
    z.object({
      title: z.string().min(1).max(SHOPPING_LIST_TITLE_LENGTH_LIMIT),
      collaboratorUserIds: z.array(z.uuid()),
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

    const createdShoppingList = await prisma.shoppingList.create({
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
    const notifyUsers = [
      createdShoppingList.userId,
      ...input.collaboratorUserIds,
    ];
    for (const notifyUser of notifyUsers) {
      broadcastWSEventIgnoringErrors(
        notifyUser,
        WSBroadcastEventType.ShoppingListUpdated,
        {
          reference,
          shoppingListId: createdShoppingList.id,
        },
      );
    }

    return {
      reference,
      id: createdShoppingList.id,
    };
  });
