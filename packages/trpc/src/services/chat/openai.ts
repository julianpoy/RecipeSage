import { OpenAI } from "openai";
import { RunnableTools } from "openai/lib/RunnableFunction";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { initBuildRecipe } from "./chatFunctions";

export class OpenAIHelper {
  private openAi: OpenAI;
  private gptModel = process.env.OPENAI_GPT_MODEL || "gpt-3.5-turbo-1106";

  constructor() {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY && process.env.NODE_ENV !== "selfhost") {
      throw new Error("OPENAI_API_KEY must be provided");
    }

    this.openAi = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "selfhost-invalid-placeholder",
    });
  }

  async getChatResponse(
    context: ChatCompletionMessageParam[],
    tools: RunnableTools<[ReturnType<typeof initBuildRecipe>]>
  ): Promise<ChatCompletionMessageParam[]> {
    const runner = this.openAi.beta.chat.completions.runTools({
      messages: context,
      model: this.gptModel,
      tools,
    });

    await runner.done();

    // Messages includes the context passed in for some reason. We only want to return new messages
    const chats = runner.messages.slice(context.length);

    console.log("messages", chats);

    console.log("cost", await runner.totalUsage());

    return chats;
  }

  async generateImage(prompt: string, userId: string) {
    const image = await this.openAi.images.generate({
      prompt,
      n: 1,
      response_format: "url",
      size: "512x512",
      user: userId,
    });

    const url = image.data[0].url;
    if (!url) {
      throw new Error("Dall-E did not create image as requested");
    }

    return url;
  }
}
