import type { LabelGroupSummary } from "@recipesage/prisma";
import { openDialog } from "../../../components/dialogs/openDialog";
import { ManageLabelGroupModal } from "./ManageLabelGroupModal";

export const openManageLabelGroupModal = (props: {
  labelGroup: LabelGroupSummary;
}) =>
  openDialog<void>((controls) => (
    <ManageLabelGroupModal controls={controls} labelGroup={props.labelGroup} />
  ));
