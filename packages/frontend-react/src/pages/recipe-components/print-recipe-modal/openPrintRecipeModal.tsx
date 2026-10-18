import { openDialog } from "../../../components/dialogs/openDialog";
import type { UnitSystem } from "../../../modals/scale-recipe/ScaleRecipe";
import { PrintRecipeModal } from "./PrintRecipeModal";

export const openPrintRecipeModal = (props: {
  recipeId: string;
  scale: string;
  unitSystem?: UnitSystem;
}) =>
  openDialog<void>((controls) => (
    <PrintRecipeModal controls={controls} {...props} />
  ));
