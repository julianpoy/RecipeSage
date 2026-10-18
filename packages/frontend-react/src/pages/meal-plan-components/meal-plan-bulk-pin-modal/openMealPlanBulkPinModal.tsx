import type { MealPlanItemSummary } from "@recipesage/prisma";
import { openDialog } from "../../../components/dialogs/openDialog";
import { MealPlanBulkPinModal } from "./MealPlanBulkPinModal";

export const openMealPlanBulkPinModal = (props: {
  mealItems: MealPlanItemSummary[];
}) =>
  openDialog<void>((controls) => (
    <MealPlanBulkPinModal controls={controls} mealItems={props.mealItems} />
  ));
