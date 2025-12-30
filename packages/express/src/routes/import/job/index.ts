import express from "express";
import { textfilesHandler } from "./textfiles";
import { copymethatHandler } from "./copymethat";
import { cookmateHandler } from "./cookmate";
import { fdxzHandler } from "./fdxz";
import { jsonldHandler } from "./jsonld";
import { livingcookbookHandler } from "./livingcookbook";
import { paprikaHandler } from "./paprika";
import { pepperplateHandler } from "./pepperplate";
import { recipekeeperHandler } from "./recipekeeper";
import { urlsHandler } from "./urls";
import { csvHandler } from "./csv";
import { pdfsHandler } from "./pdfs";
import { imagesHandler } from "./images";
import { enexHandler } from "./enex";

const router = express.Router();

router.post("/cookmate", ...cookmateHandler);
router.post("/copymethat", ...copymethatHandler);
router.post("/fdxz", ...fdxzHandler);
router.post("/jsonld", ...jsonldHandler);
router.post("/livingcookbook", ...livingcookbookHandler);
router.post("/paprika", ...paprikaHandler);
router.post("/pepperplate", ...pepperplateHandler);
router.post("/recipekeeper", ...recipekeeperHandler);
router.post("/textfiles", ...textfilesHandler);
router.post("/enex", ...enexHandler);
router.post("/urls", ...urlsHandler);
router.post("/csv", ...csvHandler);
router.post("/pdfs", ...pdfsHandler);
router.post("/images", ...imagesHandler);

export { router as importJobRouter };
