import { openDialog } from "../../../components/dialogs/openDialog";
import { ShoppingListCategoryOrderModal } from "./ShoppingListCategoryOrderModal";

export const openShoppingListCategoryOrderModal = (props: {
  shoppingListId: string;
  categoryOrder: string | undefined;
}) =>
  openDialog<void>((controls) => (
    <ShoppingListCategoryOrderModal
      controls={controls}
      shoppingListId={props.shoppingListId}
      categoryOrder={props.categoryOrder}
    />
  ));
