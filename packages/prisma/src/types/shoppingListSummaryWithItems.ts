import { Prisma } from "@prisma/client";
import { userPublic } from "./userPublic";
import { ShoppingListItemSummary } from "./shoppingListItemSummary";

/**
 * Provides fields necessary for displaying a summary about a shopping list
 **/
export const shoppingListSummaryWithItems =
  Prisma.validator<Prisma.ShoppingListFindFirstArgs>()({
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
  });

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
