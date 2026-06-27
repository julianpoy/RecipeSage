import { ocrFormatRecipeSchema } from "../ml/chatFunctionsVercel";
import { StandardizedRecipeImportEntry } from "../db";
import { generateText, Output } from "ai";
import { aiProvider } from "./vercel";
import { config } from "../general/config";
import { metrics } from "../general/metrics";
import { withNoObjectRetry } from "./withNoObjectRetry";

export enum VisionToRecipeInputType {
  Photo,
  Document,
}

const prompts = {
  [VisionToRecipeInputType.Photo]:
    "I took this photo of a recipe. Please save the recipe in JSON format in it's original language. Please include all of the original measurements and instructions. Do not add additional information. Do not number instructions.",
  [VisionToRecipeInputType.Document]:
    "I scanned a document containing a recipe. Please save the recipe in JSON format in it's original language. Please include all of the original measurements and instructions. Do not add additional information. Do not number instructions.",
} satisfies Record<VisionToRecipeInputType, string>;

/**
 * Converts an image to a recipe using function calling against GPT4O.
 */
export const visionToRecipe = async (
  imageB64: (Uint8Array | ArrayBuffer | Buffer)[],
  inputType: VisionToRecipeInputType,
) => {
  const llmResponse = await withNoObjectRetry(() =>
    generateText({
      system:
        "You are a data processor utility. Do not summarize or add information, just format and process into the correct shape. Do not insert your own editorial voice, just clean the text and get it into the correct shape. Leave fields that are not present blank. A header can be denoted in the ingredients, instructions, or notes by prefixing the line with a # sign.",
      model: aiProvider(config.ai.model.vision),
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompts[inputType],
            },
            ...imageB64.map(
              (el) =>
                ({
                  type: "image",
                  image: el,
                }) as const,
            ),
          ],
        },
      ],
      output: Output.object({
        schema: ocrFormatRecipeSchema,
      }),
    }),
  );

  if (llmResponse.totalUsage.totalTokens !== undefined) {
    metrics.llmTokensConsumed.observe(
      {
        category: "visionToRecipe",
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

  const recipe: StandardizedRecipeImportEntry = {
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
    },
    labels: [],
    images: [],
  };

  return recipe;
};
