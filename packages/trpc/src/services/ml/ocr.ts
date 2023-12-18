import { ImageAnnotatorClient } from "@google-cloud/vision";
import { join } from "path";

export const ocr = async (imageB64: string) => {
  const imageAnnotationClient = new ImageAnnotatorClient({
    keyFile: join(__dirname, "../../../../../.credentials/firebase.json"),
  });

  const ocrResults = await imageAnnotationClient.documentTextDetection(
    Buffer.from(imageB64, "base64"),
  );

  const text = ocrResults
    .map((el) => {
      return el.fullTextAnnotation?.text;
    })
    .filter((el): el is string => !!el);

  return text;
};
