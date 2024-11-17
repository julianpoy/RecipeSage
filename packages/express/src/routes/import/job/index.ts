import * as express from "express";
import { textfilesHandler } from "./textfiles";
import { cookmateHandler } from "./cookmate";
import { fdxzHandler } from "./fdxz";
import { jsonldHandler } from "./jsonld";
import { livingcookbookHandler } from "./livingcookbook";
import { paprikaHandler } from "./paprika";
import { pepperplateHandler } from "./pepperplate";
import { recipekeeperHandler } from "./recipekeeper";

const router = express.Router();

router.post("/cookmate", ...cookmateHandler);
router.post("/fdxz", ...fdxzHandler);
router.post("/jsonld", ...jsonldHandler);
router.post("/livingcookbook", ...livingcookbookHandler);
router.post("/paprika", ...paprikaHandler);
router.post("/pepperplate", ...pepperplateHandler);
router.post("/recipekeeper", ...recipekeeperHandler);
router.post("/textfiles", ...textfilesHandler);

export { router as importJobRouter };
