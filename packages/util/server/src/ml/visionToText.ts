import { OpenAIHelper, SupportedGPTModel } from "../ml/openai";

const openAiHelper = new OpenAIHelper();

export enum VisionToRecipeInputType {
  Photo,
  Document,
}

const prompts = {
  [VisionToRecipeInputType.Photo]:
    "I took this photo of a recipe. Please fix any odd capitalization and give me the recipe in a nice, readable format in it's original language. Please include all of the original measurements and instructions",
  [VisionToRecipeInputType.Document]:
    "I scanned a document containing a recipe. Please fix any odd capitalization and give me the recipe in a nice, readable format in it's original language. Please include all of the original measurements and instructions",
} satisfies Record<VisionToRecipeInputType, string>;

/**
 * Converts an image to text using function calling against GPT4Vision.
 * Note: This has very, very poor accuracy for OCR purposes.
 */
export const visionToText = async (
  imageB64: string,
  inputType: VisionToRecipeInputType,
): Promise<string> => {
  const response = await openAiHelper.getChatResponse(
    SupportedGPTModel.GPT4Vision,
    [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompts[inputType],
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageB64}`,
              detail: "high",
            },
          },
        ],
      },
    ],
  );

  return response.choices.map((el) => el.message.content).join("") || "";
};
