import { openDialog } from "../../../components/dialogs/openDialog";
import {
  UpdateShoppingListModal,
  type UpdateShoppingListModalResult,
  type UpdateShoppingListModalShoppingList,
} from "./UpdateShoppingListModal";

export const openUpdateShoppingListModal = (props: {
  shoppingList: UpdateShoppingListModalShoppingList;
}) =>
  openDialog<UpdateShoppingListModalResult>((controls) => (
    <UpdateShoppingListModal
      controls={controls}
      shoppingList={props.shoppingList}
    />
  ));
