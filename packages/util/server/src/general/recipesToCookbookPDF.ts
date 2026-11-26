import { Content, Margins, TDocumentDefinitions } from "pdfmake/interfaces";
import { RecipeSummary } from "@recipesage/prisma";
import { setTimeout } from "node:timers/promises";
import { PassThrough } from "stream";
import { pdfmake, recipeToPDFMakeSchema } from "./recipeSummariesToPDF";
import { getCJKPDFFont } from "./getCJKPDFFont";
import { applyCJKPDFFont } from "./applyCJKPDFFont";

export interface CookbookOptions {
  title: string;
  subtitle?: string;
  introduction?: string;
  author?: string;
  includeToc: boolean;
  includePageNumbers: boolean;
  includeImages: boolean;
  includeLabels: boolean;
  includeLastMade: boolean;
  includeLinkedRecipes: boolean;
  includeRecipeSageUrl: boolean;
  language: string;
  introductionLabel: string;
  contentsLabel: string;
  byAuthorTemplate: string;
}

export const generateCookbookPDFStream = async (
  recipes: RecipeSummary[],
  options: CookbookOptions,
  onProgress?: (processedCount: number) => void,
): Promise<PassThrough> => {
  const pagesBeforeRecipes: Content[] = [];

  pagesBeforeRecipes.push({
    text: options.title,
    fontSize: 30,
    bold: true,
    alignment: "center",
    margin: [0, 180, 0, 0] satisfies Margins,
  });
  if (options.subtitle) {
    pagesBeforeRecipes.push({
      text: options.subtitle,
      fontSize: 16,
      alignment: "center",
      margin: [0, 14, 0, 0] satisfies Margins,
    });
  }
  if (options.author) {
    pagesBeforeRecipes.push({
      text: options.byAuthorTemplate.replace("{{author}}", options.author),
      fontSize: 12,
      italics: true,
      alignment: "center",
      margin: [0, 24, 0, 0] satisfies Margins,
    });
  }

  if (options.introduction) {
    pagesBeforeRecipes.push({
      text: options.introductionLabel,
      fontSize: 18,
      bold: true,
      pageBreak: "before",
      margin: [0, 0, 0, 8] satisfies Margins,
    });
    pagesBeforeRecipes.push({ text: options.introduction });
  }

  if (options.includeToc) {
    pagesBeforeRecipes.push({
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

  const pagesBeforeRecipesCJKFont = getCJKPDFFont(
    [
      options.title,
      options.subtitle,
      options.introduction,
      options.author,
    ].join("\n"),
    options.language,
  );
  const content: Content[] = pagesBeforeRecipes.map((item) =>
    applyCJKPDFFont(item, pagesBeforeRecipesCJKFont),
  );

  let processedCount = 0;
  for (const recipe of recipes) {
    content.push(
      await recipeToPDFMakeSchema(recipe, {
        language: options.language,
        includePrimaryImage: options.includeImages,
        renderInlineImages: options.includeImages,
        includeLabels: options.includeLabels,
        includeLastMade: options.includeLastMade,
        includeLinkedRecipes: options.includeLinkedRecipes,
        includeRecipeSageUrl: options.includeRecipeSageUrl,
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
    footer: options.includePageNumbers
      ? (currentPage) =>
          currentPage === 1
            ? null
            : {
                text: String(currentPage),
                alignment: "center",
                fontSize: 9,
                margin: [0, 12, 0, 0] satisfies Margins,
              }
      : undefined,
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
