import * as Sentry from "@sentry/node";
import { metrics } from "../general";
import { extractTextFromPDF } from "../general/extractTextFromPDF";
import { pdfToImage } from "../general/pdfToImage";
import { ocrImagesToRecipe } from "./ocrImagesToRecipe";
import { VisionToRecipeInputType } from "./visionToRecipe";
import {
  OCR_MIN_VALID_TEXT,
  TextToRecipeInputType,
  textToRecipe,
} from "./textToRecipe";

/**
 * Can take either a buffer or a file path
 */
export const pdfToRecipe = async (pdf: Buffer | string, maxPages = 5) => {
  metrics.convertPDFToRecipe.inc();

  const text = await extractTextFromPDF(pdf, maxPages).catch((e) => {
    Sentry.captureException(e);
    console.error(e);
    return "";
  });

  if (text.trim().length < OCR_MIN_VALID_TEXT) {
    const images = [];
    for (let page = 1; page <= maxPages; page++) {
      try {
        const result = await pdfToImage(pdf, page);
        if (result.length === 0) continue;
        images.push(result);
      } catch (_e) {
        // Do nothing
      }
    }
    return ocrImagesToRecipe(images, VisionToRecipeInputType.Document);
  }

  const recipe = await textToRecipe(text, TextToRecipeInputType.Document);

  return recipe;
};
