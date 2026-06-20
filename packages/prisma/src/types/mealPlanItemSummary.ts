import type { Prisma } from "../prisma/generated/client";
import { z } from "zod";
import { userPublic, userPublicSchema } from "./userPublic";

/**
 * Provides fields necessary for displaying a summary about a meal plan item
 **/
export const mealPlanItemSummary = {
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
          orderBy: {
            order: "asc",
          },
        },
      },
    },
  },
} satisfies Prisma.MealPlanItemFindFirstArgs;

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

export const mealPlanItemSummarySchema = z.object({
  id: z.uuid(),
  mealPlanId: z.uuid(),
  title: z.string(),
  notes: z.string(),
  scheduled: z.date().nullable(),
  scheduledDate: z.string(),
  meal: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  user: userPublicSchema,
  shoppingListItems: z.array(
    z.object({
      id: z.uuid(),
      title: z.string(),
      shoppingListId: z.uuid(),
      shoppingList: z.object({
        id: z.uuid(),
        title: z.string(),
      }),
    }),
  ),
  recipeId: z.uuid().nullable(),
  recipe: z
    .object({
      id: z.uuid(),
      title: z.string(),
      ingredients: z.string(),
      recipeImages: z.array(
        z.object({
          image: z.object({
            id: z.uuid(),
            location: z.string(),
          }),
        }),
      ),
    })
    .nullable(),
});

const _checkSchemaSatisfiesType = {} as z.infer<
  typeof mealPlanItemSummarySchema
> satisfies MealPlanItemSummary;
const _checkTypeSatisfiesSchema = {} as MealPlanItemSummary satisfies z.infer<
  typeof mealPlanItemSummarySchema
>;
