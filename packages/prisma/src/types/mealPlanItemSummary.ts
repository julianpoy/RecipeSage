import { Prisma } from "@prisma/client";
import { userPublic } from "./userPublic";

/**
 * Provides fields necessary for displaying a summary about a meal plan item
 **/
export const mealPlanItemSummary =
  Prisma.validator<Prisma.MealPlanItemFindFirstArgs>()({
    select: {
      id: true,
      title: true,
      scheduled: true,
      scheduledDate: true,
      meal: true,
      createdAt: true,
      updatedAt: true,
      user: userPublic,
      shoppingListItems: {
        select: {
          id: true,
          title: true,
          shoppingListId: true,
          shoppingList: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
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

type InternalMealPlanItemSummary = Prisma.MealPlanItemGetPayload<
  typeof mealPlanItemSummary
>;

/**
 * Provides fields necessary for displaying a summary about a meal plan item
 **/
export type MealPlanItemSummary = Omit<
  InternalMealPlanItemSummary,
  "scheduledDate"
> & {
  scheduledDate: string;
};
