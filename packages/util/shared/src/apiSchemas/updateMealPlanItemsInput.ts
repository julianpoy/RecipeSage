import { z } from "zod";
import {
  MEAL_PLAN_ITEMS_MEAL_LENGTH_LIMIT,
  MEAL_PLAN_ITEMS_NOTES_LENGTH_LIMIT,
  MEAL_PLAN_ITEMS_TITLE_LENGTH_LIMIT,
  UPDATE_MEAL_PLAN_ITEMS_PAGINATION_LIMIT,
} from "../apiConstants";

export const updateMealPlanItemsInput = z.object({
  mealPlanId: z.uuid(),
  items: z
    .array(
      z.object({
        id: z.uuid(),
        title: z.string().min(1).max(MEAL_PLAN_ITEMS_TITLE_LENGTH_LIMIT),
        scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        meal: z.string().min(1).max(MEAL_PLAN_ITEMS_MEAL_LENGTH_LIMIT),
        recipeId: z.uuid().nullable(),
        notes: z.string().max(MEAL_PLAN_ITEMS_NOTES_LENGTH_LIMIT).optional(),
      }),
    )
    .min(1)
    .max(UPDATE_MEAL_PLAN_ITEMS_PAGINATION_LIMIT),
  reference: z.uuid().optional(),
});
