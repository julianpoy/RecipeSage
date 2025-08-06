import { router } from "../../trpc";

import { get } from "./get";
import { create } from "./create";
import { remove } from "./remove";
import { update } from "./update";

export const mealOptionsRouter = router({
  get,
  create,
  update,
  remove,
});
