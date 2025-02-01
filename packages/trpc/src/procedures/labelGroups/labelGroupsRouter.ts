import { router } from "../../trpc";
import { createLabelGroup } from "./createLabelGroup";
import { deleteLabelGroup } from "./deleteLabelGroup";
import { getLabelGroups } from "./getLabelGroups";
import { updateLabelGroup } from "./updateLabelGroup";

export const labelGroupsRouter = router({
  createLabelGroup,
  getLabelGroups,
  updateLabelGroup,
  deleteLabelGroup,
});
