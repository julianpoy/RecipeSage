import { openDialog } from "../../../components/dialogs/openDialog";
import { ShoppingListIgnoreModal } from "./ShoppingListIgnoreModal";

export const openShoppingListIgnoreModal = () =>
  openDialog<void>((controls) => (
    <ShoppingListIgnoreModal controls={controls} />
  ));
