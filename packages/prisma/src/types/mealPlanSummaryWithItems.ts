import type { Prisma } from "../prisma/generated/client";
import { z } from "zod";
import { userPublic } from "./userPublic";
import { mealPlanSummarySchema } from "./mealPlanSummary";
import { mealPlanItemSummarySchema } from "./mealPlanItemSummary";

/**
 * Provides fields necessary for displaying a summary about a meal plan
 **/
export const mealPlanSummaryWithItems = {
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
    customMealOptions: true,
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
        mealPlanId: true,
        title: true,
        notes: true,
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
} satisfies Prisma.MealPlanFindFirstArgs;

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

export const mealPlanSummaryWithItemsSchema = mealPlanSummarySchema.extend({
  items: z.array(mealPlanItemSummarySchema),
});

const _checkSchemaSatisfiesType = {} as z.infer<
  typeof mealPlanSummaryWithItemsSchema
> satisfies MealPlanSummaryWithItems;
const _checkTypeSatisfiesSchema =
  {} as MealPlanSummaryWithItems satisfies z.infer<
    typeof mealPlanSummaryWithItemsSchema
  >;
