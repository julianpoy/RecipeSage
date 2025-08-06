import { OpenAIHelper, GPTModelQuality } from "../ml/openai";

const openAiHelper = new OpenAIHelper();

export enum VisionToTextInputType {
  Photo,
  Document,
}

const prompts = {
  [VisionToTextInputType.Photo]:
    "I took this photo of a recipe. Please fix any odd capitalization and give me the recipe in a nice, readable format in it's original language. Please include all of the original measurements and instructions",
  [VisionToTextInputType.Document]:
    "I scanned a document containing a recipe. Please fix any odd capitalization and give me the recipe in a nice, readable format in it's original language. Please include all of the original measurements and instructions",
} satisfies Record<VisionToTextInputType, string>;

/**
 * Converts an image to text using function calling against GPT4O.
 */
export const visionToText = async (
  imageB64: string,
  inputType: VisionToTextInputType,
): Promise<string> => {
  const response = await openAiHelper.getChatResponse(
    GPTModelQuality.ImageRecognition,
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
