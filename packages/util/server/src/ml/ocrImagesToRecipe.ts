import type { Readable } from "stream";
import {
  metrics,
  transformImageBuffer,
  transformImageFile,
  transformImageStreamToBuffer,
} from "../general";
import { IS_FIREBASE_AVAILABLE } from "../general/isFirebaseAvailable";
import { ocrImageBuffer } from "./ocr";
import { TextToRecipeInputType, textToRecipe } from "./textToRecipe";
import { VisionToRecipeInputType, visionToRecipe } from "./visionToRecipe";

const OCR_IMAGE_MAX_DIMENSION = 4000;
const OCR_IMAGE_QUALITY = 85;

export type OCRImageInput = Buffer | Readable | string;

const transformOCRImage = (image: OCRImageInput) => {
  if (typeof image === "string") {
    return transformImageFile(
      image,
      OCR_IMAGE_MAX_DIMENSION,
      OCR_IMAGE_MAX_DIMENSION,
      OCR_IMAGE_QUALITY,
      "inside",
    );
  }

  if (Buffer.isBuffer(image)) {
    return transformImageBuffer(
      image,
      OCR_IMAGE_MAX_DIMENSION,
      OCR_IMAGE_MAX_DIMENSION,
      OCR_IMAGE_QUALITY,
      "inside",
    );
  }

  return transformImageStreamToBuffer(
    image,
    OCR_IMAGE_MAX_DIMENSION,
    OCR_IMAGE_MAX_DIMENSION,
    OCR_IMAGE_QUALITY,
    "inside",
  );
};

export const ocrImagesToRecipe = async (images: OCRImageInput[]) => {
  metrics.convertImagesToRecipe.inc();

  if (!IS_FIREBASE_AVAILABLE || process.env.DISABLE_GCV === "true") {
    if (process.env.DISABLE_GCV !== "true") {
      // Selfhosted environments do not have firebase available.
      // We fallback to using ChatGPT vision which is less capable at OCR than Google Cloud Vision.
      console.warn("Firebase not available, using GPT Vision");
    }

    const transformedImagesAsBuffers: Buffer[] = [];
    for (const image of images) {
      transformedImagesAsBuffers.push(await transformOCRImage(image));
    }

    const recognizedRecipe = await visionToRecipe(
      transformedImagesAsBuffers,
      VisionToRecipeInputType.Photo,
    );

    return recognizedRecipe;
  }

  const ocrResults: string[] = [];
  for (const image of images) {
    const transformed = await transformOCRImage(image);
    ocrResults.push(...(await ocrImageBuffer(transformed)));
  }
  const recipeText = ocrResults.join("\n");

  const recognizedRecipe = await textToRecipe(
    recipeText,
    TextToRecipeInputType.OCR,
  );

  return recognizedRecipe;
};
