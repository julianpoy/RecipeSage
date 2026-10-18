import type { LabelGroupSummary } from "@recipesage/prisma";
import { openDialog } from "../../../components/dialogs/openDialog";
import { NewLabelItemModal } from "./NewLabelItemModal";

export const openNewLabelItemModal = (
  props: { labelGroup?: LabelGroupSummary } = {},
) =>
  openDialog<void>((controls) => (
    <NewLabelItemModal controls={controls} labelGroup={props.labelGroup} />
  ));
