import { ImageAnnotatorClient } from "@google-cloud/vision";
import { join } from "path";

export const ocrImageBuffer = async (imageBuffer: Buffer) => {
  const imageAnnotationClient = new ImageAnnotatorClient({
    keyFile: join(__dirname, "../../../../../.credentials/firebase.json"),
  });

  const ocrResults =
    await imageAnnotationClient.documentTextDetection(imageBuffer);

  const text = ocrResults
    .map((el) => {
      return el.fullTextAnnotation?.text;
    })
    .filter((el): el is string => !!el);

  return text;
};
