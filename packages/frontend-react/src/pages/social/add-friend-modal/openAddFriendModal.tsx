import { openDialog } from "../../../components/dialogs/openDialog";
import { AddFriendModal } from "./AddFriendModal";

export const openAddFriendModal = () =>
  openDialog<void>((controls) => <AddFriendModal controls={controls} />);
