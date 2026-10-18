import { openDialog } from "../../../components/dialogs/openDialog";
import { NewMessageModal } from "./NewMessageModal";

export const openNewMessageModal = (props?: { initialRecipientId?: string }) =>
  openDialog<void>((controls) => (
    <NewMessageModal
      controls={controls}
      initialRecipientId={props?.initialRecipientId}
    />
  ));
