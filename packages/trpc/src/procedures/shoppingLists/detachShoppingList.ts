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

export const detachShoppingList = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/shoppingLists/detachShoppingList",
      tags: ["shoppingLists"],
      summary: "Detach the caller as a collaborator from a shopping list",
      protect: true,
    },
  })
  .input(
    z.object({
      id: z.uuid(),
      reference: z.uuid().optional(),
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

    if (access.level !== ShoppingListAccessLevel.Collaborator) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "Shopping list with that id does not exist or you are not a collaborator for it",
      });
    }

    await prisma.shoppingListCollaborator.delete({
      where: {
        shoppingListId_userId: {
          shoppingListId: input.id,
          userId: ctx.session.userId,
        },
      },
    });

    const reference = input.reference ?? crypto.randomUUID();
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
