import express from "express";
import { getRecipeFromOCRHandler } from "./getRecipeFromOCR";
import { getRecipeFromPDFHandler } from "./getRecipeFromPDF";
import { getRecipeFromDocumentHandler } from "./getRecipeFromDocument";

const router = express.Router();

router.use("/getRecipeFromOCR", getRecipeFromOCRHandler);
router.use("/getRecipeFromPDF", getRecipeFromPDFHandler);
router.use("/getRecipeFromDocument", getRecipeFromDocumentHandler);

export { router as mlRouter };
