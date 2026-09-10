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
        title: true,
        categoryTitle: true,
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

    const existingItemsById = new Map(
      shoppingListItems.map((item) => [item.id, item]),
    );

    const itemsToRecategorize: { id: string; title: string }[] = [];
    for (const item of input.items) {
      if (item.title === undefined) continue;
      if (item.categoryTitle !== undefined) continue;

      const existingItem = existingItemsById.get(item.id);
      if (!existingItem) continue;
      if (existingItem.title === item.title) continue;
      if (
        existingItem.categoryTitle &&
        !existingItem.categoryTitle.startsWith("::")
      ) {
        continue;
      }

      itemsToRecategorize.push({ id: item.id, title: item.title });
    }

    const autoCategories = itemsToRecategorize.length
      ? await getShoppingListItemCategories(
          itemsToRecategorize.map((item) => item.title),
        )
      : [];
    const autoCategoryTitleByItemId = new Map(
      itemsToRecategorize.map((item, idx) => [
        item.id,
        `::${autoCategories[idx]}`,
      ]),
    );

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
            categoryTitle:
              item.categoryTitle ?? autoCategoryTitleByItemId.get(item.id),
          },
        });
      }
    });

    const reference = input.reference ?? crypto.randomUUID();
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
