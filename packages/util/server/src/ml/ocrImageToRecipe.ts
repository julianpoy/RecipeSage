import { IS_FIREBASE_AVAILABLE } from "../general/isFirebaseAvailable";
import { ocrImageBuffer } from "./ocr";
import { TextToRecipeInputType, textToRecipe } from "./textToRecipe";
import { VisionToTextInputType, visionToText } from "./visionToText";

export const ocrImageToRecipe = async (imageBuffer: Buffer) => {
  let recipeText;
  if (IS_FIREBASE_AVAILABLE) {
    const ocrResults = await ocrImageBuffer(imageBuffer);
    recipeText = ocrResults.join("\n");
  } else {
    // Selfhosted environments may not have firebase available. We fallback to GPT4 vision.
    recipeText = await visionToText(
      imageBuffer.toString("base64"),
      VisionToTextInputType.Photo,
    );
  }

  console.log("OCR results", recipeText);

  const recognizedRecipe = await textToRecipe(
    recipeText,
    TextToRecipeInputType.OCR,
  );

  return recognizedRecipe;
};
