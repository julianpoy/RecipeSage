const PDFJSPromise = import("pdfjs-dist");
import { PDFDocumentProxy } from "pdfjs-dist";
import type {
  DocumentInitParameters,
  TypedArray,
} from "pdfjs-dist/types/src/display/api";
import * as Canvas from "canvas";

const getPageImage = async (pdf: PDFDocumentProxy, pageNum: number) => {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({
    scale: 2,
    rotation: 0,
    dontFlip: false,
  });
  console.log(viewport.width, viewport.height);
  const canvas = Canvas.createCanvas(
    viewport.width || 1024,
    viewport.height || 1024,
  );
  const context = canvas.getContext("2d");

  await page.render({
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport: viewport,
  }).promise;

  const image = canvas.toBuffer("image/jpeg");

  return image;
};

export const getImagesFromPDF = async (
  source: string | URL | TypedArray | ArrayBuffer | DocumentInitParameters,
  maxPages?: number,
): Promise<Buffer[]> => {
  const PDFJS = await PDFJSPromise;
  const pdf: PDFDocumentProxy = await PDFJS.getDocument(source).promise;
  maxPages ||= pdf.numPages;
  const pageImagePromises = [];
  for (let pageNum = 1; pageNum <= maxPages; pageNum += 1) {
    pageImagePromises.push(getPageImage(pdf, pageNum));
  }
  const pageImages = await Promise.all(pageImagePromises);

  return pageImages;
};
