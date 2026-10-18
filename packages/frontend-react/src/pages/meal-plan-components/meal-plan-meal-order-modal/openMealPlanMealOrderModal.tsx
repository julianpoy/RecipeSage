import { openDialog } from "../../../components/dialogs/openDialog";
import {
  MealPlanMealOrderModal,
  type MealPlanMealOrderModalResult,
} from "./MealPlanMealOrderModal";

export const openMealPlanMealOrderModal = (props: {
  customMealOptions?: string;
}) =>
  openDialog<MealPlanMealOrderModalResult>((controls) => (
    <MealPlanMealOrderModal
      controls={controls}
      customMealOptions={props.customMealOptions}
    />
  ));
