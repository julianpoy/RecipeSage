import { openDialog } from "../../../components/dialogs/openDialog";
import {
  NewShoppingListModal,
  type NewShoppingListModalResult,
} from "./NewShoppingListModal";

export const openNewShoppingListModal = (props?: {
  openAfterCreate?: boolean;
}) =>
  openDialog<NewShoppingListModalResult>((controls) => (
    <NewShoppingListModal
      controls={controls}
      openAfterCreate={props?.openAfterCreate}
    />
  ));
