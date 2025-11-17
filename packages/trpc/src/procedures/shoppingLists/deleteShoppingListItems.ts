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

export const deleteShoppingListItems = publicProcedure
  .input(
    z.object({
      shoppingListId: z.uuid(),
      ids: z.array(z.uuid()).min(1),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const shoppingListItems = await prisma.shoppingListItem.findMany({
      where: {
        id: {
          in: input.ids,
        },
        shoppingListId: input.shoppingListId,
      },
      select: {
        shoppingListId: true,
      },
    });

    if (shoppingListItems.length !== input.ids.length) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "One or more of the items you've passed do not exist, or do not belong to the shopping list id",
      });
    }

    const access = await getAccessToShoppingList(
      session.userId,
      input.shoppingListId,
    );

    if (access.level === ShoppingListAccessLevel.None) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "Shopping list with that id does not exist or you do not have access",
      });
    }

    await prisma.shoppingListItem.deleteMany({
      where: {
        id: { in: input.ids },
      },
    });

    const reference = crypto.randomUUID();
    for (const subscriberId of access.subscriberIds) {
      broadcastWSEventIgnoringErrors(
        subscriberId,
        WSBoardcastEventType.ShoppingListUpdated,
        {
          reference,
          shoppingListId: input.shoppingListId,
        },
      );
    }

    return {
      reference,
    };
  });
