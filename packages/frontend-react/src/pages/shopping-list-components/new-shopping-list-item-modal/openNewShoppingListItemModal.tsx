import { openDialog } from "../../../components/dialogs/openDialog";
import {
  NewShoppingListItemModal,
  type NewShoppingListItemModalResult,
} from "./NewShoppingListItemModal";

export const openNewShoppingListItemModal = () =>
  openDialog<NewShoppingListItemModalResult>((controls) => (
    <NewShoppingListItemModal controls={controls} />
  ));
