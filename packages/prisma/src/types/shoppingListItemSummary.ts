import { Prisma } from "@prisma/client";
import { userPublic } from "./userPublic";

/**
 * Provides fields necessary for displaying a summary about a shopping list item
 **/
export const shoppingListItemSummary =
  Prisma.validator<Prisma.ShoppingListItemFindFirstArgs>()({
    select: {
      id: true,
      title: true,
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

/**
 * Provides fields necessary for displaying a summary about a shopping list item
 **/
export type ShoppingListItemSummary = Prisma.ShoppingListItemGetPayload<
  typeof shoppingListItemSummary
>;
