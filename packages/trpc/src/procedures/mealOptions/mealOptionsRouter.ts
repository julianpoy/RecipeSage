import { router } from "../../trpc";

import { getMealOptions } from "./getMealOptions";
import { createMealOption } from "./createMealOption";
import { deleteMealOption } from "./deleteMealOption";

export const mealOptionsRouter = router({
  getMealOptions,
  createMealOption,
  deleteMealOption,
});
