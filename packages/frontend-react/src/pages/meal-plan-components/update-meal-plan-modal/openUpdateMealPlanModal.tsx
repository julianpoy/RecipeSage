import { openDialog } from "../../../components/dialogs/openDialog";
import {
  UpdateMealPlanModal,
  type UpdateMealPlanModalMealPlan,
  type UpdateMealPlanModalResult,
} from "./UpdateMealPlanModal";

export const openUpdateMealPlanModal = (props: {
  mealPlan: UpdateMealPlanModalMealPlan;
}) =>
  openDialog<UpdateMealPlanModalResult>((controls) => (
    <UpdateMealPlanModal controls={controls} mealPlan={props.mealPlan} />
  ));
