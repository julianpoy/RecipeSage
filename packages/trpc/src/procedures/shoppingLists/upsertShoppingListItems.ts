import { authenticatedProcedure } from "../../trpc";
import {
  WSBroadcastEventType,
  broadcastWSEventIgnoringErrors,
  getShoppingListItemCategories,
} from "@recipesage/util/server/general";
import { prisma } from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  ShoppingListAccessLevel,
  getAccessToShoppingList,
} from "@recipesage/util/server/db";
import {
  SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT,
  UPSERT_SHOPPING_LIST_ITEMS_PAGINATION_LIMIT,
} from "@recipesage/util/shared";

export const upsertShoppingListItems = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/shoppingLists/upsertShoppingListItems",
      tags: ["shoppingLists"],
      summary:
        "Create or update multiple shopping list items via id-keyed upsert",
      protect: true,
    },
  })
  .input(
    z.object({
      shoppingListId: z.uuid(),
      items: z
        .array(
          z.object({
            id: z.uuid(),
            title: z
              .string()
              .min(1)
              .max(SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT),
            recipeId: z.uuid().nullable(),
            completed: z.boolean().optional(),
            categoryTitle: z.string().optional(),
            createdAt: z.coerce.date().optional(),
            updatedAt: z.coerce.date(),
          }),
        )
        .min(1)
        .max(UPSERT_SHOPPING_LIST_ITEMS_PAGINATION_LIMIT),
    }),
  )
  .output(
    z.object({
      reference: z.uuid(),
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

    const autoCategories = await getShoppingListItemCategories(
      input.items.map((el) => el.title),
    );
    const itemsWithCategoryTitles = input.items.map((item, idx) => ({
      ...item,
      completed: item.completed ?? false,
      categoryTitle: item.categoryTitle ?? `::${autoCategories[idx]}`,
    }));

    const existingItems = await prisma.shoppingListItem.findMany({
      where: {
        id: {
          in: input.items.map((el) => el.id),
        },
      },
      select: {
        id: true,
        shoppingListId: true,
        updatedAt: true,
      },
    });

    const existingItemsById = new Map(existingItems.map((el) => [el.id, el]));
    for (const item of itemsWithCategoryTitles) {
      const existingItem = existingItemsById.get(item.id);

      if (
        existingItem &&
        existingItem.shoppingListId !== input.shoppingListId
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "One of the items you've passed does not not belong to the shopping list id you're updating",
        });
      }
    }

    const itemsToWrite = itemsWithCategoryTitles.filter((item) => {
      const existingItem = existingItemsById.get(item.id);
      return !existingItem || existingItem.updatedAt <= item.updatedAt;
    });

    await prisma.$transaction(async (tx) => {
      for (const item of itemsToWrite) {
        const updatedAt = new Date(
          Math.min(Date.now(), item.updatedAt.getTime()),
        );
        const createdAt = new Date(
          Math.min(Date.now(), item.createdAt?.getTime() || Date.now()),
        );

        await tx.shoppingListItem.upsert({
          where: {
            id: item.id,
          },
          create: {
            id: item.id,
            shoppingListId: input.shoppingListId,
            title: item.title,
            userId: ctx.session.userId,
            recipeId: item.recipeId,
            completed: item.completed,
            categoryTitle: item.categoryTitle,
            createdAt,
            updatedAt,
          },
          update: {
            title: item.title,
            recipeId: item.recipeId,
            completed: item.completed,
            categoryTitle: item.categoryTitle,
            updatedAt,
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
