import { z } from "zod";
import { DELETE_MEAL_PLAN_ITEMS_PAGINATION_LIMIT } from "../apiConstants";

export const deleteMealPlanItemsInput = z.object({
  mealPlanId: z.uuid(),
  ids: z.array(z.uuid()).min(1).max(DELETE_MEAL_PLAN_ITEMS_PAGINATION_LIMIT),
  reference: z.uuid().optional(),
});
