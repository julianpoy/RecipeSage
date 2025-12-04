import { Prisma } from "@prisma/client";
import { userPublic } from "./userPublic";

/**
 * Provides fields necessary for displaying a summary about a shopping list,
 * not including items
 **/
export const shoppingListSummary =
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
      categoryOrder: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          items: true,
        },
      },
    },
  });

/**
 * Provides fields necessary for displaying a summary about a shopping list,
 * not including items
 **/
export type ShoppingListSummary = Prisma.ShoppingListGetPayload<
  typeof shoppingListSummary
>;
