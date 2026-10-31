import { ocrFormatRecipeModelSchema } from "../ml/chatFunctionsVercel";
import { StandardizedRecipeImportEntry } from "../db";
import { generateText, Output, type FilePart, type TextPart } from "ai";
import { aiProvider } from "./vercel";
import { AI_REQUEST_TIMEOUT_MS } from "./AI_REQUEST_TIMEOUT_MS";
import { config } from "../general/config";
import { metrics } from "../general/metrics";
import { withLLMRetryOptional } from "./withLLMRetryOptional";

export enum VisionToRecipeInputType {
  Photo,
  Document,
}

const RECIPE_EXTRACTION_RULES =
  " Put each ingredient with its amount in the ingredients, one per line. Put each preparation step in the instructions, in order. Some recipes write steps next to or between the ingredients they apply to. Those steps belong in the instructions, not the ingredients. Leave out marks and text that are not part of the recipe, such as page numbers, labels, or website navigation. If the images do not contain a recipe, leave all fields blank.";

const prompts = {
  [VisionToRecipeInputType.Photo]:
    "I took this photo of a recipe. Please save the recipe in JSON format in it's original language. Please include all of the original measurements and instructions. Do not add additional information. Do not number instructions." +
    RECIPE_EXTRACTION_RULES,
  [VisionToRecipeInputType.Document]:
    "I scanned a document containing a recipe. Please save the recipe in JSON format in it's original language. Please include all of the original measurements and instructions. Do not add additional information. Do not number instructions." +
    RECIPE_EXTRACTION_RULES,
} satisfies Record<VisionToRecipeInputType, string>;

const OCR_TEXT_PROMPT =
  "An OCR tool read this text from the same images. Use it to check the spelling of words that are hard to read in the images. The OCR text can contain errors and does not keep the layout, so use the images for the layout and the order of the recipe. Here's the OCR text:\n\n";

/**
 * Converts an image to a recipe using function calling against GPT4O.
 */
export const visionToRecipe = async (
  imageB64: (Uint8Array | ArrayBuffer | Buffer)[],
  inputType: VisionToRecipeInputType,
  ocrText?: string,
) => {
  const ocrTextParts: TextPart[] = ocrText
    ? [{ type: "text", text: OCR_TEXT_PROMPT + ocrText }]
    : [];

  const llmResponse = await withLLMRetryOptional(
    "vision_to_recipe",
    config.ai.model.vision,
    async (temperature, onStepEnd) => {
      const response = await generateText({
        system:
          "You are a data processor utility. Do not summarize or add information, just format and process into the correct shape. Do not insert your own editorial voice, just clean the text and get it into the correct shape. Leave fields that are not present blank. A header can be denoted in the ingredients, instructions, or notes by prefixing the line with a # sign.",
        model: aiProvider(config.ai.model.vision, { disableReasoning: true }),
        temperature,
        timeout: AI_REQUEST_TIMEOUT_MS,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompts[inputType],
              },
              ...imageB64.map((el): FilePart => ({
                type: "file",
                data: el,
                mediaType: "image/jpeg",
              })),
              ...ocrTextParts,
            ],
          },
        ],
        output: Output.object({
          schema: ocrFormatRecipeModelSchema,
        }),
        onStepEnd,
      });

      if (response.totalUsage.totalTokens !== undefined) {
        metrics.llmTokensConsumed.observe(
          {
            category: "visionToRecipe",
          },
          response.totalUsage.totalTokens,
        );
      }

      return response.output;
    },
    (output) => !output.ingredients?.trim() && !output.instructions?.trim(),
  );

  if (!llmResponse) return;

  const markdownHeadersToRS = (line: string) => {
    if (line.startsWith("#")) {
      return `[${line.replace(/^#\s*/, "")}]`;
    }
    return line;
  };

  const recipe: StandardizedRecipeImportEntry = {
    recipe: {
      title: llmResponse.title || "Unnamed",
      description: llmResponse.description || "",
      folder: "main",
      source: "",
      url: "",
      rating: undefined,
      yield: (llmResponse.yield || "").replaceAll("<UNKNOWN>", ""),
      activeTime: (llmResponse.activeTime || "").replaceAll("<UNKNOWN>", ""),
      totalTime: (llmResponse.totalTime || "").replaceAll("<UNKNOWN>", ""),
      ingredients: (llmResponse.ingredients || "")
        .replaceAll("\\n", "\n")
        .split("\n")
        .map(markdownHeadersToRS)
        .join("\n"),
      instructions: (llmResponse.instructions || "")
        .replaceAll("\\n", "\n")
        .split("\n")
        .map(markdownHeadersToRS)
        .join("\n"),
      notes: (llmResponse.notes || "")
        .replaceAll("\\n", "\n")
        .split("\n")
        .map(markdownHeadersToRS)
        .join("\n"),
      nutritionInfo: llmResponse.nutritionInfo || undefined,
    },
    labels: [],
    images: [],
  };

  return recipe;
};
