import { openDialog } from "../../../components/dialogs/openDialog";
import {
  AddRecipeToMealPlanModal,
  type AddRecipeToMealPlanRecipe,
} from "./AddRecipeToMealPlanModal";

export const openAddRecipeToMealPlanModal = (props: {
  recipe: AddRecipeToMealPlanRecipe;
}) =>
  openDialog<void>((controls) => (
    <AddRecipeToMealPlanModal controls={controls} recipe={props.recipe} />
  ));
