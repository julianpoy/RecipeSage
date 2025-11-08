import { router } from "../../trpc";
import { createLabel } from "./createLabel";
import { deleteLabel } from "./deleteLabel";
import { deleteLabels } from "./deleteLabels";
import { getAllVisibleLabels } from "./getAllVisibleLabels";
import { getLabelByTitle } from "./getLabelByTitle";
import { getLabels } from "./getLabels";
import { getLabelsByUserId } from "./getLabelsByUserId";
import { mergeLabels } from "./mergeLabels";
import { updateLabel } from "./updateLabel";
import { upsertLabel } from "./upsertLabel";

export const labelsRouter = router({
  createLabel,
  deleteLabel,
  deleteLabels,
  getAllVisibleLabels,
  getLabelByTitle,
  getLabels,
  getLabelsByUserId,
  mergeLabels,
  updateLabel,
  upsertLabel,
});
