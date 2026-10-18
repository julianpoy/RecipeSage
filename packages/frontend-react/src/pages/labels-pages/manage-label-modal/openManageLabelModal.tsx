import type { LabelSummary } from "@recipesage/prisma";
import { openDialog } from "../../../components/dialogs/openDialog";
import { ManageLabelModal } from "./ManageLabelModal";

export const openManageLabelModal = (props: { label: LabelSummary }) =>
  openDialog<void>((controls) => (
    <ManageLabelModal controls={controls} label={props.label} />
  ));
