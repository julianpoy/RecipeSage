import { OpenAI } from "openai";
import {
  ChatCompletion,
  ChatCompletionMessageParam,
  ChatCompletionToolChoiceOption,
} from "openai/resources/chat/completions";
import { RSRunnableFunction } from "./chatFunctions";

export enum SupportedGPTModel {
  GPT4OMini = "gpt-4o-mini-2024-07-18",
  GPT4O = "gpt-4o-2024-08-06",
}

export class OpenAIHelper {
  private openAi: OpenAI;

  constructor() {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (
      !OPENAI_API_KEY &&
      process.env.NODE_ENV !== "selfhost" &&
      process.env.NODE_ENV !== "test"
    ) {
      throw new Error("OPENAI_API_KEY must be provided");
    }

    this.openAi = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "selfhost-invalid-placeholder",
    });
  }

  async getJsonResponseWithTools(
    model: SupportedGPTModel,
    context: ChatCompletionMessageParam[],
    tools: RSRunnableFunction[],
    toolChoice?: ChatCompletionToolChoiceOption,
  ): Promise<ChatCompletionMessageParam[]> {
    const runner = this.openAi.beta.chat.completions.runTools({
      messages: context,
      model,
      tools,
      tool_choice: toolChoice,
      response_format: {
        type: "json_object",
      },
    });

    await runner.done();

    // Messages includes the context passed in for some reason. We only want to return new messages
    const chats = runner.messages.slice(context.length);

    console.log("messages", chats);

    console.log("cost", await runner.totalUsage());

    return chats;
  }

  async getChatResponseWithTools(
    model: SupportedGPTModel,
    context: ChatCompletionMessageParam[],
    tools: RSRunnableFunction[],
  ): Promise<ChatCompletionMessageParam[]> {
    const runner = this.openAi.beta.chat.completions.runTools({
      messages: context,
      model,
      tools,
    });

    await runner.done();

    // Messages includes the context passed in for some reason. We only want to return new messages
    const chats = runner.messages.slice(context.length);

    console.log("messages", chats);

    console.log("cost", await runner.totalUsage());

    return chats;
  }

  async getChatResponse(
    model: SupportedGPTModel,
    context: ChatCompletionMessageParam[],
  ): Promise<ChatCompletion> {
    const response = await this.openAi.chat.completions.create({
      messages: context,
      model,
      max_tokens: 4000,
    });

    return response;
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
