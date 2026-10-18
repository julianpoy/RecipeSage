import type { MealPlanItemSummary } from "@recipesage/prisma";
import { openDialog } from "../../../components/dialogs/openDialog";
import {
  MealPlanItemDetailsModal,
  type MealPlanItemDetailsModalResult,
} from "./MealPlanItemDetailsModal";

export const openMealPlanItemDetailsModal = (props: {
  mealPlanId: string;
  mealItem: MealPlanItemSummary;
  customMealOptions?: string | null;
}) =>
  openDialog<MealPlanItemDetailsModalResult>((controls) => (
    <MealPlanItemDetailsModal
      controls={controls}
      mealPlanId={props.mealPlanId}
      mealItem={props.mealItem}
      customMealOptions={props.customMealOptions}
    />
  ));
