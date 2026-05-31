import { authenticatedProcedure } from "../../trpc";
import {
  WSBroadcastEventType,
  broadcastWSEventIgnoringErrors,
  getShoppingListItemCategories,
} from "@recipesage/util/server/general";
import { prisma } from "@recipesage/prisma";
import { TRPCError } from "@trpc/server";
import {
  ShoppingListAccessLevel,
  getAccessToShoppingList,
} from "@recipesage/util/server/db";
import { createShoppingListItemInput } from "@recipesage/util/shared";
import { z } from "zod";

/** @deprecated Use createShoppingListItems instead */
export const createShoppingListItem = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/shoppingLists/createShoppingListItem",
      tags: ["shoppingLists"],
      summary: "Create a single shopping list item (deprecated)",
      protect: true,
    },
  })
  .input(createShoppingListItemInput)
  .output(
    z.object({
      reference: z.uuid(),
      id: z.uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
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

    const categoryTitle = input.categoryTitle
      ? input.categoryTitle
      : `::${await getShoppingListItemCategories([input.title])}`;

    const createdShoppingListItem = await prisma.shoppingListItem.create({
      data: {
        shoppingListId: input.shoppingListId,
        title: input.title,
        userId: ctx.session.userId,
        recipeId: input.recipeId,
        completed: input.completed ?? false,
        categoryTitle,
      },
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
      id: createdShoppingListItem.id,
    };
  });
