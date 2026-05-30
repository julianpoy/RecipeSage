import { Content, Margins, TDocumentDefinitions } from "pdfmake/interfaces";
import { RecipeSummary } from "@recipesage/prisma";
import { setTimeout } from "node:timers/promises";
import { PassThrough } from "stream";
import {
  pdfmake,
  recipeToPDFMakeSchema,
  type RecipePDFStrings,
} from "./recipeSummariesToPDF";

export interface CookbookOptions {
  title: string;
  subtitle?: string;
  introduction?: string;
  author?: string;
  includeToc: boolean;
  includeImages: boolean;
  strings: RecipePDFStrings;
  introductionLabel: string;
  contentsLabel: string;
  byAuthorTemplate: string;
}

export const generateCookbookPDFStream = async (
  recipes: RecipeSummary[],
  options: CookbookOptions,
  onProgress?: (processedCount: number) => void,
): Promise<PassThrough> => {
  const content: Content[] = [];

  content.push({
    text: options.title,
    fontSize: 30,
    bold: true,
    alignment: "center",
    margin: [0, 180, 0, 0] satisfies Margins,
  });
  if (options.subtitle) {
    content.push({
      text: options.subtitle,
      fontSize: 16,
      alignment: "center",
      margin: [0, 14, 0, 0] satisfies Margins,
    });
  }
  if (options.author) {
    content.push({
      text: options.byAuthorTemplate.replace("{{author}}", options.author),
      fontSize: 12,
      italics: true,
      alignment: "center",
      margin: [0, 24, 0, 0] satisfies Margins,
    });
  }

  if (options.introduction) {
    content.push({
      text: options.introductionLabel,
      fontSize: 18,
      bold: true,
      pageBreak: "before",
      margin: [0, 0, 0, 8] satisfies Margins,
    });
    content.push({ text: options.introduction });
  }

  if (options.includeToc) {
    content.push({
      toc: {
        title: {
          text: options.contentsLabel,
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 8] satisfies Margins,
        },
      },
      pageBreak: "before",
    });
  }

  let processedCount = 0;
  for (const recipe of recipes) {
    content.push(
      await recipeToPDFMakeSchema(recipe, {
        strings: options.strings,
        includePrimaryImage: options.includeImages,
        renderInlineImages: options.includeImages,
        pageBreakBefore: true,
        tocItem: options.includeToc,
      }),
    );
    processedCount++;
    onProgress?.(processedCount);
    await setTimeout(0);
  }

  const docDefinition: TDocumentDefinitions = {
    content,
    defaultStyle: {
      font: "NotoSans",
      fontSize: 10,
      lineHeight: 1.2,
    },
  };

  const doc = pdfmake.createPdf(docDefinition);
  const stream = await doc.getStream();
  const passthrough = new PassThrough();
  stream.pipe(passthrough);
  stream.end();

  return passthrough;
};
