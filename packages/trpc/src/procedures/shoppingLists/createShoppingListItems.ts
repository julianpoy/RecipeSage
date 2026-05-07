import { publicProcedure } from "../../trpc";
import {
  WSBroadcastEventType,
  broadcastWSEventIgnoringErrors,
  getShoppingListItemCategories,
  validateTrpcSession,
} from "@recipesage/util/server/general";
import { prisma } from "@recipesage/prisma";
import { TRPCError } from "@trpc/server";
import {
  ShoppingListAccessLevel,
  getAccessToShoppingList,
} from "@recipesage/util/server/db";
import { createShoppingListItemsInput } from "@recipesage/util/shared";
import { z } from "zod";

export const createShoppingListItems = publicProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/shoppingLists/createShoppingListItems",
      tags: ["shoppingLists"],
      summary: "Create multiple shopping list items",
      protect: true,
    },
  })
  .input(createShoppingListItemsInput)
  .output(
    z.object({
      reference: z.uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

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

    const autoCategories = await getShoppingListItemCategories(
      input.items.map((el) => el.title),
    );
    const itemsWithCategoryTitles = input.items.map((item, idx) => ({
      ...item,
      completed: item.completed ?? false,
      categoryTitle: item.categoryTitle ?? `::${autoCategories[idx]}`,
      userId: session.userId,
      shoppingListId: input.shoppingListId,
    }));

    await prisma.shoppingListItem.createMany({
      data: itemsWithCategoryTitles,
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
