import { authenticatedProcedure } from "../../trpc";
import {
  WSBroadcastEventType,
  broadcastWSEventIgnoringErrors,
} from "@recipesage/util/server/general";
import { prisma } from "@recipesage/prisma";
import { TRPCError } from "@trpc/server";
import {
  ShoppingListAccessLevel,
  getAccessToShoppingList,
} from "@recipesage/util/server/db";
import { updateShoppingListItemsInput } from "@recipesage/util/shared";
import { z } from "zod";

export const updateShoppingListItems = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/shoppingLists/updateShoppingListItems",
      tags: ["shoppingLists"],
      summary: "Update multiple shopping list items",
      protect: true,
    },
  })
  .input(updateShoppingListItemsInput)
  .output(
    z.object({
      reference: z.uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const shoppingListItems = await prisma.shoppingListItem.findMany({
      where: {
        id: {
          in: input.items.map((el) => el.id),
        },
        shoppingListId: input.shoppingListId,
      },
      select: {
        id: true,
      },
    });

    if (shoppingListItems.length !== input.items.length) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "One or more of the items you've passed do not exist, or do not belong to the shopping list id",
      });
    }

    const access = await getAccessToShoppingList(
      ctx.session.userId,
      input.shoppingListId,
    );

    if (access.level === ShoppingListAccessLevel.None) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "Shopping list with that id does not exist or you do not have access",
      });
    }

    await prisma.$transaction(async (tx) => {
      for (const item of input.items) {
        if (
          item.title === undefined &&
          item.recipeId === undefined &&
          item.completed === undefined &&
          item.categoryTitle === undefined
        ) {
          continue;
        }

        await tx.shoppingListItem.update({
          where: {
            id: item.id,
          },
          data: {
            title: item.title,
            recipeId: item.recipeId,
            completed: item.completed,
            categoryTitle: item.categoryTitle,
          },
        });
      }
    });

    const reference = crypto.randomUUID();
    for (const subscriberId of access.subscriberIds) {
      broadcastWSEventIgnoringErrors(
        subscriberId,
        WSBroadcastEventType.ShoppingListUpdated,
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
