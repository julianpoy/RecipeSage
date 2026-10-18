import { openDialog } from "../../components/dialogs/openDialog";
import { ModalDialog } from "../../components/dialogs/ModalDialog";
import { AuthView } from "./AuthView";

export const openAuthDialog = () =>
  openDialog<void>((controls) => (
    <ModalDialog controls={controls} dismissible={false}>
      <AuthView
        startWithRegister={false}
        modal={{ close: () => controls.close() }}
      />
    </ModalDialog>
  ));
