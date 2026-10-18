import { openDialog } from "../../../components/dialogs/openDialog";
import { ICalMealPlanModal } from "./ICalMealPlanModal";

export const openICalMealPlanModal = (props: { mealPlanId: string }) =>
  openDialog<void>((controls) => (
    <ICalMealPlanModal controls={controls} mealPlanId={props.mealPlanId} />
  ));
