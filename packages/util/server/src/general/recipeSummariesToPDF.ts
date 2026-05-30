import _pdfmake from "pdfmake";
import {
  imageTokenRegex,
  parseIngredients,
  parseInstructions,
  parseNotes,
  parseTableCells,
  stripImageTokens,
} from "@recipesage/util/shared";
import { sanitizeRemoveHtmlFromString } from "./sanitizeRemoveHtmlFromString";
import { fetchURL } from "../general/fetch";
import { Content, Margins, TDocumentDefinitions } from "pdfmake/interfaces";
import path from "path";
import { RecipeSummary } from "@recipesage/prisma";
import { readFile } from "fs/promises";
import process from "node:process";
import { setTimeout } from "node:timers/promises";
import { translate } from "./translate";

const FONT_PATH = process.env.FONTS_PATH;
if (!FONT_PATH) throw new Error("FONTS_PATH must be provided");

// DefinitelyTyped hasn't been updated for pdfmake 0.3.x yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const pdfmake = _pdfmake as any;

pdfmake.addFonts({
  NotoSans: {
    normal: path.resolve(FONT_PATH, "Noto_Sans/NotoSans-Regular.ttf"),
    bold: path.resolve(FONT_PATH, "Noto_Sans/NotoSans-Bold.ttf"),
    italics: path.resolve(FONT_PATH, "Noto_Sans/NotoSans-Italic.ttf"),
    bolditalics: path.resolve(FONT_PATH, "Noto_Sans/NotoSans-BoldItalic.ttf"),
  },
});

export interface RecipePDFStrings {
  untitled: string;
  source: string;
  activeTime: string;
  totalTime: string;
  yield: string;
  ingredients: string;
  instructions: string;
  notes: string;
  nutrition: string;
  servingSize: string;
  otherNutritionDetails: string;
  sourceUrl: string;
  imageUrl: string;
  nutritionLabels: {
    calories: string;
    totalFat: string;
    saturatedFat: string;
    transFat: string;
    polyunsaturatedFat: string;
    monounsaturatedFat: string;
    cholesterol: string;
    sodium: string;
    totalCarbs: string;
    dietaryFiber: string;
    totalSugars: string;
    addedSugars: string;
    protein: string;
    vitaminD: string;
    calcium: string;
    iron: string;
    potassium: string;
  };
}

export const getRecipePDFStrings = async (
  language: string,
): Promise<RecipePDFStrings> => {
  const t = (key: string) => translate(language, key);
  return {
    untitled: await t("pages.recipeDetails.untitled"),
    source: await t("pages.recipeDetails.source"),
    activeTime: await t("pages.recipeDetails.activeTime"),
    totalTime: await t("pages.recipeDetails.totalTime"),
    yield: await t("pages.recipeDetails.yield"),
    ingredients: await t("pages.recipeDetails.ingredients"),
    instructions: await t("pages.recipeDetails.instructions"),
    notes: await t("pages.recipeDetails.notes"),
    nutrition: await t("pages.recipeDetails.nutrition"),
    servingSize: await t("pages.recipeDetails.nutritionServingSize"),
    otherNutritionDetails: await t("pages.recipeDetails.nutritionOtherDetails"),
    sourceUrl: await t("pages.editRecipe.input.sourceUrl"),
    imageUrl: await t("webextension.inject.field.imageUrl"),
    nutritionLabels: {
      calories: await t("pages.recipeDetails.nutritionCalories"),
      totalFat: await t("pages.recipeDetails.nutritionTotalFat"),
      saturatedFat: await t("pages.recipeDetails.nutritionSaturatedFat"),
      transFat: await t("pages.recipeDetails.nutritionTransFat"),
      polyunsaturatedFat: await t(
        "pages.recipeDetails.nutritionPolyunsaturatedFat",
      ),
      monounsaturatedFat: await t(
        "pages.recipeDetails.nutritionMonounsaturatedFat",
      ),
      cholesterol: await t("pages.recipeDetails.nutritionCholesterol"),
      sodium: await t("pages.recipeDetails.nutritionSodium"),
      totalCarbs: await t("pages.recipeDetails.nutritionTotalCarbs"),
      dietaryFiber: await t("pages.recipeDetails.nutritionDietaryFiber"),
      totalSugars: await t("pages.recipeDetails.nutritionTotalSugars"),
      addedSugars: await t("pages.recipeDetails.nutritionAddedSugars"),
      protein: await t("pages.recipeDetails.nutritionProtein"),
      vitaminD: await t("pages.recipeDetails.nutritionVitaminD"),
      calcium: await t("pages.recipeDetails.nutritionCalcium"),
      iron: await t("pages.recipeDetails.nutritionIron"),
      potassium: await t("pages.recipeDetails.nutritionPotassium"),
    },
  };
};

export interface RecipePDFMakeOptions {
  strings: RecipePDFStrings;
  includePrimaryImage?: boolean;
  includeImageUrls?: boolean;
  renderInlineImages?: boolean;
  pageBreakBefore?: boolean;
  tocItem?: boolean;
}

const inlineFormattingRegex =
  /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__)/g;

export const applyInlineFormattingPdfmake = (text: string): Content => {
  const segments: Content[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(inlineFormattingRegex)) {
    if (match.index > lastIndex) {
      segments.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      segments.push({ text: match[2], bold: true, italics: true });
    } else if (match[3]) {
      segments.push({ text: match[3], bold: true });
    } else if (match[4]) {
      segments.push({ text: match[4], italics: true });
    } else if (match[5]) {
      segments.push({ text: match[5], decoration: "underline" });
    }

    lastIndex = match.index + match[0].length;
  }

  if (segments.length === 0) return text;

  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex));
  }

  return { text: segments };
};

const INLINE_IMAGE_SIZES: Record<string, [number, number]> = {
  small: [160, 120],
  medium: [320, 240],
  large: [560, 420],
  xlarge: [840, 620],
};

const PAGE_CONTENT_WIDTH = 515;
const INGREDIENTS_COLUMN_WIDTH = 180;
const INSTRUCTIONS_COLUMN_WIDTH = 300;
const IMAGE_FETCH_TIMEOUT_MS = 15 * 1000;

const getInlineImageFit = (
  sizeToken: string | undefined,
  maxWidth: number,
): [number, number] => {
  const size = sizeToken?.trim().toLowerCase();
  const dims = (size && INLINE_IMAGE_SIZES[size]) || INLINE_IMAGE_SIZES.medium;
  return [Math.min(dims[0], maxWidth), dims[1]];
};

const fetchImageAsDataUrl = async (url: string): Promise<string | null> => {
  try {
    let buffer: Buffer;
    if (process.env.NODE_ENV === "selfhost" && url.startsWith("/")) {
      buffer = await readFile(url);
    } else {
      const response = await fetchURL(url, { timeout: IMAGE_FETCH_TIMEOUT_MS });
      buffer = await response.buffer();
    }
    return `data:image/jpeg;base64,${buffer.toString("base64")}`;
  } catch (_e) {
    return null;
  }
};

const getSortedImageLocations = (recipe: RecipeSummary): string[] =>
  [...recipe.recipeImages]
    .sort((a, b) => a.order - b.order)
    .map((recipeImage) => recipeImage.image.location);

interface RenderItemOptions {
  bold?: boolean;
  numberPrefix?: number;
  margin?: Margins;
  renderInlineImages: boolean;
  imageLocations: string[];
  maxWidth: number;
}

const renderItem = async (
  content: string,
  options: RenderItemOptions,
): Promise<Content[]> => {
  if (!options.renderInlineImages) {
    const body = applyInlineFormattingPdfmake(stripImageTokens(content));
    return [
      {
        text:
          options.numberPrefix !== undefined
            ? [{ text: `${options.numberPrefix}. `, bold: true }, body]
            : body,
        bold: options.bold,
        margin: options.margin,
      },
    ];
  }

  const blocks: Content[] = [];
  let isFirstText = true;

  const emitText = (raw: string) => {
    if (!raw.trim()) return;
    const formatted = applyInlineFormattingPdfmake(raw);
    if (isFirstText && options.numberPrefix !== undefined) {
      blocks.push({
        text: [{ text: `${options.numberPrefix}. `, bold: true }, formatted],
        margin: options.margin,
      });
    } else {
      blocks.push({
        text: formatted,
        bold: options.bold,
        margin: options.margin,
      });
    }
    isFirstText = false;
  };

  let lastIndex = 0;
  for (const match of content.matchAll(imageTokenRegex)) {
    const matchStart = match.index ?? 0;
    emitText(content.slice(lastIndex, matchStart));

    const index = parseInt(match[1], 10);
    const sizeToken = match[2];
    const caption = match[3]?.trim();
    const location = options.imageLocations[index - 1];
    const dataUrl = location ? await fetchImageAsDataUrl(location) : null;

    if (dataUrl) {
      blocks.push({
        image: dataUrl,
        fit: getInlineImageFit(sizeToken, options.maxWidth),
        margin: [0, 4, 0, caption ? 2 : 8] satisfies Margins,
      });
      if (caption) {
        blocks.push({
          text: caption,
          italics: true,
          fontSize: 9,
          margin: [0, 0, 0, 8] satisfies Margins,
        });
      }
    } else if (caption) {
      emitText(caption);
    }

    lastIndex = matchStart + match[0].length;
  }
  emitText(content.slice(lastIndex));

  return blocks;
};

const buildNotesTable = (noteContent: string): Content => {
  const lines = noteContent.split("\n");
  const headerCells = parseTableCells(lines[0].trim());
  const body: string[][] = [headerCells];
  for (const row of lines.slice(2)) {
    const cells = parseTableCells(row.trim());
    body.push(headerCells.map((_, i) => cells[i] ?? ""));
  }

  return {
    table: {
      headerRows: 1,
      body: body.map((row, rowIdx) =>
        row.map((cell) => ({
          text: applyInlineFormattingPdfmake(stripImageTokens(cell)),
          bold: rowIdx === 0,
        })),
      ),
    },
    margin: [0, 4, 0, 4] satisfies Margins,
  };
};

export const buildNutritionTableRows = (
  recipe: RecipeSummary,
  strings: RecipePDFStrings,
): Content[][] => {
  const labels = strings.nutritionLabels;
  const rows: [string, number | null, string][] = [
    [labels.calories, recipe.nutritionCalories, "kcal"],
    [labels.totalFat, recipe.nutritionTotalFat, "g"],
    [labels.saturatedFat, recipe.nutritionSaturatedFat, "g"],
    [labels.transFat, recipe.nutritionTransFat, "g"],
    [labels.polyunsaturatedFat, recipe.nutritionPolyunsaturatedFat, "g"],
    [labels.monounsaturatedFat, recipe.nutritionMonounsaturatedFat, "g"],
    [labels.cholesterol, recipe.nutritionCholesterol, "mg"],
    [labels.sodium, recipe.nutritionSodium, "mg"],
    [labels.totalCarbs, recipe.nutritionTotalCarbs, "g"],
    [labels.dietaryFiber, recipe.nutritionDietaryFiber, "g"],
    [labels.totalSugars, recipe.nutritionTotalSugars, "g"],
    [labels.addedSugars, recipe.nutritionAddedSugars, "g"],
    [labels.protein, recipe.nutritionProtein, "g"],
    [labels.vitaminD, recipe.nutritionVitaminD, "mcg"],
    [labels.calcium, recipe.nutritionCalcium, "mg"],
    [labels.iron, recipe.nutritionIron, "mg"],
    [labels.potassium, recipe.nutritionPotassium, "mg"],
  ];
  return rows
    .filter(([, value]) => value != null)
    .map(([label, value, unit]) => [
      { text: label, bold: true },
      { text: `${value} ${unit}` },
    ]);
};

export const recipeToPDFMakeSchema = async (
  recipe: RecipeSummary,
  options: RecipePDFMakeOptions,
): Promise<Content> => {
  const { strings } = options;
  const renderInlineImages = options.renderInlineImages ?? false;
  const imageLocations = getSortedImageLocations(recipe);

  const schema: Content[] = [];
  const headerContent: Content[] = [];

  const primaryImageUrl = imageLocations[0];
  const primaryImageDataUrl =
    primaryImageUrl && options.includePrimaryImage
      ? await fetchImageAsDataUrl(primaryImageUrl)
      : null;

  // pdfmake only honors pageBreak on top-level nodes. When there is a primary
  // image the title is nested inside a columns node, so the break must land on
  // the columns node instead of the (nested) title.
  const titlePageBreak =
    options.pageBreakBefore && !primaryImageDataUrl ? "before" : undefined;
  const columnsPageBreak =
    options.pageBreakBefore && primaryImageDataUrl ? "before" : undefined;

  const titleText = recipe.title || strings.untitled;
  headerContent.push(
    options.tocItem
      ? {
          text: titleText,
          fontSize: 16,
          tocItem: true,
          pageBreak: titlePageBreak,
        }
      : { text: titleText, fontSize: 16, pageBreak: titlePageBreak },
  );

  const showTagLine =
    recipe.source || recipe.activeTime || recipe.totalTime || recipe.yield;
  if (showTagLine) {
    const tagline: [string, string][] = [];
    if (recipe.source) tagline.push([strings.source, recipe.source]);
    if (recipe.activeTime)
      tagline.push([strings.activeTime, recipe.activeTime]);
    if (recipe.totalTime) tagline.push([strings.totalTime, recipe.totalTime]);
    if (recipe.yield) tagline.push([strings.yield, recipe.yield]);

    const taglineSchema: Content[] = tagline.flatMap((item) => [
      { text: item[0] + ": ", bold: true },
      { text: item[1] + "  " },
    ]);

    headerContent.push({
      text: taglineSchema,
      margin: [0, 10, 0, 10] satisfies Margins,
    });
  }

  if (primaryImageDataUrl) {
    schema.push({
      columns: [
        {
          width: 150,
          image: primaryImageDataUrl,
          fit: [150, 150],
        },
        {
          width: "auto",
          stack: headerContent,
          margin: [10, 10, 0, 0] satisfies Margins,
        },
      ],
      margin: [0, 0, 0, 10] satisfies Margins,
      pageBreak: columnsPageBreak,
    });
  } else {
    schema.push(...headerContent);
  }

  if (recipe.description) {
    schema.push({
      text: recipe.description,
      margin: [0, 0, 0, 10] satisfies Margins,
    });
  }

  const parsedIngredients = parseIngredients(
    sanitizeRemoveHtmlFromString(recipe.ingredients || ""),
    "1",
  );
  const parsedInstructions = parseInstructions(
    sanitizeRemoveHtmlFromString(recipe.instructions || ""),
    "1",
  );
  const parsedNotes = parseNotes(
    sanitizeRemoveHtmlFromString(recipe.notes || ""),
  );

  const buildIngredientStack = async (maxWidth: number): Promise<Content[]> => {
    const out: Content[] = [];
    for (const item of parsedIngredients) {
      out.push(
        ...(await renderItem(item.content, {
          bold: item.isHeader,
          margin: [0, 0, 0, 5],
          renderInlineImages,
          imageLocations,
          maxWidth,
        })),
      );
    }
    return out;
  };

  const buildInstructionStack = async (
    maxWidth: number,
  ): Promise<Content[]> => {
    const out: Content[] = [];
    for (const item of parsedInstructions) {
      out.push(
        ...(await renderItem(item.content, {
          bold: item.isHeader,
          numberPrefix: item.isHeader ? undefined : item.count,
          margin: [0, 0, 0, 5],
          renderInlineImages,
          imageLocations,
          maxWidth,
        })),
      );
    }
    return out;
  };

  if (recipe.ingredients && recipe.instructions) {
    schema.push({
      columns: [
        {
          width: INGREDIENTS_COLUMN_WIDTH,
          stack: await buildIngredientStack(INGREDIENTS_COLUMN_WIDTH),
        },
        {
          width: "auto",
          stack: await buildInstructionStack(INSTRUCTIONS_COLUMN_WIDTH),
        },
      ],
      columnGap: 16,
    });
  } else if (recipe.ingredients) {
    schema.push({
      stack: await buildIngredientStack(PAGE_CONTENT_WIDTH),
    });
  } else if (recipe.instructions) {
    schema.push({
      stack: await buildInstructionStack(PAGE_CONTENT_WIDTH),
    });
  }

  if (recipe.notes) {
    schema.push({
      text: strings.notes + ":",
      margin: [0, 10, 0, 5] satisfies Margins,
      bold: true,
    });
    for (const note of parsedNotes) {
      if (note.isTable) {
        schema.push(buildNotesTable(note.content));
      } else {
        schema.push(
          ...(await renderItem(note.content, {
            bold: note.isHeader,
            renderInlineImages,
            imageLocations,
            maxWidth: PAGE_CONTENT_WIDTH,
          })),
        );
      }
    }
  }

  const nutritionRows = buildNutritionTableRows(recipe, strings);
  if (nutritionRows.length > 0 || recipe.nutritionOtherDetails) {
    schema.push({
      text: strings.nutrition + ":",
      margin: [0, 10, 0, 5] satisfies Margins,
      bold: true,
    });
    if (recipe.nutritionServingSize) {
      schema.push({
        text: [
          { text: strings.servingSize + ": ", bold: true },
          { text: recipe.nutritionServingSize },
        ],
        margin: [0, 0, 0, 5] satisfies Margins,
      });
    }
    if (nutritionRows.length > 0) {
      schema.push({
        table: {
          headerRows: 0,
          widths: ["*", "auto"],
          body: nutritionRows,
        },
        layout: {
          hLineWidth: (i, node) =>
            i === 0 || i === node.table.body.length ? 0 : 1,
          vLineWidth: () => 0,
          hLineColor: () => "#aaa",
          paddingLeft: (i) => (i === 0 ? 0 : 8),
          paddingRight: (i, node) =>
            i === (node.table.widths?.length ?? 0) - 1 ? 0 : 8,
        },
        margin: [0, 0, 0, 5] satisfies Margins,
      });
    }
    if (recipe.nutritionOtherDetails) {
      schema.push({
        text: [
          { text: strings.otherNutritionDetails + ": ", bold: true },
          { text: recipe.nutritionOtherDetails },
        ],
        margin: [0, 5, 0, 0] satisfies Margins,
      });
    }
  }

  if (recipe.url) {
    schema.push({
      text: [
        { text: strings.sourceUrl + ": ", bold: true },
        { text: recipe.url, link: recipe.url },
      ],
      margin: [0, 10, 0, 0] satisfies Margins,
    });
  }

  const otherImageUrls = recipe.recipeImages.map((el) => el.image.location);
  // Primary image is already included
  if (options.includePrimaryImage) otherImageUrls.splice(0, 1);
  if (options.includeImageUrls) {
    for (const imageUrl of otherImageUrls) {
      schema.push({
        text: [
          { text: strings.imageUrl + ": ", bold: true },
          { text: imageUrl, link: imageUrl },
        ],
        margin: [0, 10, 0, 0] satisfies Margins,
      });
    }
  }

  return schema;
};

export async function* recipeAsyncIteratorToPDF(
  recipes: AsyncIterable<RecipeSummary>,
  options: RecipePDFMakeOptions,
) {
  for await (const recipe of recipes) {
    const content: Content[] = [await recipeToPDFMakeSchema(recipe, options)];

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
    stream.end();

    yield {
      stream,
      recipe,
    };

    await setTimeout(50);
  }
}
