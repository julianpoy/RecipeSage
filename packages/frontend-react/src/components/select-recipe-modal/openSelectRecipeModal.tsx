import type { RecipeSummary } from "@recipesage/prisma";
import { openDialog } from "../dialogs/openDialog";
import { SelectRecipeModal } from "./SelectRecipeModal";

export const openSelectRecipeModal = () =>
  openDialog<RecipeSummary>((controls) => (
    <SelectRecipeModal controls={controls} />
  ));
