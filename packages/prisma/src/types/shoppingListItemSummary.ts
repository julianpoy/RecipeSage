import { Prisma } from "@prisma/client";
import { userPublic } from "./userPublic";

/**
 * Provides fields necessary for displaying a summary about a shopping list item
 **/
export const shoppingListItemSummary =
  Prisma.validator<Prisma.ShoppingListItemFindFirstArgs>()({
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
  });

export type ShoppingListItemSummary = Prisma.ShoppingListItemGetPayload<typeof shoppingListItemSummary> & {
  groupTitle: string,
};

