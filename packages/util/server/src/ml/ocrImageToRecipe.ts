import { IS_FIREBASE_AVAILABLE } from "../general/isFirebaseAvailable";
import { ocrImageBuffer } from "./ocr";
import { TextToRecipeInputType, textToRecipe } from "./textToRecipe";
import { VisionToRecipeInputType, visionToRecipe } from "./visionToRecipe";

export const ocrImageToRecipe = async (imageBuffer: Buffer) => {
  if (!IS_FIREBASE_AVAILABLE) {
    // Selfhosted environments do not have firebase available.
    // We fallback to using ChatGPT vision which is less capable at OCR than Google Cloud Vision.
    const recognizedRecipe = await visionToRecipe(
      imageBuffer.toString("base64"),
      VisionToRecipeInputType.Photo,
    );
    return recognizedRecipe;
  }

  const ocrResults = await ocrImageBuffer(imageBuffer);
  const recipeText = ocrResults.join("\n");

  console.log("OCR results", recipeText);

  const recognizedRecipe = await textToRecipe(
    recipeText,
    TextToRecipeInputType.OCR,
  );

  return recognizedRecipe;
};
