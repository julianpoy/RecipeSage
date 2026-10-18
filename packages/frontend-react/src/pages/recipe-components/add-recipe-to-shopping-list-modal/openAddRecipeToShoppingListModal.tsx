import { openDialog } from "../../../components/dialogs/openDialog";
import type { UnitSystem } from "../../../modals/scale-recipe/ScaleRecipe";
import {
  AddRecipeToShoppingListModal,
  type AddRecipeToShoppingListRecipe,
} from "./AddRecipeToShoppingListModal";

export const openAddRecipeToShoppingListModal = (props: {
  recipes: AddRecipeToShoppingListRecipe[];
  scale?: string;
  unitSystem?: UnitSystem;
}) =>
  openDialog<void>((controls) => (
    <AddRecipeToShoppingListModal controls={controls} {...props} />
  ));
