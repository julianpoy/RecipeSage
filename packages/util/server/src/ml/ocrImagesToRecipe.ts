import type { Readable } from "stream";
import * as Sentry from "@sentry/node";
import {
  metrics,
  transformImageBuffer,
  transformImageFile,
  transformImageStreamToBuffer,
} from "../general";
import { StandardizedRecipeImportEntry } from "../db";
import { IS_FIREBASE_AVAILABLE } from "../general/isFirebaseAvailable";
import { ocrImageBuffer } from "./ocr";
import {
  OCR_MAX_VALID_TEXT,
  OCR_MIN_VALID_TEXT,
  TextToRecipeInputType,
  textToRecipe,
} from "./textToRecipe";
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

const hasRecipeContent = (
  entry: StandardizedRecipeImportEntry | undefined,
): entry is StandardizedRecipeImportEntry =>
  !!entry?.recipe.ingredients?.trim() || !!entry?.recipe.instructions?.trim();

export const ocrImagesToRecipe = async (
  images: OCRImageInput[],
  inputType = VisionToRecipeInputType.Photo,
) => {
  metrics.convertImagesToRecipe.inc();

  const transformedImagesAsBuffers: Buffer[] = [];
  for (const image of images) {
    transformedImagesAsBuffers.push(await transformOCRImage(image));
  }

  if (!IS_FIREBASE_AVAILABLE || process.env.DISABLE_GCV === "true") {
    if (process.env.DISABLE_GCV !== "true") {
      // Selfhosted environments do not have firebase available.
      // We fallback to using ChatGPT vision which is less capable at OCR than Google Cloud Vision.
      console.warn("Firebase not available, using GPT Vision");
    }

    const recognizedRecipe = await visionToRecipe(
      transformedImagesAsBuffers,
      inputType,
    );

    return hasRecipeContent(recognizedRecipe) ? recognizedRecipe : undefined;
  }

  const ocrResults: string[] = [];
  for (const transformed of transformedImagesAsBuffers) {
    ocrResults.push(...(await ocrImageBuffer(transformed)));
  }
  const recipeText = ocrResults.join("\n");

  if (recipeText.trim().length < OCR_MIN_VALID_TEXT) return;

  const visionRecipe = await visionToRecipe(
    transformedImagesAsBuffers,
    inputType,
    recipeText.substring(0, OCR_MAX_VALID_TEXT),
  ).catch((e) => {
    Sentry.captureException(e);
    console.error(e);
    return undefined;
  });

  const recognizedRecipe =
    visionRecipe ?? (await textToRecipe(recipeText, TextToRecipeInputType.OCR));

  return hasRecipeContent(recognizedRecipe) ? recognizedRecipe : undefined;
};
