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
  ShoppingListAccessLevel,
  getAccessToShoppingList,
} from "@recipesage/util/server/db";

/** @deprecated Use deleteShoppingListItems instead */
export const deleteShoppingListItem = publicProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/shoppingLists/deleteShoppingListItem",
      tags: ["shoppingLists"],
      summary: "Delete a single shopping list item (deprecated)",
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

    const shoppingListItem = await prisma.shoppingListItem.findUnique({
      where: {
        id: input.id,
      },
      select: {
        shoppingListId: true,
      },
    });

    if (!shoppingListItem) {
      throw new TRPCError({
        code: "NOT_FOUND",
      });
    }

    const access = await getAccessToShoppingList(
      session.userId,
      shoppingListItem.shoppingListId,
    );

    if (access.level === ShoppingListAccessLevel.None) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "Shopping list with that id does not exist or you do not have access",
      });
    }

    const deletedShoppingListItem = await prisma.shoppingListItem.delete({
      where: {
        id: input.id,
      },
    });

    const reference = crypto.randomUUID();
    for (const subscriberId of access.subscriberIds) {
      broadcastWSEventIgnoringErrors(
        subscriberId,
        WSBroadcastEventType.ShoppingListUpdated,
        {
          reference,
          shoppingListId: shoppingListItem.shoppingListId,
        },
      );
    }

    return {
      reference,
      id: deletedShoppingListItem.id,
    };
  });
