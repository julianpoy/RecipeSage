import { openDialog } from "../../../components/dialogs/openDialog";
import {
  NewMealPlanModal,
  type NewMealPlanModalResult,
} from "./NewMealPlanModal";

export const openNewMealPlanModal = () =>
  openDialog<NewMealPlanModalResult>((controls) => (
    <NewMealPlanModal controls={controls} />
  ));
