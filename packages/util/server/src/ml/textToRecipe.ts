import { ocrFormatRecipeSchema } from "../ml/chatFunctionsVercel";
import { StandardizedRecipeImportEntry } from "../db";
import { metrics } from "../general";
import { config } from "../general/config";
import { generateText, Output } from "ai";
import { aiProvider } from "./vercel";
import { withNoObjectRetry } from "./withNoObjectRetry";

export enum TextToRecipeInputType {
  OCR,
  Document,
  Text,
  Webpage,
}

const DEFAULT_SYSTEM =
  "You are a data processor utility. Do not summarize or add information, just format and process into the correct shape. Do not insert your own editorial voice, just clean the text and get it into the correct shape. Leave fields that are not present blank. A header can be denoted in the ingredients, instructions, or notes by prefixing the line with a # sign.";

const WEBPAGE_SYSTEM =
  "You are a recipe extraction utility. From the provided webpage text, extract ONLY the single main recipe and return it in the structured format. Follow these rules strictly:\n" +
  "- Do not summarize, paraphrase, translate, or invent anything. Preserve the recipe's original language and wording. Leave a field null/empty if the information is not present in the text.\n" +
  "- A recipe is a list of food or drink ingredients together with preparation steps to make a dish. If the text does not contain a genuine recipe (for example it is an article, an error or not-found page, a product or category page, or a list of links), return empty ingredients and instructions. Never fabricate, infer, or complete a recipe that is not explicitly written in the text.\n" +
  '- Extract only genuine recipe content. EXCLUDE all surrounding page material: site navigation, menus and breadcrumbs, advertisements, cookie/consent banners, newsletter or app install prompts, social share / print / save buttons, login UI, author biographies, reader comments and review counts, FAQ or Q&A sections, affiliate or product links (e.g. "special tools", "shop this post"), and any links or references to OTHER recipes ("you might also like", "related recipes", roundups).\n' +
  "- Clean formatting only: fix odd capitalization and stray whitespace, and strip leading list bullets, checkbox glyphs, and standalone step numbers from ingredient and instruction lines. Do not otherwise change the wording.\n" +
  '- A sub-section header within ingredients, instructions, or notes may be marked by prefixing its line with a # sign (e.g. "# For the sauce").\n' +
  "- Put one ingredient per line and one instruction step per line.";

const systemPrompts = {
  [TextToRecipeInputType.OCR]: DEFAULT_SYSTEM,
  [TextToRecipeInputType.Document]: DEFAULT_SYSTEM,
  [TextToRecipeInputType.Text]: DEFAULT_SYSTEM,
  [TextToRecipeInputType.Webpage]: WEBPAGE_SYSTEM,
} satisfies Record<TextToRecipeInputType, string>;

const models = {
  [TextToRecipeInputType.OCR]: config.ai.model.ocr,
  [TextToRecipeInputType.Document]: config.ai.model.document,
  [TextToRecipeInputType.Text]: config.ai.model.text,
  [TextToRecipeInputType.Webpage]: config.ai.model.webpage,
} satisfies Record<TextToRecipeInputType, string>;

const prompts = {
  [TextToRecipeInputType.OCR]:
    "I have scanned a recipe via OCR and this block of text is the result. Please fix any odd capitalization and save the recipe in JSON format in it's original language. Do not add or invent any information that is not present. Here's the OCR text:\n\n",
  [TextToRecipeInputType.Document]:
    "I have scanned a recipe from a document this block of text is the result. Please fix any odd capitalization and save the recipe in JSON format in it's original language. Do not add or invent any information that is not present. Please include all recipe detail and do not summarize. Here's the document text:\n\n",
  [TextToRecipeInputType.Text]:
    "I have copied some recipe text from the internet. Please fix any odd capitalization and save the recipe in JSON format in it's original language. Do not add or invent any information that is not present in the text. Here's the copied text:\n\n",
  [TextToRecipeInputType.Webpage]:
    "Here is the text extracted from a recipe webpage. Extract the single main recipe from it, following the rules. Here is the text:\n\n",
} satisfies Record<TextToRecipeInputType, string>;

/**
 * If passed very little text, we're not going to get
 * a meaningful result from ChatGPT. If returned text length is less
 * than this number, processing will abort early.
 */
export const OCR_MIN_VALID_TEXT = 20;

export const OCR_MAX_VALID_TEXT = 20000;

export const textToRecipe = async (
  text: string,
  inputType: TextToRecipeInputType,
) => {
  metrics.convertTextToRecipe.inc();

  if (text.length < OCR_MIN_VALID_TEXT) return;
  if (text.length > OCR_MAX_VALID_TEXT)
    text = text.substring(0, OCR_MAX_VALID_TEXT);

  const llmResponse = await withNoObjectRetry(() =>
    generateText({
      system: systemPrompts[inputType],
      model: aiProvider(models[inputType]),
      temperature: 0,
      prompt: prompts[inputType] + text,
      output: Output.object({
        schema: ocrFormatRecipeSchema,
      }),
    }),
  );

  if (llmResponse.totalUsage.totalTokens !== undefined) {
    metrics.llmTokensConsumed.observe(
      {
        category: "textToRecipe_" + inputType,
      },
      llmResponse.totalUsage.totalTokens,
    );
  }

  const markdownHeadersToRS = (line: string) => {
    if (line.startsWith("#")) {
      return `[${line.replace(/^#\s*/, "")}]`;
    }
    return line;
  };

  const entry: StandardizedRecipeImportEntry = {
    recipe: {
      title: llmResponse.output.title || "Unnamed",
      description: llmResponse.output.description || "",
      folder: "main",
      source: "",
      url: "",
      rating: undefined,
      yield: (llmResponse.output.yield || "").replaceAll("<UNKNOWN>", ""),
      activeTime: (llmResponse.output.activeTime || "").replaceAll(
        "<UNKNOWN>",
        "",
      ),
      totalTime: (llmResponse.output.totalTime || "").replaceAll(
        "<UNKNOWN>",
        "",
      ),
      ingredients: (llmResponse.output.ingredients || "")
        .replaceAll("\\n", "\n")
        .split("\n")
        .map(markdownHeadersToRS)
        .join("\n"),
      instructions: (llmResponse.output.instructions || "")
        .replaceAll("\\n", "\n")
        .split("\n")
        .map(markdownHeadersToRS)
        .join("\n"),
      notes: (llmResponse.output.notes || "")
        .replaceAll("\\n", "\n")
        .split("\n")
        .map(markdownHeadersToRS)
        .join("\n"),
      nutritionInfo: llmResponse.output.nutritionInfo || undefined,
    },
    labels: [],
    images: [],
  };

  return entry;
};
