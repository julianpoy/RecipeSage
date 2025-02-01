import { router } from "../../trpc";
import { createLabel } from "./createLabel";
import { deleteLabel } from "./deleteLabel";
import { getAllVisibleLabels } from "./getAllVisibleLabels";
import { getLabels } from "./getLabels";
import { getLabelsByUserId } from "./getLabelsByUserId";
import { updateLabel } from "./updateLabel";
import { upsertLabel } from "./upsertLabel";

export const labelsRouter = router({
  createLabel,
  getAllVisibleLabels,
  getLabels,
  getLabelsByUserId,
  updateLabel,
  deleteLabel,
  upsertLabel,
});
