import { router } from "../../trpc";
import { createMealPlan } from "./createMealPlan";
import { createMealPlanItem } from "./createMealPlanItem";
import { createMealPlanItems } from "./createMealPlanItems";
import { deleteMealPlan } from "./deleteMealPlan";
import { deleteMealPlanItem } from "./deleteMealPlanItem";
import { deleteMealPlanItems } from "./deleteMealPlanItems";
import { detachMealPlan } from "./detachMealPlan";
import { getMealPlan } from "./getMealPlan";
import { getMealPlanItems } from "./getMealPlanItems";
import { getMealPlanItemsByDateRange } from "./getMealPlanItemsByDateRange";
import { getMealPlans } from "./getMealPlans";
import { getMealPlansWithItems } from "./getMealPlansWithItems";
import { updateMealPlan } from "./updateMealPlan";
import { updateMealPlanItem } from "./updateMealPlanItem";
import { updateMealPlanItems } from "./updateMealPlanItems";
import { upsertMealPlanItems } from "./upsertMealPlanItems";

export const mealPlansRouter = router({
  createMealPlan,
  createMealPlanItem,
  createMealPlanItems,
  deleteMealPlan,
  deleteMealPlanItem,
  deleteMealPlanItems,
  detachMealPlan,
  getMealPlan,
  getMealPlanItems,
  getMealPlanItemsByDateRange,
  getMealPlans,
  getMealPlansWithItems,
  updateMealPlan,
  updateMealPlanItem,
  updateMealPlanItems,
  upsertMealPlanItems,
});
