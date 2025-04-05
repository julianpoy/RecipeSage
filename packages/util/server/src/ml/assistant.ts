import {
  prisma,
  AssistantMessageSummary,
  assistantMessageSummary,
} from "@recipesage/prisma";
import {
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  ChatCompletionUserMessageParam,
} from "openai/resources/chat/completions";
import { OpenAIHelper, SupportedGPTModel } from "./openai";
import { AssistantMessage } from "@prisma/client";
import { initBuildRecipe } from "./chatFunctions";
import dedent from "ts-dedent";
import { userHasCapability } from "../capabilities";
import { Capabilities } from "@recipesage/util/shared";
import Sentry from "@sentry/node";
import { Converter } from "showdown";
import { StandardizedRecipeImportEntry } from "../db";
const showdown = new Converter({
  simplifiedAutoLink: true,
  openLinksInNewWindow: true,
});

const FREE_MESSAGE_CAP = 5;
const CONTRIB_MESSAGE_CAP = 50;
const ABUSE_MESSAGE_CAP = 1440;

export class Assistant {
  private openAiHelper: OpenAIHelper;
  /**
   * Limits the number of historical messages sent to ChatGPT
   */
  private contextSizeLimit = 4;
  /**
   * Limits the number of messages returned to the user
   * to keep long conversations loading quickly.
   */
  private chatHistoryLimit = 200;
  /**
   * Sets up the assistant with some initial instructions
   */
  private systemPrompt = dedent`
    You are the RecipeSage cooking assistant.
    You will not deviate from the topic of recipes and cooking.
    Any response with recipe content must call the embedRecipe function.
  `;

  constructor() {
    this.openAiHelper = new OpenAIHelper();
  }

  private _buildChatContext(_messages: AssistantMessage[]): AssistantMessage[] {
    const messages = Array.from(_messages);
    const context: AssistantMessage[] = [];

    // Add messages until context size reached and last message is not a tool_call
    while (
      context.length < this.contextSizeLimit ||
      (context.at(-1) && context.at(-1)?.role === "tool")
    ) {
      const message = messages.shift();
      if (!message) return context;

      context.push(message);
    }

    return context;
  }

  private async getChatContext(
    userId: string,
  ): Promise<ChatCompletionMessageParam[]> {
    const assistantMessages = await prisma.assistantMessage.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    const assistantMessageContext = this._buildChatContext(assistantMessages);

    const chatGPTContext = assistantMessageContext
      .reverse() // Oldest first
      .map((assistantMessage) => {
        const message =
          assistantMessage.json as unknown as ChatCompletionMessageParam;
        if (message.role === "assistant") {
          return {
            ...message,
            // Fix for https://github.com/openai/openai-python/issues/2061
            tool_calls: message.tool_calls?.length
              ? message.tool_calls
              : undefined,
          };
        }

        return message;
      });

    let expectedToolCalls = 0;
    let toolCallingError = false;
    for (const message of chatGPTContext) {
      if (expectedToolCalls > 0 && message.role !== "tool") {
        toolCallingError = true;
        continue;
      }

      if (expectedToolCalls > 0 && message.role === "tool") {
        expectedToolCalls--;
        continue;
      }

      if (message.role === "assistant" && message.tool_calls) {
        expectedToolCalls = message.tool_calls.length;
      }
    }

    if (toolCallingError) {
      console.error("TOOL CALLING ERROR", userId);
      Sentry.captureMessage("TOOL CALLING ERROR", {
        extra: {
          userId,
          context: chatGPTContext,
        },
      });
      // If we have a tool calling error (a tool call not followed by tool responses)
      // we must remove all context otherwise gpt will fail.
      // TODO: better solution for this
      return chatGPTContext.splice(0);
    }

    // Insert the system prompt at the beginning of the messages sent to ChatGPT (oldest)
    chatGPTContext.unshift({
      role: "system",
      content: this.systemPrompt,
    });

    return chatGPTContext;
  }

  async checkMessageLimit(userId: string) {
    const moreMessages = await userHasCapability(
      userId,
      Capabilities.AssistantMoreMessages,
    );

    const lastDayReset = new Date();
    lastDayReset.setUTCSeconds(0);
    lastDayReset.setUTCMinutes(0);
    lastDayReset.setUTCHours(0);

    const todayMessageCount = await prisma.assistantMessage.count({
      where: {
        userId,
        role: "user",
        createdAt: {
          gte: lastDayReset,
        },
      },
    });

    const isOverLimit =
      (!moreMessages && todayMessageCount >= FREE_MESSAGE_CAP) ||
      todayMessageCount >= ABUSE_MESSAGE_CAP;
    const useLowQualityModel =
      moreMessages && todayMessageCount >= CONTRIB_MESSAGE_CAP;

    return {
      isOverLimit,
      useLowQualityModel,
    };
  }

  async sendChat(
    content: string,
    userId: string,
    useLowQualityModel: boolean,
  ): Promise<void> {
    const assistantUser = await prisma.user.findUniqueOrThrow({
      where: {
        email: "assistant@recipesage.com",
      },
    });

    const userMessage = {
      role: "user",
      content,
    } satisfies ChatCompletionUserMessageParam;

    const context = [...(await this.getChatContext(userId)), userMessage];

    const recipes: StandardizedRecipeImportEntry[] = [];

    const response = await this.openAiHelper.getChatResponseWithTools(
      useLowQualityModel
        ? SupportedGPTModel.GPT4OMini
        : SupportedGPTModel.GPT4O,
      context,
      [initBuildRecipe(recipes)],
    );

    await prisma.$transaction(async (tx) => {
      await tx.assistantMessage.create({
        data: {
          userId,
          role: userMessage.role,
          content: userMessage.content,
          json: userMessage,
          createdAt: new Date(), // Since ordering is important and we're in a transaction, we must create date here
        },
      });

      const toolCallsById: Record<string, ChatCompletionMessageToolCall> = {};
      for (const message of response) {
        if (message.role === "assistant" && message.tool_calls) {
          message.tool_calls.forEach((toolCall) => {
            toolCallsById[toolCall.id] = toolCall;
          });
        }
      }

      for (const message of response) {
        let recipeId: string | undefined = undefined;
        if (
          message.role === "tool" &&
          toolCallsById[message.tool_call_id]?.function.name === "embedRecipe"
        ) {
          const recipeToCreate = recipes.shift();
          if (!recipeToCreate) {
            throw new Error(
              "ChatGPT claims it created a recipe but no recipe was created by function call",
            );
          }

          const recipe = await tx.recipe.create({
            data: {
              ...recipeToCreate.recipe,
              userId: assistantUser.id,
              folder: "main",
            },
          });

          recipeId = recipe.id;
        }

        const content = Array.isArray(message.content)
          ? message.content
              .map((part) => {
                switch (part.type) {
                  case "text":
                    return part.text;
                  case "image_url":
                    return part.image_url;
                  case "input_audio":
                  case "refusal":
                    return "";
                }
              })
              .join("\n")
          : message.content;

        await tx.assistantMessage.create({
          data: {
            userId,
            role: message.role,
            recipeId,
            content,
            name: "name" in message ? message.name : null,
            json: message as object, // Prisma does not like OpenAI's typings
            createdAt: new Date(), // Since ordering is important and we're in a transaction, we must create date here
          },
        });
      }
    });
  }

  async getChatHistory(userId: string): Promise<AssistantMessageSummary[]> {
    const messages = await prisma.assistantMessage.findMany({
      where: {
        userId,
      },
      ...assistantMessageSummary,
      orderBy: {
        createdAt: "asc",
      },
      take: this.chatHistoryLimit,
    });

    for (const message of messages) {
      if (message.content) {
        message.content = showdown.makeHtml(message.content);
      }
    }

    return messages;
  }
}
