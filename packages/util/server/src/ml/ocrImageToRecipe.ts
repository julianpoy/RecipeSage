import { ocrImageBuffer } from "./ocr";
import { InputType, textToRecipe } from "./textToRecipe";

export const ocrImageToRecipe = async (imageBuffer: Buffer) => {
  const ocrResults = await ocrImageBuffer(imageBuffer);

  const stringifiedOCRResults = ocrResults.join("\n");

  console.log("OCR results", stringifiedOCRResults);

  const recognizedRecipe = await textToRecipe(
    stringifiedOCRResults,
    InputType.OCR,
  );

  return recognizedRecipe;
};
