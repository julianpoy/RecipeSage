import { authenticatedProcedure } from "../../trpc";
import {
  WSBroadcastEventType,
  broadcastWSEventIgnoringErrors,
} from "@recipesage/util/server/general";
import { prisma } from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  ShoppingListAccessLevel,
  getAccessToShoppingList,
} from "@recipesage/util/server/db";

export const deleteShoppingList = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/shoppingLists/deleteShoppingList",
      tags: ["shoppingLists"],
      summary: "Delete a shopping list",
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
    const access = await getAccessToShoppingList(ctx.session.userId, input.id);

    if (access.level !== ShoppingListAccessLevel.Owner) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "Shopping list with that id does not exist or you do not own it",
      });
    }

    await prisma.shoppingList.delete({
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
          shoppingListId: input.id,
        },
      );
    }

    return {
      reference,
      id: input.id,
    };
  });
