import { IS_FIREBASE_AVAILABLE } from "../general/isFirebaseAvailable";
import { ocrImageBuffer } from "./ocr";
import { TextToRecipeInputType, textToRecipe } from "./textToRecipe";
import { VisionToRecipeInputType, visionToRecipe } from "./visionToRecipe";

export const ocrImagesToRecipe = async (imageBuffers: Buffer[]) => {
  if (!IS_FIREBASE_AVAILABLE) {
    console.warn("Firebase not available, using GPT Vision");
    // Selfhosted environments do not have firebase available.
    // We fallback to using ChatGPT vision which is less capable at OCR than Google Cloud Vision.
    const recognizedRecipe = await visionToRecipe(
      imageBuffers.map((imageBuffer) => imageBuffer.toString("base64")),
      VisionToRecipeInputType.Photo,
    );
    return recognizedRecipe;
  }

  const ocrResults: string[] = [];
  for (const imageBuffer of imageBuffers) {
    ocrResults.push(...(await ocrImageBuffer(imageBuffer)));
  }
  const recipeText = ocrResults.join("\n");

  console.log("OCR results", recipeText);

  const recognizedRecipe = await textToRecipe(
    recipeText,
    TextToRecipeInputType.OCR,
  );

  return recognizedRecipe;
};
