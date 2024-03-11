import { IS_FIREBASE_AVAILABLE } from "../general/isFirebaseAvailable";
import { ocrImageBuffer } from "./ocr";
import { TextToRecipeInputType, textToRecipe } from "./textToRecipe";

export const ocrImageToRecipe = async (imageBuffer: Buffer) => {
  if (!IS_FIREBASE_AVAILABLE) {
    throw new Error("Firebase configuration required for OCR");
  }

  const ocrResults = await ocrImageBuffer(imageBuffer);

  const stringifiedOCRResults = ocrResults.join("\n");

  console.log("OCR results", stringifiedOCRResults);

  const recognizedRecipe = await textToRecipe(
    stringifiedOCRResults,
    TextToRecipeInputType.OCR,
  );

  return recognizedRecipe;
};
