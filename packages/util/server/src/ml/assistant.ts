import {
  prisma,
  AssistantMessageSummary,
  assistantMessageSummary,
} from "@recipesage/prisma";
import {
  CreateAssistantRecipeToolResult,
  initCreateAssistantRecipeTool,
} from "./chatFunctionsVercel";
import dedent from "ts-dedent";
import { userHasCapability } from "../capabilities";
import { Capabilities } from "@recipesage/util/shared";
import { Converter } from "showdown";
import { generateText, ModelMessage } from "ai";
import { AI_MODEL_HIGH, AI_MODEL_LOW } from "./vercel";
const showdown = new Converter({
  simplifiedAutoLink: true,
  openLinksInNewWindow: true,
});

const FREE_MESSAGE_CAP = 5;
const CONTRIB_MESSAGE_SOFTCAP = 50;
const ABUSE_MESSAGE_CAP = 1440;

export class Assistant {
  /**
   * Limits the number of historical messages sent to ChatGPT
   */
  private contextSizeLimit = 6;
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
    Any response with recipe content must call the createRecipe function.
  `;

  private async getChatContext(userId: string): Promise<ModelMessage[]> {
    const assistantMessages = await prisma.assistantMessage.findMany({
      where: {
        userId,
        version: 2,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        json: true,
      },
      take: this.contextSizeLimit * 3,
    });

    const context: ModelMessage[] = [];
    const pending: ModelMessage[] = [];

    for (const message of assistantMessages) {
      if (context.length >= this.contextSizeLimit) break;

      const modelMessage = message.json as ModelMessage;
      pending.push(modelMessage);

      // We want to make sure to only capture conversation "rounds"
      // where no user<->assistant<->tool cycle is cut off
      if (modelMessage.role === "user") {
        context.push(...pending);
        pending.length = 0;
      }
    }

    return context.reverse();
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
      moreMessages && todayMessageCount >= CONTRIB_MESSAGE_SOFTCAP;

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
    const userMessage = {
      role: "user",
      content,
    } as const;

    const context = [...(await this.getChatContext(userId)), userMessage];

    const response = await generateText({
      system: this.systemPrompt,
      model: useLowQualityModel ? AI_MODEL_LOW : AI_MODEL_HIGH,
      messages: context,
      tools: {
        createRecipe: initCreateAssistantRecipeTool(),
      },
    });

    const toolResultRecipeMap = new Map<string, string>();
    for (const toolResult of response.toolResults) {
      if (toolResult.toolName === "createRecipe") {
        const recipeId = (toolResult.output as CreateAssistantRecipeToolResult)
          .storedRecipeInfo.id;
        toolResultRecipeMap.set(toolResult.toolCallId, recipeId);
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.assistantMessage.create({
        data: {
          userId,
          role: userMessage.role,
          content: userMessage.content,
          json: userMessage,
          version: 2,
          createdAt: new Date(), // Since ordering is important and we're in a transaction, we must create date here
        },
      });

      for (const message of response.response.messages) {
        let recipeId: string | undefined = undefined;
        let content: string | undefined = undefined;

        if (typeof message.content === "string") {
          content = message.content;
        } else if (Array.isArray(message.content)) {
          const textParts = message.content
            .filter((part) => part.type === "text")
            .map((part) => part.text);

          content = textParts.length > 0 ? textParts.join("") : undefined;

          if (message.role === "tool") {
            for (const part of message.content) {
              if (part.type === "tool-result") {
                recipeId = toolResultRecipeMap.get(part.toolCallId);
                break;
              }
            }
          }
        }

        await tx.assistantMessage.create({
          data: {
            userId,
            role: message.role,
            recipeId,
            content,
            json: message,
            version: 2,
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
