import { openDialog } from "../../components/dialogs/openDialog";
import {
  ScaleRecipe,
  type ScaleRecipeProps,
  type ScaleRecipeResult,
} from "./ScaleRecipe";

export const openScaleRecipe = (props: ScaleRecipeProps) =>
  openDialog<ScaleRecipeResult>((controls) => (
    <ScaleRecipe controls={controls} {...props} />
  ));
