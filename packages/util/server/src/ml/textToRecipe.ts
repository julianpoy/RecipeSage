import { initOCRFormatRecipe } from "../ml/chatFunctions";
import { OpenAIHelper, SupportedGPTModel } from "../ml/openai";
import { StandardizedRecipeImportEntry } from "../db";
import { metrics } from "../general";

const openAiHelper = new OpenAIHelper();

export enum TextToRecipeInputType {
  OCR,
  Document,
  Text,
  Webpage,
}

const prompts = {
  [TextToRecipeInputType.OCR]:
    "I have scanned a recipe via OCR and this block of text is the result. Please fix any odd capitalization and save the recipe in JSON format in it's original language. Here's the OCR text:\n\n",
  [TextToRecipeInputType.Document]:
    "I have scanned a recipe from a document this block of text is the result. Please fix any odd capitalization and save the recipe in JSON format in it's original language. Here's the document text:\n\n",
  [TextToRecipeInputType.Text]:
    "I have copied some recipe text from the internet. Please fix any odd capitalization and save the recipe in JSON format in it's original language. Here's the copied text:\n\n",
  [TextToRecipeInputType.Webpage]:
    "Here's some text from a webpage that contains a recipe. Please grab only the recipe and save it in JSON format in it's original language. Do not add steps, ingredients, or any other content that doesn't exist in the original text. Here's the copied text:\n\n",
} satisfies Record<TextToRecipeInputType, string>;

/**
 * If passed very little text, we're not going to get
 * a meaningful result from ChatGPT. If returned text length is less
 * than this number, processing will abort early.
 */
export const OCR_MIN_VALID_TEXT = 20;

export const textToRecipe = async (
  text: string,
  inputType: TextToRecipeInputType,
) => {
  if (text.length < OCR_MIN_VALID_TEXT) return;

  const recognizedRecipes: StandardizedRecipeImportEntry[] = [];
  const gptFn = initOCRFormatRecipe(recognizedRecipes);
  const gptFnName = gptFn.function.name;
  if (!gptFnName)
    throw new Error("GPT function must have name for mandated tool call");

  await openAiHelper.getJsonResponseWithTools(
    SupportedGPTModel.GPT4OMini,
    [
      {
        role: "system",
        content: prompts[inputType] + text,
      },
    ],
    [gptFn],
    {
      type: "function",
      function: {
        name: gptFnName,
      },
    },
  );

  metrics.convertTextToRecipe.inc();

  const recognizedRecipe = recognizedRecipes[0];

  return recognizedRecipe;
};
