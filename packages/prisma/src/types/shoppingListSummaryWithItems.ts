import type { Prisma } from "../prisma/generated/client";
import { z } from "zod";
import { userPublic } from "./userPublic";
import {
  ShoppingListItemSummary,
  shoppingListItemSummarySchema,
} from "./shoppingListItemSummary";
import { shoppingListSummarySchema } from "./shoppingListSummary";

/**
 * Provides fields necessary for displaying a summary about a shopping list
 **/
export const shoppingListSummaryWithItems = {
  select: {
    id: true,
    userId: true,
    user: userPublic,
    collaboratorUsers: {
      select: {
        user: userPublic,
      },
    },
    title: true,
    categoryOrder: true,
    createdAt: true,
    updatedAt: true,
    _count: {
      select: {
        items: true,
      },
    },
    items: {
      select: {
        id: true,
        shoppingListId: true,
        title: true,
        completed: true,
        categoryTitle: true,
        createdAt: true,
        updatedAt: true,
        user: userPublic,
        recipeId: true,
        recipe: {
          select: {
            id: true,
            title: true,
            ingredients: true,
            recipeImages: {
              select: {
                image: {
                  select: {
                    id: true,
                    location: true,
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ShoppingListFindFirstArgs;

/**
 * Provides fields necessary for displaying a summary about a shopping list, including items
 **/
export type ShoppingListSummaryWithItems = Omit<
  Prisma.ShoppingListGetPayload<typeof shoppingListSummaryWithItems>,
  "items"
> & {
  items: ShoppingListItemSummary[];
};

export const prismaShoppingListSummaryWithItemsToShoppingListItemSummaryWithItems =
  (
    _shoppingListSummary: Prisma.ShoppingListGetPayload<
      typeof shoppingListSummaryWithItems
    >,
    itemSummaries: ShoppingListItemSummary[],
  ): ShoppingListSummaryWithItems => {
    return {
      ..._shoppingListSummary,
      items: itemSummaries,
    };
  };

export const shoppingListSummaryWithItemsSchema =
  shoppingListSummarySchema.extend({
    items: z.array(shoppingListItemSummarySchema),
  });

const _checkSchemaSatisfiesType = {} as z.infer<
  typeof shoppingListSummaryWithItemsSchema
> satisfies ShoppingListSummaryWithItems;
const _checkTypeSatisfiesSchema =
  {} as ShoppingListSummaryWithItems satisfies z.infer<
    typeof shoppingListSummaryWithItemsSchema
  >;
