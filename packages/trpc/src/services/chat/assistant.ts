import { prisma } from "@recipesage/prisma";
import { ChatCompletionMessageParam, ChatCompletionMessageToolCall, ChatCompletionUserMessageParam } from "openai/resources/chat/completions";
import { OpenAIHelper } from "./openai";
import { AssistantMessage, Prisma } from "@prisma/client";
import { initBuildRecipe } from "./chatFunctions";
import { AssistantMessageSummary, assistantMessageSummary, recipeSummary } from "../../types/queryTypes";
import dedent from "ts-dedent";

// TODO: Move to seed lib
(async () => {
  const assistantUser = await prisma.user.upsert({
    create: {
      name: "RecipeSage Cooking Assistant",
      email: "assistant@recipesage.com",
      passwordHash: "nologin",
      passwordSalt: "nologin",
      passwordVersion: 2,
      handle: "assistant",
      enableProfile: true,
    },
    where: {
      email: "assistant@recipesage.com",
    },
    update: {},
  });

  const existingProfileItem = await prisma.profileItem.findFirst({
    where: {
      userId: assistantUser.id,
      order: 0,
    }
  });

  if (!existingProfileItem) {
    await prisma.profileItem.create({
      data: {
        userId: assistantUser.id,
        type: "all-recipes",
        title: "Created by RecipeSage Cooking Assistant",
        visibility: "public",
        order: 0,
      },
    });
  }
})();

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
  `

  constructor() {
    this.openAiHelper = new OpenAIHelper();
  }

  private _buildChatContext(_messages: AssistantMessage[]): AssistantMessage[] {
    const messages = Array.from(_messages);
    const context: AssistantMessage[] = [];

    // Add messages until context size reached and last message is not a tool_call
    while(context.length < this.contextSizeLimit || (context.at(-1) && context.at(-1)?.role === 'tool')) {
      const message = messages.shift();
      if (!message) return context;

      context.push(message);
    }

    return context;
  }

  private async getChatContext(userId: string): Promise<ChatCompletionMessageParam[]> {
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
      .map((assistantMessage) => assistantMessage.json as unknown as ChatCompletionMessageParam);

    // Insert the system prompt at the beginning of the messages sent to ChatGPT (oldest)
    chatGPTContext.unshift({
      role: "system",
      content: this.systemPrompt
    });

    return chatGPTContext;
  }

  async sendChat(
    content: string,
    userId: string,
  ): Promise<void> {
    const assistantUser = await prisma.user.findUniqueOrThrow({
      where: {
        email: "assistant@recipesage.com",
      }
    });

    const userMessage = {
      role: 'user',
      content,
    } satisfies ChatCompletionUserMessageParam;

    const context = [
      ...await this.getChatContext(userId),
      userMessage,
    ];

    const recipes: Prisma.RecipeUncheckedCreateInput[] = [];

    const response = await this.openAiHelper.getChatResponse(
      context,
      [
        initBuildRecipe(assistantUser.id, recipes),
      ]
    );

    await prisma.assistantMessage.create({
      data: {
        userId,
        role: userMessage.role,
        content: userMessage.content,
        json: userMessage,
      }
    });

    const toolCallsById: Record<string, ChatCompletionMessageToolCall> = {};
    for (const message of response) {
      if (message.role === 'assistant' && message.tool_calls) {
        message.tool_calls.forEach((toolCall) => {
          toolCallsById[toolCall.id] = toolCall;
        });
      }
    }

    for (const message of response) {
      let recipeId: string | undefined = undefined;
      if (
        message.role === "tool"
        && toolCallsById[message.tool_call_id]?.function.name === 'displayRecipe'
      ) {
        const recipeToCreate = recipes.shift();
        if (!recipeToCreate) {
          throw new Error("ChatGPT claims it created a recipe but no recipe was created by function call");
        }

        const recipe = await prisma.recipe.create({
          data: recipeToCreate,
        });

        recipeId = recipe.id;
      }

      const content = Array.isArray(message.content) ?
        message.content
          .map((part) => part.type === "text" ? part.text : part.image_url)
          .join('\n')
          : message.content;

      await prisma.assistantMessage.create({
        data: {
          userId,
          role: message.role,
          recipeId,
          content,
          name: 'name' in message ? message.name : null,
          json: message as any, // Prisma does not like OpenAI's typings
        }
      });
    }
  }

  async getChatHistory(
    userId: string,
  ): Promise<AssistantMessageSummary[]> {
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

    return messages;
  }
}
