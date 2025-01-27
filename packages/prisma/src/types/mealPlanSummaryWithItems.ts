import { Prisma } from "@prisma/client";
import { userPublic } from "./userPublic";

/**
 * Provides fields necessary for displaying a summary about a meal plan
 **/
export const mealPlanSummaryWithItems =
  Prisma.validator<Prisma.MealPlanFindFirstArgs>()({
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
      },
    },
  });

type InternalMealPlanSummaryWithItems = Prisma.MealPlanGetPayload<
  typeof mealPlanSummaryWithItems
>;

/**
 * Provides fields necessary for displaying a summary about a meal plan item
 **/
export type MealPlanSummaryWithItems = Omit<
  InternalMealPlanSummaryWithItems,
  "items"
> & {
  items: (Omit<
    InternalMealPlanSummaryWithItems["items"][0],
    "scheduledDate"
  > & {
    scheduledDate: string;
  })[];
};
