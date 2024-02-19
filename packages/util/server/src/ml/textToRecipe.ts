import { Prisma } from "@prisma/client";
import { initOCRFormatRecipe } from "../ml/chatFunctions";
import { OpenAIHelper } from "../ml/openai";

const openAiHelper = new OpenAIHelper();

export enum InputType {
  OCR,
  Document,
  Text,
}

const prompts = {
  [InputType.OCR]:
    "I have scanned a recipe via OCR and this block of text is the result. Please fix any odd capitalization and save the recipe in JSON format in it's original language. Here's the OCR text:\n\n",
  [InputType.Document]:
    "I have scanned a recipe from a document this block of text is the result. Please fix any odd capitalization and save the recipe in JSON format in it's original language. Here's the document text:\n\n",
  [InputType.Text]:
    "I have copied some recipe text from the internet. Please fix any odd capitalization and save the recipe in JSON format in it's original language. Here's the copied text:\n\n",
} satisfies Record<InputType, string>;

/**
 * If passed very little text, we're not going to get
 * a meaningful result from ChatGPT. If returned text length is less
 * than this number, processing will abort early.
 */
const OCR_MIN_VALID_TEXT = 20;

export const textToRecipe = async (text: string, inputType: InputType) => {
  if (text.length < OCR_MIN_VALID_TEXT) return;

  const recognizedRecipes: Prisma.RecipeUncheckedCreateInput[] = [];
  const gptFn = initOCRFormatRecipe("no-user-id", recognizedRecipes);
  const gptFnName = gptFn.function.name;
  if (!gptFnName)
    throw new Error("GPT function must have name for mandated tool call");

  await openAiHelper.getJsonResponseWithTools(
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

  const recognizedRecipe = recognizedRecipes[0];

  return recognizedRecipe;
};
