import { openDialog } from "../../../components/dialogs/openDialog";
import {
  AddProfileItemModal,
  type AddProfileItemModalResult,
} from "./AddProfileItemModal";

export const openAddProfileItemModal = () =>
  openDialog<AddProfileItemModalResult>((controls) => (
    <AddProfileItemModal controls={controls} />
  ));
