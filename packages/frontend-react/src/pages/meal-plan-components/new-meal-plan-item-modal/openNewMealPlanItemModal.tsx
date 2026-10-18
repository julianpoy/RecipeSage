import { openDialog } from "../../../components/dialogs/openDialog";
import {
  NewMealPlanItemModal,
  type NewMealPlanItemModalProps,
  type NewMealPlanItemModalResult,
} from "./NewMealPlanItemModal";

export const openNewMealPlanItemModal = (props: NewMealPlanItemModalProps) =>
  openDialog<NewMealPlanItemModalResult>((controls) => (
    <NewMealPlanItemModal controls={controls} {...props} />
  ));
