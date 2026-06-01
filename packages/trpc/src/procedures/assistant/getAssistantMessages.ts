import { authenticatedProcedure } from "../../trpc";
import { Assistant } from "@recipesage/util/server/ml";
import { z } from "zod";
import { assistantMessageSummarySchema } from "@recipesage/prisma";

const assistant = new Assistant();

export const getAssistantMessages = authenticatedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/assistant/getAssistantMessages",
      tags: ["assistant"],
      summary: "Get the caller's assistant chat history",
      protect: true,
    },
  })
  .output(z.array(assistantMessageSummarySchema))
  .query(async ({ ctx }) => {
    const chatHistory = await assistant.getChatHistory(ctx.session.userId);

    return chatHistory;
  });
