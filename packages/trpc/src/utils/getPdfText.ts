import PDFJS, { PDFDocumentProxy } from "pdfjs-dist";
import {
  DocumentInitParameters,
  TextItem,
  TypedArray,
} from "pdfjs-dist/types/src/display/api";

const getPageText = async (pdf: PDFDocumentProxy, pageNum: number) => {
  const page = await pdf.getPage(pageNum);
  const tokenizedText = await page.getTextContent();
  const pageText = tokenizedText.items
    .filter((token): token is TextItem => "str" in token)
    .map((token) => token.str)
    .join("");
  return pageText;
};

export const getPDFText = async (
  source: string | URL | TypedArray | ArrayBuffer | DocumentInitParameters,
  maxPages?: number,
): Promise<string> => {
  const pdf: PDFDocumentProxy = await PDFJS.getDocument(source).promise;
  maxPages ||= pdf.numPages;
  const pageTextPromises = [];
  for (let pageNum = 1; pageNum <= maxPages; pageNum += 1) {
    pageTextPromises.push(getPageText(pdf, pageNum));
  }
  const pageTexts = await Promise.all(pageTextPromises);
  return pageTexts.join(" ");
};
