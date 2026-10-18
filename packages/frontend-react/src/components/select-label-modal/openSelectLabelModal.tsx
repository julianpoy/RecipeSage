import type { LabelSummary } from "@recipesage/prisma";
import { openDialog } from "../dialogs/openDialog";
import { SelectLabelModal } from "./SelectLabelModal";

export const openSelectLabelModal = () =>
  openDialog<LabelSummary>((controls) => (
    <SelectLabelModal controls={controls} />
  ));
