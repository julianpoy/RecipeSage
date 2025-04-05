import { extractTextFromPDF } from "../general/extractTextFromPDF";
import { pdfToImage } from "../general/pdfToImage";
import { ocrImagesToRecipe } from "./ocrImagesToRecipe";
import {
  OCR_MIN_VALID_TEXT,
  TextToRecipeInputType,
  textToRecipe,
} from "./textToRecipe";

export const pdfToRecipe = async (pdf: Buffer, maxPages = 1) => {
  const text = await extractTextFromPDF(pdf, maxPages);

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
    return ocrImagesToRecipe(images);
  }

  const recipe = await textToRecipe(text, TextToRecipeInputType.Document);

  return recipe;
};
